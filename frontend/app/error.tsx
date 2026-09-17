"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-sm card p-8 text-center">
                <h1 className="mb-1 text-lg font-semibold text-gray-900">Something went wrong</h1>
                <p className="mb-6 text-sm text-gray-500">
                    An unexpected error occurred. You can try again or go back to the home page.
                </p>
                <div className="flex items-center justify-center gap-4">
                    <button onClick={reset} className="text-sm text-gray-700 underline hover:text-gray-900">
                        Try again
                    </button>
                    <Link href="/" className="text-sm text-gray-700 underline hover:text-gray-900">
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
