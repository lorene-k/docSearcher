"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { uploadDocument } from "@/lib/api";
import Banner from "@/components/Banner";

export default function UploadZone() {
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (file.type !== "application/pdf") {
            setStatus("error");
            setErrorMessage("Seuls les fichiers PDF sont acceptés.");
            return;
        }
        setStatus("uploading");
        try {
            await uploadDocument(file);
            setStatus("success");
        } catch {
            setStatus("error");
            setErrorMessage("Une erreur est survenue lors de l'import.");
        }
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

    const reset = () => {
        setStatus("idle");
        setErrorMessage("");
    };

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
                className={`bg-white border-2 border-dashed rounded-lg p-12 text-center cursor-pointer shadow-sm transition-all duration-200 ${isDragging
                    ? "border-blue-400 bg-blue-50 shadow-md"
                    : "border-gray-300 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                    }`}
            >
                <p className="text-gray-600 text-sm">
                    Glissez un fichier PDF ici ou{" "}
                    <span className="text-gray-900 font-medium underline">parcourez vos fichiers</span>
                </p>
                <p className="text-gray-400 text-xs mt-1">PDF uniquement · 6 pages max</p>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={onChange}
                />
            </div>

            {status === "uploading" && (
                <p className="text-sm text-gray-500">Import en cours...</p>
            )}
            {status === "success" && (
                <Banner
                    variant="success"
                    message="Fichier importé avec succès."
                    action={{ label: "Importer un autre", onClick: reset }}
                />
            )}
            {status === "error" && (
                <Banner
                    variant="error"
                    message={errorMessage}
                    action={{ label: "Réessayer", onClick: reset }}
                />
            )}
        </div>
    );
}
