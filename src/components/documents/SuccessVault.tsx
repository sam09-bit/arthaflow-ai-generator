'use client';

import React, { useRef, useState } from 'react';
import { CheckCircle, Download, HardDrive, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface SuccessVaultProps {
  onReset: () => void;
  data: any;
  docType: 'proforma' | 'packing_list' | 'hs_code';
}

export default function SuccessVault({ onReset, data, docType }: SuccessVaultProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const titleString = 
    docType === 'hs_code' ? 'HS_Classification' : 
    docType === 'proforma' ? 'Proforma_Invoice' : 'Packing_List';
    
  const displayTitle = 
    docType === 'proforma' ? 'PROFORMA INVOICE' : 
    docType === 'packing_list' ? 'PACKING LIST' : 'CLASSIFICATION REPORT';

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);

    try {
      const canvas = await html2canvas(printRef.current, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff' 
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const dynamicName = data?.invoice_number?.value || data?.hs_code?.value || 'Generated';
      pdf.save(`${titleString}_${dynamicName}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF', error);
      alert('There was an issue generating your PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const invoiceNo = data?.invoice_number?.value || 'PENDING';
  const invoiceDate = data?.date?.value || new Date().toISOString().split('T')[0];
  const buyerName = data?.buyer_name?.value || 'TBD';

  return (
    <div className="relative p-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500 overflow-hidden">
      <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      
      <h2 className="text-3xl font-bold mb-2">PDF Generated Successfully!</h2>
      <p className="text-zinc-500 max-w-md mb-8">
        The data has been mapped to a customs-compliant {docType === 'proforma' ? 'Invoice' : docType === 'packing_list' ? 'Packing List' : 'Classification Report'} template.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-12">
        <button 
          onClick={handleDownloadPDF} 
          disabled={isGenerating} 
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-xl font-medium shadow-sm transition-all"
        >
          {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          {isGenerating ? 'Generating...' : 'Download PDF'}
        </button>
        <button className="flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-8 py-3 rounded-xl font-medium border border-zinc-200 transition-all">
          <HardDrive className="h-5 w-5 text-zinc-500" /> View in Vault
        </button>
      </div>

      <button onClick={onReset} className="text-blue-600 font-medium hover:underline text-sm">
        + Scan another document
      </button>

      {/* HIDDEN PDF TEMPLATE */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div ref={printRef} className="w-[794px] min-h-[1123px] bg-[#ffffff] p-10 text-[#000000] font-sans text-sm box-border">
          
          {docType === 'hs_code' ? (
            <div className="border-[2px] border-[#000000] p-8 h-full flex flex-col min-h-[1043px]">
              <div className="text-center mb-12">
                <h1 className="text-3xl font-bold underline tracking-widest mb-2">CUSTOMS CLASSIFICATION REPORT</h1>
                <p className="text-[#666666]">ArthaFlow Global Trade Compliance System</p>
                <p className="text-[#666666] mt-2">Date Generated: {new Date().toLocaleDateString()}</p>
              </div>

              <div className="mb-8">
                <span className="font-bold text-lg border-b border-[#000000] inline-block mb-4">Product Details</span>
                <div className="grid grid-cols-3 gap-4 bg-[#f5f5f5] p-4 border border-[#000000]">
                  <div className="col-span-1 font-bold text-[#666666]">Product Name:</div>
                  <div className="col-span-2 font-bold text-lg break-words">{data?.product_name?.value || 'N/A'}</div>
                </div>
              </div>

              <div className="mb-8">
                <span className="font-bold text-lg border-b border-[#000000] inline-block mb-4">Harmonized System (HS) Classification</span>
                <div className="bg-[#e8f4f8] p-8 border-[2px] border-[#000000] text-center">
                  <div className="text-sm text-[#666666] uppercase tracking-widest mb-2">Official 8-Digit HS Code</div>
                  <div className="text-6xl font-bold tracking-widest">{data?.hs_code?.value || 'N/A'}</div>
                </div>
              </div>

              <div className="mb-8">
                <div className="border-[1px] border-[#000000] p-4">
                  <span className="font-bold text-[#666666] block mb-2">Chapter & Heading Description:</span>
                  <p className="text-base leading-relaxed break-words">{data?.chapter_description?.value || 'N/A'}</p>
                </div>
              </div>

              <div className="flex-1">
                <div className="border-[1px] border-[#000000] p-4 bg-[#fdfdfd] h-full min-h-[150px]">
                  <span className="font-bold text-[#666666] block mb-2">AI Classification Rationale:</span>
                  <p className="italic text-[#333333] break-words">{data?.rationale?.value || 'N/A'}</p>
                </div>
              </div>
              
              <div className="mt-12 text-center text-xs text-[#999999] border-t border-[#cccccc] pt-4">
                Disclaimer: This HS Code is generated by Vision AI based on the provided image and is for reference purposes only. Final classification should be verified with your local customs authority.
              </div>
            </div>
          ) : (
            <>
              <div className="text-center font-bold text-2xl mb-4 underline tracking-widest">{displayTitle}</div>

              <div className="border-[2px] border-[#000000] flex flex-col w-full">
                <div className="flex w-full border-b-[2px] border-[#000000] min-h-[256px]">
                  
                  <div className="w-1/2 border-r-[2px] border-[#000000] flex flex-col">
                    <div className="p-3 border-b-[1px] border-[#000000] flex-1 flex flex-col justify-center break-words">
                      <span className="text-xs text-[#333333] block">Exporter / Shipper:</span>
                      <span className="font-bold text-base block mt-1">ArthaFlow Global Exports Ltd.</span>
                      <span>123 Industrial Phase II,</span>
                      <span>Mumbai, Maharashtra, India 400001</span>
                      <span>VAT/GSTIN: 27AAAAA0000A1Z5</span>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-center break-words">
                      <span className="text-xs text-[#333333] block">Consignee (Billed To):</span>
                      <span className="font-bold text-base block mt-1">{buyerName}</span>
                      <span>Address on File</span>
                      <span>International Destination</span>
                    </div>
                  </div>

                  <div className="w-1/2 flex flex-col">
                    <div className="flex w-full border-b-[1px] border-[#000000] flex-1">
                      <div className="w-1/2 border-r-[1px] border-[#000000] p-3 break-words flex flex-col justify-center">
                        <span className="text-xs text-[#333333] block">Document No. & Date:</span>
                        <span className="font-bold break-all block">{invoiceNo}</span>
                        <span className="font-bold block mt-1">{invoiceDate}</span>
                      </div>
                      <div className="w-1/2 p-3 break-words flex flex-col justify-center">
                        <span className="text-xs text-[#333333] block">Buyer's Order No. & Date:</span>
                        <span>As per Email</span>
                      </div>
                    </div>
                    
                    <div className="p-3 border-b-[1px] border-[#000000] flex-1 break-words flex flex-col justify-center">
                      <span className="text-xs text-[#333333] block">Country of Origin of Goods:</span>
                      <span className="font-bold">INDIA</span>
                    </div>
                    
                    <div className="flex w-full border-b-[1px] border-[#000000] flex-1">
                      <div className="w-1/2 border-r-[1px] border-[#000000] p-3 break-words flex flex-col justify-center">
                        <span className="text-xs text-[#333333] block">Port of Loading:</span>
                        <span className="font-bold">Nhava Sheva, India</span>
                      </div>
                      <div className="w-1/2 p-3 break-words flex flex-col justify-center">
                        <span className="text-xs text-[#333333] block">Port of Discharge:</span>
                        <span className="font-bold">TBD</span>
                      </div>
                    </div>

                    <div className="p-3 flex-1 break-words flex flex-col justify-center">
                      <span className="text-xs text-[#333333] block">Terms of Delivery & Payment (Incoterms):</span>
                      <span className="font-bold">FOB / T/T Advance</span>
                    </div>
                  </div>
                </div>

                {docType === 'proforma' ? (
                  <div className="flex w-full border-b-[2px] border-[#000000] font-bold text-center bg-[#f5f5f5]">
                    <div className="w-[15%] p-2 border-r-[1px] border-[#000000]">Marks & No.</div>
                    <div className="w-[40%] p-2 border-r-[1px] border-[#000000]">Description of Goods</div>
                    <div className="w-[15%] p-2 border-r-[1px] border-[#000000]">HS Code</div>
                    <div className="w-[10%] p-2 border-r-[1px] border-[#000000]">Qty</div>
                    <div className="w-[20%] p-2">Amount (USD)</div>
                  </div>
                ) : (
                  <div className="flex w-full border-b-[2px] border-[#000000] font-bold text-center bg-[#f5f5f5] text-xs">
                    <div className="w-[15%] p-2 border-r-[1px] border-[#000000]">Marks & No.</div>
                    <div className="w-[30%] p-2 border-r-[1px] border-[#000000]">Description of Goods</div>
                    <div className="w-[15%] p-2 border-r-[1px] border-[#000000]">Total Pkgs</div>
                    <div className="w-[15%] p-2 border-r-[1px] border-[#000000]">Net Wt (KGS)</div>
                    <div className="w-[15%] p-2 border-r-[1px] border-[#000000]">Gross Wt (KGS)</div>
                    <div className="w-[10%] p-2">Meas. (CBM)</div>
                  </div>
                )}

                {docType === 'proforma' ? (
                  <div className="flex w-full min-h-[300px]">
                    <div className="w-[15%] p-3 border-r-[1px] border-[#000000] text-center break-words">As Addressed</div>
                    <div className="w-[40%] p-3 border-r-[1px] border-[#000000] break-words">
                      <strong>Export Goods / Specified Items</strong><br/>
                      <span className="text-xs text-[#666666]">As per uploaded documentation/spec sheet.</span>
                    </div>
                    <div className="w-[15%] p-3 border-r-[1px] border-[#000000] text-center font-bold break-all">{data?.hs_code?.value || 'N/A'}</div>
                    <div className="w-[10%] p-3 border-r-[1px] border-[#000000] text-center break-words">1 LOT</div>
                    <div className="w-[20%] p-3 text-right break-all">${data?.total_value_usd?.value?.toLocaleString() || '0.00'}</div>
                  </div>
                ) : (
                  <div className="flex w-full min-h-[300px] text-sm">
                    <div className="w-[15%] p-3 border-r-[1px] border-[#000000] text-center break-words">As Addressed</div>
                    <div className="w-[30%] p-3 border-r-[1px] border-[#000000] break-words">
                      <strong>Export Goods / Specified Items</strong><br/>
                      <span className="text-xs text-[#666666]">As per uploaded documentation/spec sheet.</span>
                    </div>
                    <div className="w-[15%] p-3 border-r-[1px] border-[#000000] text-center font-bold break-all">{data?.total_packages?.value || '0'} CTNS</div>
                    <div className="w-[15%] p-3 border-r-[1px] border-[#000000] text-right font-bold break-all">{data?.net_weight_kg?.value || '0.00'}</div>
                    <div className="w-[15%] p-3 border-r-[1px] border-[#000000] text-right font-bold break-all">{data?.gross_weight_kg?.value || '0.00'}</div>
                    <div className="w-[10%] p-3 text-right font-bold break-all">{data?.volume_cbm?.value || '0.00'}</div>
                  </div>
                )}

                {docType === 'proforma' ? (
                  <div className="flex w-full border-t-[2px] border-[#000000]">
                    <div className="w-[80%] p-3 border-r-[1px] border-[#000000] text-right font-bold">
                      Total Value (USD):
                    </div>
                    <div className="w-[20%] p-3 text-right font-bold break-all">
                      ${data?.total_value_usd?.value?.toLocaleString() || '0.00'}
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full border-t-[2px] border-[#000000] bg-[#f5f5f5] text-sm">
                    <div className="w-[45%] p-3 border-r-[1px] border-[#000000] text-right font-bold">
                      TOTALS:
                    </div>
                    <div className="w-[15%] p-3 border-r-[1px] border-[#000000] text-center font-bold break-all">
                      {data?.total_packages?.value || '0'} CTNS
                    </div>
                    <div className="w-[15%] p-3 border-r-[1px] border-[#000000] text-right font-bold break-all">
                      {data?.net_weight_kg?.value || '0.00'} KGS
                    </div>
                    <div className="w-[15%] p-3 border-r-[1px] border-[#000000] text-right font-bold break-all">
                      {data?.gross_weight_kg?.value || '0.00'} KGS
                    </div>
                    <div className="w-[10%] p-3 text-right font-bold break-all">
                      {data?.volume_cbm?.value || '0.00'} CBM
                    </div>
                  </div>
                )}
              </div>

              <div className="flex w-full mt-4 h-32">
                <div className="w-2/3 pr-4">
                  <span className="font-bold underline mb-1 block">Declaration:</span>
                  <p className="text-xs text-[#333333] text-justify leading-relaxed">
                    {docType === 'proforma' 
                      ? "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. The goods sold are intended for export and not for domestic consumption."
                      : "We hereby certify that the information on this packing list is true and correct, and that the packaging conforms to international export standards."}
                  </p>
                </div>
                <div className="w-1/3 flex flex-col justify-end items-end pb-4 border-b-[1px] border-[#000000] border-dashed">
                  <span className="font-bold text-sm">For ArthaFlow Global Exports</span>
                  <span className="text-xs text-[#666666] mt-8">Authorized Signatory</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}