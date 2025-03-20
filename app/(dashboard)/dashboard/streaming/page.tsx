// app/(dashboard)/dashboard/streaming/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, History as HistoryIcon, FileIcon, Trash2, Loader2 } from 'lucide-react';
import ChatInterface from '@/components/chat/ChatInterface';
import { FileHistory } from '@/components/chat/FileHistory';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDistanceToNow } from 'date-fns';

export default function StreamingPage() {
  const [activeChat, setActiveChat] = useState<{ id: string; title: string } | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string; fileId: string } | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Fetch chat history when the history sheet opens
  useEffect(() => {
    if (isHistoryOpen) {
      fetchChatHistory();
    }
  }, [isHistoryOpen]);
  
  const fetchChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/chat/history');
      if (response.ok) {
        const data = await response.json();
        setChatHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  const handleNewChat = async () => {
    try {
      const response = await fetch('/api/chat/new', {
        method: 'POST',
      });
      
      if (response.ok) {
        const newChat = await response.json();
        setActiveChat(newChat);
        setSelectedFile(null); // Clear any selected file when creating a new chat
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };
  
  const handleSelectChat = (chat: { id: string; title: string }) => {
    setActiveChat(chat);
    setIsHistoryOpen(false);
    setSelectedFile(null); // Clear any selected file when switching chats
  };
  
  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Refresh the chat list
        await fetchChatHistory();
        
        // If the active chat was deleted, reset it
        if (activeChat?.id === chatId) {
          setActiveChat(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };
  
  const handleFileSelect = (file: { id: string; name: string; fileId: string }) => {
    setSelectedFile(file);
  };
  
  return (
    <div className="h-full w-full bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 p-4">
      <div className="max-w-5xl mx-auto h-full flex flex-col">
        {/* Header with buttons */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
            AI Assistant
          </h1>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={handleNewChat}
              className="flex items-center gap-2 bg-white/50 hover:bg-white/80"
            >
              <PlusCircle className="h-4 w-4" />
              New Chat
            </Button>
            
            <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <Button 
                variant="outline" 
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-2 bg-white/50 hover:bg-white/80"
              >
                <HistoryIcon className="h-4 w-4" />
                Chat History
              </Button>
              
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Chat History</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  {isLoadingHistory ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    </div>
                  ) : chatHistory.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No chat history found</p>
                  ) : (
                    <div className="space-y-4">
                      {chatHistory.map((chat) => (
                        <div 
                          key={chat.id} 
                          className={`p-4 rounded-lg border ${
                            activeChat?.id === chat.id ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                          } cursor-pointer transition-colors`}
                          onClick={() => handleSelectChat(chat)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 mr-4">
                              <h3 className="font-medium truncate">{chat.title}</h3>
                              <p className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => handleDeleteChat(chat.id, e)}
                              className="h-8 w-8 p-0 text-gray-500 hover:text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            
            <FileHistory onSelectFile={handleFileSelect} />
          </div>
        </div>
        
        {/* Chat interface or welcome screen */}
        <div className="flex-1">
          {activeChat ? (
            <ChatInterface 
              chatId={activeChat.id} 
              attachedFile={selectedFile} 
              onFileSelect={handleFileSelect}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center h-full">
              <div className="text-center max-w-md glass-morphism p-8 rounded-2xl shadow-xl backdrop-blur-lg bg-white/30">
                <h2 className="text-2xl font-bold text-purple-800 mb-4">Welcome to AI Chat</h2>
                <p className="text-gray-600 mb-8">
                  Start a new conversation or continue where you left off. You can also attach PDF files 
                  to chat about their contents.
                </p>
                <Button 
                  onClick={handleNewChat}
                  className="px-6 py-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg"
                >
                  Start New Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
