
import React, { useState } from 'react';
import Chatbot from './components/Chatbot';
import ImageGenerator from './components/ImageGenerator';
import ImageEditor from './components/ImageEditor';
import ContentAnalyzer from './components/ContentAnalyzer';
import VideoGenerator from './components/VideoGenerator';
import LiveConversation from './components/LiveConversation';
import GroundedSearch from './components/GroundedSearch';
import CreativeStudio from './components/CreativeStudio';
import TextToSpeech from './components/TextToSpeech';
import NanoBanana from './components/NanoBanana';
import { Bot, Clapperboard, Compass, Edit3, Image, Mic, Sparkles, Speech, FileVideo, Rabbit } from './components/icons/Icons';

type Feature = 
  | 'Chatbot' 
  | 'Image Generation'
  | 'Nano Banana'
  | 'Image Editor' 
  | 'Content Analyzer' 
  | 'Video Generation' 
  | 'Live Conversation'
  | 'Grounded Search'
  | 'Creative Studio'
  | 'Text to Speech';

const features: { name: Feature, icon: React.ComponentType<{ className?: string }> }[] = [
  { name: 'Chatbot', icon: Bot },
  { name: 'Image Generation', icon: Image },
  { name: 'Nano Banana', icon: Rabbit },
  { name: 'Image Editor', icon: Edit3 },
  { name: 'Content Analyzer', icon: FileVideo },
  { name: 'Video Generation', icon: Clapperboard },
  { name: 'Live Conversation', icon: Mic },
  { name: 'Grounded Search', icon: Compass },
  { name: 'Creative Studio', icon: Sparkles },
  { name: 'Text to Speech', icon: Speech },
];

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<Feature>('Chatbot');

  const renderFeature = () => {
    switch (activeFeature) {
      case 'Chatbot':
        return <Chatbot />;
      case 'Image Generation':
        return <ImageGenerator />;
      case 'Nano Banana':
        return <NanoBanana />;
      case 'Image Editor':
        return <ImageEditor />;
      case 'Content Analyzer':
        return <ContentAnalyzer />;
      case 'Video Generation':
        return <VideoGenerator />;
      case 'Live Conversation':
        return <LiveConversation />;
      case 'Grounded Search':
        return <GroundedSearch />;
      case 'Creative Studio':
        return <CreativeStudio />;
      case 'Text to Speech':
        return <TextToSpeech />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
            EmaGPT
          </h1>
          <nav className="hidden md:flex items-center space-x-1">
            {features.map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => setActiveFeature(name)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${
                  activeFeature === name
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {name}
              </button>
            ))}
          </nav>
        </div>
        <div className="md:hidden p-2">
            <select
                value={activeFeature}
                onChange={(e) => setActiveFeature(e.target.value as Feature)}
                className="w-full bg-gray-700 text-white rounded-md p-2"
            >
                {features.map(({ name }) => (
                    <option key={name} value={name}>{name}</option>
                ))}
            </select>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-6">
        {renderFeature()}
      </main>
       <footer className="text-center p-4 text-xs text-gray-500 border-t border-gray-800">
        Powered by Google Gemini. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
