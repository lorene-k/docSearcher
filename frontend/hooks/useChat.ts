
import { chat } from "@/lib/api";
import { useState } from "react";

export type Message = {
    text: string;
    sender: "user" | "bot";
    sources?: {
        filename: string;
        chunk_text: string;
    }[];
}

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const sendMessage = async (input: string) => {
        try {
            setLoading(true);
            const userMessage: Message = { text: input, sender: "user" };
            setMessages((prev) => [...prev, userMessage]);
            const message = await chat(input);
            const botMessage: Message = { text: message.answer, sender: "bot", sources: message.sources };
            setMessages((prev) => [...prev, botMessage]);
        } catch {
            setError("Une erreur est survenue. Réessayez.");
        } finally {
            setLoading(false);
        }
    };

    return { loading, error, messages, sendMessage };
}