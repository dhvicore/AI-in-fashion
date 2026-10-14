import { z } from 'zod';
import { HttpError } from '../lib/errors.js';

export const photoAnalysisSchema = z.object({
  garments: z.array(z.object({ name: z.string().trim().min(1).max(100), color: z.string().trim().min(1).max(80) })).max(12),
  score: z.number().min(0).max(100).nullable(),
  summary: z.string().trim().min(1).max(1500),
  corrections: z.array(z.string().trim().min(1).max(500)).max(5),
  limitations: z.string().trim().max(1000),
}).refine((value) => value.garments.length === 0 || value.score === null || value.corrections.length > 0,
  'A scored outfit must include styling suggestions')
  .refine((value) => value.garments.length === 0 || value.score !== null || value.limitations.length > 0,
    'Explain why visible clothing cannot be scored');

export function validateAnalysis(value: unknown) {
  const result = photoAnalysisSchema.safeParse(value);
  if (!result.success) throw new HttpError(502, 'The local model returned an incomplete analysis. Please retry.');
  // Never attach a styling score or clothing corrections to a photo with no detected clothes.
  return result.data.garments.length === 0 ? { ...result.data, score: null, corrections: [] } : result.data;
}

export function parseModelAnswer(content: string, doneReason?: string) {
  if (!content.trim() || doneReason === 'length') throw new HttpError(502, 'The local model did not finish its analysis. Please retry with a clear, smaller outfit photo.');
  let parsed: unknown;
  try { parsed = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  catch { throw new HttpError(502, 'The local model returned an unreadable result. Please retry.'); }
  return validateAnalysis(parsed);
}
export const model = process.env.OLLAMA_MODEL ?? 'qwen3-vl:4b';
let busy = false;

export async function analyzePhoto(image: Buffer) {
  if (busy) throw new HttpError(429, 'Another photo is being analyzed. Please wait and retry.');
  busy = true;
  try {
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(360_000),
      body: JSON.stringify({ model, stream: false, think: false,
        messages: [{ role: 'user', images: [image.toString('base64')], content:
          'Identify only the actual visible garments and their main colours. Do not invent hidden clothing, fabric properties or fit. Do not judge the person or give a styling score. Reply only JSON with keys garments (array of {name,color}), score (always null), summary (one sentence), corrections (always []), limitations (mention uncertainty or partial views and ask the user to confirm the clothes). If no clothing is visible, garments=[] and explain why.' }],
        options: { temperature: 0, seed: 42, num_predict: 4096, num_ctx: 8192 },
      }),
    }).catch(() => { throw new HttpError(503, 'The local vision model is unavailable or took too long. Start Ollama and retry. No photo analysis was generated.'); });
    if (!response.ok) throw new HttpError(503, 'The installed local vision model could not analyze this photo. Check Ollama and retry.');
    const data = await response.json() as { message?: { content?: string }; done_reason?: string };
    const content = data.message?.content?.trim() ?? '';
    // Only use the model's final answer, never its unfinished internal reasoning.
    const detected = parseModelAnswer(content, data.done_reason);
    return { ...detected, score: null, corrections: [], limitations: detected.limitations || 'Confirm the detected clothing before scoring.' };
  } finally { busy = false; }
}
