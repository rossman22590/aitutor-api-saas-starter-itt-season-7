// components/chat/FileHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { FileIcon, Loader2, Trash2, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FileHistoryProps {
  onSelectFile: (file: { id: string; name: string; fileId: string }) => void;
}

interface FileItem {
  id: string;
  fileName: string;
  fileId: string;
  createdAt: string;
}

export function FileHistory({ onSelectFile }: FileHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fileHistory, setFileHistory] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFileHistory();
    }
  }, [isOpen]);

  const fetchFileHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const data = await response.json();
        setFileHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch file history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFile = (file: FileItem) => {
    onSelectFile({
      id: file.id,
      name: file.fileName,
      fileId: file.fileId
    });
    setIsOpen(false);
  };

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchFileHistory();
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 bg-white/50 hover:bg-white/80"
        >
          <FileIcon className="h-4 w-4" />
          File History
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>File History</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : fileHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No files found</p>
          ) : (
            <div className="space-y-4">
              {fileHistory.map((file) => (
                <div 
                  key={file.id} 
                  className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleSelectFile(file)}
                >
                  <div className="flex items-start gap-3">
                    <Copy className="h-5 w-5 text-red-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{file.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => handleDeleteFile(file.id, e)}
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
