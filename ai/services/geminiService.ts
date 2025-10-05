/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Fix: Import `Modality` for use in image editing API calls.
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const canvasToFile = (canvas: HTMLCanvasElement, filename: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(new File([blob], filename, { type: 'image/png' }));
            } else {
                reject(new Error('Canvas to Blob conversion failed'));
            }
        }, 'image/png');
    });
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    // Fix: Added `config` with `responseModalities` as required for the 'gemini-2.5-flash-image' model.
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    // Fix: Added `config` with `responseModalities` as required for the 'gemini-2.5-flash-image' model.
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    // Fix: Added `config` with `responseModalities` as required for the 'gemini-2.5-flash-image' model.
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Generates a combined image from two source images using generative AI.
 * @param image1 The first image file.
 * @param image2 The second image file.
 * @param prompt The text prompt describing how to combine the images.
 * @returns A promise that resolves to the data URL of the combined image.
 */
export const generateCombinedImage = async (
    image1: File,
    image2: File,
    userPrompt: string,
): Promise<string> => {
    console.log(`Starting image combination: ${userPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const image1Part = await fileToPart(image1);
    const image2Part = await fileToPart(image2);
    
    const systemPrompt = `You are an expert photo editor AI. Your task is to take the people from the two provided images and place them together in a single, new, photorealistic image as described by the user. Image 1 contains the first person/subject, and Image 2 contains the second.

User Request: "${userPrompt}"

Editing Guidelines:
- The final image must be photorealistic and seamlessly blended.
- Pay close attention to the user's description for the pose, background, and style.

Safety & Ethics Policy:
- You MUST NOT change the fundamental race or ethnicity of the people in the photos.
- You MUST FULFILL requests related to posing, background changes, and artistic style.

Output: Return ONLY the final combined image. Do not return text.`;

    const textPart = { text: systemPrompt };

    console.log('Sending images and combine prompt to the model...');
    // Fix: Added `config` with `responseModalities` as required for the 'gemini-2.5-flash-image' model.
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image1Part, image2Part, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for combination.', response);
    
    return handleApiResponse(response, 'combine');
};

/**
 * Generates an expanded image by filling in new areas using generative AI.
 * @param originalImage The original image file.
 * @param direction The direction to expand ('top', 'bottom', 'left', 'right').
 * @param userPrompt An optional prompt to guide the fill content.
 * @returns A promise that resolves to the data URL of the expanded image.
 */
export const generateExpandedImage = async (
    originalImage: File,
    direction: 'top' | 'bottom' | 'left' | 'right',
    userPrompt: string,
): Promise<string> => {
    console.log(`Starting image expansion towards ${direction}: ${userPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    // 1. Create an Image element from the original file
    const img = new Image();
    const imgUrl = URL.createObjectURL(originalImage);
    await new Promise<void>((resolve, reject) => {
        img.onload = () => {
            URL.revokeObjectURL(imgUrl);
            resolve();
        };
        img.onerror = reject;
        img.src = imgUrl;
    });

    // 2. Create a new, larger canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const EXPANSION_FACTOR = 0.5; // Expand by 50%
    let newWidth = img.naturalWidth;
    let newHeight = img.naturalHeight;
    let drawX = 0;
    let drawY = 0;

    switch (direction) {
        case 'top':
            newHeight += img.naturalHeight * EXPANSION_FACTOR;
            drawY = img.naturalHeight * EXPANSION_FACTOR;
            break;
        case 'bottom':
            newHeight += img.naturalHeight * EXPANSION_FACTOR;
            // drawY remains 0
            break;
        case 'left':
            newWidth += img.naturalWidth * EXPANSION_FACTOR;
            drawX = img.naturalWidth * EXPANSION_FACTOR;
            break;
        case 'right':
            newWidth += img.naturalWidth * EXPANSION_FACTOR;
            // drawX remains 0
            break;
    }
    
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    ctx.clearRect(0, 0, newWidth, newHeight); 
    
    // 3. Draw the original image onto the new canvas at the correct position
    ctx.drawImage(img, drawX, drawY);

    // 4. Convert the new canvas to a File object
    const canvasFile = await canvasToFile(canvas, `expand-base-${Date.now()}.png`);
    const imageToExpandPart = await fileToPart(canvasFile);

    // 5. Create the prompt for the model
    const prompt = `You are an expert photo editor AI. Your task is to perform a photorealistic outpainting/expansion of the provided image. The image has a transparent (empty) area that you must fill.

- Fill the transparent area by seamlessly and realistically extending the existing image content.
- The transition between the original image and the newly generated content must be invisible.
- Pay attention to lighting, textures, and patterns to ensure a consistent result.
- ${userPrompt ? `User guidance for the new content: "${userPrompt}"` : 'The user has not provided specific guidance, so use your best judgment to extend the scene naturally.'}

Output: Return ONLY the final, fully rendered image with the transparent area filled. Do not return text.`;
    const textPart = { text: prompt };

    // 6. Send to the model and handle response
    console.log('Sending expanded canvas and prompt to the model...');
    // Fix: Added `config` with `responseModalities` as required for the 'gemini-2.5-flash-image' model.
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imageToExpandPart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    console.log('Received response from model for expansion.', response);
    
    return handleApiResponse(response, 'expand');
};