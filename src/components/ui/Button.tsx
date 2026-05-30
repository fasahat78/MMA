import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "success" | "warn";

const variants: Record<Variant, string> = {
  primary: "bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-300/50 hover:bg-fuchsia-400",
  secondary: "bg-white text-fuchsia-700 ring-2 ring-fuchsia-200 hover:bg-fuchsia-50",
  ghost: "bg-white/70 text-slate-600 hover:bg-white",
  success: "bg-emerald-500 text-white shadow-lg shadow-emerald-300/50 hover:bg-emerald-400",
  warn: "bg-amber-400 text-amber-950 shadow-lg shadow-amber-200/60 hover:bg-amber-300",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

// Large, rounded, kid-friendly button. Min 44px touch target (spec v2 §14).
export function Button({ variant = "primary", className = "", children, ...rest }: Props) {
  return (
    <button
      className={`btn-pop min-h-[52px] rounded-3xl px-6 py-3 text-lg font-extrabold tracking-wide disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
