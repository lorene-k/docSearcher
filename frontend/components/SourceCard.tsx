import { Source } from "@/lib/api";

type Props = {
  source: Source;
  index: number;
};

export default function SourceCard({ source, index }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <p className="text-xs font-medium text-gray-500 mb-1">
        Source {index + 1} · {source.filename}
      </p>
      <p className="text-xs text-gray-600 line-clamp-3">{source.chunk_text}</p>
    </div>
  );
}
