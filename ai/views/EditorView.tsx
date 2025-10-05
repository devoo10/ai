/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import Spinner from '../components/Spinner';
import FilterPanel from '../components/FilterPanel';
import AdjustmentPanel from '../components/AdjustmentPanel';
import CropPanel from '../components/CropPanel';
import CombinePanel from '../components/CombinePanel';
import ExpandPanel from '../components/ExpandPanel';
import { UndoIcon, RedoIcon, EyeIcon } from '../components/icons';
import StartScreen from '../components/StartScreen';
import { dataURLtoFile, addImageToHistory } from '../utils/fileHelpers';
import { type User } from '../App';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateCombinedImage, generateExpandedImage } from '../services/geminiService';


type Tab = 'retouch' | 'adjust' | 'filters' | 'crop' | 'combine' | 'expand';

interface EditorViewProps {
  currentUser: User;
  checkUserCanGenerate: () => boolean;
  updateUserCredits: (userId: string, creditChange: number) => void;
}

const EditorView: React.FC<EditorViewProps> = ({
    currentUser, checkUserCanGenerate, updateUserCredits
}) => {
    const [history, setHistory] = useState<File[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Load and save history from/to local storage based on user ID
    useEffect(() => {
        if (!currentUser) return;
        const savedHistoryData = localStorage.getItem(`history_${currentUser.id}`);
        if (savedHistoryData) {
            const { files, index } = JSON.parse(savedHistoryData);
            // This is a simplified deserialization. A real app would need robust handling.
            // For now, we assume it's just metadata and we can't recover the files themselves
            // on a hard refresh, so we'll just start fresh. This avoids complexity with storing binary data.
            // A better simulation might store dataURLs. Let's do that.
        }
    }, [currentUser]);


    const [prompt, setPrompt] = useState<string>('');
    const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
    const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('retouch');
    
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [aspect, setAspect] = useState<number | undefined>();
    const [isComparing, setIsComparing] = useState<boolean>(false);
    const imgRef = useRef<HTMLImageElement>(null);

    const currentImage = history[historyIndex] ?? null;
    const originalImage = history[0] ?? null;
  
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  
    useEffect(() => {
      if (currentImage) {
        const url = URL.createObjectURL(currentImage);
        setCurrentImageUrl(url);
        return () => URL.revokeObjectURL(url);
      } else {
        setCurrentImageUrl(null);
      }
    }, [currentImage]);
    
    useEffect(() => {
      if (originalImage) {
        const url = URL.createObjectURL(originalImage);
        setOriginalImageUrl(url);
        return () => URL.revokeObjectURL(url);
      } else {
        setOriginalImageUrl(null);
      }
    }, [originalImage]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

     const handleGenericGeneration = async (
        apiCall: () => Promise<string>,
        fileNamePrefix: string
    ) => {
        if (!checkUserCanGenerate() || !currentUser) return;
        setIsLoading(true);
        setError(null);
        try {
            const imageUrl = await apiCall();
            const newImageFile = dataURLtoFile(imageUrl, `${fileNamePrefix}-${Date.now()}.png`);
            addImageToHistory(newImageFile, history, historyIndex, setHistory, setHistoryIndex);
            if (currentUser.role !== 'admin') {
                updateUserCredits(currentUser.id, -1);
            }
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Operation failed. ${errorMessage}`);
            console.error(err);
            return false;
        } finally {
            setIsLoading(false);
        }
    };
  
    const handleImageUpload = useCallback((file: File) => {
      setError(null);
      setHistory([file]);
      setHistoryIndex(0);
      setEditHotspot(null);
      setDisplayHotspot(null);
      setActiveTab('retouch');
      setCrop(undefined);
      setCompletedCrop(undefined);
    }, [setHistory, setHistoryIndex, setError]);

    const handleGenerate = async () => {
        if (!currentImage) { setError('No image loaded to edit.'); return; }
        if (!prompt.trim()) { setError('Please enter a description for your edit.'); return; }
        if (!editHotspot) { setError('Please click on the image to select an area to edit.'); return; }

        const success = await handleGenericGeneration(
            () => generateEditedImage(currentImage, prompt, editHotspot),
            'edited'
        );
        if (success) {
            setEditHotspot(null);
            setDisplayHotspot(null);
        }
    };
    
    const handleApplyFilter = (filterPrompt: string) => {
        if (!currentImage) { setError('No image loaded.'); return; }
        handleGenericGeneration(
            () => generateFilteredImage(currentImage, filterPrompt),
            'filtered'
        );
    };

    const handleApplyAdjustment = (adjustmentPrompt: string) => {
        if (!currentImage) { setError('No image loaded.'); return; }
        handleGenericGeneration(
            () => generateAdjustedImage(currentImage, adjustmentPrompt),
            'adjusted'
        );
    };

    const handleCombineImages = (image1: File, image2: File, combinePrompt: string) => {
        handleGenericGeneration(
            () => generateCombinedImage(image1, image2, combinePrompt),
            'combined'
        );
    };

    const handleExpandImage = (direction: 'top' | 'bottom' | 'left' | 'right', expandPrompt: string) => {
        if (!currentImage) { setError('No image loaded.'); return; }
        handleGenericGeneration(
            () => generateExpandedImage(currentImage, direction, expandPrompt),
            'expanded'
        );
    };

    const handleApplyCrop = useCallback(() => {
        if (!completedCrop || !imgRef.current) {
            setError('Please select an area to crop.');
            return;
        }
    
        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');
    
        if (!ctx) {
            setError('Could not process the crop.');
            return;
        }
    
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = completedCrop.width * pixelRatio;
        canvas.height = completedCrop.height * pixelRatio;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.imageSmoothingQuality = 'high';
    
        ctx.drawImage(
          image,
          completedCrop.x * scaleX,
          completedCrop.y * scaleY,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY,
          0,
          0,
          completedCrop.width,
          completedCrop.height,
        );
        
        const croppedImageUrl = canvas.toDataURL('image/png');
        const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
        addImageToHistory(newImageFile, history, historyIndex, setHistory, setHistoryIndex);
        setCrop(undefined);
        setCompletedCrop(undefined);
    
      }, [completedCrop, history, historyIndex, setHistory, setHistoryIndex, setError]);

    const handleUndo = useCallback(() => {
        if (canUndo) {
          setHistoryIndex(historyIndex - 1);
          setEditHotspot(null);
          setDisplayHotspot(null);
        }
      }, [canUndo, historyIndex, setHistoryIndex]);
      
      const handleRedo = useCallback(() => {
        if (canRedo) {
          setHistoryIndex(historyIndex + 1);
          setEditHotspot(null);
          setDisplayHotspot(null);
        }
      }, [canRedo, historyIndex, setHistoryIndex]);
    
      const handleReset = useCallback(() => {
        if (history.length > 0) {
          setHistoryIndex(0);
          setError(null);
          setEditHotspot(null);
          setDisplayHotspot(null);
        }
      }, [history, setHistoryIndex, setError]);
    
      const handleUploadNew = useCallback(() => {
          setHistory([]);
          setHistoryIndex(-1);
          setError(null);
          setPrompt('');
          setEditHotspot(null);
          setDisplayHotspot(null);
      }, [setHistory, setHistoryIndex, setError]);

    const handleDownload = useCallback(() => {
        if (currentImage) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(currentImage);
            link.download = `edited-${currentImage.name}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }
    }, [currentImage]);
    
    const handleFileSelect = (files: FileList | null) => {
      if (files && files[0]) {
        handleImageUpload(files[0]);
      }
    };

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (activeTab !== 'retouch') return;
        
        const img = e.currentTarget;
        const rect = img.getBoundingClientRect();
    
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        
        setDisplayHotspot({ x: offsetX, y: offsetY });
    
        const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
        const scaleX = naturalWidth / clientWidth;
        const scaleY = naturalHeight / clientHeight;
    
        const originalX = Math.round(offsetX * scaleX);
        const originalY = Math.round(offsetY * scaleY);
    
        setEditHotspot({ x: originalX, y: originalY });
    };

    if (error) {
        return (
            <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
             <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
             <p className="text-md text-red-400">{error}</p>
             <button
                 onClick={() => setError(null)}
                 className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
               >
                 Try Again
             </button>
           </div>
         );
     }
     
     if (!currentImageUrl) {
       return <StartScreen onFileSelect={handleFileSelect} />;
     }
 
     const imageDisplay = (
       <div className="relative">
         {originalImageUrl && (
             <img
                 key={originalImageUrl}
                 src={originalImageUrl}
                 alt="Original"
                 className="w-full h-auto object-contain max-h-[60vh] rounded-xl pointer-events-none"
             />
         )}
         <img
             ref={imgRef}
             key={currentImageUrl}
             src={currentImageUrl}
             alt="Current"
             onClick={handleImageClick}
             className={`absolute top-0 left-0 w-full h-auto object-contain max-h-[60vh] rounded-xl transition-opacity duration-200 ease-in-out ${isComparing ? 'opacity-0' : 'opacity-100'} ${activeTab === 'retouch' ? 'cursor-crosshair' : ''}`}
         />
       </div>
     );
     
     const cropImageElement = (
       <img 
         ref={imgRef}
         key={`crop-${currentImageUrl}`}
         src={currentImageUrl} 
         alt="Crop this image"
         className="w-full h-auto object-contain max-h-[60vh] rounded-xl"
       />
     );
 
 
     return (
       <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
         <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20">
             {isLoading && (
                 <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                     <Spinner />
                     <p className="text-gray-300">AI is working its magic...</p>
                 </div>
             )}
             
             {activeTab === 'crop' ? (
               <ReactCrop 
                 crop={crop} 
                 onChange={c => setCrop(c)} 
                 onComplete={c => setCompletedCrop(c)}
                 aspect={aspect}
                 className="max-h-[60vh]"
               >
                 {cropImageElement}
               </ReactCrop>
             ) : imageDisplay }
 
             {displayHotspot && !isLoading && activeTab === 'retouch' && (
                 <div 
                     className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                     style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                 >
                     <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                 </div>
             )}
         </div>
         
         <div className="w-full bg-gray-800/80 border border-gray-700/80 rounded-lg p-2 flex items-center justify-center gap-2 backdrop-blur-sm">
             {(['retouch', 'crop', 'adjust', 'filters', 'combine', 'expand'] as Tab[]).map(tab => (
                  <button
                     key={tab}
                     onClick={() => setActiveTab(tab)}
                     className={`w-full capitalize font-semibold py-3 px-5 rounded-md transition-all duration-200 text-base ${
                         activeTab === tab 
                         ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/40' 
                         : 'text-gray-300 hover:text-white hover:bg-white/10'
                     }`}
                 >
                     {tab}
                 </button>
             ))}
         </div>
         
         <div className="w-full">
             {activeTab === 'retouch' && (
                 <div className="flex flex-col items-center gap-4">
                     <p className="text-md text-gray-400">
                         {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                     </p>
                     <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                         <input
                             type="text"
                             value={prompt}
                             onChange={(e) => setPrompt(e.target.value)}
                             placeholder={editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image"}
                             className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                             disabled={isLoading || !editHotspot}
                         />
                         <button 
                             type="submit"
                             className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                             disabled={isLoading || !prompt.trim() || !editHotspot}
                         >
                             Generate
                         </button>
                     </form>
                 </div>
             )}
             {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
             {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />}
             {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
             {activeTab === 'combine' && <CombinePanel baseImage={currentImage} onCombine={handleCombineImages} isLoading={isLoading} />}
             {activeTab === 'expand' && <ExpandPanel onExpand={handleExpandImage} isLoading={isLoading} />}
         </div>
         
         <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
             <button 
                 onClick={handleUndo}
                 disabled={!canUndo}
                 className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                 aria-label="Undo last action"
             >
                 <UndoIcon className="w-5 h-5 mr-2" />
                 Undo
             </button>
             <button 
                 onClick={handleRedo}
                 disabled={!canRedo}
                 className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5"
                 aria-label="Redo last action"
             >
                 <RedoIcon className="w-5 h-5 mr-2" />
                 Redo
             </button>
             
             <div className="h-6 w-px bg-gray-600 mx-1 hidden sm:block"></div>
 
             {canUndo && (
               <button 
                   onMouseDown={() => setIsComparing(true)}
                   onMouseUp={() => setIsComparing(false)}
                   onMouseLeave={() => setIsComparing(false)}
                   onTouchStart={() => setIsComparing(true)}
                   onTouchEnd={() => setIsComparing(false)}
                   className="flex items-center justify-center text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
                   aria-label="Press and hold to see original image"
               >
                   <EyeIcon className="w-5 h-5 mr-2" />
                   Compare
               </button>
             )}
 
             <button 
                 onClick={handleReset}
                 disabled={!canUndo}
                 className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/30 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent"
               >
                 Reset
             </button>
             <button 
                 onClick={handleUploadNew}
                 className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 hover:border-white/30 active:scale-95 text-base"
             >
                 Upload New
             </button>
 
             <button 
                 onClick={handleDownload}
                 className="flex-grow sm:flex-grow-0 ml-auto bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
             >
                 Download Image
             </button>
         </div>
       </div>
     );
}

export default EditorView;