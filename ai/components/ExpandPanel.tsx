/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

type ExpandDirection = 'top' | 'bottom' | 'left' | 'right';

interface ExpandPanelProps {
  onExpand: (direction: ExpandDirection, prompt: string) => void;
  isLoading: boolean;
}

const ExpandPanel: React.FC<ExpandPanelProps> = ({ onExpand, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const directions: { name: string; value: ExpandDirection }[] = [
    { name: 'Expand Top', value: 'top' },
    { name: 'Expand Bottom', value: 'bottom' },
    { name: 'Expand Left', value: 'left' },
    { name: 'Expand Right', value: 'right' },
  ];

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-center text-gray-300">Expand Image Canvas</h3>
      <p className="text-sm text-center text-gray-400 -mt-2">
        Extend the boundaries of your photo. The AI will fill in the new space.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Optional: Describe what to add in the new space (e.g., 'more of the blue sky with clouds')"
        rows={3}
        className="flex-grow bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
        disabled={isLoading}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {directions.map(({ name, value }) => (
          <button
            key={value}
            onClick={() => onExpand(value, prompt)}
            disabled={isLoading}
            className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExpandPanel;
