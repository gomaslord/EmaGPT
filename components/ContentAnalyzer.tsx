
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { fileToBase64, getMimeType } from '../utils/helpers';
import Card from './ui/Card';
import Button from './ui/Button';

const ContentAnalyzer: React.FC = () => {
  const [prompt, setPrompt] = useState('Describe this content in detail.');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAnalysis(null);
      setError(null);
      const url = URL.createObjectURL(selectedFile);
      setFilePreview(url);
    }
  };

  const captureFrame = (): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => {
                    if (blob) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64data = (reader.result as string).split(',')[1];
                            resolve({ base64: base64data, mimeType: blob.type });
                        };
                        reader.readAsDataURL(blob);
                    } else {
                        reject('Could not create blob from canvas.');
                    }
                }, 'image/jpeg', 0.9);
            } else {
                 reject('Could not get canvas context.');
            }
        } else {
             reject('Video element not found.');
        }
    });
  };

  const handleAnalyze = async () => {
    if (!prompt.trim() || !file) {
      setError('Please upload content and enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      let base64Data: string;
      let mimeType: string;

      if (file.type.startsWith('video/')) {
        const frameData = await captureFrame();
        base64Data = frameData.base64;
        mimeType = frameData.mimeType;
      } else {
        base64Data = await fileToBase64(file);
        mimeType = getMimeType(file);
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const modelToUse = file.type.startsWith('video/') ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: prompt },
          ],
        },
      });

      setAnalysis(response.text);
    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found")) {
        setError("API Key error. Please check your API key setup.");
      } else {
        setError('Failed to analyze content. Please try again.');
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">Content Analyzer (Image/Video Frame)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg">1. Upload Content</h3>
            <div className="w-full h-64 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-500">
              {filePreview ? (
                file?.type.startsWith('video/') ? (
                    <video ref={videoRef} src={filePreview} className="max-h-full max-w-full object-contain" controls />
                ) : (
                    <img src={filePreview} alt="Content preview" className="max-h-full max-w-full object-contain rounded-md" />
                )
              ) : (
                <p className="text-gray-400">Content preview</p>
              )}
            </div>
             <p className="text-xs text-gray-400">For videos, the first frame will be analyzed using Gemini 2.5 Pro.</p>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 text-gray-400"
            />
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg">2. What do you want to know?</h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Describe this scene' or 'Are there any people in this video frame?'"
              className="w-full bg-gray-700 text-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-600 h-24 resize-none"
              disabled={isLoading || !file}
            />
            <Button onClick={handleAnalyze} isLoading={isLoading} disabled={!file || !prompt}>
              Analyze
            </Button>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
        </div>
        <div className="mt-4">
            <h3 className="font-semibold text-lg mb-2">3. Analysis Result</h3>
            <div className="w-full min-h-[12rem] bg-gray-900 rounded-lg p-4 border border-gray-700 whitespace-pre-wrap">
                {isLoading ? (
                    <div className="text-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto"></div>
                        <p className="mt-4 text-gray-400">Analyzing your content...</p>
                    </div>
                ) : analysis ? (
                    <p className="text-gray-300">{analysis}</p>
                ) : (
                    <p className="text-gray-500">The analysis will appear here.</p>
                )}
            </div>
        </div>
      </div>
    </Card>
  );
};

export default ContentAnalyzer;
