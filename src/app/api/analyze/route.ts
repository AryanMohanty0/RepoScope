import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { getRepoFilesWithContent } from '../../../../lib/github';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Rename 'branch' to '_branch' to fix the "unused-vars" warning
    const { repoUrl, branch: _branch, question } = await req.json();
    
    // 2. Fetch files from GitHub
    const { files, parts } = await getRepoFilesWithContent(repoUrl, 30);

    if (files.length === 0) {
      return Response.json({ error: 'No code files found in this repo.' }, { status: 400 });
    }

    // 3. Format the codebase into a single string for Gemini
    const codebaseContext = files
      .map(f => `FILE: ${f.path}\nCONTENT:\n${f.content}\n---`)
      .join("\n");

    // 4. Use Gemini to stream the result
    const result = await streamText({
      model: google('gemini-2.5-flash'), // Ensure this matches your enabled model version
      system: `You are RepoScope AI, a Senior Software Architect and Security Engineer. 
      Analyze the provided code context from the repository: ${repoUrl}

      INSTRUCTIONS:
      1. Provide an **Executive Summary**.
      2. Explain the **Logic Flow** or architecture related to the question.
      3. Highlight **Security** or **Performance** observations.
      4. Use **bold** for file names and function names.
      
      FORMATTING RULES:
      - ALWAYS add a full blank line (double newline) after every heading (###) and every bold definition.
      - Ensure each numbered list item starts on a new line with a blank line between items.
      - Use horizontal rules (---) to separate major sections.`,
      prompt: `Codebase Context from ${parts.owner}/${parts.repo}:\n${codebaseContext}\n\nUser Question: ${question}`,
    });

    // 5. Return the stream with the file list in headers for the UI
    const filePaths = files.map(f => f.path).join(',');
    
    return result.toTextStreamResponse({
      headers: { 
        'x-analyzed-files': filePaths,
        'x-repo-branch': parts.branch 
      }
    });

  } catch (err: unknown) { 
    // 6. Changed 'any' to 'unknown' and added a type check to fix the "no-explicit-any" error
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error("Gemini API Error:", err);
    return Response.json({ error: errorMessage }, { status: 400 });
  }
}