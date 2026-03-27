import { pipeline } from '@huggingface/transformers';
import type { RepoFile } from './github';
import { supabase } from './supabase';

interface SearchMatch {
  id: number;
  file_path: string;
  content: string;
  similarity: number;
}

interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

const API = 'https://generativelanguage.googleapis.com/v1';
const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY!;
const GEN_MODEL = process.env.GEN_MODEL || 'gemini-1.5-flash';

const cleanUrl = (url: string): string => {
  if (!url) return "";
  return String(url).trim().replace(/\/$/, "").toLowerCase();
};

// --- 1. LOCAL EMBEDDING SETUP ---
// Using any here is necessary for the external library, but we'll tell the linter it's okay.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      cache_dir: './.model_cache' 
    });
  }
  return extractor;
}

async function generateGeminiResponse(prompt: string): Promise<string> {
  if (!KEY) throw new Error('Missing Google API Key');

  const res = await fetch(`${API}/models/${GEN_MODEL}:generateContent?key=${KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      }
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API Error: ${res.status} - ${err}`);
  }

  const json = (await res.json()) as GeminiResponse;
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
}

export async function answerWithCitations(files: RepoFile[], question: string, repoUrl: string) {
  const normalizedUrl = cleanUrl(repoUrl);
  const generateEmbedding = await getExtractor();
  
  for (const file of files) {
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('repo_url', normalizedUrl)
      .eq('file_path', file.path)
      .maybeSingle();

    if (!existing) {
      const output = await generateEmbedding(file.content.slice(0, 3000), { 
        pooling: 'mean', 
        normalize: true 
      });
      const embedding = Array.from(output.data as number[]);

      await supabase.from('documents').insert({
        repo_url: normalizedUrl,
        file_path: file.path,
        content: file.content,
        embedding: embedding,
        metadata: { source: 'github', indexed_at: new Date().toISOString() }
      });
    }
  }

  const qOutput = await generateEmbedding(question, { pooling: 'mean', normalize: true });
  const qVec = Array.from(qOutput.data as number[]);

  const { data: matches, error: searchError } = await supabase.rpc('match_documents', {
    query_embedding: qVec,
    match_threshold: 0.3,
    match_count: 10,
    repo_url_filter: normalizedUrl
  });

  if (searchError) throw new Error(`Vector Search Error: ${searchError.message}`);

  const typedMatches = (matches as SearchMatch[]) || [];

  const context = typedMatches.length > 0
    ? typedMatches.map((m: SearchMatch) => `FILE: ${m.file_path}\nCONTENT:\n${m.content}`).join('\n---\n')
    : files.slice(0, 5).map(f => `FILE: ${f.path}\n${f.content}`).join('\n---\n');

  const finalPrompt = `
You are RepoScope AI, a Senior Software Architect and Security Engineer. 
Analyze the following code context from the repository: ${repoUrl}

QUESTION:
${question}

CONTEXT FROM CODEBASE:
${context}

INSTRUCTIONS:
1. Provide an **Executive Summary**.
2. Explain the **Logic Flow** or architecture related to the question.
3. Highlight **Security** or **Performance** observations.
4. Use **bold** for file names and function names.
5. If the context does not contain the answer, state that clearly.

FORMATTING RULES:
- ALWAYS add a full blank line (double newline) after every heading (###) and every bold definition (e.g., **Definition**:).
- Ensure each numbered list item starts on a new line with a blank line between items to improve readability.
- Use horizontal rules (---) to separate major sections.

Answer in professional Markdown.
`;

  const answer = await generateGeminiResponse(finalPrompt);

  return { 
    answer, 
    cited: typedMatches.map((m: SearchMatch) => ({ path: m.file_path })) 
  };
}