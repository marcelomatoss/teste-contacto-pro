import { AlertTriangle } from "lucide-react";

interface Props {
  errors: { id: string; message: string }[];
}

export const Toaster = ({ errors }: Props) => {
  if (errors.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-6 top-6 z-50 flex flex-col gap-2">
      {errors.map((e) => (
        <div
          key={e.id}
          className="pointer-events-auto flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 shadow-card-lg ring-1 ring-rose-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <p className="text-xs font-medium text-rose-800">{e.message}</p>
        </div>
      ))}
    </div>
  );
};

export default Toaster;
