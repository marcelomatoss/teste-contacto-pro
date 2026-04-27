import clsx from "clsx";

interface Props {
  size?: number;
  className?: string;
  online?: boolean;
}

/**
 * Brand mark for Contact Pro Inbox.
 * Combines a chat-bubble silhouette with a stylised "C" — a custom mark
 * recommended by the UI/UX Pro Max skill in lieu of a generic stock icon.
 */
export const BrandMark = ({ size = 40, className, online = false }: Props) => {
  return (
    <span
      className={clsx("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        className="rounded-xl shadow-card-lg"
      >
        <defs>
          <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="brand-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#brand-grad)" />
        <rect width="40" height="20" rx="10" fill="url(#brand-shine)" />
        {/* Chat bubble + C */}
        <path
          d="M11 14a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-7l-4 3v-3h-1a3 3 0 0 1-3-3v-8Z"
          fill="white"
          fillOpacity="0.96"
        />
        <path
          d="M22 16.5a3.5 3.5 0 1 0 0 5"
          stroke="#1D4ED8"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {online && (
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-accent-500 ring-2 ring-accent-500/30"
        />
      )}
    </span>
  );
};

export default BrandMark;
