import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-sm card p-8 text-center">
                <h1 className="mb-1 text-lg font-semibold text-gray-900">Page not found</h1>
                <p className="mb-6 text-sm text-gray-500">{"This page doesn't exist or has been moved."}</p>
                <Link href="/" className="text-sm text-gray-700 underline hover:text-gray-900">
                    Back to home
                </Link>
            </div>
        </div>
    );
}
