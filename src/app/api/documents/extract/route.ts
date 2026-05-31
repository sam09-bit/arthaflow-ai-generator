import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageBase64, docType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));

    let mockVisionResponse;

    if (docType === 'hs_code') {
      mockVisionResponse = {
        product_name: { value: "Industrial Wi-Fi Router", confidence: 0.99 },
        hs_code: { value: "8517.62.00", confidence: 0.95 },
        chapter_description: { value: "Machines for the reception, conversion and transmission or regeneration of voice, images or other data, including switching and routing apparatus", confidence: 0.92 },
        rationale: { value: "Based on the visual of dual antennas and ethernet ports, this is classified under networking apparatus.", confidence: 0.88 }
      };
    } else if (docType === 'packing_list') {
      mockVisionResponse = {
        buyer_name: { value: "Global Trade Partners LLC", confidence: 0.98 },
        invoice_number: { value: "INV-2026-8821", confidence: 0.95 },
        date: { value: "2026-05-28", confidence: 0.92 },
        total_packages: { value: 12, confidence: 0.99 },
        net_weight_kg: { value: 450.50, confidence: 0.75 }, 
        gross_weight_kg: { value: 480.00, confidence: 0.95 },
        volume_cbm: { value: 2.45, confidence: 0.90 }, // NEW STRICT FIELD
      };
    } else {
      mockVisionResponse = {
        buyer_name: { value: "Global Trade Partners LLC", confidence: 0.98 },
        invoice_number: { value: "INV-2026-8821", confidence: 0.95 },
        date: { value: "2026-05-28", confidence: 0.92 },
        total_value_usd: { value: 45250.00, confidence: 0.65 },
        hs_code: { value: "8517.62.00", confidence: 0.99 },
      };
    }

    return NextResponse.json(mockVisionResponse);

  } catch (error) {
    console.error("Mock API Error:", error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}