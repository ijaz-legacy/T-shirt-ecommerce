import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5 rounded-full", className)}
      aria-label="IJAZ LEGACY home"
    >
      <span
        className={cn(
          "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-black ring-1 transition sm:h-11 sm:w-11",
          inverted
            ? "ring-gold/45 group-hover:ring-gold"
            : "ring-ink/15 group-hover:ring-gold",
        )}
      >
        <Image
          src="/brand/emblem.webp"
          alt=""
          width={88}
          height={88}
          priority
          className="h-full w-full object-cover"
        />
      </span>
      <span className="flex flex-col justify-center leading-none">
        <span
          className={cn(
            "font-serif text-[16px] uppercase leading-none tracking-[0.12em] sm:text-[19px]",
            inverted ? "text-paper" : "text-ink",
          )}
        >
          Ijaz Legacy
        </span>
        <span
          className={cn(
            "mt-1 text-[8px] font-semibold uppercase leading-none tracking-[0.28em] sm:text-[9px]",
            inverted ? "text-gold/80" : "text-smoke",
          )}
        >
          Tamil Tees
        </span>
      </span>
    </Link>
  );
}
