
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import Card from './ui/Card';
import Button from './ui/Button';

type Mode = 'pro' | 'flash';

const CreativeStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<Mode>('pro');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      // FIX: Updated model name for 'flash' mode to 'gemini-flash-lite-latest' per coding guidelines.
      const model = mode === 'pro' ? 'gemini-2.5-pro' : 'gemini-flash-lite-latest';
      const config = mode === 'pro' ? { thinkingConfig: { thinkingBudget: 32768 } } : {};
      
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: config,
      });

      setResult(response.text);
    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found")) {
        setError("API Key error. Please check your API key setup.");
      } else {
        setError('Failed to generate response. Please try again.');
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const proPlaceholder = "Enter a complex query... e.g., 'Write a detailed business plan for a tech startup focusing on sustainable energy solutions, including market analysis, financial projections, and marketing strategy.'";
  const flashPlaceholder = "Enter a quick query... e.g., 'Summarize the plot of Hamlet in three sentences.'";

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">Creative Studio</h2>
        <div className="flex items-center gap-2 bg-gray-700 p-1 rounded-lg">
          <Button onClick={() => setMode('pro')} className={`w-full ${mode === 'pro' ? 'bg-indigo-600' : 'bg-transparent hover:bg-gray-600'}`}>
            Complex Task (Pro + Thinking Mode)
          </Button>
          <Button onClick={() => setMode('flash')} className={`w-full ${mode === 'flash' ? 'bg-indigo-600' : 'bg-transparent hover:bg-gray-600'}`}>
            Fast Task (Flash-Lite)
          </Button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={mode === 'pro' ? proPlaceholder : flashPlaceholder}
          className="w-full bg-gray-700 text-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-600 h-40 resize-y"
          disabled={isLoading}
        />
        <Button onClick={handleGenerate} isLoading={isLoading} className="self-start">
          Generate
        </Button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="mt-4 p-4 bg-gray-900 rounded-lg min-h-[20rem] border border-gray-700">
          {isLoading ? (
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto"></div>
              <p className="mt-4 text-gray-400">{mode === 'pro' ? 'Thinking deeply...' : 'Getting a quick response...'}</p>
            </div>
          ) : result ? (
            <p className="text-gray-300 whitespace-pre-wrap">{result}</p>
          ) : (
            <p className="text-gray-500">Your generated content will appear here.</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CreativeStudio;
