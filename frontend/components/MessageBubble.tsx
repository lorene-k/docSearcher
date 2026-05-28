type Props = {
  text: string;
};

export default function MessageBubble({ text }: Props) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{text}</p>
    </div>
  );
}
