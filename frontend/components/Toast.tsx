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
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs animate-fade-slide-in ${styles[variant]}`}>
            <div className="flex items-center justify-between gap-4">
                <span>{message}</span>
                <button onClick={onDismiss} className="opacity-70 hover:opacity-100 transition-opacity">✕</button>
            </div>
        </div>
    );
}
