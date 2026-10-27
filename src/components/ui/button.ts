import { cn } from "@/lib/cn";

type Variant = "primary" | "rust" | "outline" | "light" | "ghost";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-rust-dark",
  rust: "bg-rust text-paper hover:bg-rust-dark",
  outline:
    "border border-ink/20 bg-transparent text-ink hover:border-ink hover:bg-ink/[0.04]",
  light: "border border-line bg-paper text-ink hover:bg-shell",
  ghost: "text-ink hover:bg-ink/[0.06]",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2.5 text-[13px]",
  md: "px-5 py-3 text-sm",
  lg: "px-7 py-3.5 text-[15px]",
  icon: "h-11 w-11 p-0",
};

export function buttonClass(options?: {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  className?: string;
}): string {
  const { variant = "primary", size = "md", full = false, className } = options ?? {};
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    full && "w-full",
    className,
  );
}
