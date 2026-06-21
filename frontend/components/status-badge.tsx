import { cn } from "@/lib/utils";

// 4 tone màu trạng thái theo skill ui-design (KHÔNG dùng accent cam ở đây).
export type Tone = "ok" | "warn" | "error" | "idle";

const DOT: Record<Tone, string> = {
  ok: "bg-status-ok",
  warn: "bg-status-warn",
  error: "bg-status-error",
  idle: "bg-status-idle",
};

const TEXT: Record<Tone, string> = {
  ok: "text-status-ok",
  warn: "text-status-warn",
  error: "text-status-error",
  idle: "text-status-idle",
};

// Map các trạng thái phổ biến (process status, socket status) sang tone màu.
export function toneFor(status: string): Tone {
  const s = status.toLowerCase();
  if (["running", "established", "listen"].includes(s)) return "ok";
  if (["sleeping", "waiting", "syn_sent", "syn_recv", "time_wait", "close_wait"].includes(s))
    return "warn";
  if (["zombie", "dead", "stopped", "killed", "close", "closed"].includes(s))
    return "error";
  return "idle";
}

export function StatusBadge({
  status,
  tone,
}: {
  status: string;
  tone?: Tone;
}) {
  const t = tone ?? toneFor(status);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-1.5 py-0.5 font-mono text-[11px]">
      <span className={cn("size-1.5 rounded-full", DOT[t])} />
      <span className={TEXT[t]}>{status}</span>
    </span>
  );
}
