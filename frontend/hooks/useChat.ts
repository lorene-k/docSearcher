"use client";

import { useState } from "react";
import { chat } from "@/lib/api";
import type { Source } from "@/lib/api";

export type ChatMessage = { role: "user" | "assistant"; text: string; sources?: Source[] };

export function useChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const sendMessage = async (input: string, conversationId?: string) => {
        setError("");
        setLoading(true);
        setMessages((prev) => [...prev, { role: "user", text: input }]);
        try {
            const response = await chat(input, conversationId);
            setMessages((prev) => [...prev, { role: "assistant", text: response.answer, sources: response.sources }]);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Forgets the messages sent so far, so opening another conversation does not mix them with its history
    const reset = () => {
        setMessages([]);
        setError("");
    };

    return { loading, error, messages, sendMessage, reset };
}
