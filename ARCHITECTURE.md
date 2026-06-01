# ArthaFlow Global — AI Documentation Generation Pipeline
### Technical Architecture & Implementation Guide
`Version 2.0 · June 2026 · Updated for DeepSeek`

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [AI Provider Strategy](#3-ai-provider-strategy)
4. [Input Layer — Ingestion Modes](#4-input-layer--ingestion-modes)
5. [Vision AI Pipeline](#5-vision-ai-pipeline)
6. [Document Generation Pipeline](#6-document-generation-pipeline)
7. [The 7 Documents — Specs & Phases](#7-the-7-documents--specs--phases)
8. [PDF Rendering Pipeline](#8-pdf-rendering-pipeline)
9. [Storage & Delivery](#9-storage--delivery)
10. [Error Handling & Fallbacks](#10-error-handling--fallbacks)
11. [Cost Analysis](#11-cost-analysis)
12. [Build Phases](#12-build-phases)
13. [Environment Variables](#13-environment-variables)

---

## 1. Overview

The ArthaFlow AI Documentation Generator converts raw manufacturer data — uploaded images, photographed spec sheets, or filled forms — into professional, internationally-standard export documents in 30–60 seconds.

### What it produces

| # | Document | Phase | Ingestion |
|---|---|---|---|
| 1 | Product Export Sheet | P0 | Text + Vision |
| 2 | HS Code Classification Report | P0 | Text + Vision |
| 3 | Proforma Invoice | P0 | Text + Vision |
| 4 | Packing List | P1 | Text + Vision |
| 5 | Certificate of Origin Draft | P1 | Text only |
| 6 | Export Readiness Report | P1 | Text only |
| 7 | Shipping Instruction Draft | P2 | Text only |

### Core design principles

- **Form-first, vision-enhanced** — text pipeline is the stable base; vision is the accelerator
- **JSON-in, PDF-out** — AI always returns structured JSON; PDF rendering is deterministic
- **Never re-ask** — every field in the manufacturer profile auto-populates
- **Fail gracefully** — partial data produces a document with `[CONFIRM]` placeholders
- **Model-agnostic** — switching DeepSeek → OpenAI → Claude = change one env var

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                MANUFACTURER  (Browser / PWA)             │
│                                                          │
│   [Upload Images]  ──OR──  [Fill / Confirm Form Fields]  │
└──────────────────────────────┬───────────────────────────┘
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────────┐
│              NEXT.JS API LAYER  (Phase 1)                │
│              EXPRESS.JS API SERVER  (Phase 2+)           │
│                                                          │
│   POST  /api/documents/extract      ← vision pipeline    │
│   POST  /api/documents/generate     ← doc generation     │
│   GET   /api/documents/:id          ← vault fetch        │
│   POST  /api/documents/:id/feedback ← rating + comment   │
└────────────┬─────────────────────────┬───────────────────┘
             │                         │
             ▼                         ▼
┌────────────────────┐   ┌─────────────────────────────────┐
│   VISION SERVICE   │   │      DOCUMENT GEN SERVICE       │
│                    │   │                                 │
│  • Quality gate    │   │  • Context assembly             │
│  • Type detection  │   │  • Prompt builder               │
│  • Extraction      │   │  • AI API call                  │
│  • Data fusion     │   │  • JSON schema validation       │
│                    │   │                                 │
│  deepseek-v4-flash │   │  deepseek-v4-flash              │
│  (or OCR-2)        │   │                                 │
└────────────┬───────┘   └──────────────┬──────────────────┘
             │                          │
             └──────────┬───────────────┘
                        ▼
┌──────────────────────────────────────────────────────────┐
│                 PDF RENDERING SERVICE                    │
│                                                          │
│   JSON payload → Handlebars template → Puppeteer → PDF   │
│   (Phase 1: html2canvas inline · Phase 2: Puppeteer)     │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                  STORAGE & DELIVERY                      │
│                                                          │
│   Cloudinary (PDF + source images)                       │
│   MongoDB     (metadata + AI JSON + feedback)            │
│   ↓                                                      │
│   Manufacturer vault  +  WhatsApp notification           │
└──────────────────────────────────────────────────────────┘
```

---

## 3. AI Provider Strategy

### Active provider: DeepSeek

DeepSeek is the default provider — OpenAI-compatible API, ~50× cheaper than Claude, excellent JSON instruction-following.

### Provider matrix

| Provider | Vision Model | Generation Model | SDK | Status |
|---|---|---|---|---|
| **DeepSeek** | `deepseek-v4-flash` | `deepseek-v4-flash` | `openai` (baseURL swap) | ✅ **Active** |
| **DeepSeek OCR-2** | `deepseek-ai/DeepSeek-OCR-2` | — | `openai` via DeepInfra | ⚙️ Optional upgrade |
| **OpenAI** | `gpt-4o` | `gpt-4o-mini` | `openai` | 🔑 Ready (needs key) |
| **Claude** | `claude-sonnet-4-5-20251001` | `claude-haiku-4-5-20251001` | `@anthropic-ai/sdk` | 🔑 Ready (needs key + npm install) |

### Switching provider

1. Set `AI_PROVIDER=openai` (or `claude`) in `.env.local`
2. Supply the matching API key
3. For Claude only: `npm install @anthropic-ai/sdk` + uncomment the Claude block in `src/lib/ai/aiClient.ts`
4. No other code changes

### Why DeepSeek V4 Flash for vision

- Native multimodal — images + text in one call
- ~90 KV cache entries per image (vs ~870 for Claude) = cheaper at scale
- 1M token context window — handles multi-page documents
- `deepseek-v4-flash` and `deepseek-v4-pro` are the current stable model IDs (replacing retired `deepseek-chat` / `deepseek-reasoner` as of July 2026)

### DeepSeek-OCR-2 upgrade (optional)

For high-volume, OCR-heavy workloads (spec sheets, technical drawings, degraded scans):

```
Provider : DeepInfra
Base URL : https://api.deepinfra.com/v1/openai
Model    : deepseek-ai/DeepSeek-OCR-2
Key      : DEEPINFRA_API_KEY
```

DeepSeek-OCR-2 (Jan 2026) uses **DeepEncoder V2** — a "Causal Flow" architecture that reads documents in human visual order rather than top-to-bottom scanning. 34% better reading-order accuracy on benchmarks. $0.03/M input, $0.10/M output.

---

## 4. Input Layer — Ingestion Modes

Every generation job starts here. The manufacturer can use any combination.

### Mode A — Vision ingestion (recommended UX)

Manufacturer photographs or uploads an existing document.

| Source type | What it contains |
|---|---|
| `product_photo` | Physical product photograph |
| `engineering_drawing` | CAD drawing / technical blueprint |
| `spec_sheet` | Internal manufacturing spec sheet |
| `brochure_page` | Catalogue or brochure page |
| `quality_certificate` | ISO / BIS / CE / test report |
| `existing_invoice` | Old export invoice (pre-validated data) |
| `packing_list_existing` | Old packing list |

**Constraints:**
- Max 5 images per generation job
- Accepted: JPG, PNG, HEIC, PDF (first page only)
- Max size: 10 MB per image
- Min resolution: 800 × 600 px for reliable extraction

### Mode B — Text / form ingestion

Manufacturer fills or confirms fields in their onboarding profile. All fields that exist in MongoDB are pre-populated. Only delta fields required for the specific document are entered fresh.

### Mode C — Hybrid (default target UX — 90% of sessions)

Vision extraction pre-fills all available fields → manufacturer sees the pre-filled form → confirms or corrects → generation triggered.

---

## 5. Vision AI Pipeline

### 5.1 Image quality gate (client-side, before upload)

Run before the API call. Blocks bad images early and surfaces a specific retake prompt.

```ts
// src/services/imageQualityCheck.ts  (Phase 1 — add to UploadDropzone)
export async function checkImageQuality(file: File) {
  const img    = new Image();
  const canvas = document.createElement('canvas');
  img.src      = URL.createObjectURL(file);

  await new Promise(r => { img.onload = r; });

  canvas.width  = img.width;
  canvas.height = img.height;
  const ctx     = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const data           = ctx.getImageData(0, 0, img.width, img.height);
  const blurScore      = calculateLaplacianVariance(data);   // > 100 = sharp
  const brightness     = calculateAverageBrightness(data);   // 40–240 = good

  return {
    passed:            blurScore > 100 && brightness > 40 && brightness < 240,
    resolutionPassed:  img.width >= 800 && img.height >= 600,
    blurScore,
    brightness,
  };
}
```

**Retake prompts by failure type:**

| Failure | Message shown |
|---|---|
| Blur | "Image is blurry — hold phone steady and keep document flat" |
| Too dark | "Image is too dark — move to better lighting or turn on torch" |
| Overexposed | "Image is overexposed — avoid direct light on document" |
| Low resolution | "Image too small — move closer to the document" |

### 5.2 Upload to Cloudinary (Phase 2)

Currently: base64 image sent directly in the API request body (Phase 1 shortcut).

Phase 2 upgrade: upload to Cloudinary first, then pass the secure URL to the AI.

```ts
// services/cloudinaryUpload.ts
export async function uploadSourceImage(file: File, manufacturerId: string, jobId: string) {
  const formData = new FormData();
  formData.append('file',           file);
  formData.append('upload_preset',  process.env.CLOUDINARY_UPLOAD_PRESET!);
  formData.append('folder',         `arthaflow/source/${manufacturerId}/${jobId}`);
  formData.append('tags',           `source,${manufacturerId},${jobId}`);

  const res  = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST', body: formData,
  });
  return res.json(); // { secure_url, public_id, format, width, height }
}
```

### 5.3 Document type auto-detection (Phase 2)

One cheap API call to classify the image before running the expensive full extraction.

```ts
// One-shot classification call
const typeResult = await callAI('vision', EXTRACTION_SYSTEM_PROMPT, `
  Classify this image as exactly ONE type:
  product_photo | engineering_drawing | spec_sheet | brochure_page |
  quality_certificate | existing_invoice | packing_list_existing | unknown

  Return: { "type": "string", "confidence": 0-1, "reasoning": "string" }
`, imageBase64);
```

Phase 1: user manually selects document type (current implementation).
Phase 2: auto-detect + confirm with user.

### 5.4 Type-specific extraction prompts

Defined in `src/lib/ai/prompts.ts`. Each prompt requests a flat JSON object where every field is `{ value, confidence }` — matching `VerificationForm` directly without transformation.

| Doc type | Key fields extracted |
|---|---|
| `proforma` | buyer_name, invoice_number, date, hs_code, total_value_usd, currency, incoterm |
| `packing_list` | buyer_name, invoice_number, date, total_packages, net/gross weight, volume_cbm |
| `hs_code` | product_name, hs_code, chapter_description, rationale, material |

### 5.5 Multi-image data fusion (Phase 2)

When multiple images are uploaded, results are merged by source trustworthiness:

| Source type | Trust score |
|---|---|
| `existing_invoice` | 5 (pre-validated by customs) |
| `engineering_drawing` | 4 (authoritative technical source) |
| `spec_sheet` | 4 |
| `quality_certificate` | 3 |
| `brochure_page` | 2 |
| `product_photo` | 1 (visual inference only) |

Higher score wins on field conflicts. All conflicts are logged for the manufacturer to review.

---

## 6. Document Generation Pipeline

### 6.1 Context assembly

For text-based and hybrid generation, the system assembles context from:

```ts
{
  company: {               // Auto-populated from manufacturer profile (MongoDB)
    name, gst, iec, address, city, state,
    contact, email, phone, certifications,
    bank_name, account, swift, ad_code
  },
  product: {               // Auto-populated from product profile
    name, description, specifications, moq,
    leadTime, packaging, certifications, hsnCode
  },
  request: {               // Entered fresh per generation job
    targetCountry, buyerName, buyerAddress,
    currency, incoterm, unitPrice, quantity, paymentTerms
  }
}
```

### 6.2 Prompt builder

`src/lib/ai/prompts.ts` exports `GENERATION_SYSTEM_PROMPT` and per-document schemas. The builder injects the full context as JSON into the user prompt alongside the schema, then calls `callAI('generation', ...)`.

### 6.3 AI call + JSON validation

```
callAI('generation', systemPrompt, userPrompt)
  → strips markdown fences from response
  → JSON.parse()
  → on SyntaxError → retryWithJsonEnforcement() (temperature = 0)
  → validateOutputSchema(result, documentType)
  → on schema error → throw SCHEMA_INVALID
```

### 6.4 Generation job flow

```
1. Assemble context (MongoDB profile + per-job inputs)
2. Merge vision extraction results (if images were uploaded)
3. Validate: hard stops (company/product name missing) → error
              soft warnings (IEC missing) → [CONFIRM] placeholder
4. Build prompt → callAI('generation')
5. Validate AI output schema
6. Render PDF (Puppeteer + Handlebars template)
7. Upload PDF + source images to Cloudinary
8. Save metadata + AI JSON to MongoDB
9. Send WhatsApp notification to manufacturer
```

---

## 7. The 7 Documents — Specs & Phases

### Document 1 — Product Export Sheet `P0`
**Trigger:** Manufacturer selects product + target country  
**AI model:** `deepseek-v4-flash` (generation)  
**Output:** 1-page branded A4 PDF  
**Avg time:** 8–12 s

Key output fields: product_headline, product_description, specifications array, key_features, certifications, commercial_terms (MOQ, lead time, incoterm), packaging, hs_code_suggested, target_market_notes

---

### Document 2 — HS Code Classification Report `P0`
**Trigger:** Manufacturer selects product (or uploads product photo/spec sheet)  
**AI model:** Vision: `deepseek-v4-flash` · Generation: `deepseek-v4-flash`  
**Output:** 2-page PDF report  
**Avg time:** 10–15 s

Key output fields: recommended_hs_code (8-digit), hs_description, classification_reasoning, alternative_codes[], duty_by_market[], regulatory_requirements[], fta_opportunities[], legal_disclaimer

---

### Document 3 — Proforma Invoice `P0`
**Trigger:** Manufacturer has a buyer inquiry  
**AI model:** `deepseek-v4-flash` (minimal AI — mostly templating)  
**Output:** 1-page branded PDF + XLSX  
**Avg time:** 5–8 s

Key output fields: invoice_number (auto: AF-PI-YYYYMMDD-XXXX), seller, buyer, line_items[], subtotal, freight_charges, insurance, total, currency, incoterm, payment_terms, port_of_loading, port_of_discharge

---

### Document 4 — Packing List `P1`
**Trigger:** Shipment confirmed  
**AI model:** Vision: `deepseek-v4-flash` (if existing packing list uploaded)  
**Output:** 1-page PDF  
**Avg time:** 5–8 s

Key output fields: shipment_reference, cartons[] (carton_number, contents, qty, net_weight_kg, gross_weight_kg, dimensions_cm, cbm), totals, marks_and_numbers

---

### Document 5 — Certificate of Origin Draft `P1`
**Trigger:** Buyer requests COO  
**AI model:** `deepseek-v4-flash` (text only)  
**Output:** Draft PDF with DRAFT watermark  
**Note:** Requires official stamp from DGFT / Chamber / EPC — AI produces the draft only

Key output fields: exporter, consignee, goods_description, hs_code, quantity, origin_criteria (WO / PE / PSR), issuing_body_required, fta_format_required, declaration_text

---

### Document 6 — Export Readiness Report `P1`
**Trigger:** New manufacturer onboarding  
**AI model:** `deepseek-v4-flash` (text only)  
**Output:** Multi-page advisory PDF

Key output fields: overall_score (0–100), score_breakdown (compliance, documentation, product_readiness, operational), executive_summary, compliance_status[], recommended_markets[], estimated_timeline_to_first_shipment, priority_actions[]

---

### Document 7 — Shipping Instruction Draft `P2`
**Trigger:** Shipment booking initiated  
**AI model:** `deepseek-v4-flash` (text only)  
**Output:** Shipping instruction form PDF

---

## 8. PDF Rendering Pipeline

### Phase 1 (current) — html2canvas + jsPDF

```
Hidden DOM element → html2canvas screenshot → jsPDF → inline browser download
```

**Limitations:** Rasterized (not searchable), can be blurry at high DPI, no proper footer/header.

### Phase 2 (target) — Puppeteer + Handlebars

```
AI JSON + context → Handlebars .hbs template → HTML string
                 → Puppeteer headless Chrome → PDF buffer
                 → upload to Cloudinary → return secure_url
```

```ts
// services/pdf/renderer.ts
import puppeteer   from 'puppeteer';
import Handlebars  from 'handlebars';

export async function renderPDF(documentType: string, aiData: object, context: object) {
  const template = Handlebars.compile(loadTemplate(documentType));
  const html     = template({
    ...aiData,
    branding: {
      logo:       process.env.ARTHAFLOW_LOGO_URL,
      primary:    '#1D9E75',
      website:    'arthaflow.com',
    },
    manufacturer: (context as any).company,
    generatedAt:  new Date().toLocaleDateString('en-IN'),
    documentId:   generateDocumentId(documentType),
  });

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page    = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdf = await page.pdf({
    format:          'A4',
    printBackground: true,
    margin:          { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    displayHeaderFooter: true,
    footerTemplate: `
      <span style="font-size:8px;color:#999;padding:0 15mm">
        Generated by ArthaFlow Global · arthaflow.com · Document ID: {{documentId}}
      </span>`,
  });

  await browser.close();
  return pdf; // Buffer — upload to Cloudinary
}
```

One `.hbs` template per document type under `src/templates/pdf/`.

---

## 9. Storage & Delivery

### MongoDB — `GeneratedDocument` schema

```ts
{
  manufacturer:         ObjectId,          // ref: Manufacturer
  product:              ObjectId,          // ref: Product
  documentType:         string,            // enum of 7 types
  version:              number,            // increments on regeneration
  pdfUrl:               string,            // Cloudinary secure_url
  cloudinaryPublicId:   string,
  aiOutput:             object,            // raw JSON from AI
  modelUsed:            string,
  provider:             string,            // deepseek | openai | claude
  confidenceScore:      number,
  tokensUsed:           { input, output },
  wasRetry:             boolean,
  visionSourceImages:   string[],          // Cloudinary URLs
  validationWarnings:   string[],
  feedbackScore:        number,            // 1–5
  feedbackComment:      string,
  status:               'generating' | 'complete' | 'failed' | 'superseded',
  generatedAt:          Date,
  expiresAt:            Date,              // for proforma invoices
}
```

### WhatsApp notification

Sent via Meta Cloud API on generation complete.

```
"Hi {manufacturer_name}, your {document_type} for {product_name} is ready.
Download here: {cloudinary_url}"
```

### Prompt versioning

Prompts are stored in MongoDB (`PromptVersion` collection), not hardcoded. Switching prompt versions = database update, no redeployment.

```ts
{
  documentType,   version,           systemPrompt,
  userPromptTemplate,                isActive,
  avgConfidenceScore,                avgFeedbackScore,
  sampleCount,    createdAt,         notes
}
```

---

## 10. Error Handling & Fallbacks

| Error code | Cause | Action |
|---|---|---|
| `VALIDATION_FAILED` | Missing required fields before generation | Return specific field list to frontend |
| `AI_TIMEOUT` | API call > 30 s | Retry once; return partial with warning |
| `JSON_PARSE_FAILED` | Model returned malformed JSON after retry | Log prompt + response; alert ops; return error |
| `SCHEMA_INVALID` | AI JSON missing required fields | Retry with explicit field list |
| `PDF_RENDER_FAILED` | Puppeteer crash or template error | Return AI JSON; offer manual PDF download |
| `CLOUDINARY_FAILED` | Upload failed | Serve PDF from memory buffer; retry async |
| `VISION_EXTRACTION_LOW` | All fields confidence < 0.50 | Fall through to manual form entry with warning |
| `AUTH_FAILED` | Invalid API key | Surface specific error in dev; generic in prod |
| `RATE_LIMITED` | Provider quota exceeded | Return 429; retry-after header |

---

## 11. Cost Analysis

### Per-generation job estimate (DeepSeek)

```
Vision extraction (2 images avg):
  Type detection ×2:          2 × $0.00001  = $0.00002
  Full extraction ×2:         2 × $0.00010  = $0.00020

Document generation (3 docs):
  deepseek-v4-flash ×3:       3 × $0.00003  = $0.00009
                                            ─────────
  Total per full job:                       ≈ $0.0003   (₹0.025)
```

### Monthly scale

| Jobs / month | DeepSeek cost | Claude cost (spec estimate) | Saving |
|---|---|---|---|
| 1,000 | ~$0.30 (₹25) | ~$10 (₹850) | 97% |
| 10,000 | ~$3 (₹250) | ~$100 (₹8,500) | 97% |
| 100,000 | ~$30 (₹2,500) | ~$1,000 (₹85,000) | 97% |

**Revenue context:** At ₹2,999/month plan, even 1 client covers ~10,000 jobs/month. Cost structure scales without pain.

### DeepSeek OCR-2 upgrade (via DeepInfra)

If OCR-2 is used for vision tasks: $0.03/M input, $0.10/M output — still ~30× cheaper than Claude Sonnet for vision.

---

## 12. Build Phases

### Phase 1 — Current (this repo)

| Status | Task |
|---|---|
| ✅ Done | 4-step UI flow (Upload → Processing → Verify → Success) |
| ✅ Done | Document type selector (Proforma, Packing List, HS Code) |
| ✅ Done | VerificationForm with confidence indicators |
| ✅ Done | html2canvas + jsPDF PDF generation |
| ✅ Done | AI abstraction layer (`src/lib/ai/aiClient.ts`) |
| ✅ Done | DeepSeek integration (real extraction replaces mock) |
| ✅ Done | OpenAI + Claude configs ready to activate |
| 🔲 Next | Client-side image quality gate (blur + brightness check) |
| 🔲 Next | Back button on Verify screen |
| 🔲 Next | Inline error states (replace `alert()`) |
| 🔲 Next | Multi-item line items in Proforma Invoice PDF |
| 🔲 Next | Strong TypeScript types (replace `data: any`) |

### Phase 2 — Platform integration

| Week | Task | Owner |
|---|---|---|
| W4 D1–2 | Puppeteer + Handlebars PDF renderer, 3 templates (P0 docs) | Backend |
| W4 D3–4 | MongoDB schemas (Manufacturer, Product, GeneratedDocument) | Backend |
| W4 D5 | Frontend vault page — list + download generated docs | Frontend |
| W5 D1 | WhatsApp notification on generation complete | Backend |
| W5 D2–3 | Manufacturer profile auth + auto-populate fields | Full-stack |
| W8 D1–2 | Image quality gate (client-side) | Frontend |
| W8 D3–4 | Cloudinary pre-upload + auto document type detection | Backend |
| W8 D5 | Multi-image data fusion + gap analyser | Backend |
| W9 D1–2 | Hybrid confirmation UI (pre-filled form with source tags) | Frontend |
| W9 D3–5 | End-to-end vision pipeline test (20 real documents) | Both + founder |
| W10 | P1 documents live · feedback collection · prompt versioning | All |

### Phase 3 — Scale

- Certificate of Origin workflow (P1)
- Export Readiness Report (P1)
- Shipping Instruction Draft (P2)
- Batch generation (all docs from one spec sheet)
- Feedback loop → automated prompt improvement
- Rate limiting + usage metering per plan tier

---

## 13. Environment Variables

```bash
# ── AI Provider ────────────────────────────────────────────
AI_PROVIDER=deepseek          # deepseek | openai | claude

# ── DeepSeek (default) ─────────────────────────────────────
DEEPSEEK_API_KEY=             # https://platform.deepseek.com/api_keys
# DEEPINFRA_API_KEY=          # for DeepSeek-OCR-2 upgrade

# ── OpenAI ─────────────────────────────────────────────────
OPENAI_API_KEY=               # activate: AI_PROVIDER=openai

# ── Claude ─────────────────────────────────────────────────
ANTHROPIC_API_KEY=            # activate: AI_PROVIDER=claude
                              # also: npm install @anthropic-ai/sdk

# ── AI config ──────────────────────────────────────────────
AI_TIMEOUT_MS=30000
AI_MAX_RETRIES=2

# ── Storage (Phase 2) ──────────────────────────────────────
CLOUDINARY_CLOUD_NAME=arthaflow
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_PRESET=arthaflow_source_docs
ARTHAFLOW_LOGO_URL=           # hosted logo URL for PDF templates

# ── Database (Phase 2) ─────────────────────────────────────
MONGODB_URI=

# ── Notifications (Phase 2) ────────────────────────────────
WHATSAPP_API_KEY=
WHATSAPP_PHONE_NUMBER_ID=
RESEND_API_KEY=               # transactional email fallback

# ── App ────────────────────────────────────────────────────
NODE_ENV=development
MAX_IMAGES_PER_JOB=5
MAX_IMAGE_SIZE_MB=10
MIN_IMAGE_WIDTH=800
MIN_IMAGE_HEIGHT=600
```

---

*ArthaFlow Global · AI Documentation Pipeline · v2.0 · Confidential*  
*Built by Sarthak Wage · June 2026*
