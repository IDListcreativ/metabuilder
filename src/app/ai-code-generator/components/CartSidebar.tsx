'use client';

import { useState } from 'react';

type PromptComposerProps = {
  onGenerate?: (prompt: string) => void;
    loading?: boolean;
    };

    export default function CartSidebar({ onGenerate, loading = false }: PromptComposerProps) {
      const [prompt, setPrompt] = useState('');

        const handleGenerate = () => {
            if (!prompt.trim()) return;
                if (onGenerate) onGenerate(prompt);
                  };

                    return (
                        <div className="w-full h-full border-l bg-white flex flex-col">
                              {/* Header */}
                                    <div className="p-4 border-b">
                                            <h2 className="text-lg font-semibold">AI Builder</h2>
                                                    <p className="text-sm text-gray-500">
                                                              Describe the feature or app you want to generate
                                                                      </p>
                                                                            </div>

                                                                                  {/* Prompt Area */}
                                                                                        <div className="flex-1 p-4 flex flex-col gap-3">
                                                                                                <textarea
                                                                                                          value={prompt}
                                                                                                                    onChange={(e) => setPrompt(e.target.value)}
                                                                                                                              placeholder="Example: Build a dashboard page with charts and user analytics."
                                                                                                                                        className="w-full h-40 p-3 border rounded-md text-sm resize-none focus:outline