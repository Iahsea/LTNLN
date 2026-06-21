"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, ChevronLeft, ChevronRight, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  listProcesses,
  spawnProcess,
  killProcess,
  type ProcessInfo,
} from "@/lib/api";
import { DataTable, type Column } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Terminal } from "@/components/terminal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const REFRESH_MS = 4000;
const PAGE_SIZE = 20;

function formatMem(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

function agoText(ts: number | null, now: number): string {
  if (!ts) return "—";
  const s = Math.max(0, Math.round((now - ts) / 1000));
  return s < 1 ? "vừa xong" : `${s}s trước`;
}

export default function ProcessPage() {
  const [rows, setRows] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true); // chỉ lần đầu
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Phân trang (server-side): backend trả total/running trên toàn bộ.
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [auto, setAuto] = useState(true);
  const [command, setCommand] = useState("");
  const [spawning, setSpawning] = useState(false);

  // PID do app spawn trong phiên này — đánh dấu để dễ nhận ra khi demo.
  const [spawnedPids, setSpawnedPids] = useState<Set<number>>(new Set());

  const [killTarget, setKillTarget] = useState<ProcessInfo | null>(null);
  const [killing, setKilling] = useState(false);

  // tick mỗi giây để cập nhật chữ "x giây trước"
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(
    async (initial = false) => {
      try {
        const data = await listProcesses(page, PAGE_SIZE);
        setRows(data.items);
        setTotal(data.total);
        setRunning(data.running);
        setTotalPages(data.total_pages);
        // Nếu trang hiện tại vượt quá tổng số trang (tiến trình giảm), lùi lại.
        if (data.page > data.total_pages && data.total_pages >= 1) {
          setPage(data.total_pages);
        }
        setError(null);
        setLastUpdated(Date.now());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được danh sách tiến trình");
      } finally {
        if (initial) setLoading(false);
      }
    },
    [page]
  );

  // load lần đầu & mỗi khi đổi trang (load đổi identity theo `page`)
  useEffect(() => {
    load(true);
  }, [load]);

  // auto-refresh tại chỗ (không bật loading lại để bảng không nhấp nháy)
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => load(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [auto, load]);

  async function handleSpawn(e: React.FormEvent) {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;
    setSpawning(true);
    try {
      const res = await spawnProcess(cmd);
      setSpawnedPids((prev) => new Set(prev).add(res.pid));
      toast.success(`Đã spawn PID ${res.pid}`);
      setCommand("");
      load(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Spawn thất bại");
    } finally {
      setSpawning(false);
    }
  }

  async function confirmKill() {
    if (!killTarget) return;
    setKilling(true);
    try {
      await killProcess(killTarget.pid);
      toast.success(`Đã kill PID ${killTarget.pid}`);
      setKillTarget(null);
      load(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kill thất bại");
    } finally {
      setKilling(false);
    }
  }

  const columns: Column<ProcessInfo>[] = [
    {
      key: "pid",
      header: "PID",
      className: "w-20 font-mono tabular-nums",
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          {r.pid}
          {spawnedPids.has(r.pid) ? (
            <span className="rounded border border-border bg-secondary px-1 text-[10px] text-muted-foreground">
              app
            </span>
          ) : null}
        </span>
      ),
    },
    { key: "name", header: "Tên", className: "max-w-56 truncate", cell: (r) => r.name },
    { key: "ppid", header: "PPID", className: "w-20 font-mono tabular-nums", cell: (r) => r.ppid },
    { key: "status", header: "Trạng thái", className: "w-32", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "cpu",
      header: "CPU %",
      className: "w-20 text-right font-mono tabular-nums",
      cell: (r) => r.cpu_percent.toFixed(1),
    },
    {
      key: "mem",
      header: "Bộ nhớ",
      className: "w-24 text-right font-mono tabular-nums",
      cell: (r) => formatMem(r.memory_kb),
    },
    {
      key: "action",
      header: "",
      className: "w-20 text-right",
      cell: (r) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-status-error hover:text-status-error"
          onClick={() => setKillTarget(r)}
        >
          <Ban className="size-3.5" />
          Kill
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Tổng tiến trình" value={loading ? "—" : total} />
        <StatCard label="Đang chạy" value={loading ? "—" : running} />
        <StatCard label="App đã spawn" value={spawnedPids.size} />
        <StatCard label="Cập nhật" value={agoText(lastUpdated, now)} hint={auto ? "tự động 4s/lần" : "đang tắt auto"} />
      </div>

      {/* Form spawn (nút chính = accent cam) */}
      <form onSubmit={handleSpawn} className="flex flex-wrap items-center gap-2">
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder='Lệnh để spawn, ví dụ: ping 127.0.0.1 -n 30'
          className="h-9 max-w-md font-mono"
        />
        <Button type="submit" size="sm" className="h-9" disabled={spawning || !command.trim()}>
          <Play className="size-3.5" />
          {spawning ? "Đang spawn…" : "Spawn"}
        </Button>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="auto" checked={auto} onCheckedChange={setAuto} />
            <Label htmlFor="auto" className="text-xs text-muted-foreground">
              Auto-refresh
            </Label>
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={() => load(false)}>
            <RefreshCw className="size-3.5" />
            Làm mới
          </Button>
        </div>
      </form>

      {/* Bảng tiến trình */}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.pid}
        loading={loading}
        error={error}
        onRetry={() => load(false)}
        emptyText="Chưa có tiến trình nào"
      />

      {/* Thanh phân trang */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total > 0 ? (
            <>
              Hiển thị{" "}
              <span className="font-mono text-foreground">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
              </span>{" "}
              / {total} tiến trình
            </>
          ) : (
            "—"
          )}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
          >
            <ChevronLeft className="size-3.5" />
            Trước
          </Button>
          <span className="font-mono tabular-nums">
            Trang {page}/{totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
          >
            Sau
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Log realtime */}
      <Terminal />

      {/* Xác nhận kill (hành động phá hủy → màu lỗi) */}
      <AlertDialog open={!!killTarget} onOpenChange={(o) => !o && setKillTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kill tiến trình?</AlertDialogTitle>
            <AlertDialogDescription>
              Gửi tín hiệu kết thúc tới{" "}
              <span className="font-mono text-foreground">
                PID {killTarget?.pid} — {killTarget?.name}
              </span>
              . Backend chỉ cho phép kill tiến trình do app tạo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={killing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmKill();
              }}
              disabled={killing}
              className="bg-status-error text-white hover:bg-status-error/90"
            >
              {killing ? "Đang kill…" : "Kill"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
