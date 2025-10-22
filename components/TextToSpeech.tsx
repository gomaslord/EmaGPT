
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData } from '../utils/helpers';
import Card from './ui/Card';
import Button from './ui/Button';
import { Speech } from './icons/Icons';

const TextToSpeech: React.FC = () => {
  const [text, setText] = useState('Hello! I am EmaGPT, a helpful AI assistant. Have a wonderful day!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleSynthesize = async () => {
    if (!text.trim()) {
      setError('Please enter some text to synthesize.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio && audioContextRef.current) {
        const audioBuffer = await decodeAudioData(
          decode(base64Audio),
          audioContextRef.current,
          24000,
          1
        );
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
      } else {
        throw new Error('No audio data received.');
      }

    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found")) {
        setError("API Key error or model access issue. Please check your API key and that you have access to the TTS model.");
      } else {
        setError('Failed to synthesize speech. Please try again.');
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">Text-to-Speech</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          className="w-full bg-gray-700 text-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-600 h-32 resize-y"
          disabled={isLoading}
        />
        <Button onClick={handleSynthesize} isLoading={isLoading} className="self-start">
          Synthesize & Play
        </Button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="mt-4 p-8 bg-gray-900 rounded-lg flex items-center justify-center border border-gray-700">
            <div className="text-center text-gray-500">
                <Speech className="w-16 h-16 mx-auto mb-4" />
                <p>Press the button to hear the synthesized audio.</p>
            </div>
        </div>
      </div>
    </Card>
  );
};

export default TextToSpeech;
