import { pipeline } from '@huggingface/transformers';
import type { RepoFile } from './github';
import { supabase } from './supabase';

const API = 'https://generativelanguage.googleapis.com/v1';
const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY!;
const GEN_MODEL = process.env.GEN_MODEL || 'gemini-1.5-flash'; // Adjusted to current stable Flash versions

/**
 * Standardizes the URL to ensure database lookups match regardless of 
 * trailing slashes or capitalization.
 */
const cleanUrl = (url: string) => {
  if (!url) return "";
  return String(url).trim().replace(/\/$/, "").toLowerCase();
};

// --- 1. LOCAL EMBEDDING SETUP ---
let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    // Using MiniLM-L6-v2: Fast, local, and 384 dimensions
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      cache_dir: './.model_cache' 
    });
  }
  return extractor;
}

// --- 2. GEMINI TEXT GENERATION ---
async function generateGeminiResponse(prompt: string): Promise<string> {
  if (!KEY) throw new Error('Missing Google API Key');

  const res = await fetch(`${API}/models/${GEN_MODEL}:generateContent?key=${KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2, // Low temperature for technical accuracy
        maxOutputTokens: 2048,
      }
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API Error: ${res.status} - ${err}`);
  }

  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
}

// --- 3. MAIN LOGIC: SYNC -> SEARCH -> ANSWER ---
export async function answerWithCitations(files: RepoFile[], question: string, repoUrl: string) {
  const normalizedUrl = cleanUrl(repoUrl);
  const generateEmbedding = await getExtractor();
  
  // STEP A: SYNC FILES TO SUPABASE
  // We check if the file version exists; if not, we embed and save.
  for (const file of files) {
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('repo_url', normalizedUrl)
      .eq('file_path', file.path)
      .maybeSingle();

    if (!existing) {
      console.log(`🚀 Indexing new file: ${file.path}`);
      // Generate 384-dimensional embedding
      const output = await generateEmbedding(file.content.slice(0, 3000), { 
        pooling: 'mean', 
        normalize: true 
      });
      const embedding = Array.from(output.data);

      await supabase.from('documents').insert({
        repo_url: normalizedUrl,
        file_path: file.path,
        content: file.content,
        embedding: embedding,
        metadata: { source: 'github', indexed_at: new Date().toISOString() }
      });
    }
  }

  // STEP B: VECTOR SEARCH
  // Embed the user's question to find the most relevant parts of the code
  const qOutput = await generateEmbedding(question, { pooling: 'mean', normalize: true });
  const qVec = Array.from(qOutput.data);

  const { data: matches, error: searchError } = await supabase.rpc('match_documents', {
    query_embedding: qVec,
    match_threshold: 0.3, // Adjust based on how strict you want the search to be
    match_count: 10,      // Number of file chunks to send to Gemini
    repo_url_filter: normalizedUrl
  });

  if (searchError) throw new Error(`Vector Search Error: ${searchError.message}`);

  // STEP C: CONSTRUCT PROMPT & GET ANSWER
  // Even if 0 matches found in Vector, we fallback to the files provided in the current fetch
  const context = (matches && matches.length > 0)
    ? matches.map((m: any) => `FILE: ${m.file_path}\nCONTENT:\n${m.content}`).join('\n---\n')
    : files.slice(0, 5).map(f => `FILE: ${f.path}\n${f.content}`).join('\n---\n');

  const finalPrompt = `
You are RepoScope AI, a Senior Software Architect. 
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
6. ALWAYS add a full blank line (double newline) after every heading (###) and every bold definition (e.g., **Definition**:).
7.Ensure each numbered list item starts on a new line with a blank line between items to improve readability.

Answer in professional Markdown.
`;

  const answer = await generateGeminiResponse(finalPrompt);

  // Return the answer and the specific files Gemini used for the analysis
  return { 
    answer, 
    cited: (matches || []).map((m: any) => ({ path: m.file_path })) 
  };
}