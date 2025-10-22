
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import Card from './ui/Card';
import Button from './ui/Button';

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
const aspectRatios: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio,
        },
      });

      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
      setGeneratedImage(imageUrl);
    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found")) {
        setError("API Key error or model access issue. Please check your API key and ensure it has access to the Imagen 4.0 model.");
      } else {
        setError('Failed to generate image. Please try again.');
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">Image Generator (Imagen 4.0)</h2>
        <div className="flex flex-col gap-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to create... e.g., 'A robot holding a red skateboard.'"
            className="w-full bg-gray-700 text-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-600 h-24 resize-none"
            disabled={isLoading}
          />
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-400 mb-1">Aspect Ratio</label>
              <div className="flex flex-wrap gap-2">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      aspectRatio === ratio
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleGenerate} isLoading={isLoading} className="w-full sm:w-auto mt-4 sm:mt-0 self-end">
              Generate
            </Button>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        <div className="mt-4 p-4 bg-gray-900 rounded-lg min-h-[300px] flex items-center justify-center">
          {isLoading ? (
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto"></div>
                <p className="mt-4 text-gray-400">Generating your masterpiece...</p>
            </div>
          ) : generatedImage ? (
            <img src={generatedImage} alt="Generated" className="max-w-full max-h-[50vh] rounded-md shadow-lg" />
          ) : (
            <p className="text-gray-500">Your generated image will appear here.</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ImageGenerator;
