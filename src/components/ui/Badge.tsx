import { cn } from "@/lib/utils";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-line-accent bg-accent-muted px-3 py-1 text-[13px] font-medium text-ivory",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-[2px] bg-accent" />
      {children}
    </span>
  );
}
