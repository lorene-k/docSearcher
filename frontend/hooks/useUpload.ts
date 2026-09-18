"use client";

import { useState } from "react";
import { uploadDocument } from "@/lib/api";
import type { UploadOptions } from "@/lib/api";

export type UploadStep = "idle" | "uploading" | "processing" | "indexing" | "done" | "error";

const UPLOAD_ERRORS: Record<number, string> = {
    409: "A document with this name already exists. Delete it first to replace it.",
    413: "This file is too large or has more than 6 pages.",
    415: "Only PDF files are accepted.",
    400: "No text could be read from this PDF.",
};

const describeError = (error: unknown): string => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return (status && UPLOAD_ERRORS[status]) || "Something went wrong during the upload.";
};

export function useUpload() {
    const [step, setStep] = useState<UploadStep>("idle");
    const [progress, setProgress] = useState(0);
    const [chunksCreated, setChunksCreated] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");

    const upload = async (file: File, options: UploadOptions) => {
        setStep("uploading");
        setProgress(0);
        setErrorMessage("");
        try {
            const result = await uploadDocument(file, options, (pct) => {
                setProgress(pct);
                if (pct === 100) setStep("processing");
            });
            setStep("indexing");
            await new Promise((r) => setTimeout(r, 600));
            setChunksCreated(result.chunks_created);
            setStep("done");
        } catch (error) {
            setStep("error");
            setErrorMessage(describeError(error));
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
