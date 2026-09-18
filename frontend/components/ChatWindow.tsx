"use client";

import { useState, useEffect, useRef } from "react";
import MessageBubble from "@/components/MessageBubble";
import Banner from "@/components/Banner";
import type { ChatMessage } from "@/hooks/useChat";

type Props = {
    messages: ChatMessage[];
    loading: boolean;
    error: string;
    onSend: (text: string) => Promise<void>;
};

export default function ChatWindow({ messages, loading, error, onSend }: Props) {
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length, loading]);

    const submit = () => {
        if (!input.trim() || loading) return;
        const text = input;
        setInput("");
        onSend(text);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submit();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-lg bg-white">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-2">
                {error && <Banner variant="error" message={error} />}
                {messages.length === 0 && (
                    <p className="mt-10 text-center text-sm text-gray-400">Ask a question about your documents.</p>
                )}
                {messages.map((msg, i) => (
                    <MessageBubble key={i} text={msg.text} role={msg.role} sources={msg.sources} />
                ))}
                {loading && <MessageBubble role="assistant" text="" isTyping={true} />}
                <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSubmit} className="flex items-end gap-2 pt-4">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask your question... (Enter to send)"
                    rows={2}
                    className="flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm transition-shadow placeholder:text-gray-400 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="self-stretch rounded-lg bg-gray-900 px-4 py-2 text-sm whitespace-nowrap text-white shadow-sm transition-all duration-200 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? "..." : "Send"}
                </button>
            </form>
        </div>
    );
}
