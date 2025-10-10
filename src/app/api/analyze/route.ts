// src/app/api/analyze/route.ts
import { z } from 'zod';
import { getRepoFilesWithContent } from '@/lib/github';
import { answerWithCitations } from '@/lib/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  repoUrl: z.string().url(),
  branch: z.string().optional(),
  question: z.string().min(5, 'Ask a longer question for better results'),
});

type ApiOk = { answer: string; references: { path: string; url: string }[] };
type ApiErr = { error: string };

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const effectiveUrl = body.branch
      ? `${body.repoUrl.replace(/\/$/, '')}/tree/${body.branch}`
      : body.repoUrl;

    const { files, parts } = await getRepoFilesWithContent(effectiveUrl, 30);

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No readable text files found in this repo.' } satisfies ApiErr),
        { status: 400 }
      );
    }

    const { answer, cited } = await answerWithCitations(files, body.question, 8);

    const blobBase = `https://github.com/${parts.owner}/${parts.repo}/blob/${parts.branch}`;
    const references = cited.map((c) => ({ path: c.path, url: `${blobBase}/${c.path}` }));

    return Response.json({ answer, references } satisfies ApiOk);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Analysis failed';
    return new Response(JSON.stringify({ error: msg } satisfies ApiErr), { status: 400 });
  }
}