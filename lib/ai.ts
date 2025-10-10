// lib/ai.ts
import type { RepoFile } from './github';

const API = 'https://generativelanguage.googleapis.com/v1';
const KEY = process.env.GOOGLE_API_KEY!;
const GEN_MODEL = process.env.GEN_MODEL || 'gemini-2.5-flash';
const EMB_MODEL = process.env.EMB_MODEL || 'text-embedding-004';

function assertKey() {
  if (!KEY) throw new Error('Missing GOOGLE_API_KEY');
}

async function embedOne(text: string): Promise<number[]> {
  assertKey();
  const res = await fetch(`${API}/models/${EMB_MODEL}:embedContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': KEY,
    },
    body: JSON.stringify({
      content: { parts: [{ text }] },
    }),
  });
  if (!res.ok) throw new Error(`Embed failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json.embedding?.values as number[]) ?? [];
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map((t) => embedOne(t)));
}

export async function embedOneText(text: string): Promise<number[]> {
  return embedOne(text);
}

function cosineSim(a: number[], b: number[]) {
  let dot = 0,
    na = 0,
    nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

function buildContext(files: { path: string; content: string }[]) {
  return files
    .map(
      (f) => `File: ${f.path}
\`\`\`
${f.content.slice(0, 4000)}
\`\`\``
    )
    .join('\n\n');
}

async function generateContent(prompt: string): Promise<string> {
  assertKey();
  const res = await fetch(`${API}/models/${GEN_MODEL}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': KEY,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) throw new Error(`Generate failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const text =
    json.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ??
    json.candidates?.[0]?.content?.parts?.[0]?.text ??
    '';
  return text;
}

export async function answerWithCitations(
  files: RepoFile[],
  question: string,
  topK = 8
): Promise<{ answer: string; cited: { path: string }[] }> {
  // Embed files (truncate for speed/cost)
  const truncated = files.map((f) => f.content.slice(0, 8000));
  const fileVecs = await embedTexts(truncated);
  const qVec = await embedOne(question);

  const ranked = files
    .map((f, i) => ({ file: f, score: cosineSim(fileVecs[i], qVec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(topK, fileVecs.length))
    .map((s) => s.file);

  const context = buildContext(ranked);
  const prompt = `
You are RepoScope, an AI coding assistant that answers questions about a GitHub repository using only the provided context.
- If the answer isn't fully supported by the context, say what's missing.
- Be concise and technical.
- End with a "Sources" list of file paths used.

Context:
${context}

Question: ${question}

Answer in Markdown with a "Sources" section listing file paths.`;

  const answer = await generateContent(prompt);
  return { answer, cited: ranked.map((f) => ({ path: f.path })) };
}