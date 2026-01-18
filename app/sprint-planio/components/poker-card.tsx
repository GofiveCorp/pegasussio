import { cn } from "@/lib/utils";

interface PokerCardProps {
  value: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PokerCard({
  value,
  selected,
  onClick,
  className,
}: PokerCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex h-32 w-24 items-center justify-center rounded-xl border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
        selected
          ? "border-blue-600 bg-blue-50 text-blue-600 shadow-md dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400"
          : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-700",
        className
      )}
    >
      <span className="text-3xl font-bold">{value}</span>

      {/* Corner decorations to look like a playing card */}
      <span className="absolute top-2 left-2 text-xs font-semibold opacity-50">
        {value}
      </span>
      <span className="absolute bottom-2 right-2 text-xs font-semibold opacity-50 rotate-180">
        {value}
      </span>
    </button>
  );
}
