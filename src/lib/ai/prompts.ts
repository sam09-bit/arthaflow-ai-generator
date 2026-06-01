/**
 * ArthaFlow — AI Extraction & Generation Prompts
 * ─────────────────────────────────────────────────────────────────────────────
 * All prompts instruct the model to return a flat JSON object where every
 * field is wrapped as { value: <extracted>, confidence: <0-1> }.
 * This matches the shape expected by VerificationForm directly.
 *
 * Confidence guide for the model:
 *   1.00  clearly visible / certain
 *   0.85  visible but slightly ambiguous
 *   0.70  inferred / partially obscured
 *   0.50  best guess from context
 *   0.00  not found (value will be empty string)
 */

// ── Shared system prompt ──────────────────────────────────────────────────────

export const EXTRACTION_SYSTEM_PROMPT = `
You are an expert international trade documentation specialist with deep
knowledge of Indian export procedures, customs requirements, and HS classification.

Your task is to extract structured data from a document image.

Rules you MUST follow:
1. Return ONLY a valid JSON object — no preamble, no markdown fences, no text.
2. Every field must be: { "value": <extracted_value>, "confidence": <0.0–1.0> }
3. confidence = 1.0 means clearly visible; 0.5 means inferred; 0.0 means not found.
4. Never invent or estimate values — if a field is not visible, set value to "" and confidence to 0.
5. For dates use ISO format: YYYY-MM-DD.
6. For numbers, return the numeric value (not a string).
7. HS codes must follow the format XXXX.XX.XX (8-digit WCO 2022 nomenclature).
`.trim();

export const GENERATION_SYSTEM_PROMPT = `
You are an expert international trade documentation specialist with 15 years
of experience preparing export documents for Indian manufacturers.

Your output is used in official export transactions — accuracy is paramount.

Rules you MUST follow:
1. Return ONLY a valid JSON object matching the schema provided.
2. Use formal international business English throughout.
3. Never invent data — use "[MANUFACTURER TO CONFIRM]" for missing values.
4. HS codes must follow WCO Harmonised System 2022 nomenclature.
5. Monetary values in the currency specified in the request context.
6. Include a confidence_score (0–100) based on completeness of input.
`.trim();

// ── Doc-type extraction prompts ───────────────────────────────────────────────

export type DocType = 'proforma' | 'packing_list' | 'hs_code';

export const EXTRACTION_PROMPTS: Record<DocType, string> = {

  // ── Proforma Invoice ────────────────────────────────────────────────────────
  proforma: `
Analyse this commercial invoice or proforma invoice image and extract all visible fields.

Return this exact JSON structure (every field wrapped as { value, confidence }):
{
  "buyer_name":        { "value": "", "confidence": 0 },
  "invoice_number":    { "value": "", "confidence": 0 },
  "date":              { "value": "", "confidence": 0 },
  "hs_code":           { "value": "", "confidence": 0 },
  "total_value_usd":   { "value": 0,  "confidence": 0 },
  "currency":          { "value": "", "confidence": 0 },
  "incoterm":          { "value": "", "confidence": 0 },
  "payment_terms":     { "value": "", "confidence": 0 },
  "port_of_loading":   { "value": "", "confidence": 0 },
  "port_of_discharge": { "value": "", "confidence": 0 }
}

Notes:
- hs_code is the most important field — extract with maximum care.
- total_value_usd: convert to USD if another currency is shown, or set confidence low.
- If this is a product photo / spec sheet rather than an invoice, extract whatever
  trade-relevant data is visible and leave unrelated fields at confidence 0.
  `.trim(),

  // ── Packing List ────────────────────────────────────────────────────────────
  packing_list: `
Analyse this packing list or shipping document image and extract all visible fields.

Return this exact JSON structure (every field wrapped as { value, confidence }):
{
  "buyer_name":       { "value": "",  "confidence": 0 },
  "invoice_number":   { "value": "",  "confidence": 0 },
  "date":             { "value": "",  "confidence": 0 },
  "total_packages":   { "value": 0,   "confidence": 0 },
  "net_weight_kg":    { "value": 0.0, "confidence": 0 },
  "gross_weight_kg":  { "value": 0.0, "confidence": 0 },
  "volume_cbm":       { "value": 0.0, "confidence": 0 },
  "marks_and_numbers":{ "value": "",  "confidence": 0 },
  "port_of_loading":  { "value": "",  "confidence": 0 },
  "port_of_discharge":{ "value": "",  "confidence": 0 }
}

Notes:
- total_packages: count of cartons/boxes/units, not individual items.
- net_weight_kg and gross_weight_kg: extract in KG — convert from LBS if needed
  (set confidence to 0.7 if converted).
- volume_cbm: extract in cubic metres — convert from cubic feet if needed.
  `.trim(),

  // ── HS Code Classification ──────────────────────────────────────────────────
  hs_code: `
Analyse this image (product photo, spec sheet, technical drawing, or existing invoice)
and classify the product under the WCO Harmonised System 2022.

Return this exact JSON structure (every field wrapped as { value, confidence }):
{
  "product_name":        { "value": "", "confidence": 0 },
  "hs_code":             { "value": "", "confidence": 0 },
  "chapter_description": { "value": "", "confidence": 0 },
  "rationale":           { "value": "", "confidence": 0 },
  "material":            { "value": "", "confidence": 0 },
  "manufacturing_process":{ "value":"", "confidence": 0 }
}

Notes:
- hs_code: provide the 8-digit code in XXXX.XX.XX format.
- chapter_description: use the official WCO chapter/heading text.
- rationale: plain English explanation of why this HS code was chosen,
  referencing visible product characteristics (shape, material, ports, markings).
- If this is a product photo, infer from visible design features; set confidence
  proportional to how clearly classifiable the product is.
  `.trim(),
};
