'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface VerificationFormProps {
  data: any;
  image: string | null;
  docType: 'proforma' | 'packing_list' | 'hs_code';
  onConfirm: () => void;
}

export default function VerificationForm({ data, image, docType, onConfirm }: VerificationFormProps) {
  const [formData, setFormData] = useState(data);

  const handleInputChange = (key: string, newValue: string | number) => {
    setFormData({
      ...formData,
      [key]: { ...formData[key], value: newValue }
    });
  };

  const getDocBadgeName = () => {
    if (docType === 'hs_code') return 'HS Classification';
    if (docType === 'packing_list') return 'Packing List';
    return 'Proforma Invoice';
  };

  return (
    <div className="flex flex-col md:flex-row h-full animate-in slide-in-from-right-8 duration-500">
      
      <div className="w-full md:w-1/3 bg-zinc-100 p-6 border-r border-zinc-200 flex flex-col">
        <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Source Image</h4>
        <div className="flex-1 rounded-lg overflow-hidden border border-zinc-300 bg-white min-h-[300px]">
          {image ? (
            <img src={image} alt="Source" className="w-full h-full object-contain bg-zinc-50" />
          ) : (
            <div className="w-full h-full bg-zinc-200 flex items-center justify-center text-zinc-400 text-sm">
              No Image
            </div>
          )}
        </div>
      </div>

      <div className="w-full md:w-2/3 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Verify Extracted Data</h2>
            <p className="text-zinc-500 text-sm mt-1">Review the AI output before PDF generation.</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 shadow-sm">
            {getDocBadgeName()}
          </span>
        </div>

        <div className="space-y-5">
          {docType === 'hs_code' ? (
            <>
              <VerificationField label="Detected Product Name" dataKey="product_name" fieldData={formData.product_name} onChange={handleInputChange} />
              <div className="grid grid-cols-2 gap-4">
                <VerificationField label="8-Digit HS Code" dataKey="hs_code" fieldData={formData.hs_code} onChange={handleInputChange} />
              </div>
              <VerificationField label="Chapter Description" dataKey="chapter_description" fieldData={formData.chapter_description} onChange={handleInputChange} isTextArea />
              <VerificationField label="AI Rationale" dataKey="rationale" fieldData={formData.rationale} onChange={handleInputChange} isTextArea />
            </>
          ) : (
            <>
              <VerificationField label="Buyer Name" dataKey="buyer_name" fieldData={formData.buyer_name} onChange={handleInputChange} />
              <div className="grid grid-cols-2 gap-4">
                <VerificationField label="Document Number" dataKey="invoice_number" fieldData={formData.invoice_number} onChange={handleInputChange} />
                <VerificationField label="Date" dataKey="date" type="date" fieldData={formData.date} onChange={handleInputChange} />
              </div>
              
              {docType === 'proforma' ? (
                <div className="grid grid-cols-2 gap-4">
                  <VerificationField label="HS Code" dataKey="hs_code" fieldData={formData.hs_code} onChange={handleInputChange} />
                  <VerificationField label="Total Value (USD)" dataKey="total_value_usd" type="number" fieldData={formData.total_value_usd} onChange={handleInputChange} />
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <VerificationField label="Total Pkgs" dataKey="total_packages" type="number" fieldData={formData.total_packages} onChange={handleInputChange} />
                  <VerificationField label="Net Wt (KG)" dataKey="net_weight_kg" type="number" fieldData={formData.net_weight_kg} onChange={handleInputChange} />
                  <VerificationField label="Gross Wt (KG)" dataKey="gross_weight_kg" type="number" fieldData={formData.gross_weight_kg} onChange={handleInputChange} />
                  <VerificationField label="Volume (CBM)" dataKey="volume_cbm" type="number" fieldData={formData.volume_cbm} onChange={handleInputChange} />
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-end">
          <button 
            onClick={onConfirm} 
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm"
          >
            Confirm & Generate PDF
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function VerificationField({ label, dataKey, fieldData, type = "text", isTextArea = false, onChange }: any) {
  const safeFieldData = fieldData || { value: '', confidence: 1.0 };
  const isHighConfidence = safeFieldData.confidence >= 0.85;
  
  const baseInputClasses = "w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all";
  const confidenceClasses = isHighConfidence 
    ? "border-green-200 bg-green-50/30 focus:border-green-500" 
    : "border-amber-300 bg-amber-50 focus:border-amber-500";
    
  const combinedClasses = `${baseInputClasses} ${confidenceClasses}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700 flex items-center justify-between">
        {label}
        {isHighConfidence ? (
          <span className="text-xs text-green-600 flex items-center gap-1 font-semibold">
            <CheckCircle className="h-3 w-3"/> High
          </span>
        ) : (
          <span className="text-xs text-amber-600 flex items-center gap-1 font-semibold">
            <AlertTriangle className="h-3 w-3"/> Review
          </span>
        )}
      </label>
      {isTextArea ? (
        <textarea rows={3} value={safeFieldData.value} onChange={(e) => onChange(dataKey, e.target.value)} className={combinedClasses} />
      ) : (
        <input type={type} value={safeFieldData.value} onChange={(e) => onChange(dataKey, e.target.value)} className={combinedClasses} />
      )}
    </div>
  );
}