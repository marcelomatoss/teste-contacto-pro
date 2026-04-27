import { Sparkles } from "lucide-react";

export const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-white px-3 py-2.5 ring-1 ring-slate-200 w-fit">
      <Sparkles className="h-3.5 w-3.5 text-brand-500" />
      <span className="text-xs font-medium text-slate-600">IA pensando</span>
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-thinking rounded-full bg-brand-500" />
        <span
          className="h-1.5 w-1.5 animate-thinking rounded-full bg-brand-500"
          style={{ animationDelay: "0.16s" }}
        />
        <span
          className="h-1.5 w-1.5 animate-thinking rounded-full bg-brand-500"
          style={{ animationDelay: "0.32s" }}
        />
      </span>
    </div>
  );
};

export default TypingIndicator;
