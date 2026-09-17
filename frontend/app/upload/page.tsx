"use client";

import AuthGuard from "@/components/AuthGuard";
import UploadZone from "@/components/UploadZone";

export default function UploadPage() {
    return (
        <AuthGuard>
            <div className="page-container">
                <h1 className="mb-2 text-lg font-semibold">Upload a document</h1>
                <p className="mb-6 text-sm text-gray-500">Add a PDF file to the knowledge base.</p>
                <UploadZone />
            </div>
        </AuthGuard>
    );
}
