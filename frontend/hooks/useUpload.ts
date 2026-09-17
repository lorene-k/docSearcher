"use client";

import { useState } from "react";
import { uploadDocument } from "@/lib/api";

export type UploadStep = "idle" | "uploading" | "processing" | "indexing" | "done" | "error";

export function useUpload() {
    const [step, setStep] = useState<UploadStep>("idle");
    const [progress, setProgress] = useState(0);
    const [chunksCreated, setChunksCreated] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");

    const upload = async (file: File) => {
        setStep("uploading");
        setProgress(0);
        setErrorMessage("");
        try {
            const result = await uploadDocument(file, (pct) => {
                setProgress(pct);
                if (pct === 100) setStep("processing");
            });
            setStep("indexing");
            await new Promise((r) => setTimeout(r, 600));
            setChunksCreated(result.chunks_created);
            setStep("done");
        } catch {
            setStep("error");
            setErrorMessage("Something went wrong during the upload.");
        }
    };

    const reset = () => {
        setStep("idle");
        setProgress(0);
        setChunksCreated(0);
        setErrorMessage("");
    };

    return { step, progress, chunksCreated, errorMessage, upload, reset };
}
