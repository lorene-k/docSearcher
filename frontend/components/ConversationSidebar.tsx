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
        <aside className="hidden md:flex md:flex-col w-48 shrink-0 gap-2 border-r border-gray-100 pr-4">
            <button onClick={onNew} className="w-full text-left px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
                + Nouvelle
            </button>
            {loading ? (
                <div className="flex flex-col gap-2 mt-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />)}
                </div>
            ) : conversations.length === 0 ? (
                <p className="text-xs text-gray-400 mt-2 px-1">Aucune conversation.</p>
            ) : (
                <ul className="flex flex-col gap-1 mt-1">
                    {conversations.map((c) => (
                        <li key={c.id}>
                            <button
                                onClick={() => onSelect(c.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors truncate ${c.id === activeId ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                            >
                                {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </aside>
    );
}
