import { cn } from "../../../lib/utils";
import type { ButtonProps } from "./types";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-yellow-400",
        "disabled:cursor-not-allowed disabled:opacity-60",

        {
          "bg-yellow-400 text-slate-900 hover:bg-yellow-300":
            variant === "primary",

          "bg-slate-900 text-white hover:bg-slate-800":
            variant === "secondary",

          "border border-slate-300 bg-white hover:bg-slate-100":
            variant === "outline",

          "bg-red-600 text-white hover:bg-red-700":
            variant === "danger",
        },

        {
          "px-4 py-2 text-sm": size === "sm",
          "px-6 py-3": size === "md",
          "px-8 py-4 text-lg": size === "lg",
        },

        fullWidth && "w-full",

        className
      )}
      {...props}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}