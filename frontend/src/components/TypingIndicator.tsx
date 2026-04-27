import { Sparkles } from "lucide-react";

export const TypingIndicator = () => {
  return (
    <div className="animate-fade-in flex w-fit items-center gap-2 rounded-2xl rounded-bl-md bg-white px-3 py-2.5 shadow-card ring-1 ring-slate-200/80">
      <Sparkles className="h-3.5 w-3.5 text-brand-600" />
      <span className="text-xs font-semibold text-slate-700">IA pensando</span>
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-thinking rounded-full bg-brand-600" />
        <span
          className="h-1.5 w-1.5 animate-thinking rounded-full bg-brand-600"
          style={{ animationDelay: "0.16s" }}
        />
        <span
          className="h-1.5 w-1.5 animate-thinking rounded-full bg-brand-600"
          style={{ animationDelay: "0.32s" }}
        />
      </span>
    </div>
  );
};

export default TypingIndicator;
