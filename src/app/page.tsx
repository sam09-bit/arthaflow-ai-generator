'use client';

import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import UploadDropzone from '@/components/documents/UploadDropzone';
import VerificationForm from '@/components/documents/VerificationForm';
import SuccessVault from '@/components/documents/SuccessVault';

export type DocType = 'proforma' | 'packing_list' | 'hs_code';

export default function DocumentGeneratorPage() {
  const [step, setStep] = useState<'UPLOAD' | 'PROCESSING' | 'VERIFY' | 'SUCCESS'>('UPLOAD');
  const [docType, setDocType] = useState<DocType>('proforma');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

  const handleFileUpload = async (fileUrl: string) => {
    setUploadedImage(fileUrl);
    setStep('PROCESSING');
    
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const apiRes = await fetch('/api/documents/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64data, docType })
        });

        if (!apiRes.ok) throw new Error('API request failed');

        const extractedJson = await apiRes.json();
        setExtractedData(extractedJson);
        setStep('VERIFY');
      };
    } catch (error) {
      console.error("Extraction failed:", error);
      alert("Failed to extract data.");
      setStep('UPLOAD');
    }
  };

  const handleReset = () => {
    setStep('UPLOAD');
    setUploadedImage(null);
    setExtractedData(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans p-6 md:p-12 flex flex-col items-center">
      <div className="max-w-3xl w-full mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
          <FileText className="text-blue-600 h-8 w-8" />
          ArthaFlow AI Generator
        </h1>
        <p className="text-zinc-500 mt-2">Upload rough spec sheets or photos to generate customs documents.</p>
      </div>

      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden min-h-100">
        {step === 'UPLOAD' && (
          <div className="p-8 pb-0">
            <div className="flex flex-wrap justify-center gap-2 p-1 bg-zinc-100 rounded-xl mb-4 w-fit mx-auto border border-zinc-200">
              <button onClick={() => setDocType('proforma')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${docType === 'proforma' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>
                Proforma Invoice
              </button>
              <button onClick={() => setDocType('packing_list')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${docType === 'packing_list' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>
                Packing List
              </button>
              <button onClick={() => setDocType('hs_code')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${docType === 'hs_code' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>
                HS Code Finder
              </button>
            </div>
            <UploadDropzone onUpload={handleFileUpload} />
          </div>
        )}

        {step === 'PROCESSING' && (
          <div className="p-12 flex flex-col items-center justify-center text-center animate-in fade-in h-full min-h-100">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <h3 className="text-xl font-semibold mb-2">Vision AI is reading...</h3>
            <p className="text-zinc-500 text-sm">
              {docType === 'hs_code' ? 'Analyzing product image for HS Classification...' : `Extracting ${docType === 'proforma' ? 'Invoice' : 'Packing'} details.`}
            </p>
          </div>
        )}

        {step === 'VERIFY' && (
          <VerificationForm data={extractedData} image={uploadedImage} docType={docType} onConfirm={() => setStep('SUCCESS')} />
        )}

        {step === 'SUCCESS' && (
          <SuccessVault onReset={handleReset} data={extractedData} docType={docType} />
        )}
      </div>
    </div>
  );
}