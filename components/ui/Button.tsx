"use client";
import Link from "next/link";
import clsx from "clsx";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type BaseProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
};

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", fullWidth, className, href, ...rest } = props as ButtonProps & Partial<LinkProps>;
  const base = "rounded-md text-sm font-medium transition active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none shadow-sm";
  const variants: Record<string, string> = {
    primary: "brand-bg text-white hover:opacity-95",
    secondary: "border border-[var(--border)] bg-[var(--card)] hover:bg-white/5",
    ghost: "hover:bg-white/5",
    danger: "bg-red-600 text-white hover:bg-red-600/90",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5",
    md: "px-4 py-2",
    lg: "px-5 py-3",
  };
  const classes = clsx(base, variants[variant], sizes[size], fullWidth && "w-full", className);

  if (href) {
    return (
      <Link href={href} className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} />
    );
  }
  return <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} />;
}


