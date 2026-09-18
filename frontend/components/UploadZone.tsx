"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import Link from "next/link";
import { useUpload } from "@/hooks/useUpload";
import Banner from "@/components/Banner";
import UploadProgress from "@/components/UploadProgress";
import type { UploadOptions } from "@/lib/api";

type Props = { options: UploadOptions; disabled?: boolean };

export default function UploadZone({ options, disabled = false }: Props) {
    const [isDragging, setIsDragging] = useState(false);
    const [invalidTypeMessage, setInvalidTypeMessage] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const { step, progress, chunksCreated, errorMessage, upload, reset } = useUpload();

    const handleFile = (file: File) => {
        if (file.type !== "application/pdf") {
            setInvalidTypeMessage("Only PDF files are accepted.");
            return;
        }
        setInvalidTypeMessage("");
        upload(file, options);
    };

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = "";
    };

    if (step !== "idle" && step !== "error") {
        return (
            <div className="card p-6">
                <UploadProgress step={step} progress={progress} chunksCreated={chunksCreated} />
                {step === "done" && (
                    <div className="mt-5 flex flex-wrap gap-2">
                        <button onClick={reset} className="btn btn-outline">
                            Upload another file
                        </button>
                        <Link href="/documents" className="btn btn-ghost">
                            See all documents
                        </Link>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled}
                onClick={() => !disabled && inputRef.current?.click()}
                onKeyDown={(e) => {
                    if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!disabled) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`rounded-2xl border-2 border-dashed p-12 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-plum/40 ${
                    disabled
                        ? "cursor-not-allowed border-line bg-base text-muted"
                        : isDragging
                          ? "border-plum bg-plum-soft"
                          : "cursor-pointer border-lilac-deep bg-white hover:border-plum hover:bg-plum-soft"
                }`}
            >
                <p className="text-sm text-ink">
                    Drop a PDF here or{" "}
                    <span className="font-medium text-plum underline underline-offset-4">choose a file</span>
                </p>
                <p className="hint mt-1">PDF only, 6 pages at most</p>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={onChange}
                    disabled={disabled}
                />
            </div>
            {step === "error" && (
                <Banner variant="error" message={errorMessage} action={{ label: "Try again", onClick: reset }} />
            )}
            {invalidTypeMessage && <Banner variant="error" message={invalidTypeMessage} />}
        </div>
    );
}
