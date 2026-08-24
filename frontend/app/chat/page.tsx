"use client";

import AuthGuard from "@/components/AuthGuard";
import ChatWindow from "@/components/ChatWindow";
import ConversationSidebar from "@/components/ConversationSidebar";
import { useConversations } from "@/hooks/useConversations";

function ChatPageInner() {
    const { conversations, activeId, historyMessages, loading, selectConversation, newConversation } = useConversations();

    return (
        <div className="flex h-[calc(100vh-57px)] px-6 py-6 max-w-5xl mx-auto w-full gap-6">
            <ConversationSidebar
                conversations={conversations}
                activeId={activeId}
                loading={loading}
                onSelect={selectConversation}
                onNew={newConversation}
            />
            <div className="flex flex-col flex-1 min-h-0">
                <h1 className="text-lg font-semibold mb-4">Chat</h1>
                <ChatWindow
                    conversationId={activeId ?? undefined}
                    initialMessages={historyMessages}
                    onEnsureConversation={async () => (await newConversation()).id}
                />
            </div>
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
