"use client";

import { useState } from "react";
import { chat } from "@/lib/api";
import type { Source } from "@/lib/api";

export type Message = {
    text: string;
    sender: "user" | "bot";
    sources?: Source[];
};

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const sendMessage = async (input: string, conversationId?: string) => {
        setError("");
        setLoading(true);
        setMessages((prev) => [...prev, { text: input, sender: "user" }]);
        try {
            const response = await chat(input, conversationId);
            setMessages((prev) => [...prev, { text: response.answer, sender: "bot", sources: response.sources }]);
        } catch {
            setError("Une erreur est survenue. Réessayez.");
        } finally {
            setLoading(false);
        }
    };

    return { loading, error, messages, sendMessage };
}
