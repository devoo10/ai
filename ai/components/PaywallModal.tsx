/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { UploadIcon } from './icons';

interface PaywallModalProps {
  onClose: () => void;
  onSubmitForReview: (credits: number, price: string, screenshot: File) => void;
}

type Package = {
  credits: number;
  price: string;
}

const packages: Package[] = [
  { credits: 1, price: '10 EGP' },
  { credits: 15, price: '100 EGP' },
];

const PaywallModal: React.FC<PaywallModalProps> = ({ onClose, onSubmitForReview }) => {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const screenshotUrl = screenshot ? URL.createObjectURL(screenshot) : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (selectedPackage && screenshot) {
      onSubmitForReview(selectedPackage.credits, selectedPackage.price, screenshot);
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center animate-fade-in p-4">
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700/50 rounded-2xl w-full max-w-lg p-8 text-center text-white shadow-2xl shadow-green-500/10">
          <h2 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Submission Received!</h2>
          <p className="text-gray-400 mb-8">An admin will review your transaction shortly. Once approved, the credits will be added to your account. Thank you!</p>
          <button onClick={onClose} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition-colors hover:bg-blue-500">
              Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center animate-fade-in p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700/50 rounded-2xl w-full max-w-2xl p-8 text-white shadow-2xl shadow-blue-500/10 flex flex-col gap-6">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Purchase Credits</h2>
            <p className="text-gray-400 mt-1">Select a package, complete the payment, and upload a screenshot to receive your credits.</p>
        </div>

        {/* Step 1: Select Package */}
        <div>
            <h3 className="font-semibold text-lg mb-2 text-gray-300">1. Select a Package</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map(pkg => (
                    <button 
                        key={pkg.credits}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`p-4 rounded-lg text-left border-2 transition-all duration-200 ${selectedPackage?.credits === pkg.credits ? 'bg-blue-500/20 border-blue-500' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'}`}
                    >
                        <h4 className="font-bold text-xl">{pkg.credits} Credits</h4>
                        <p className="text-gray-400 text-lg">{pkg.price}</p>
                    </button>
                ))}
            </div>
        </div>

        {/* Step 2: Payment Details */}
        {selectedPackage && (
            <div className="animate-fade-in">
                <h3 className="font-semibold text-lg mb-2 text-gray-300">2. Complete Payment</h3>
                <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg text-sm space-y-2">
                    <p>Please send <strong className="text-blue-400 text-base">{selectedPackage.price}</strong> to one of the following accounts:</p>
                    <p><strong>Vodafone Cash:</strong> <span className="font-mono text-gray-300">01012345678</span></p>
                    <p><strong>Instapay:</strong> <span className="font-mono text-gray-300">user@instapay</span></p>
                </div>
            </div>
        )}

        {/* Step 3: Upload Screenshot */}
        {selectedPackage && (
            <div className="animate-fade-in">
                <h3 className="font-semibold text-lg mb-2 text-gray-300">3. Upload Screenshot</h3>
                {screenshotUrl ? (
                    <div className="flex items-center gap-4">
                        <img src={screenshotUrl} alt="Screenshot preview" className="w-24 h-24 object-cover rounded-md border border-gray-600" />
                        <div className="text-left">
                            <p className="font-medium text-green-400">File selected:</p>
                            <p className="text-sm text-gray-400 truncate max-w-xs">{screenshot.name}</p>
                            <button onClick={() => setScreenshot(null)} className="text-xs text-red-400 hover:underline mt-1">Remove</button>
                        </div>
                    </div>
                ) : (
                    <label htmlFor="screenshot-upload" className="w-full h-32 flex flex-col items-center justify-center bg-gray-800/70 border-2 border-dashed border-gray-600 rounded-md cursor-pointer hover:bg-gray-800 hover:border-gray-500 transition-colors">
                        <UploadIcon className="w-8 h-8 text-gray-500" />
                        <span className="mt-2 text-sm text-gray-500">Click or drag to upload receipt</span>
                        <input id="screenshot-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                )}
            </div>
        )}
        
        <div className="flex items-center justify-end gap-4 mt-4">
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-sm font-medium px-6 py-3">Cancel</button>
            <button 
                onClick={handleSubmit}
                disabled={!selectedPackage || !screenshot}
                className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 ease-in-out shadow-md shadow-green-500/20 hover:shadow-lg hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
            >
                Submit for Review
            </button>
        </div>

      </div>
    </div>
  );
};
export default PaywallModal;
