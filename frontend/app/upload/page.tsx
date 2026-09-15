"use client";

import AuthGuard from "@/components/AuthGuard";
import UploadZone from "@/components/UploadZone";

export default function UploadPage() {
    return (
        <AuthGuard>
            <div className="page-container">
                <h1 className="text-lg font-semibold mb-2">Upload a document</h1>
                <p className="text-sm text-gray-500 mb-6">Add a PDF file to the knowledge base.</p>
                <UploadZone />
            </div>
        </AuthGuard>
    );
}
