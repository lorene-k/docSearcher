"use client";

import { useEffect, useRef } from "react";

type Props = { open: boolean; title: string; onClose: () => void; children: React.ReactNode };

// A modal on the native dialog element, so focus trapping and Escape come from the browser
export default function Dialog({ open, title, onClose, children }: Props) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog || typeof dialog.showModal !== "function") return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={(e) => {
                if (e.target === ref.current) onClose();
            }}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink shadow-none backdrop:bg-ink/30 open:animate-fade-slide-in"
        >
            <div className="p-6">
                <h2 className="section-title mb-4">{title}</h2>
                {children}
            </div>
        </dialog>
    );
}
