"use client";

import { useState, useEffect, useRef } from "react";
import MessageBubble from "@/components/MessageBubble";
import Banner from "@/components/Banner";
import { useChat } from "@/hooks/useChat";
import type { Message } from "@/lib/api";

type Props = {
    conversationId?: string;
    initialMessages?: Message[];
    onEnsureConversation: () => Promise<string>;
};

export default function ChatWindow({ conversationId, initialMessages = [], onEnsureConversation }: Props) {
    const [input, setInput] = useState("");
    const { loading, error, messages, sendMessage } = useChat();
    const bottomRef = useRef<HTMLDivElement>(null);

    const allMessages = [
        ...initialMessages.map((m) => ({
            text: m.text,
            sender: m.role === "user" ? ("user" as const) : ("bot" as const),
            sources: m.sources,
        })),
        ...messages,
    ];

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [allMessages.length, loading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;
        const text = input;
        setInput("");
        const id = conversationId ?? (await onEnsureConversation());
        await sendMessage(text, id);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as unknown as React.FormEvent);
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-lg bg-white">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-2">
                {error && <Banner variant="error" message={error} />}
                {allMessages.length === 0 && (
                    <p className="mt-10 text-center text-sm text-gray-400">Ask a question about your documents.</p>
                )}
                {allMessages.map((msg, i) => (
                    <MessageBubble key={i} text={msg.text} sender={msg.sender} sources={msg.sources} />
                ))}
                {loading && <MessageBubble sender="bot" text="" isTyping={true} />}
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
