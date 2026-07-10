import { cn } from "../../../lib/utils";
import type { CardProps } from "./types";

export default function Card({
  children,
  hover = false,
  clickable = false,
  padding = "md",
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200",

        hover && "hover:-translate-y-1 hover:shadow-lg",

        clickable && "cursor-pointer",

        {
          "p-0": padding === "none",
          "p-4": padding === "sm",
          "p-6": padding === "md",
          "p-8": padding === "lg",
        },

        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}