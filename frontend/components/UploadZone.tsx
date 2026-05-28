"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { uploadDocument } from "@/lib/api";

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
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-gray-400 bg-gray-50"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
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
        <div className="flex items-center justify-between text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          <span>Fichier importé avec succès.</span>
          <button onClick={reset} className="text-green-600 hover:text-green-800 underline text-xs">
            Importer un autre
          </button>
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center justify-between text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          <span>{errorMessage}</span>
          <button onClick={reset} className="text-red-600 hover:text-red-800 underline text-xs">
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
