'use client';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronRight, Trash2, X } from "lucide-react";
// Adjust the path below if your lib folder is at the root
import { supabase } from "../../lib/supabase"; 
import { GithubIcon } from "../components/icons/Githubicons"

export default function HistorySidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Fetches the 10 most recent analyses globally
  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  // Re-fetch history every time the sidebar is opened
  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed right-6 top-1/2 -translate-y-1/2 z-40 p-3 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white group shadow-xl"
        title="Recent Activity"
      >
        <Clock size={20} className="group-hover:rotate-[-20deg] transition-transform" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Dark Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />

            {/* Sidebar Panel */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-80 bg-zinc-950 border-l border-zinc-800 z-[70] p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
                    <Clock size={16} className="text-indigo-400" />
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-200">
                    Recent Activity
                  </h2>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-1 hover:bg-zinc-900 rounded-md text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {history.length > 0 ? history.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:border-indigo-500/40 hover:bg-zinc-900/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 mb-1 min-w-0">
                        <GithubIcon size={14} className="text-zinc-500 shrink-0" />
                        <span className="text-xs font-semibold text-zinc-300 truncate">
                          {item.repo_name}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-zinc-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-zinc-600 font-medium">
                        {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-500">
                        Public Analysis
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                      <Clock size={20} className="text-zinc-700" />
                    </div>
                    <p className="text-zinc-500 text-xs">No activity yet.<br/>Start an analysis to see it here!</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-900">
                <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
                  Displaying the latest global repository insights powered by RepoScope AI.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}