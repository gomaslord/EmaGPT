
import React, { useState, useRef, useEffect, useCallback } from 'react';
// FIX: Removed LiveSession as it is not an exported member of '@google/genai'.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/helpers';
import Card from './ui/Card';
import Button from './ui/Button';

// FIX: Defined LiveSession interface locally to maintain type safety.
interface LiveSession {
  close: () => void;
  sendRealtimeInput: (input: { media: Blob }) => void;
}

// Define a type for the session promise to handle it correctly
type SessionPromise = Promise<LiveSession>;

const LiveConversation: React.FC = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ user: string; model: string }[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState<{ user: string; model: string }>({ user: '', model: '' });
  const [error, setError] = useState<string | null>(null);
  
  const sessionPromiseRef = useRef<SessionPromise | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  
  const stopSession = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    setIsSessionActive(false);
  }, []);

  const startSession = async () => {
    setError(null);
    setIsSessionActive(true);
    setTranscriptions([]);
    setCurrentTranscription({ user: '', model: '' });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Session opened');
            if (!mediaStreamRef.current) return;
            
            inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

            const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              // FIX: Replaced .map with a for-loop for performance and to align with documentation examples for audio processing.
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setCurrentTranscription(prev => ({ ...prev, user: prev.user + text }));
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setCurrentTranscription(prev => ({ ...prev, model: prev.model + text }));
            }
            if(message.serverContent?.turnComplete) {
                setTranscriptions(prev => [...prev, currentTranscription]);
                setCurrentTranscription({ user: '', model: '' });
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const outputCtx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError(`Session error: ${e.message}. Please try again.`);
            stopSession();
          },
          onclose: (e: CloseEvent) => {
            console.log('Session closed');
            setIsSessionActive(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are a helpful and friendly conversational AI.',
        },
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error('Failed to start session:', err);
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key error or model access issue. Please check your API key and that you have access to the Live API model.");
      } else {
        setError('Could not access microphone or start session. Please check permissions.');
      }
      setIsSessionActive(false);
    }
  };

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      stopSession();
    };
  }, [stopSession]);
  
  return (
    <Card>
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">Live Conversation</h2>
        <div className="flex justify-center">
            <Button 
                onClick={isSessionActive ? stopSession : startSession}
                className="w-48"
                variant={isSessionActive ? 'danger' : 'primary'}
            >
                {isSessionActive ? 'Stop Session' : 'Start Session'}
            </Button>
        </div>
        {error && <p className="text-red-400 text-center">{error}</p>}
        <div className="mt-4 p-4 bg-gray-900 rounded-lg min-h-[40vh] border border-gray-700">
            <div className="space-y-4">
                {transcriptions.map((t, i) => (
                    <div key={i}>
                        <p><strong className="text-blue-400">You:</strong> {t.user}</p>
                        <p><strong className="text-indigo-400">EmaGPT:</strong> {t.model}</p>
                    </div>
                ))}
                {isSessionActive && (
                    <div>
                        <p><strong className="text-blue-400">You:</strong> {currentTranscription.user}<span className="animate-pulse">...</span></p>
                        <p><strong className="text-indigo-400">EmaGPT:</strong> {currentTranscription.model}<span className="animate-pulse">...</span></p>
                    </div>
                )}
                {!isSessionActive && transcriptions.length === 0 && (
                    <p className="text-gray-500 text-center pt-8">Press "Start Session" to begin a conversation.</p>
                )}
            </div>
        </div>
      </div>
    </Card>
  );
};

export default LiveConversation;
