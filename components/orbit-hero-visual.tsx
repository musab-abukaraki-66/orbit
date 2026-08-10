import { OrbitMark } from "@/components/orbit-mark"

export function OrbitHeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-square w-full max-w-md select-none"
    >
      <div className="absolute inset-0 rounded-full bg-brand/20 blur-3xl" />

      <div className="absolute inset-0 animate-orbit-slow">
        <span className="absolute left-1/2 top-0 size-2.5 -translate-x-1/2 rounded-full bg-brand shadow-[0_0_12px_4px] shadow-brand/40" />
      </div>
      <div className="absolute inset-[12%] animate-orbit-medium">
        <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-foreground/70" />
      </div>
      <div className="absolute inset-[24%] animate-orbit-fast">
        <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-foreground/40" />
      </div>

      <div className="absolute inset-[14%] rounded-full border border-foreground/10" />
      <div className="absolute inset-[30%] rounded-full border border-foreground/5" />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex size-24 animate-float items-center justify-center rounded-2xl border bg-card shadow-xl">
          <OrbitMark className="size-12 text-brand" />
        </div>
      </div>
    </div>
  )
}
