// ./app/page.tsx
'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

type Ref = { path: string; url: string };

export default function Page() {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string>('');
  const [refs, setRefs] = useState<Ref[]>([]);
  const [error, setError] = useState<string>('');

  async function onAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAnswer('');
    setRefs([]);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch: branch || undefined, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setAnswer(data.answer);
      setRefs(data.references || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 920, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>RepoScope</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Ask questions about a public GitHub repo. Free, fast prototype.
      </p>

      <form onSubmit={onAnalyze} style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
        <input
          placeholder="GitHub repo URL (e.g., https://github.com/vercel/next.js)"
          value={repoUrl}
          onChange={e => setRepoUrl(e.target.value)}
          required
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <input
          placeholder="Branch (optional, defaults to repo default)"
          value={branch}
          onChange={e => setBranch(e.target.value)}
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <textarea
          placeholder="Your question…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          required
          rows={4}
          style={{ padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 14px',
            borderRadius: 6,
            border: '1px solid #111',
            background: loading ? '#ccc' : '#111',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {loading ? 'Analyzing…' : 'Analyze repository'}
        </button>
      </form>

      {error && (
        <div style={{ marginBottom: 16, color: '#b00020' }}>
          {error}
        </div>
      )}

      {answer && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Answer</h2>
          <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 6 }}>
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>

          {!!refs.length && (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '16px 0 8px' }}>Sources</h3>
              <ul>
                {refs.map(r => (
                  <li key={r.path}>
                    <a href={r.url} target="_blank" rel="noreferrer">{r.path}</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <footer style={{ marginTop: 48, color: '#999', fontSize: 12 }}>
        Tip: Try small-to-medium public repos for fastest results. Private repos and giant monorepos are out-of-scope for this MVP.
      </footer>
    </main>
  );
}