import SourceCard from "@/components/SourceCard";

type Props = {
    text: string;
    sender?: "user" | "bot";
    sources?: {
        filename: string;
        chunk_text: string;
    }[];
    isTyping?: boolean;
};

export default function MessageBubble({ text, sender, sources, isTyping }: Props) {
    const isUser = sender === "user";

    return (
        <div className={`flex animate-fade-slide-in ${isUser ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[95%] rounded-lg px-4 py-3 text-base ${isUser
                ? "bg-gray-300 text-black"
                : "bg-gray-100 text-gray-800"
                }`}>
                {isTyping ? (
                    <div className="flex gap-1 items-center h-4">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap">{text}</p>
                )}
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