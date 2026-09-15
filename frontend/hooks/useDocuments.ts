"use client";

import { useState, useEffect, useCallback } from "react";
import { getDocuments, deleteDocument } from "@/lib/api";

export function useDocuments() {
    const [documents, setDocuments] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setDocuments(await getDocuments());
        } catch {
            setError("Could not load documents.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

    const remove = useCallback(async (filename: string) => {
        setDocuments((prev) => prev.filter((d) => d !== filename));
        try {
            await deleteDocument(filename);
        } catch {
            setDocuments((prev) => [...prev, filename]);
            setError(`Could not delete "${filename}".`);
            throw new Error("delete failed");
        }
    }, []);

    return { documents, loading, error, remove, refetch: fetchDocuments };
}
