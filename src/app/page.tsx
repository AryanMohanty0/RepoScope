'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Terminal, Link as LinkIcon, AlertCircle, FileText, History, Copy, Check, Loader2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';


import Navbar from "../components/Navbar";
import Features from '../components/Features';

type Ref = { path: string; url: string };
type LocalRepo = { name: string; url: string };

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string>('');
  const [refs, setRefs] = useState<Ref[]>([]);
  const [error, setError] = useState<string>('');
  const [recentRepos, setRecentRepos] = useState<LocalRepo[]>([]);
  const [copied, setCopied] = useState(false);

  // Load Local History on mount
  useEffect(() => {
    const saved = localStorage.getItem('reposcope_history');
    if (saved) {
      try {
        setRecentRepos(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }
  }, []);

  const addToHistory = (url: string) => {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length < 2) return;
      const name = `${parts[0]}/${parts[1]}`;
      const newEntry = { name, url };
      const updated = [newEntry, ...recentRepos.filter(r => r.url !== url)].slice(0, 5);
      setRecentRepos(updated);
      localStorage.setItem('reposcope_history', JSON.stringify(updated));
    } catch (e) { console.error(e); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      if (!res.ok) {
        const fullText = await res.text();
        try {
          const errJson = JSON.parse(fullText);
          throw new Error(errJson.error || 'Analysis failed');
        } catch {
          throw new Error(fullText || 'Server Error');
        }
      }

      // --- FIX: URL CLEANING LOGIC ---
      // This helper ensures we get https://github.com/owner/repo 
      // even if the user pasted a URL containing /tree/main/ or other fluff.
      const getCleanBase = (url: string) => {
        try {
          const u = new URL(url);
          const parts = u.pathname.split('/').filter(Boolean);
          // Only take origin + first two parts (owner & repo)
          return `${u.origin}/${parts[0]}/${parts[1]}`;
        } catch {
          return url.replace(/\/$/, '');
        }
      };

      const base = getCleanBase(repoUrl);
      
      // Get branch from headers (detected by server) or fallback to input/main
      const serverBranch = res.headers.get('x-repo-branch') || branch || 'main';

      // 2. GET SOURCES FROM HEADERS
      const analyzedFiles = res.headers.get('x-analyzed-files');
      if (analyzedFiles) {
        const paths = analyzedFiles.split(',');
        const newRefs = paths.map(path => ({
          path,
          // Correct structure: https://github.com/user/repo/blob/main/README.md
          url: `${base}/blob/${serverBranch}/${path}`
        }));
        setRefs(newRefs);
      }

      // 3. HANDLE THE STREAM
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No response stream available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break; 
        
        const chunk = decoder.decode(value);
        setAnswer((prev) => prev + chunk); 
      }

      addToHistory(repoUrl);
      setTimeout(() => window.scrollTo({ top: 700, behavior: 'smooth' }), 100);

    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30">
      <Navbar />

      <div className="relative pt-32 pb-20 px-6 flex flex-col items-center overflow-hidden">
        <div className="absolute top-0 -z-10 h-[500px] w-full bg-indigo-500/10 blur-[120px]" />
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6 uppercase tracking-widest">
            <Sparkles size={14} />
            <span>AI Code Architect</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
            Bringing any codebase into focus.
          </h1>
          <p className="text-zinc-400 text-lg">Analyze Repositories, Map the logic and Trace every answer to its file.</p>
        </motion.div>

        <motion.div className="w-full max-w-2xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl z-10">
          <form onSubmit={onAnalyze} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="GitHub Repo URL" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
              <input placeholder="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
            </div>
            <textarea placeholder="How does the logic flow in this repo?" value={question} onChange={(e) => setQuestion(e.target.value)} required rows={3} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Analyzing...</span>
                </>
              ) : (
                "Analyze Codebase"
              )}
            </button>
          </form>

          {recentRepos.length > 0 && (
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <p className="text-[10px] font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
                <History size={12} /> Recent
              </p>
              <div className="flex flex-wrap gap-2">
                {recentRepos.map((repo, i) => (
                  <button key={i} onClick={() => setRepoUrl(repo.url)} className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-[10px] hover:border-indigo-500/50 transition-all">
                    {repo.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm flex items-center gap-3">
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {answer && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto px-6 pb-32 grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                    <FileText className="text-indigo-400" size={20} />
                  </div>
                  <h2 className="text-xl font-bold">Analysis Insight</h2>
                </div>
                <button onClick={handleCopy} className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white flex items-center gap-2 transition-colors">
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="prose prose-invert max-w-none bg-zinc-900/30 border border-zinc-800 rounded-[2rem] p-8 shadow-xl leading-relaxed">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-xl border border-zinc-800 my-4"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs" {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {answer}
                </ReactMarkdown>
                {loading && <span className="inline-block w-2 h-4 bg-indigo-500 ml-1 animate-pulse" />}
              </div>
            </div>

            {/* Sidebar with Citations */}
            <div className="space-y-6 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-600">Context Sources</h3>
              <div className="space-y-3">
                {refs.length > 0 ? refs.map((r) => (
                  <a key={r.path} href={r.url} target="_blank" rel="noreferrer" className="group block p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl text-sm hover:border-indigo-500/50 transition-all">
                    <p className="text-zinc-300 truncate font-mono text-xs mb-2">{r.path}</p>
                    <span className="text-[10px] text-zinc-600 group-hover:text-indigo-400 font-bold uppercase transition-colors">View Source →</span>
                  </a>
                )) : (
                  <p className="text-xs text-zinc-600 italic">No specific files cited yet...</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!answer && <Features />}
    </main>
  );
}