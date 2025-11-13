"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "orange" | "orange-outline";
  size?: "default" | "sm" | "lg";
  asChild?: boolean;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? (React.Fragment as any) : "button";

  const baseStyles =
    "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    default: "bg-white text-black hover:bg-gray-200 shadow-md hover:shadow-lg",
    secondary: "bg-gray-800 text-white hover:bg-gray-700 shadow-md hover:shadow-lg",
    outline: "border-2 border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-gray-50 shadow-md hover:shadow-lg",
    ghost: "hover:bg-gray-100",
    orange: "orange-gradient text-white hover:opacity-90 shadow-lg hover:shadow-xl",
    "orange-outline": "border-2 border-[#F56A34] text-[#F56A34] hover:bg-[#F56A34] hover:text-white shadow-md hover:shadow-lg",
  };

  const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
    default: "px-6 py-3 text-base",
    sm: "px-3 py-2 text-sm",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <Comp
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
