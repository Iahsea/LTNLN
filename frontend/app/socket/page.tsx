"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

import {
  listConnections,
  tcpEcho,
  udpEcho,
  unixEcho,
  type SocketConnection,
  type EchoResponse,
} from "@/lib/api";
import { DataTable, type Column } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Terminal } from "@/components/terminal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const REFRESH_MS = 4000;
const PAGE_SIZE = 10;

type Transport = "tcp" | "udp" | "unix";

const ECHO_FN: Record<Transport, (msg: string) => Promise<EchoResponse>> = {
  tcp: tcpEcho,
  udp: udpEcho,
  unix: unixEcho,
};

function agoText(ts: number | null, now: number): string {
  if (!ts) return "—";
  const s = Math.max(0, Math.round((now - ts) / 1000));
  return s < 1 ? "vừa xong" : `${s}s trước`;
}

export default function SocketPage() {
  const [conns, setConns] = useState<SocketConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);
  const [page, setPage] = useState(1);

  // Echo demo
  const [transport, setTransport] = useState<Transport>("tcp");
  const [message, setMessage] = useState("Xin chao socket");
  const [sending, setSending] = useState(false);
  const [lastEcho, setLastEcho] = useState<EchoResponse | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async (initial = false) => {
    try {
      const data = await listConnections();
      setConns(data);
      setError(null);
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách kết nối");
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => load(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [auto, load]);

  async function handleEcho(e: React.FormEvent) {
    e.preventDefault();
    const msg = message;
    if (!msg.trim()) return;
    setSending(true);
    try {
      const res = await ECHO_FN[transport](msg);
      setLastEcho(res);
      toast.success(`Echo ${res.transport.toUpperCase()} thành công`);
    } catch (e) {
      setLastEcho(null);
      toast.error(e instanceof Error ? e.message : "Echo thất bại");
    } finally {
      setSending(false);
    }
  }

  const tcpCount = conns.filter((c) => c.type === "TCP").length;
  const udpCount = conns.filter((c) => c.type === "UDP").length;
  const listening = conns.filter((c) => c.status.toUpperCase() === "LISTEN").length;

  // Phân trang phía client (backend trả toàn bộ kết nối).
  const totalPages = Math.max(1, Math.ceil(conns.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = conns.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const columns: Column<SocketConnection>[] = [
    { key: "fd", header: "FD", className: "w-16 font-mono tabular-nums", cell: (c) => c.fd },
    { key: "type", header: "Loại", className: "w-24 font-mono", cell: (c) => c.type },
    {
      key: "local",
      header: "Local",
      className: "font-mono",
      cell: (c) => c.local_addr || "—",
    },
    {
      key: "remote",
      header: "Remote",
      className: "font-mono text-muted-foreground",
      cell: (c) => c.remote_addr || "—",
    },
    {
      key: "status",
      header: "Trạng thái",
      className: "w-40",
      cell: (c) => <StatusBadge status={c.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Tổng kết nối" value={loading ? "—" : conns.length} />
        <StatCard label="TCP" value={loading ? "—" : tcpCount} />
        <StatCard label="UDP" value={loading ? "—" : udpCount} />
        <StatCard label="Đang LISTEN" value={loading ? "—" : listening} />
      </div>

      {/* Echo demo */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Echo server demo</span>
          <Tabs value={transport} onValueChange={(v) => setTransport(v as Transport)}>
            <TabsList>
              {(
                [
                  ["tcp", "TCP"],
                  ["udp", "UDP"],
                  ["unix", "Unix"],
                ] as [Transport, string][]
              ).map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="px-3 data-[state=active]:border-border data-[state=active]:bg-foreground/10 data-[state=active]:font-medium data-[state=active]:text-foreground"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <form onSubmit={handleEcho} className="flex flex-wrap items-center gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Chuỗi gửi tới echo server…"
            className="h-9 max-w-md font-mono"
          />
          <Button type="submit" size="sm" className="h-9" disabled={sending || !message.trim()}>
            <Send className="size-3.5" />
            {sending ? "Đang gửi…" : "Gửi echo"}
          </Button>
        </form>

        {transport === "unix" ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Unix domain socket chỉ chạy trên Linux; trên Windows backend trả lỗi 501.
          </p>
        ) : null}

        {/* Kết quả gửi/nhận */}
        {lastEcho ? (
          <div className="mt-3 grid gap-2 rounded-md border border-border bg-secondary/40 p-3 font-mono text-[12px] sm:grid-cols-[auto_1fr]">
            <span className="text-muted-foreground">transport</span>
            <span className="text-foreground">{lastEcho.transport}</span>
            <span className="text-muted-foreground">sent</span>
            <span className="text-foreground">{lastEcho.sent}</span>
            <span className="text-muted-foreground">received</span>
            <span className="text-status-ok">{lastEcho.received}</span>
          </div>
        ) : null}
      </div>

      {/* Thanh điều khiển bảng kết nối */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-foreground">Kết nối socket</span>
        <span className="text-xs text-muted-foreground">cập nhật {agoText(lastUpdated, now)}</span>
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
      </div>

      {/* Bảng kết nối */}
      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(c) => `${c.fd}-${c.local_addr}-${c.remote_addr}-${c.status}`}
        loading={loading}
        error={error}
        onRetry={() => load(false)}
        emptyText="Không có kết nối socket nào"
      />

      {/* Phân trang */}
      {!loading && !error && conns.length > PAGE_SIZE ? (
        <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
          <span>
            Trang {pageSafe}/{totalPages} · {conns.length} kết nối
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      ) : null}

      {/* Log realtime */}
      <Terminal />
    </div>
  );
}
