"use client";

import { useState, useEffect, useCallback } from "react";
import { createConversation, getConversations, getConversationMessages } from "@/lib/api";
import type { Conversation, Message } from "@/lib/api";

export function useConversations() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getConversations()
            .then(setConversations)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const selectConversation = useCallback(async (id: string) => {
        setActiveId(id);
        try {
            setHistoryMessages(await getConversationMessages(id));
        } catch {
            setHistoryMessages([]);
        }
    }, []);

    const newConversation = useCallback(async () => {
        const conv = await createConversation();
        setConversations((prev) => [conv, ...prev]);
        setActiveId(conv.id);
        setHistoryMessages([]);
        return conv;
    }, []);

    return { conversations, activeId, historyMessages, loading, selectConversation, newConversation };
}
