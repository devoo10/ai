/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { UploadIcon } from './icons';

interface CombinePanelProps {
  baseImage: File | null;
  onCombine: (image1: File, image2: File, prompt: string) => void;
  isLoading: boolean;
}

// Helper to create object URLs for previewing files
const useFileUrl = (file: File | null) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (file) {
      const newUrl = URL.createObjectURL(file);
      setUrl(newUrl);
      return () => URL.revokeObjectURL(newUrl);
    }
    setUrl(null);
  }, [file]);
  return url;
};

const CombinePanel: React.FC<CombinePanelProps> = ({ baseImage, onCombine, isLoading }) => {
  const [image2, setImage2] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>(`Create a Polaroid-style photo of the two people from the provided images. The girl should be leaning on the guy's shoulder, hugging. Change the background to a white curtain. The photo should have a slight blur and a consistent flash-like light source. Do not change their faces.`);

  const baseImageUrl = useFileUrl(baseImage);
  const image2Url = useFileUrl(image2);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage2(e.target.files[0]);
    }
  };

  const handleApply = () => {
    if (baseImage && image2 && prompt) {
      onCombine(baseImage, image2, prompt);
    }
  };

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">Combine Two Images</h3>
      <p className="text-sm text-center text-gray-400 -mt-2">
        Your current image is Image 1. Upload a second image to merge them with an AI prompt.
      </p>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Image 1 Preview Box */}
        <div className="flex-1 flex flex-col items-center gap-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-gray-300">Image 1 (Current)</h4>
          <div className="w-full h-40 flex items-center justify-center rounded-md overflow-hidden bg-black/20">
            {baseImageUrl ? (
              <img src={baseImageUrl} alt="Image 1 Preview" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-gray-500 p-2">
                <p>Upload an image using the "Upload New" button to begin.</p>
              </div>
            )}
          </div>
        </div>

        {/* Image 2 Uploader Box */}
        <div className="flex-1 flex flex-col items-center gap-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-gray-300">Image 2</h4>
          <div className="w-full h-40">
            {image2Url ? (
              <div className="relative w-full h-full">
                <img src={image2Url} alt="Image 2 Preview" className="w-full h-full object-contain rounded-md" />
                <button 
                  onClick={() => setImage2(null)} 
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 leading-none hover:bg-red-500 transition-colors"
                  aria-label="Remove Image 2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label 
                htmlFor="image2-upload" 
                className={`w-full h-full flex flex-col items-center justify-center rounded-md cursor-pointer transition-all duration-200 border-2 border-dashed
                  ${!baseImage ? 'bg-gray-800/50 border-gray-700 opacity-50 cursor-not-allowed' : 'bg-gray-800/70 border-gray-600 hover:bg-gray-800 hover:border-blue-500'}`}
              >
                <UploadIcon className="w-8 h-8 text-gray-500" />
                <span className="mt-2 text-sm text-gray-500">{baseImage ? 'Click to upload' : 'Upload Image 1 first'}</span>
                <input id="image2-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={!baseImage || isLoading} />
              </label>
            )}
          </div>
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe how to combine the images..."
        rows={4}
        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
        disabled={isLoading}
      />

      <div className="flex flex-col gap-4 pt-2">
          <button
              onClick={handleApply}
              className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
              disabled={isLoading || !baseImage || !image2 || !prompt.trim()}
          >
              Combine Images
          </button>
      </div>
    </div>
  );
};

export default CombinePanel;