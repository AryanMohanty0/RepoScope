import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { getRepoFilesWithContent } from '../../../../lib/github';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { repoUrl, branch, question } = await req.json();
    
    // 1. Fetch files from GitHub
    const { files, parts } = await getRepoFilesWithContent(repoUrl, 30);

    if (files.length === 0) {
      return Response.json({ error: 'No code files found in this repo.' }, { status: 400 });
    }

    // 2. Format the codebase into a single string for Gemini
    const codebaseContext = files
      .map(f => `FILE: ${f.path}\nCONTENT:\n${f.content}\n---`)
      .join("\n");

    // 3. Use Gemini to stream the result
    const result = await streamText({
      model: google('gemini-2.5-flash'), // Use 'gemini-1.5-flash' or the version you have access to
      system: `You are RepoScope AI, a Senior Software Architect. 
      Analyze the provided code context to answer the user's question. 
      Structure your response with: Executive Summary, Detailed Analysis, Security & Optimization, and Sources.
      Use Markdown headers and bold filenames.`,
      prompt: `Codebase Context from ${parts.owner}/${parts.repo}:\n${codebaseContext}\n\nUser Question: ${question}`,
    });

    // 4. Return the stream with the file list in headers for the UI
    const filePaths = files.map(f => f.path).join(',');
    
    return result.toTextStreamResponse({
      headers: { 'x-analyzed-files': filePaths,
        'x-repo-branch': parts.branch // Pass the detected branch back to the UI
       }
    });

  } catch (err: any) {
    console.error("Gemini API Error:", err);
    return Response.json({ error: err.message }, { status: 400 });
  }
}