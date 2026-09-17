"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useUpload } from "@/hooks/useUpload";
import Banner from "@/components/Banner";
import UploadProgress from "@/components/UploadProgress";

export default function UploadZone() {
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
        upload(file);
    };

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
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
                    <button onClick={reset} className="mt-4 text-sm text-gray-500 underline hover:text-gray-700">
                        Upload another file
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`cursor-pointer rounded-lg border-2 border-dashed bg-white p-12 text-center shadow-sm transition-all duration-200 ${isDragging ? "border-blue-400 bg-blue-50 shadow-md" : "border-gray-300 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"}`}
            >
                <p className="text-sm text-gray-600">
                    Drag a PDF file here or{" "}
                    <span className="font-medium text-gray-900 underline">browse your files</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">PDF only - 6 pages max</p>
                <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={onChange} />
            </div>
            {step === "error" && (
                <Banner variant="error" message={errorMessage} action={{ label: "Try again", onClick: reset }} />
            )}
            {invalidTypeMessage && <Banner variant="error" message={invalidTypeMessage} />}
        </div>
    );
}
