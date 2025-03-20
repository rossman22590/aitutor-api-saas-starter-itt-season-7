// components/chat/ChatHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { HistoryIcon, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatHistoryProps {
  onSelectChat: (chat: { id: string; title: string }) => void;
  activeChat: { id: string; title: string } | null;
}

interface ChatItem {
  id: string;
  title: string;
  updatedAt: string;
}

export function ChatHistory({ onSelectChat, activeChat }: ChatHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchChatHistory();
    }
  }, [isOpen]);

  const fetchChatHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/history');
      if (response.ok) {
        const data = await response.json();
        setChatHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChat = (chat: ChatItem) => {
    onSelectChat(chat);
    setIsOpen(false);
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchChatHistory();
        // If the active chat was deleted, inform the parent component
        if (activeChat?.id === chatId) {
          onSelectChat(null as any);
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 bg-white/50 hover:bg-white/80"
        >
          <HistoryIcon className="h-4 w-4" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Chat History</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {isLoading ? (
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
  );
}
