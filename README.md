<div align="center">

# ArthaFlow AI Document Generator

### Customs-grade export documents from a phone snapshot — in 30 seconds.

**Part of [ArthaFlow Global](https://arthaflow.com) — AI-powered export infrastructure for Indian manufacturers.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19.2-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![DeepSeek](https://img.shields.io/badge/AI-DeepSeek_V4-4D6BFE?style=flat-square)](https://deepseek.com)
[![License](https://img.shields.io/badge/License-Proprietary-E5B547?style=flat-square)](#license)

</div>

---

## 🌏 The Problem

India is targeting **$2 trillion in exports by 2030** — but only **0.3% of MSMEs** participate today. The wall isn't ambition or product quality. It's **paperwork**.

A single export shipment needs 7+ documents — Proforma Invoice, HS Classification, Packing List, Certificate of Origin, and more. Each is technically demanding, format-strict, and reviewed by customs officers who reject the slightest inconsistency. Manufacturers either:

- Hire a CHA (Customs House Agent) at ₹15,000–₹40,000 per shipment, or
- Fumble through templates and lose deals to delays

## 💡 The Solution

Upload a spec sheet, a product photo, or an old invoice. Our Vision AI extracts every field, our trade-AI maps it to the right export document, and our renderer produces a customs-compliant PDF — branded, signed, ready to send to the buyer.

**60 seconds. Zero customs knowledge required.**

---

## ✨ Features

| | |
|---|---|
| 📷 **Vision-First Ingestion** | Photograph any document — invoice, spec sheet, CAD drawing, quality cert — and the AI extracts it. |
| 🧠 **Multi-Provider AI** | DeepSeek V4 by default (50× cheaper than Claude). Swap to OpenAI or Claude with one env var. |
| 🌐 **WCO 2022 HS Classification** | 8-digit HS code suggestions with rationale, duty rates, and FTA opportunities by destination country. |
| ✅ **Confidence-Scored Output** | Every extracted field is wrapped in `{ value, confidence }`. Amber-flag low-confidence fields for review. |
| 📄 **Customs-Compliant PDFs** | Templates built to match Indian Customs and international buyer expectations. |
| 🔁 **Never Re-Ask** | Manufacturer profile auto-populates GSTIN, IEC, address, bank — once. |
| 🛡 **Fail Gracefully** | Partial data → partial document with `[CONFIRM]` placeholders, not errors. |
| 📲 **WhatsApp Notifications** | Document ready notifications delivered where Indian SMEs actually live. |

---

## 📦 What It Produces

| # | Document | Phase | Ingestion |
|---|---|---|---|
| 1 | Product Export Sheet | P0 | Text + Vision |
| 2 | HS Code Classification Report | P0 | Text + Vision |
| 3 | Proforma Invoice | P0 | Text + Vision |
| 4 | Packing List | P1 | Text + Vision |
| 5 | Certificate of Origin Draft | P1 | Text |
| 6 | Export Readiness Report | P1 | Text |
| 7 | Shipping Instruction Draft | P2 | Text |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A [DeepSeek API key](https://platform.deepseek.com/api_keys) (5M tokens free on signup)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/sam09-bit/arthaflow-ai-generator.git
cd arthaflow-ai-generator

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# → open .env.local and paste your DEEPSEEK_API_KEY

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you're live.

> 💡 **Design preview**: open [http://localhost:3000/document-generator.html](http://localhost:3000/document-generator.html) to see the full ArthaFlow Global themed interface design (interactive 4-step flow demo).

---

## 🧬 Architecture

```
┌──────────────────────────────────────────────────────────┐
│         MANUFACTURER (Browser / PWA)                     │
│                                                          │
│   [Upload Images]  ──OR──  [Confirm Form Fields]         │
└──────────────────────────────┬───────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────┐
│            NEXT.JS API LAYER                             │
│                                                          │
│   POST /api/documents/extract  ← Vision pipeline         │
│   POST /api/documents/generate ← Document generation     │
└────────────┬─────────────────────┬───────────────────────┘
             ▼                     ▼
   ┌──────────────────┐  ┌──────────────────────────┐
   │  VISION SERVICE  │  │   DOCUMENT GEN SERVICE   │
   │                  │  │                          │
   │  Quality gate    │  │  Context assembly        │
   │  Type detection  │  │  Prompt builder          │
   │  Extraction      │  │  JSON validation         │
   │  Data fusion     │  │                          │
   └────────┬─────────┘  └────────────┬─────────────┘
            │                         │
            └──────────┬──────────────┘
                       ▼
            ┌──────────────────────┐
            │   AI ABSTRACTION     │
            │   src/lib/ai/        │
            │                      │
            │   DeepSeek ◄ active  │
            │   OpenAI   ◄ ready   │
            │   Claude   ◄ ready   │
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │     PDF RENDER       │
            │  Handlebars → PDF    │
            └──────────────────────┘
```

📖 **Full technical spec:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## 🤖 AI Provider Strategy

We're model-agnostic. Switch providers with **one environment variable**.

| Provider | Status | Vision Model | Generation Model | Why |
|---|---|---|---|---|
| **DeepSeek** | ✅ Active (default) | `deepseek-v4-flash` | `deepseek-v4-flash` | 50× cheaper than Claude, OpenAI-compat API |
| **OpenAI** | 🔑 Ready | `gpt-4o` | `gpt-4o-mini` | Drop-in when credits available |
| **Claude** | 🔑 Ready | `claude-sonnet-4-5` | `claude-haiku-4-5` | Best vision quality for degraded scans |

### Switching providers

```bash
# .env.local
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

That's it. No code changes. For Claude, also run `npm install @anthropic-ai/sdk` and uncomment the Claude block in `src/lib/ai/aiClient.ts`.

### Cost per generation (DeepSeek)

```
Vision extraction (2 images):  $0.00022
Document generation (3 docs):  $0.00009
                              ─────────
Total per full job:          ≈ $0.0003  (~₹0.025)
```

At ₹2,999/month plan, **one paying customer covers ~10,000 jobs/month**. Cost structure scales without pain.

---

## 📂 Project Structure

```
arthaflow-ai-generator/
├── src/
│   ├── app/
│   │   ├── api/documents/extract/route.ts   ← Vision extraction endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx                         ← Main UI (4-step flow)
│   ├── components/documents/
│   │   ├── UploadDropzone.tsx               ← Step 1: image upload
│   │   ├── VerificationForm.tsx             ← Step 3: review extracted data
│   │   └── SuccessVault.tsx                 ← Step 4: PDF generation + download
│   └── lib/ai/
│       ├── aiClient.ts                      ← Provider abstraction layer
│       └── prompts.ts                       ← Per-doc-type extraction prompts
├── public/
│   └── document-generator.html              ← Branded design reference (preview)
├── ARCHITECTURE.md                          ← Full technical specification
├── .env.example                             ← All env vars documented
└── README.md
```

---

## 🛠 Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Server actions + edge-ready API routes |
| **Language** | TypeScript 5 | Type safety across the AI pipeline |
| **UI** | React 19 + Tailwind v4 | Modern, fast, server-component friendly |
| **AI SDK** | `openai` (OpenAI-compatible) | Works with DeepSeek, OpenAI, and many others via `baseURL` swap |
| **PDF** | `jspdf` + `html2canvas` (P1) → `puppeteer` + `handlebars` (P2) | Phase 1 ships fast; Phase 2 ships customs-grade |
| **Forms** | `react-dropzone` | Touch-first image upload |
| **Icons** | `lucide-react` | Lightweight, consistent |

---

## 🗺 Roadmap

### Phase 1 — MVP (this repo) ✅

- [x] 4-step UI flow (Upload → Process → Verify → Download)
- [x] 3 P0 document types
- [x] DeepSeek integration (real AI extraction)
- [x] Confidence-scored fields with amber-flag review
- [x] PDF generation (html2canvas + jsPDF)
- [x] Multi-provider abstraction (DeepSeek / OpenAI / Claude ready)
- [x] On-brand design reference (`/document-generator.html`)

### Phase 2 — Platform (Q3 2026)

- [ ] Image quality gate (blur + brightness + min resolution check)
- [ ] Auto document type detection
- [ ] Cloudinary image + PDF storage
- [ ] MongoDB manufacturer/product profiles → auto-populate
- [ ] Puppeteer + Handlebars PDF (vector, customs-grade)
- [ ] Document Vault with version history
- [ ] WhatsApp notifications via Meta Cloud API
- [ ] Multi-image data fusion + gap analysis

### Phase 3 — Scale (Q4 2026)

- [ ] Certificate of Origin (P1) — DGFT/Chamber/EPC integration
- [ ] Export Readiness Report (P1)
- [ ] Shipping Instruction Draft (P2)
- [ ] Batch generation (all docs from one spec sheet)
- [ ] Feedback loop → automated prompt versioning
- [ ] Usage-based billing + plan tiers

---

## 🤝 Contributing

This is currently a closed product, but we'd love to hear from you if you're:

- An Indian manufacturer who exports (or wants to) — **become a beta customer**
- A customs broker / freight forwarder — **partner with us**
- An engineer who's excited by export-tech — **we're hiring**

📧 [sarthak@arthaflow.com](mailto:sarthak@arthaflow.com)

---

## 📜 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Full 13-section technical spec (provider strategy, schemas, PDF pipeline, costs, build timeline)
- **[`.env.example`](./.env.example)** — Every environment variable, documented
- **[`/document-generator.html`](./public/document-generator.html)** — Pixel-perfect on-brand UI reference

---

## 📄 License

Proprietary © 2026 ArthaFlow Global Exports Ltd. All rights reserved.

This source is published for transparency with our enterprise customers and investors. It is **not** open source. Forking, redistribution, or commercial use without written permission is prohibited.

---

<div align="center">

**Built in Mumbai 🇮🇳 · For Indian exporters going global.**

[arthaflow.com](https://arthaflow.com) · [@arthaflow](https://twitter.com/arthaflow)

</div>
