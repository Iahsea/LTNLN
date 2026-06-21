import { cn } from "@/lib/utils";

// Thẻ số liệu gọn cho đầu trang dashboard. Cố tình KHÔNG dùng icon tròn
// gradient + mô tả (mẫu "template AI" bị cấm trong skill).
export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card px-4 py-3", className)}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-xl font-medium tabular-nums text-foreground">
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}
