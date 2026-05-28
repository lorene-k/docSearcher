import { getDocuments } from "@/lib/api";

export default async function DocumentsPage() {
  let documents: string[] = [];
  let error = "";

  try {
    documents = await getDocuments();
  } catch {
    error = "Impossible de charger les documents.";
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-lg font-semibold mb-6">Documents</h1>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}
      {!error && documents.length === 0 && (
        <p className="text-sm text-gray-400">Aucun document importé pour l'instant.</p>
      )}
      {documents.length > 0 && (
        <ul className="flex flex-col gap-2">
          {documents.map((name) => (
            <li
              key={name}
              className="border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
