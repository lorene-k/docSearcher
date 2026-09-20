"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createConversation, getConversations, getConversationMessages } from "@/lib/api";
import type { Conversation, Message } from "@/lib/api";

export function useConversations() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // Counts selections so a slow response for an earlier conversation cannot
    // overwrite the history of the one opened after it
    const selection = useRef(0);

    const fetchConversations = useCallback(
        () =>
            getConversations()
                .then(setConversations)
                .catch(() => setError("Could not load your conversations."))
                .finally(() => setLoading(false)),
        [],
    );

    useEffect(() => {
        void fetchConversations();
    }, [fetchConversations]);

    const retry = useCallback(() => {
        setLoading(true);
        setError("");
        void fetchConversations();
    }, [fetchConversations]);

    const selectConversation = useCallback(async (id: string) => {
        const current = ++selection.current;
        setActiveId(id);
        setError("");
        try {
            const messages = await getConversationMessages(id);
            if (selection.current === current) setHistoryMessages(messages);
        } catch {
            if (selection.current === current) {
                setHistoryMessages([]);
                setError("Could not open that conversation.");
            }
        }
    }, []);

    const newConversation = useCallback(async () => {
        const conv = await createConversation();
        selection.current += 1;
        setConversations((prev) => [conv, ...prev]);
        setActiveId(conv.id);
        setHistoryMessages([]);
        return conv;
    }, []);

    return {
        conversations,
        activeId,
        historyMessages,
        loading,
        error,
        retry,
        selectConversation,
        newConversation,
    };
}
