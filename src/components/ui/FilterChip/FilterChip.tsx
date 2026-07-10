import type { FilterChipProps } from "./types";

export default function FilterChip({
  label,
  active = false,
  onClick,
}: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-yellow-400 text-slate-900"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      {label}
    </button>
  );
}