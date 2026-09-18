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
        <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="card flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                {error && <Banner variant="error" message={error} />}
                {messages.length === 0 && (
                    <p className="hint mt-10 text-center">Ask a question about the documents shared with you.</p>
                )}
                {messages.map((msg, i) => (
                    <MessageBubble key={i} text={msg.text} role={msg.role} sources={msg.sources} />
                ))}
                {loading && <MessageBubble role="assistant" text="" isTyping={true} />}
                <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask your question (Enter to send)"
                    aria-label="Your question"
                    rows={2}
                    className="field flex-1 resize-none"
                />
                <button type="submit" disabled={loading || !input.trim()} className="btn btn-primary self-stretch">
                    {loading ? "..." : "Send"}
                </button>
            </form>
        </div>
    );
}
