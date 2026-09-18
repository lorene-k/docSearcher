"use client";

import { useCallback, useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import ChatWindow from "@/components/ChatWindow";
import ConversationSidebar from "@/components/ConversationSidebar";
import Toast from "@/components/Toast";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";

function ChatPageInner() {
    const { conversations, activeId, historyMessages, loading, selectConversation, newConversation } =
        useConversations();
    const chat = useChat();
    // Only rendered client-side once AuthGuard has confirmed a session, so reading window here is safe.
    const [showConfirmedToast, setShowConfirmedToast] = useState(
        () => new URLSearchParams(window.location.search).get("email_confirmed") === "1",
    );
    const dismissConfirmedToast = useCallback(() => setShowConfirmedToast(false), []);

    useEffect(() => {
        if (showConfirmedToast) window.history.replaceState(null, "", "/chat");
    }, [showConfirmedToast]);

    const openConversation = (id: string) => {
        chat.reset();
        selectConversation(id);
    };

    const startConversation = () => {
        chat.reset();
        newConversation();
    };

    const send = async (text: string) => {
        const id = activeId ?? (await newConversation()).id;
        await chat.sendMessage(text, id);
    };

    return (
        <div className="mx-auto flex h-[calc(100vh-57px)] w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row">
            <ConversationSidebar
                conversations={conversations}
                activeId={activeId}
                loading={loading}
                onSelect={openConversation}
                onNew={startConversation}
            />
            <div className="flex min-h-0 flex-1 flex-col">
                <h1 className="mb-4 text-lg font-semibold">Chat</h1>
                <ChatWindow
                    messages={[...historyMessages, ...chat.messages]}
                    loading={chat.loading}
                    error={chat.error}
                    onSend={send}
                />
            </div>
            {showConfirmedToast && (
                <Toast
                    message="Email confirmed. You're logged in."
                    variant="success"
                    duration={5000}
                    onDismiss={dismissConfirmedToast}
                />
            )}
        </div>
    );
}

export default function ChatPage() {
    return (
        <AuthGuard>
            <ChatPageInner />
        </AuthGuard>
    );
}
