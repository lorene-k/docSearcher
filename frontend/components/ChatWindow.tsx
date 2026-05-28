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
        <div className="flex flex-col gap-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Posez votre question..."
                    rows={3}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm resize-none transition-shadow"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="self-end px-4 py-2 text-sm bg-gray-900 text-white rounded-lg shadow-sm hover:bg-gray-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                    {loading ? "Recherche..." : "Envoyer"}
                </button>
            </form>

            {error && <Banner variant="error" message={error} />}

            {messages.length > 0 && (
                <div className="flex flex-col gap-4">
                    {messages.map((message, index) => (
                        <MessageBubble
                            key={index - Date.now()}
                            text={message.text}
                            sender={message.sender}
                            sources={message.sources}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
