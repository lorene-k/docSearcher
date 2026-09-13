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
            setInvalidTypeMessage("Seuls les fichiers PDF sont acceptés.");
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
                        Importer un autre fichier
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`bg-white border-2 border-dashed rounded-lg p-12 text-center cursor-pointer shadow-sm transition-all duration-200 ${isDragging ? "border-blue-400 bg-blue-50 shadow-md" : "border-gray-300 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"}`}
            >
                <p className="text-gray-600 text-sm">
                    Glissez un fichier PDF ici ou{" "}
                    <span className="text-gray-900 font-medium underline">parcourez vos fichiers</span>
                </p>
                <p className="text-gray-400 text-xs mt-1">PDF uniquement · 6 pages max</p>
                <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={onChange} />
            </div>
            {step === "error" && (
                <Banner variant="error" message={errorMessage} action={{ label: "Réessayer", onClick: reset }} />
            )}
            {invalidTypeMessage && <Banner variant="error" message={invalidTypeMessage} />}
        </div>
    );
}
