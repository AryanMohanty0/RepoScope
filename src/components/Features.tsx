'use client';

import { motion } from "framer-motion";
import { Zap, Shield, Search, MessageSquare, Code2, Cpu } from "lucide-react";

const features = [
  {
    title: "Instant Context",
    description: "Our AI maps your entire codebase in seconds, not hours. Understand complex logic instantly.",
    icon: <Zap className="text-indigo-400" size={24} />,
  },
  {
    title: "Deep Search",
    description: "Go beyond grep. Find where functions are defined and how they interact across files.",
    icon: <Search className="text-indigo-400" size={24} />,
  },
  {
    title: "Private & Secure",
    description: "Your code never leaves the context of the analysis. We support private repos with GitHub OAuth.",
    icon: <Shield className="text-indigo-400" size={24} />,
  },
  {
    title: "Semantic Understanding",
    description: "Ask questions in plain English. 'Where is the auth logic?' or 'How do I add a new route?'",
    icon: <MessageSquare className="text-indigo-400" size={24} />,
  },
  {
    title: "Multi-Language",
    description: "Support for TypeScript, Python, Go, Rust, and more. One tool for all your repositories.",
    icon: <Code2 className="text-indigo-400" size={24} />,
  },
  {
    title: "Vector Powered",
    description: "Built on Supabase Vector and OpenAI for lightning-fast, high-accuracy code retrieval.",
    icon: <Cpu className="text-indigo-400" size={24} />,
  },
];

export default function Features() {
  return (
    <section className="py-24 px-6 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Built for modern engineers</h2>
        <p className="text-zinc-500 max-w-xl mx-auto">
          RepoScope combines vector search with LLMs to give you a superpower: 
          the ability to speak to any codebase.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-3xl hover:border-indigo-500/50 transition-all group"
          >
            <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
            <p className="text-zinc-500 leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}