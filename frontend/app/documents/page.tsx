"use client";

import { useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import Banner from "@/components/Banner";
import Toast from "@/components/Toast";
import { useDocuments } from "@/hooks/useDocuments";

function DocumentsPageInner() {
    const { documents, loading, error, remove } = useDocuments();
    const [search, setSearch] = useState("");
    const [confirming, setConfirming] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

    const filtered = documents.filter((d) => d.toLowerCase().includes(search.toLowerCase()));

    const handleDelete = async (filename: string) => {
        setConfirming(null);
        try {
            await remove(filename);
            setToast({ message: `"${filename}" deleted.`, variant: "success" });
        } catch {
            // remove() already surfaces the failure via the error banner
        }
    };

    return (
        <div className="page-container">
            <h1 className="mb-2 text-lg font-semibold">Documents</h1>
            <p className="mb-6 text-sm text-gray-500">
                {documents.length} document{documents.length !== 1 ? "s" : ""} in the knowledge base.
            </p>

            {documents.length > 0 && (
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search files..."
                    className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                />
            )}

            {error && <Banner variant="error" className="mb-4" message={error} />}

            {loading && (
                <ul className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                        <li key={i} className="h-12 animate-pulse card bg-gray-100 px-4 py-3" />
                    ))}
                </ul>
            )}

            {!loading && documents.length === 0 && (
                <div className="card px-6 py-10 text-center">
                    <p className="mb-2 text-sm text-gray-400">No documents uploaded yet.</p>
                    <Link href="/upload" className="text-sm text-blue-600 underline">
                        Upload a document
                    </Link>
                </div>
            )}

            {!loading && documents.length > 0 && filtered.length === 0 && (
                <p className="text-sm text-gray-400">{`No results for "${search}".`}</p>
            )}

            {!loading && filtered.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {filtered.map((name) => (
                        <li key={name} className="flex items-center justify-between card px-4 py-3">
                            <span className="truncate text-base text-gray-700">{name}</span>
                            {confirming === name ? (
                                <div className="ml-4 flex shrink-0 items-center gap-2">
                                    <span className="text-xs text-gray-500">Delete?</span>
                                    <button
                                        onClick={() => handleDelete(name)}
                                        className="text-xs font-medium text-red-600 hover:underline"
                                    >
                                        Yes
                                    </button>
                                    <button
                                        onClick={() => setConfirming(null)}
                                        className="text-xs text-gray-500 hover:underline"
                                    >
                                        No
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirming(name)}
                                    className="ml-4 shrink-0 text-xs text-gray-400 transition-colors hover:text-red-500"
                                >
                                    Delete
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
        </div>
    );
}

export default function DocumentsPage() {
    return (
        <AuthGuard>
            <DocumentsPageInner />
        </AuthGuard>
    );
}
