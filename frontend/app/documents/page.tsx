"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
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
            setToast({ message: `"${filename}" supprimé.`, variant: "success" });
        } catch {
            // remove() already surfaces the failure via the error banner
        }
    };

    return (
        <div className="page-container">
            <h1 className="text-lg font-semibold mb-2">Documents</h1>
            <p className="text-sm text-gray-500 mb-6">{documents.length} document{documents.length !== 1 ? "s" : ""} dans la base.</p>

            {documents.length > 0 && (
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un fichier..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">{error}</p>}

            {loading && (
                <ul className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => <li key={i} className="card px-4 py-3 h-12 bg-gray-100 animate-pulse" />)}
                </ul>
            )}

            {!loading && documents.length === 0 && (
                <div className="card px-6 py-10 text-center">
                    <p className="text-sm text-gray-400 mb-2">Aucun document importé.</p>
                    <a href="/upload" className="text-sm text-blue-600 underline">Importer un document</a>
                </div>
            )}

            {!loading && documents.length > 0 && filtered.length === 0 && (
                <p className="text-sm text-gray-400">Aucun résultat pour &ldquo;{search}&rdquo;.</p>
            )}

            {!loading && filtered.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {filtered.map((name) => (
                        <li key={name} className="card px-4 py-3 flex items-center justify-between">
                            <span className="text-sm text-gray-700 truncate">{name}</span>
                            {confirming === name ? (
                                <div className="flex items-center gap-2 shrink-0 ml-4">
                                    <span className="text-xs text-gray-500">Supprimer ?</span>
                                    <button onClick={() => handleDelete(name)} className="text-xs text-red-600 font-medium hover:underline">Oui</button>
                                    <button onClick={() => setConfirming(null)} className="text-xs text-gray-500 hover:underline">Non</button>
                                </div>
                            ) : (
                                <button onClick={() => setConfirming(name)} className="ml-4 text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0">
                                    Supprimer
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
    return <AuthGuard><DocumentsPageInner /></AuthGuard>;
}
