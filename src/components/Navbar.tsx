'use client';

import { motion } from "framer-motion";
import { GithubIcon } from "./icons/Githubicons";
import Link from "next/link";
import { ScopeIcon } from "./icons/ScopeIcon"; // ADD THIS

export default function Navbar() {
  return (
    <div className="fixed top-6 inset-x-0 max-w-4xl mx-auto z-[50] px-4">
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between px-6 py-3 bg-zinc-900/70 backdrop-blur-lg border border-zinc-800 rounded-full shadow-2xl"
      >
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center shadow-lg      transition-all group-hover:border-indigo-500/50 group-hover:scale-105">
            {/* NEW SCOPE ICON */}
            <ScopeIcon className="w-6 h-6 text-indigo-400 group-hover:text-white transition-colors" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            RepoScope
          </span>
        </Link>

        {/* Action Icons Section */}
        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/AryanMohanty0/RepoScope" 
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-zinc-400 hover:text-white transition-all hover:scale-110 active:scale-95"
            title="View Source on GitHub"
          >
            <GithubIcon size={22} />
          </a>
          
          {/* Subtle CTA / Status Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              System Live
            </span>
          </div>
        </div>
      </motion.nav>
    </div>
  );
}