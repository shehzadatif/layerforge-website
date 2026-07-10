import { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  clickable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}