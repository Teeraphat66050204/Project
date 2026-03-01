import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  outline: "btn-outline",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

type ButtonProps = {
  variant?: Variant;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

type LinkButtonProps = {
  href: string;
  variant?: Variant;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
} & AnchorHTMLAttributes<HTMLAnchorElement>;

export function Button({ variant = "primary", fullWidth, className = "", children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`btn-base ${variantClass[variant]} ${fullWidth ? "w-full justify-center" : ""} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", fullWidth, className = "", children, ...props }: LinkButtonProps) {
  return (
    <a
      href={href}
      {...props}
      className={`btn-base ${variantClass[variant]} ${fullWidth ? "w-full justify-center" : ""} ${className}`.trim()}
    >
      {children}
    </a>
  );
}
