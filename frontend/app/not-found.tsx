import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="card w-full max-w-sm p-8 text-center">
                <h1 className="text-lg font-semibold mb-1 text-gray-900">Page introuvable</h1>
                <p className="text-sm text-gray-500 mb-6">Cette page n&apos;existe pas ou a été déplacée.</p>
                <Link href="/" className="text-sm underline text-gray-700 hover:text-gray-900">
                    Retour à l&apos;accueil
                </Link>
            </div>
        </div>
    );
}
