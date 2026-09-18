import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex flex-1 items-center justify-center px-4 py-12">
            <div className="card w-full max-w-md p-8 text-center">
                <h1 className="page-title">Page not found</h1>
                <p className="page-lead mb-6">{"This page doesn't exist or has been moved."}</p>
                <Link href="/" className="btn btn-primary">
                    Back to home
                </Link>
            </div>
        </div>
    );
}
