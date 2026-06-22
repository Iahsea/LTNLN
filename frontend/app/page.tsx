"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Cable,
  Cpu,
  Folder,
  Globe,
  RefreshCw,
} from "lucide-react";

import {
  getHealth,
  listConnections,
  listFiles,
  listInterfaces,
  listProcesses,
} from "@/lib/api";
import { StatCard } from "@/components/stat-card";
import { Terminal } from "@/components/terminal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const REFRESH_MS = 5000;

// Số liệu tổng quan gom từ 4 module. null = chưa có / fetch lỗi → hiển thị "—".
interface Summary {
  procTotal: number | null;
  procRunning: number | null;
  files: number | null;
  conns: number | null;
  ifaces: number | null;
  ifacesUp: number | null;
  healthy: boolean | null;
}

const EMPTY: Summary = {
  procTotal: null,
  procRunning: null,
  files: null,
  conns: null,
  ifaces: null,
  ifacesUp: null,
  healthy: null,
};

// Lấy value từ Promise.allSettled, fail thì trả null (không phá vỡ cả trang).
function val<T>(r: PromiseSettledResult<T>): T | null {
  return r.status === "fulfilled" ? r.value : null;
}

function num(n: number | null): string {
  return n === null ? "—" : String(n);
}

function agoText(ts: number | null, now: number): string {
  if (!ts) return "—";
  const s = Math.max(0, Math.round((now - ts) / 1000));
  return s < 1 ? "vừa xong" : `${s}s trước`;
}

export default function HomePage() {
  const [data, setData] = useState<Summary>(EMPTY);
  const [loading, setLoading] = useState(true); // chỉ lần đầu
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);

  // tick mỗi giây cho chữ "x giây trước"
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async (initial = false) => {
    // Gọi song song 5 API; allSettled để một API lỗi không kéo sập cả dashboard.
    const [proc, files, conns, ifaces, health] = await Promise.allSettled([
      listProcesses(1, 1),
      listFiles(""),
      listConnections(),
      listInterfaces(),
      getHealth(),
    ]);

    const procV = val(proc);
    const filesV = val(files);
    const connsV = val(conns);
    const ifacesV = val(ifaces);
    const healthV = val(health);

    setData({
      procTotal: procV?.total ?? null,
      procRunning: procV?.running ?? null,
      files: filesV?.length ?? null,
      conns: connsV?.length ?? null,
      ifaces: ifacesV?.length ?? null,
      ifacesUp: ifacesV
        ? ifacesV.filter((i) => i.flags.startsWith("UP")).length
        : null,
      healthy: healthV ? healthV.status === "ok" : false,
    });

    // Chỉ báo lỗi toàn trang khi TẤT CẢ đều hỏng (backend nhiều khả năng đang tắt).
    const allFailed = [proc, files, conns, ifaces, health].every(
      (r) => r.status === "rejected",
    );
    setError(allFailed ? "Không kết nối được backend (:8066)" : null);
    setLastUpdated(Date.now());
    if (initial) setLoading(false);
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => load(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [auto, load]);

  // Các ô module: số liệu sống + đường dẫn điều hướng.
  const modules = [
    {
      href: "/process",
      label: "Tiến trình",
      icon: Cpu,
      desc: "Liệt kê, spawn, kill",
      stat:
        data.procTotal === null
          ? "—"
          : `${num(data.procRunning)} chạy / ${data.procTotal} tổng`,
    },
    {
      href: "/files",
      label: "File",
      icon: Folder,
      desc: "Đọc / ghi / xóa / chmod",
      stat:
        data.files === null ? "—" : `${data.files} mục trong sandbox`,
    },
    {
      href: "/socket",
      label: "Socket",
      icon: Cable,
      desc: "TCP / UDP / Unix echo",
      stat: data.conns === null ? "—" : `${data.conns} kết nối`,
    },
    {
      href: "/network",
      label: "Network",
      icon: Globe,
      desc: "Interface, DNS, ping",
      stat:
        data.ifaces === null
          ? "—"
          : `${num(data.ifacesUp)} UP / ${data.ifaces} card`,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Subheader: trạng thái backend + cập nhật + điều khiển refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 font-mono text-[11px]",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                data.healthy === null
                  ? "bg-status-idle"
                  : data.healthy
                    ? "bg-status-ok"
                    : "bg-status-error",
              )}
            />
            <span
              className={cn(
                data.healthy === null
                  ? "text-status-idle"
                  : data.healthy
                    ? "text-status-ok"
                    : "text-status-error",
              )}
            >
              backend {data.healthy ? "online" : data.healthy === false ? "offline" : "…"}
            </span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            Cập nhật {agoText(lastUpdated, now)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="auto" checked={auto} onCheckedChange={setAuto} />
            <Label htmlFor="auto" className="text-xs text-muted-foreground">
              Auto-refresh
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => load(false)}
          >
            <RefreshCw className="size-3.5" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Lỗi toàn trang (chỉ khi mọi API hỏng) */}
      {error ? (
        <div className="flex items-center justify-between rounded-lg border border-status-error/40 bg-status-error/5 px-4 py-3">
          <span className="text-sm text-status-error">{error}</span>
          <Button variant="outline" size="sm" className="h-8" onClick={() => load(false)}>
            Thử lại
          </Button>
        </div>
      ) : null}

      {/* Stat cards tổng quan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[78px] rounded-lg" />
          ))
        ) : (
          <>
            <StatCard label="Tổng tiến trình" value={num(data.procTotal)} />
            <StatCard
              label="Đang chạy"
              value={num(data.procRunning)}
              hint="tiến trình running"
            />
            <StatCard label="Kết nối socket" value={num(data.conns)} />
            <StatCard
              label="Card mạng UP"
              value={
                data.ifaces === null
                  ? "—"
                  : `${num(data.ifacesUp)}/${data.ifaces}`
              }
              hint="interface đang bật"
            />
          </>
        )}
      </div>

      {/* Lưới module điều hướng — mỗi ô kèm số liệu sống */}
      <div>
        <h2 className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          Module
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[104px] rounded-lg" />
              ))
            : modules.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-[#33333A] hover:bg-secondary/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-7 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground transition-colors group-hover:text-foreground">
                      <m.icon className="size-4" />
                    </span>
                    <ArrowUpRight className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {m.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {m.desc}
                    </div>
                  </div>
                  <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {m.stat}
                  </div>
                </Link>
              ))}
        </div>
      </div>

      {/* Log realtime — cho dashboard có nhịp sống */}
      <Terminal />
    </div>
  );
}
