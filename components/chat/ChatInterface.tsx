// components/chat/ChatInterface.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { SendIcon, Loader2, User2, Bot, Paperclip, X, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  chatId: string;
  attachedFile?: { id: string; name: string; fileId: string } | null;
  onFileSelect?: (file: { id: string; name: string; fileId: string }) => void;
}

export default function ChatInterface({ 
  chatId, 
  attachedFile = null,
  onFileSelect
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/chat/${chatId}/messages`);
        if (response.ok) {
          const data = await response.json();
          setInitialMessages(data.map((msg: any) => ({
            id: msg.id.toString(),
            content: msg.content,
            role: msg.role,
          })));
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (chatId) {
      fetchMessages();
    }
  }, [chatId]);
  
  const { messages, input, handleInputChange, handleSubmit: originalHandleSubmit, isLoading: isChatLoading } = useChat({
    api: `/api/chat/${chatId}/message`,
    initialMessages,
    onFinish: () => {
      scrollToBottom();
    },
    body: attachedFile ? { fileId: attachedFile.fileId } : undefined,
  });
  
  // Custom submit handler to ensure fileId is included in the request
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    originalHandleSubmit(e);
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Format message content to properly render markdown
  const formatMessageContent = (content: string) => {
    if (!content) return '';
    
    // Handle escaped newlines and other common formatting issues
    return content
      .replace(/\\n\\n/g, '\n\n')  // Replace escaped newlines
      .replace(/\\n/g, '\n')       // Replace single escaped newlines
      .replace(/\\\*\\\*/g, '**')  // Replace escaped bold markers
      .replace(/\\\*/g, '*');      // Replace escaped italic markers
  };
  
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type - only PDF
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are supported');
      return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit');
      return;
    }
    
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        const fileData = {
          id: data.id,
          name: data.fileName,
          fileId: data.fileId,
        };
        
        if (onFileSelect) {
          onFileSelect(fileData);
        }
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const removeAttachedFile = () => {
    if (onFileSelect) {
      onFileSelect(null as any);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[87vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }
  
  return (
    // Fixed height container
    <div className="h-[87vh] relative bg-white/10 rounded-lg backdrop-blur-sm shadow-md">
      {/* Scrollable messages area with bottom padding to prevent content being hidden behind input */}
      <div className="absolute top-0 left-0 right-0 bottom-[76px] overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            } mb-4`}
          >
            <div
              className={cn(
                "flex items-start space-x-3 max-w-[80%] rounded-lg p-4 shadow-sm",
                message.role === 'user'
                  ? 'bg-purple-100 text-gray-800'
                  : 'bg-white/50 text-gray-800'
              )}
            >
              {message.role !== 'user' && (
                <Bot className="h-5 w-5 mt-1 text-purple-600 flex-shrink-0" />
              )}
              <div className={cn(
                message.role === 'user' ? 'order-first mr-3' : '',
                "flex-1"
              )}>
                <p className="font-medium text-sm mb-1">
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                </p>
                <div className="text-sm prose prose-sm max-w-none">
                  {message.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  ) : (
                    <div className="whitespace-pre-wrap markdown-body">
                      <ReactMarkdown>
                        {formatMessageContent(message.content)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
              {message.role === 'user' && (
                <User2 className="h-5 w-5 mt-1 text-gray-600 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area - fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/50 bg-white/30 backdrop-blur-sm">
        {/* File attachment indicator */}
        {attachedFile && (
          <div className="mb-2 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Copy className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-blue-700 truncate max-w-[200px]">
                {attachedFile.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeAttachedFile}
              className="h-6 w-6 p-0 rounded-full text-blue-700 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <form 
          onSubmit={handleSubmit} 
          className="flex items-center gap-2"
        >
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf"
            onChange={handleFileUpload}
          />
          
          {/* File upload button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/50 hover:bg-white/70"
            onClick={handleFileButtonClick}
            disabled={isChatLoading || isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
            ) : (
              <Paperclip className="h-5 w-5 text-gray-600" />
            )}
          </Button>
          
          <input
            className="flex-1 p-3 rounded-full bg-white/70 border border-purple-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-inner"
            value={input}
            onChange={handleInputChange}
            placeholder={attachedFile ? `Ask about ${attachedFile.name}...` : "Type your message..."}
            disabled={isChatLoading}
          />
          
          <Button 
            type="submit" 
            disabled={isChatLoading || !input.trim()}
            size="icon"
            className="rounded-full w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 p-0 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isChatLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
