
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { fileToBase64, getMimeType } from '../utils/helpers';
import Card from './ui/Card';
import Button from './ui/Button';

type AspectRatio = '16:9' | '9:16';
const aspectRatios: AspectRatio[] = ['16:9', '9:16'];
const loadingMessages = [
    "Warming up the digital director...",
    "Choreographing pixels into motion...",
    "Rendering the first few frames...",
    "Applying cinematic magic...",
    "This can take a few minutes, hang tight!",
    "Finalizing the video masterpiece..."
];

const VideoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [initialImage, setInitialImage] = useState<{ file: File, url: string } | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [error, setError] = useState<string | null>(null);
  const [isKeySelected, setIsKeySelected] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      }
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = loadingMessages.indexOf(prev);
          return loadingMessages[(currentIndex + 1) % loadingMessages.length];
        });
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);
  
  const handleSelectKey = async () => {
    if (window.aistudio) {
        try {
            await window.aistudio.openSelectKey();
            // Assume selection is successful to avoid race conditions.
            setIsKeySelected(true);
        } catch (e) {
            console.error("Error opening API key selection:", e);
            setError("Could not open the API key selection dialog.");
        }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInitialImage({ file, url: URL.createObjectURL(file) });
    }
  };
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage(loadingMessages[0]);
    setError(null);
    setGeneratedVideo(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const generationPayload: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio
        }
      };

      if (initialImage) {
        generationPayload.image = {
          imageBytes: await fileToBase64(initialImage.file),
          mimeType: getMimeType(initialImage.file),
        };
      }
      
      let operation = await ai.models.generateVideos(generationPayload);
      
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        const downloadLink = operation.response.generatedVideos[0].video.uri;
        // The API key is automatically appended by the environment
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY as string}`);
        if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
        const videoBlob = await videoResponse.blob();
        setGeneratedVideo(URL.createObjectURL(videoBlob));
      } else {
        throw new Error("Video generation completed, but no video URI was found.");
      }
    } catch (e: any) {
        if (e.message?.includes("Requested entity was not found")) {
            setError("API Key error. Please re-select your API key.");
            setIsKeySelected(false);
        } else {
             setError('Failed to generate video. Please try again.');
        }
        console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isKeySelected) {
    return (
        <Card className="text-center">
            <h2 className="text-2xl font-bold mb-4">API Key Required for Veo</h2>
            <p className="text-gray-400 mb-6">Video generation with Veo requires you to select a project with billing enabled.</p>
            <p className="text-gray-400 mb-6">
                Please review the{' '}
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    billing documentation
                </a>{' '}
                for more details.
            </p>
            <Button onClick={handleSelectKey}>Select API Key</Button>
        </Card>
    )
  }

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">Video Generator (Veo 3.1)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
             <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to create... e.g., 'A neon hologram of a cat driving at top speed'"
                className="w-full bg-gray-700 text-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-600 h-24 resize-none"
                disabled={isLoading}
              />
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                 <div className="w-full sm:w-auto">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Aspect Ratio</label>
                    <div className="flex flex-wrap gap-2">
                        {aspectRatios.map((ratio) => (
                        <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`px-3 py-1 text-sm rounded-md transition-colors ${aspectRatio === ratio ? 'bg-indigo-600 text-white' : 'bg-gray-600 hover:bg-gray-500'}`}>
                            {ratio}
                        </button>
                        ))}
                    </div>
                </div>
              </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="w-full h-40 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-500">
                {initialImage ? (
                    <img src={initialImage.url} alt="Initial frame" className="max-h-full max-w-full object-contain rounded-md" />
                ) : (
                    <p className="text-gray-400 text-center">Optional: Add a starting image</p>
                )}
            </div>
            <input type="file" accept="image/*" onChange={handleFileChange} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 text-gray-400"/>
          </div>
        </div>
        <Button onClick={handleGenerate} isLoading={isLoading} disabled={!prompt}>Generate Video</Button>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        <div className="mt-4 p-4 bg-gray-900 rounded-lg min-h-[300px] flex items-center justify-center">
          {isLoading ? (
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto"></div>
                <p className="mt-4 text-gray-400">{loadingMessage}</p>
            </div>
          ) : generatedVideo ? (
            <video src={generatedVideo} controls autoPlay loop className="max-w-full max-h-[50vh] rounded-md shadow-lg" />
          ) : (
            <p className="text-gray-500">Your generated video will appear here.</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default VideoGenerator;
