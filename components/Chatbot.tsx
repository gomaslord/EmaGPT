
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { ChatMessage } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { Bot, Send, PlusSquare } from './icons/Icons';

const Chatbot: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initializeChat = () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const newChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: 'You are EmaGPT, a helpful and creative AI assistant. Keep your responses concise and friendly.',
        },
      });
      setChat(newChat);
      setMessages([{ role: 'model', text: 'Hello! How can I help you today?' }]);
      setError(null);
      setInput('');
    } catch (e: any) {
      setError('Failed to initialize the AI. Please check your API key.');
      console.error(e);
    }
  };

  useEffect(() => {
    initializeChat();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  const handleNewChat = () => {
    initializeChat();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chat) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const result = await chat.sendMessage({ message: input });
      const modelMessage: ChatMessage = { role: 'model', text: result.text };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (e: any) {
      if (e.message?.includes("Requested entity was not found")) {
        setError('API Key error. Please check your API key setup.');
      } else {
        setError('An error occurred while getting a response.');
      }
      console.error(e);
      setMessages((prev) => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="h-[calc(100vh-10rem)] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bot className="w-6 h-6 text-indigo-400" />
                <span>EmaGPT Chat</span>
            </h2>
            <Button onClick={handleNewChat} variant="secondary" className="px-2 py-2 sm:px-3">
                <PlusSquare className="w-4 h-4" />
                <span className="ml-2 hidden sm:inline">New Chat</span>
            </Button>
        </div>
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                           <Bot className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div className={`px-4 py-2 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    </div>
                </div>
            ))}
             <div ref={messagesEndRef} />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700">
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-grow bg-gray-700 text-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-600"
                    disabled={isLoading}
                />
                <Button type="submit" isLoading={isLoading} disabled={!input.trim()}>
                    <Send className="w-5 h-5" />
                    <span className="sr-only">Send</span>
                </Button>
            </form>
        </div>
    </Card>
  );
};

export default Chatbot;
