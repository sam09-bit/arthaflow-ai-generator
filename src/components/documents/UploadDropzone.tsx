'use client';

import React, { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Image as ImageIcon, Camera } from 'lucide-react';

interface UploadDropzoneProps {
  onUpload: (fileUrl: string) => void;
}

export default function UploadDropzone({ onUpload }: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onUpload(url);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: false
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onUpload(url);
    }
  };

  return (
    <div className="p-8">
      <div 
        {...getRootProps({
          onClick: (e) => e.stopPropagation()
        })}
        className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all duration-200 ease-in-out cursor-pointer ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' 
            : 'border-zinc-300 hover:border-blue-400 hover:bg-zinc-50'
        }`}
      >
        <input {...getInputProps()} />

        <div className="bg-white p-4 rounded-full shadow-sm mb-4 border border-zinc-100">
          <UploadCloud className={`h-10 w-10 transition-colors ${isDragActive ? 'text-blue-600' : 'text-zinc-400'}`} />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">
          {isDragActive ? "Drop document here..." : "Drag & Drop Document Image"}
        </h3>
        
        <p className="text-zinc-500 text-sm mb-8 text-center max-w-sm leading-relaxed">
          Supports JPG, PNG, or rough mobile photos of invoices, packing lists, and spec sheets.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
          >
            <ImageIcon className="h-5 w-5" />
            Browse Files
          </button>
          
          <button 
            type="button" 
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-6 py-3 rounded-xl font-medium transition-colors border border-zinc-200"
          >
            <Camera className="h-5 w-5" />
            Take Photo
          </button>
        </div>

        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileSelect}
        />
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          className="hidden" 
          ref={cameraInputRef} 
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}