"use client";

import { useState, useEffect, useCallback } from "react";
import { getDocuments, deleteDocument } from "@/lib/api";

export function useDocuments() {
    const [documents, setDocuments] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        // Ignores the response if the component unmounted before the request settled
        let ignore = false;
        getDocuments()
            .then((docs) => {
                if (!ignore) setDocuments(docs);
            })
            .catch(() => {
                if (!ignore) setError("Could not load documents.");
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, []);

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

    return { documents, loading, error, remove };
}
