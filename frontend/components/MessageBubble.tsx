import SourceCard from "@/components/SourceCard";

type Props = {
    text: string;
    sender?: "user" | "bot";
    sources?: {
        filename: string;
        chunk_text: string;
    }[];
};

export default function MessageBubble({ text, sender, sources }: Props) {
    const isUser = sender === "user";

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-lg px-4 py-3 text-sm ${isUser
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-800"
                }`}>
                <p className="whitespace-pre-wrap">{text}</p>
                {sources && sources.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                        <p className="text-xs font-medium opacity-60 uppercase tracking-wide">Sources</p>
                        {sources.map((source, i) => (
                            <SourceCard key={source.filename + i} source={source} index={i} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}