"use client";

import type { Conversation } from "@/lib/model";

type Props = {
    conversations: Conversation[];
    activeId: string | null;
    loading: boolean;
    onSelect: (id: string) => void;
    onNew: () => void;
};

const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });

export default function ConversationSidebar({ conversations, activeId, loading, onSelect, onNew }: Props) {
    return (
        <aside className="panel hidden w-56 shrink-0 flex-col gap-2 p-3 md:flex lg:w-64">
            <button onClick={onNew} className="btn btn-primary w-full">
                New conversation
            </button>
            {loading ? (
                <div className="mt-2 flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-9 animate-pulse rounded-lg bg-base" />
                    ))}
                </div>
            ) : conversations.length === 0 ? (
                <p className="hint mt-2 px-1">Your conversations will appear here.</p>
            ) : (
                <ul className="mt-1 flex flex-col gap-1 overflow-y-auto">
                    {conversations.map((c) => (
                        <li key={c.id}>
                            <button
                                onClick={() => onSelect(c.id)}
                                className={`w-full truncate rounded-lg px-3 py-2 text-left text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-plum/40 ${
                                    c.id === activeId
                                        ? "bg-base font-medium text-plum-deep"
                                        : "text-ink hover:bg-base/60"
                                }`}
                            >
                                {formatDate(c.created_at)}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </aside>
    );
}
