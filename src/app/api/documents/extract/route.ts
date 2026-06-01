import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai/aiClient';
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_PROMPTS, type DocType } from '@/lib/ai/prompts';

export async function POST(req: Request) {
  try {
    const { imageBase64, docType } = await req.json();

    // ── Input validation ────────────────────────────────────────────────────
    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    const validDocTypes: DocType[] = ['proforma', 'packing_list', 'hs_code'];
    if (!validDocTypes.includes(docType)) {
      return NextResponse.json(
        { error: `Invalid docType. Must be one of: ${validDocTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // ── AI extraction ───────────────────────────────────────────────────────
    const result = await callAI(
      'vision',
      EXTRACTION_SYSTEM_PROMPT,
      EXTRACTION_PROMPTS[docType as DocType],
      imageBase64,
    );

    // Log token usage in dev for cost tracking
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[ArthaFlow AI] provider=${result.provider} model=${result.model} ` +
        `tokens=in:${result.tokensUsed.input}/out:${result.tokensUsed.output} ` +
        `retry=${result.wasRetry}`
      );
    }

    return NextResponse.json(result.data);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Surface AI key / quota errors clearly during development
    if (message.includes('401') || message.includes('API key')) {
      return NextResponse.json(
        { error: 'AI provider authentication failed. Check your API key in .env.local.' },
        { status: 401 }
      );
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'AI rate limit reached. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    console.error('[ArthaFlow AI] Extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract data from image.' },
      { status: 500 }
    );
  }
}
