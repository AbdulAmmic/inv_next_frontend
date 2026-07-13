"use client";

/**
 * Floating AI assistant — only rendered when the platform admin has enabled
 * AI for this business (business.ai_enabled). Answers are generated from a
 * role-scoped snapshot of the tenant's own inventory/finance data (see ai.ts).
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { askAI } from "@/ai";
import { isAIEnabled } from "@/businessTheme";

interface Msg {
  role: "user" | "assistant" | "error";
  text: string;
}

const SUGGESTIONS = [
  "What are today's sales?",
  "How is this month going?",
  "What is low in stock?",
  "Today vs yesterday?",
];

export default function AIAssistant() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // business_info lands in localStorage shortly after login/boot — check on
  // mount and again whenever the tab regains focus (cheap, no polling).
  useEffect(() => {
    const check = () => setEnabled(isAIEnabled());
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  if (!enabled) return null;

  const send = async (q?: string) => {
    const question = (q ?? input).trim();
    if (!question || busy) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setBusy(true);
    try {
      const answer = await askAI(question);
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "error", text: e?.message || "The assistant could not answer. Check your connection and try again." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Launcher — bottom-left so it never collides with the sync banner (bottom-right) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 z-[9990] w-12 h-12 rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-200 flex items-center justify-center hover:bg-violet-700 active:scale-95 transition-all"
          title="Ask the AI assistant"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 left-6 z-[9990] w-[380px] max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-96px)] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-violet-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <div>
                <p className="text-sm font-black leading-none">AI Assistant</p>
                <p className="text-[10px] text-violet-200 font-bold mt-0.5">Answers from your own business data</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/15 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-bold text-center mt-4 mb-3">
                  Ask about your sales, stock or finances
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-violet-400 hover:text-violet-600 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-violet-600 text-white rounded-br-md"
                    : m.role === "error"
                    ? "bg-rose-50 text-rose-600 border border-rose-100 rounded-bl-md"
                    : "bg-white text-slate-700 border border-slate-200 rounded-bl-md"
                }`}
              >
                {m.text}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 px-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing your data...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="e.g. What are today's sales?"
              className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-all font-medium"
              disabled={busy}
            />
            <button
              onClick={() => send()}
              disabled={busy || !input.trim()}
              className="p-2.5 bg-violet-600 text-white rounded-xl disabled:opacity-40 hover:bg-violet-700 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
