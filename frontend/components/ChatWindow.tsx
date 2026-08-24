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
        <div className="flex flex-col flex-1 gap-4 min-h-0 rounded-lg bg-white">
            <div className="flex flex-col gap-4 flex-1 overflow-y-auto p-2">
                {error && <Banner variant="error" message={error} />}
                {allMessages.length === 0 && (
                    <p className="text-sm text-gray-400 text-center mt-10">Posez une question sur vos documents.</p>
                )}
                {allMessages.map((msg, i) => (
                    <MessageBubble key={i} text={msg.text} sender={msg.sender} sources={msg.sources} />
                ))}
                {loading && <MessageBubble sender="bot" text="" isTyping={true} />}
                <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2 items-end pt-4">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Posez votre question... (Entrée pour envoyer)"
                    rows={2}
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm resize-none transition-shadow"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg shadow-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 whitespace-nowrap self-stretch"
                >
                    {loading ? "..." : "Envoyer"}
                </button>
            </form>
        </div>
    );
}
