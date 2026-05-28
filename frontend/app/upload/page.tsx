import UploadZone from "@/components/UploadZone";

export default function UploadPage() {
    return (
        <div className="page-container">
            <h1 className="text-lg font-semibold mb-2">Importer un document</h1>
            <p className="text-sm text-gray-500 mb-6">
                Ajoutez un fichier PDF à la base de connaissances.
            </p>
            <UploadZone />
        </div>
    );
}
