"use client";

import { useEffect } from "react";

type ToastVariant = "success" | "error";
type Props = { message: string; variant: ToastVariant; onDismiss: () => void; duration?: number };

const styles: Record<ToastVariant, string> = {
    success: "bg-green-700 text-white",
    error: "bg-red-700 text-white",
};

export default function Toast({ message, variant, onDismiss, duration = 3000 }: Props) {
    useEffect(() => {
        const t = setTimeout(onDismiss, duration);
        return () => clearTimeout(t);
    }, [onDismiss, duration]);

    return (
        <div
            className={`animate-fade-slide-in fixed right-6 bottom-6 z-50 max-w-xs rounded-lg px-4 py-3 text-sm shadow-lg ${styles[variant]}`}
        >
            <div className="flex items-center justify-between gap-4">
                <span>{message}</span>
                <button
                    onClick={onDismiss}
                    aria-label="Close"
                    className="opacity-70 transition-opacity hover:opacity-100"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
