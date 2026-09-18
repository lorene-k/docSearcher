"use client";

import { useEffect } from "react";

type ToastVariant = "success" | "error";
type Props = { message: string; variant: ToastVariant; onDismiss: () => void; duration?: number };

const styles: Record<ToastVariant, string> = {
    success: "bg-plum-deep text-white",
    error: "bg-danger text-white",
};

export default function Toast({ message, variant, onDismiss, duration = 3000 }: Props) {
    useEffect(() => {
        const t = setTimeout(onDismiss, duration);
        return () => clearTimeout(t);
    }, [onDismiss, duration]);

    return (
        <div
            role="status"
            className={`fixed right-6 bottom-6 z-50 max-w-xs animate-fade-slide-in rounded-full px-4 py-3 text-sm ${styles[variant]}`}
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
