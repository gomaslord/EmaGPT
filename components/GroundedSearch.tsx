
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import Card from './ui/Card';
import Button from './ui/Button';

type SearchMode = 'web' | 'maps';

const GroundedSearch: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<SearchMode>('web');
  const [result, setResult] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (mode === 'maps' && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          setError('Could not get location. Please allow location access for Maps search.');
        }
      );
    }
  }, [mode, userLocation]);

  const handleSearch = async () => {
    if (!prompt.trim()) {
      setError('Please enter a query.');
      return;
    }
    if (mode === 'maps' && !userLocation) {
        setError('Location is required for Maps search. Please enable location services.');
        return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSources([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const config: any = {
        tools: mode === 'web' ? [{ googleSearch: {} }] : [{ googleMaps: {} }],
      };
      if (mode === 'maps' && userLocation) {
        config.toolConfig = { retrievalConfig: { latLng: userLocation } };
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: config,
      });

      setResult(response.text);
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          setSources(response.candidates[0].groundingMetadata.groundingChunks);
      }

    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found")) {
        setError("API Key error. Please check your API key setup.");
      } else {
        setError('Failed to get search results. Please try again.');
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">Grounded Search</h2>
        <div className="flex items-center gap-2 bg-gray-700 p-1 rounded-lg">
          <Button onClick={() => setMode('web')} className={`w-full ${mode === 'web' ? 'bg-indigo-600' : 'bg-transparent hover:bg-gray-600'}`}>Web Search</Button>
          <Button onClick={() => setMode('maps')} className={`w-full ${mode === 'maps' ? 'bg-indigo-600' : 'bg-transparent hover:bg-gray-600'}`}>Maps Search</Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
           <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={mode === 'web' ? "e.g., 'Latest news on AI development'" : "e.g., 'Best coffee shops near me'"}
            className="flex-grow bg-gray-700 text-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-600"
            disabled={isLoading}
            />
            <Button onClick={handleSearch} isLoading={isLoading}>
                Search
            </Button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
         <div className="mt-4 p-4 bg-gray-900 rounded-lg min-h-[20rem] border border-gray-700">
            {isLoading ? (
                <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto"></div>
                    <p className="mt-4 text-gray-400">Searching for answers...</p>
                </div>
            ) : result ? (
                <div>
                    <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">{result}</div>
                    {sources.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-gray-400 mb-2">Sources:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                {sources.map((source, index) => {
                                    const sourceInfo = source.web || source.maps;
                                    if(!sourceInfo) return null;
                                    return (
                                        <li key={index}>
                                            <a href={sourceInfo.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline text-sm">
                                                {sourceInfo.title || sourceInfo.uri}
                                            </a>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-gray-500">Search results will appear here.</p>
            )}
        </div>
      </div>
    </Card>
  );
};

export default GroundedSearch;
