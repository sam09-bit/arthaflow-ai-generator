/**
 * ArthaFlow AI Abstraction Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Active provider is controlled by AI_PROVIDER in .env.local
 *
 * Supported providers
 *   deepseek  → api.deepseek.com          (default — cheapest, OpenAI-compat)
 *   openai    → api.openai.com/v1         (drop-in when credits available)
 *   claude    → requires @anthropic-ai/sdk (see instructions at bottom)
 *
 * Switching provider = change AI_PROVIDER + supply the matching API key.
 * No other code changes needed.
 */

import OpenAI from 'openai';

// ── Provider types ────────────────────────────────────────────────────────────

export type AIProvider = 'deepseek' | 'openai';
// Claude is handled separately — see bottom of file.

export type ModelMode = 'vision' | 'generation';

interface ProviderConfig {
  baseURL: string;
  apiKey: string;
  models: {
    /** Used for image + text tasks (OCR, document extraction) */
    vision: string;
    /** Used for pure text → JSON document generation */
    generation: string;
  };
}

// ── Provider configs ──────────────────────────────────────────────────────────

const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {

  // ── DeepSeek (DEFAULT) ─────────────────────────────────────────────────────
  // Vision model:     deepseek-v4-flash   — native multimodal, ~90 KV entries/img
  // Generation model: deepseek-v4-flash   — fast JSON output, $0.14/M input
  //
  // Optional upgrade for OCR-heavy workloads:
  //   Use DeepSeek-OCR-2 via DeepInfra (purpose-built document model, Jan 2026)
  //   baseURL : 'https://api.deepinfra.com/v1/openai'
  //   apiKey  : process.env.DEEPINFRA_API_KEY
  //   model   : 'deepseek-ai/DeepSeek-OCR-2'
  deepseek: {
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    models: {
      vision:     'deepseek-v4-flash',
      generation: 'deepseek-v4-flash',
    },
  },

  // ── OpenAI ─────────────────────────────────────────────────────────────────
  // Set AI_PROVIDER=openai and supply OPENAI_API_KEY to activate.
  openai: {
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY || '',
    models: {
      vision:     'gpt-4o',
      generation: 'gpt-4o-mini',
    },
  },

};

// ── Active provider ───────────────────────────────────────────────────────────

const ACTIVE_PROVIDER = (process.env.AI_PROVIDER ?? 'deepseek') as AIProvider;

// ── Public types ──────────────────────────────────────────────────────────────

export interface AICallResult {
  data: Record<string, unknown>;
  model: string;
  provider: string;
  tokensUsed: { input: number; output: number };
  wasRetry: boolean;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * callAI — unified call for all AI tasks in the pipeline.
 *
 * @param mode          'vision'     → image + text extraction
 *                      'generation' → text only document generation
 * @param systemPrompt  Role + rules for the model
 * @param userPrompt    Task instruction + JSON schema
 * @param imageBase64   Base64 image string (required when mode = 'vision')
 */
export async function callAI(
  mode: ModelMode,
  systemPrompt: string,
  userPrompt: string,
  imageBase64?: string,
): Promise<AICallResult> {
  const config = PROVIDER_CONFIGS[ACTIVE_PROVIDER];
  const model  = config.models[mode];

  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey:  config.apiKey,
  });

  const userContent = buildUserContent(mode, userPrompt, imageBase64);

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: mode === 'vision' ? 0.1 : 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent  },
      ],
    });

    const raw = response.choices[0].message.content?.trim() ?? '{}';

    return {
      data:       parseJSON(raw),
      model,
      provider:   ACTIVE_PROVIDER,
      tokensUsed: {
        input:  response.usage?.prompt_tokens     ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
      wasRetry: false,
    };

  } catch (err) {
    if (err instanceof SyntaxError) {
      // JSON parse failed → retry once with stronger enforcement
      return retryWithJsonEnforcement(client, model, systemPrompt, userPrompt, imageBase64);
    }
    throw err;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUserContent(
  mode: ModelMode,
  userPrompt: string,
  imageBase64?: string,
): OpenAI.Chat.ChatCompletionContentPart[] {
  const parts: OpenAI.Chat.ChatCompletionContentPart[] = [];

  if (mode === 'vision' && imageBase64) {
    parts.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${imageBase64}`,
      },
    });
  }

  parts.push({ type: 'text', text: userPrompt });
  return parts;
}

function parseJSON(raw: string): Record<string, unknown> {
  // Strip accidental markdown fences the model may add
  const clean = raw
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/,      '')
    .trim();
  return JSON.parse(clean);
}

async function retryWithJsonEnforcement(
  client:      OpenAI,
  model:       string,
  systemPrompt: string,
  userPrompt:  string,
  imageBase64?: string,
): Promise<AICallResult> {
  const enforced =
    userPrompt +
    '\n\nCRITICAL: Your ENTIRE response must be a single valid JSON object. ' +
    'No markdown, no explanation, no text before or after the JSON.';

  const userContent = buildUserContent('generation', enforced, imageBase64);

  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  },
    ],
  });

  const raw = response.choices[0].message.content?.trim() ?? '{}';

  return {
    data:       parseJSON(raw),
    model,
    provider:   ACTIVE_PROVIDER,
    tokensUsed: {
      input:  response.usage?.prompt_tokens     ?? 0,
      output: response.usage?.completion_tokens ?? 0,
    },
    wasRetry: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude integration (when Anthropic credits are available)
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Install the SDK:
//      npm install @anthropic-ai/sdk
//
// 2. Set in .env.local:
//      AI_PROVIDER=claude
//      ANTHROPIC_API_KEY=sk-ant-...
//
// 3. Add 'claude' to the AIProvider union type above.
//
// 4. Uncomment and fill in the block below, then add a 'claude' case
//    to callAI() that uses Anthropic.messages.create() with:
//      vision model:     'claude-sonnet-4-5-20251001'
//      generation model: 'claude-haiku-4-5-20251001'
//
// Claude API reference: https://docs.anthropic.com/en/api
// ─────────────────────────────────────────────────────────────────────────────
//
// import Anthropic from '@anthropic-ai/sdk';
//
// const CLAUDE_VISION_MODEL      = 'claude-sonnet-4-5-20251001';
// const CLAUDE_GENERATION_MODEL  = 'claude-haiku-4-5-20251001';
//
// async function callClaude(
//   mode: ModelMode,
//   systemPrompt: string,
//   userPrompt: string,
//   imageBase64?: string,
// ): Promise<AICallResult> {
//   const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
//   const model = mode === 'vision' ? CLAUDE_VISION_MODEL : CLAUDE_GENERATION_MODEL;
//
//   const content: Anthropic.MessageParam['content'] = [];
//   if (mode === 'vision' && imageBase64) {
//     content.push({
//       type: 'image',
//       source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
//     });
//   }
//   content.push({ type: 'text', text: userPrompt });
//
//   const response = await anthropic.messages.create({
//     model,
//     max_tokens: 2000,
//     system: systemPrompt,
//     messages: [{ role: 'user', content }],
//   });
//
//   return {
//     data:       parseJSON((response.content[0] as Anthropic.TextBlock).text),
//     model,
//     provider:   'claude',
//     tokensUsed: { input: response.usage.input_tokens, output: response.usage.output_tokens },
//     wasRetry:   false,
//   };
// }
