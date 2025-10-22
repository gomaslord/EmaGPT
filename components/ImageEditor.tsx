
import React, { useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { fileToBase64, getMimeType } from '../utils/helpers';
import Card from './ui/Card';
import Button from './ui/Button';

const ImageEditor: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [originalImage, setOriginalImage] = useState<{ file: File, url: string } | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalImage({ file, url: URL.createObjectURL(file) });
      setEditedImage(null);
    }
  };

  const handleEdit = async () => {
    if (!prompt.trim() || !originalImage) {
      setError('Please upload an image and enter an editing prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    try {
      const base64Data = await fileToBase64(originalImage.file);
      const mimeType = getMimeType(originalImage.file);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: prompt },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      const firstPart = response.candidates?.[0]?.content?.parts?.[0];
      if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
        const base64ImageBytes: string = firstPart.inlineData.data;
        const imageUrl = `data:${firstPart.inlineData.mimeType};base64,${base64ImageBytes}`;
        setEditedImage(imageUrl);
      } else {
        throw new Error("No image data returned from API.");
      }
    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found")) {
        setError("API Key error. Please check your API key setup.");
      } else {
        setError('Failed to edit image. Please try again.');
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">Image Editor (Gemini 2.5 Flash)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg">1. Upload Image</h3>
            <div className="w-full h-64 bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-500">
              {originalImage ? (
                <img src={originalImage.url} alt="Original" className="max-h-full max-w-full object-contain rounded-md" />
              ) : (
                <p className="text-gray-400">Image preview</p>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 text-gray-400"
            />
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg">2. Describe Your Edit</h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Add a retro filter' or 'Remove the person in the background'"
              className="w-full bg-gray-700 text-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-600 h-24 resize-none"
              disabled={isLoading || !originalImage}
            />
            <Button onClick={handleEdit} isLoading={isLoading} disabled={!originalImage || !prompt}>
              Apply Edit
            </Button>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
        </div>
        <div className="mt-4">
            <h3 className="font-semibold text-lg mb-2">3. Result</h3>
            <div className="w-full min-h-[20rem] bg-gray-900 rounded-lg flex items-center justify-center border border-gray-700">
                {isLoading ? (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto"></div>
                        <p className="mt-4 text-gray-400">Applying your edits...</p>
                    </div>
                ) : editedImage ? (
                    <img src={editedImage} alt="Edited" className="max-w-full max-h-[60vh] rounded-md shadow-lg" />
                ) : (
                    <p className="text-gray-500">Your edited image will appear here.</p>
                )}
            </div>
        </div>
      </div>
    </Card>
  );
};

export default ImageEditor;
