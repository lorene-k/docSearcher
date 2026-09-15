"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="card w-full max-w-sm p-8 text-center">
                <h1 className="text-lg font-semibold mb-1 text-gray-900">Something went wrong</h1>
                <p className="text-sm text-gray-500 mb-6">An unexpected error occurred. You can try again or go back to the home page.</p>
                <div className="flex items-center justify-center gap-4">
                    <button onClick={reset} className="text-sm underline text-gray-700 hover:text-gray-900">
                        Try again
                    </button>
                    <Link href="/" className="text-sm underline text-gray-700 hover:text-gray-900">
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
