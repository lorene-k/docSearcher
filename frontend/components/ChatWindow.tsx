"use client";

import { useState, FormEvent } from "react";
import { chat, ChatResponse } from "@/lib/api";
import MessageBubble from "@/components/MessageBubble";
import SourceCard from "@/components/SourceCard";

export default function ChatWindow() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await chat(question);
      setResult(response);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Posez votre question..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="self-end px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Recherche..." : "Envoyer"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <MessageBubble text={result.answer} />
          {result.sources.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Sources
              </p>
              {result.sources.map((source, i) => (
                <SourceCard key={i} source={source} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
