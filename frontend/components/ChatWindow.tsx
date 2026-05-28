"use client";

import { useState } from "react";
import MessageBubble from "@/components/MessageBubble";
import Banner from "@/components/Banner";
import { useChat } from "@/hooks/useChat";

export default function ChatWindow() {
    const [input, setInput] = useState("");
    const { loading, error, messages, sendMessage } = useChat();

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        await sendMessage(input);
        setInput("");
    };

    return (
        <div className="flex flex-col flex-1 gap-4 min-h-0 rounded-lg bg-white p-4">
            {/* Scrollable message zone */}
            <div className="flex flex-col gap-4 flex-1 overflow-y-auto py-2">
                {error && <Banner variant="error" message={error} />}
                {messages.length === 0 && (
                    <p className="text-sm text-gray-400 text-center mt-10">
                        Posez une question sur vos documents.
                    </p>
                )}
                {messages.map((message, index) => (
                    <MessageBubble
                        key={index}
                        text={message.text}
                        sender={message.sender}
                        sources={message.sources}
                    />
                ))}
                {loading && <MessageBubble sender="bot" text="" isTyping={true} />}
            </div>

            {/* Bottom input zone */}
            <form onSubmit={handleSubmit} className="flex gap-2 items-end pt-4">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Posez votre question..."
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
