"use client";

import type { Conversation } from "@/lib/api";

type Props = {
    conversations: Conversation[];
    activeId: string | null;
    loading: boolean;
    onSelect: (id: string) => void;
    onNew: () => void;
};

export default function ConversationSidebar({ conversations, activeId, loading, onSelect, onNew }: Props) {
    return (
        <aside className="hidden w-48 shrink-0 gap-2 border-r border-gray-100 pr-4 md:flex md:flex-col">
            <button
                onClick={onNew}
                className="w-full rounded-lg bg-gray-900 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-gray-700"
            >
                + New
            </button>
            {loading ? (
                <div className="mt-2 flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-9 animate-pulse rounded bg-gray-100" />
                    ))}
                </div>
            ) : conversations.length === 0 ? (
                <p className="mt-2 px-1 text-xs text-gray-400">No conversations yet.</p>
            ) : (
                <ul className="mt-1 flex flex-col gap-1">
                    {conversations.map((c) => (
                        <li key={c.id}>
                            <button
                                onClick={() => onSelect(c.id)}
                                className={`w-full truncate rounded-lg px-3 py-2 text-left text-xs transition-colors ${c.id === activeId ? "bg-blue-50 font-medium text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
                            >
                                {new Date(c.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </aside>
    );
}
