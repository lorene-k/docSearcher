"use client";

import { useState, useEffect, useCallback } from "react";
import { getDocuments, deleteDocument, setDocumentVisibility } from "@/lib/api";
import type { Document, Visibility } from "@/lib/model";

export function useDocuments() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const reload = useCallback(async () => {
        try {
            setDocuments(await getDocuments());
            setError("");
        } catch {
            setError("Could not load documents.");
        } finally {
            setLoading(false);
        }
    }, []);

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

    const remove = useCallback(async (document: Document) => {
        setDocuments((prev) => prev.filter((d) => d.id !== document.id));
        try {
            await deleteDocument(document);
        } catch {
            setDocuments((prev) => [...prev, document]);
            setError(`Could not delete "${document.filename}".`);
            throw new Error("delete failed");
        }
    }, []);

    const share = useCallback(
        async (document: Document, visibility: Visibility, groupId: string | null) => {
            await setDocumentVisibility(document, visibility, groupId);
            await reload();
        },
        [reload],
    );

    return { documents, loading, error, remove, share };
}
