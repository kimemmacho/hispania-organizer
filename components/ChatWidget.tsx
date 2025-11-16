
import React, { useState, useRef, useEffect, useCallback } from 'react';
// Fix: Added missing type definitions for ChatWidget.
import { ChatMessage, GroundingChunk } from '../types';
// Fix: Added missing getGroundedChatResponse function for ChatWidget.
import { getGroundedChatResponse } from '../services/geminiService';
// Fix: Added missing icons and removed unused ones.
import { ChatBubbleIcon, CloseIcon, SendIcon, LoadingSpinner } from './icons';

interface ChatWidgetProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, setIsOpen }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: '¡Hola! Soy HispanIA-Chat. ¿En qué puedo ayudarte hoy sobre AFK Arena?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useProModel, setUseProModel] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);
    
    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const newUserMessage: ChatMessage = { role: 'user', text: input.trim() };
        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setIsLoading(true);

        const history = messages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }],
        }));

        try {
            const { text, references } = await getGroundedChatResponse(history, newUserMessage.text, useProModel);
            const newModelMessage: ChatMessage = { role: 'model', text: text, references: references };
            setMessages(prev => [...prev, newModelMessage]);
        } catch (e) {
            const errorMessage: ChatMessage = { role: 'model', text: 'Hubo un problema de conexión. Inténtalo de nuevo.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }

    }, [input, isLoading, messages, useProModel]);
    
    const renderMessage = (msg: ChatMessage, index: number) => {
        const isUser = msg.role === 'user';
        return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
                <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${isUser ? 'bg-red-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    {msg.references && msg.references.length > 0 && (
                        <div className="mt-2 border-t border-gray-600 pt-2">
                            <h4 className="text-xs font-bold text-gray-400 mb-1">Fuentes:</h4>
                            <ul className="list-disc list-inside">
                                {msg.references.map((ref, i) => ref.web && (
                                    <li key={i} className="text-xs truncate">
                                        <a href={ref.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                            {ref.web.title || ref.web.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-5 right-5 bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 z-50"
                aria-label="Abrir chat de IA"
            >
                <ChatBubbleIcon className="h-8 w-8" />
            </button>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl h-full max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">HispanIA-Chat</h3>
                    <div className="flex items-center space-x-4">
                        <label htmlFor="pro-mode-toggle" className="flex items-center cursor-pointer">
                            <span className="mr-2 text-sm text-gray-300">Modo Avanzado</span>
                            <div className="relative">
                                <input type="checkbox" id="pro-mode-toggle" className="sr-only" checked={useProModel} onChange={() => setUseProModel(!useProModel)} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${useProModel ? 'bg-red-600' : 'bg-gray-600'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useProModel ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                        </label>
                         <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                            <CloseIcon className="h-6 w-6" />
                        </button>
                    </div>
                </header>
                <div className="flex-1 p-4 overflow-y-auto">
                    {messages.map(renderMessage)}
                    {isLoading && (
                       <div className="flex justify-start mb-4">
                           <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none flex items-center">
                               <LoadingSpinner className="h-5 w-5 mr-2" />
                               <span>Pensando...</span>
                           </div>
                       </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t border-gray-700">
                    <div className="flex items-center bg-gray-700 rounded-full px-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Pregunta sobre AFK Arena..."
                            className="flex-1 bg-transparent p-3 text-white placeholder-gray-400 focus:outline-none resize-none"
                            rows={1}
                        />
                        <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2 text-white disabled:text-gray-500 hover:text-red-500 transition-colors">
                            <SendIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatWidget;
