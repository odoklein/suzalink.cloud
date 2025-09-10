import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Paperclip, X, FileText, ImageIcon, File } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  conversationId: string;
  onFileUploaded: (attachment: any) => void;
  disabled?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  id: string;
}

export const FileUpload = React.memo(function FileUpload({
  conversationId,
  onFileUploaded,
  disabled = false
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = async (file: File) => {
    const uploadId = Math.random().toString(36).substring(7);
    
    // Add to uploading files
    setUploadingFiles(prev => [...prev, {
      file,
      progress: 0,
      id: uploadId
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);

      const response = await fetch('/api/messagerie/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      
      // Update progress to 100%
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? { ...f, progress: 100 } : f)
      );

      // Remove from uploading files after a delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
      }, 1000);

      onFileUploaded(result.attachment);
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      
      // Remove failed upload
      setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
    }
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      uploadFile(file);
    });
  }, [conversationId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleButtonClick}
        disabled={disabled}
        className="relative"
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.mp4,.webm,.mp3,.wav"
      />

      {/* Uploading Files Overlay */}
      {uploadingFiles.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
          <div className="space-y-2">
            {uploadingFiles.map((uploadingFile) => (
              <div key={uploadingFile.id} className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  {getFileIcon(uploadingFile.file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadingFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(uploadingFile.file.size)}
                  </p>
                  <Progress value={uploadingFile.progress} className="h-1 mt-1" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadingFile(uploadingFile.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drag and Drop Overlay */}
      {isDragOver && (
        <div
          className="fixed inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center z-50"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="bg-white rounded-lg p-8 text-center shadow-lg">
            <Paperclip className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <p className="text-lg font-medium text-gray-900">Drop files here to upload</p>
            <p className="text-sm text-gray-500">Images, documents, videos, and audio files</p>
          </div>
        </div>
      )}
    </div>
  );
});
