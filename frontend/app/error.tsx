"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="flex flex-1 items-center justify-center px-4 py-12">
            <div className="card w-full max-w-md p-8 text-center">
                <h1 className="page-title">Something went wrong</h1>
                <p className="page-lead mb-6">Try again, or go back to the home page.</p>
                <div className="flex items-center justify-center gap-2">
                    <button onClick={reset} className="btn btn-primary">
                        Try again
                    </button>
                    <Link href="/" className="btn btn-ghost">
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
