"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search, Radio } from "lucide-react";
import { toast } from "sonner";

import {
  listInterfaces,
  dnsLookup,
  pingHost,
  type NetworkInterface,
  type DnsResponse,
  type PingResponse,
} from "@/lib/api";
import { DataTable, type Column } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Terminal } from "@/components/terminal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const REFRESH_MS = 4000;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function agoText(ts: number | null, now: number): string {
  if (!ts) return "—";
  const s = Math.max(0, Math.round((now - ts) / 1000));
  return s < 1 ? "vừa xong" : `${s}s trước`;
}

export default function NetworkPage() {
  const [rows, setRows] = useState<NetworkInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);

  // DNS lookup
  const [dnsTarget, setDnsTarget] = useState("google.com");
  const [dnsBusy, setDnsBusy] = useState(false);
  const [dnsResult, setDnsResult] = useState<DnsResponse | null>(null);

  // Ping
  const [pingTarget, setPingTarget] = useState("127.0.0.1");
  const [pingBusy, setPingBusy] = useState(false);
  const [pingResult, setPingResult] = useState<PingResponse | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async (initial = false) => {
    try {
      const data = await listInterfaces();
      setRows(data);
      setError(null);
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách interface");
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

  async function handleDns(e: React.FormEvent) {
    e.preventDefault();
    const host = dnsTarget.trim();
    if (!host) return;
    setDnsBusy(true);
    try {
      const res = await dnsLookup(host);
      setDnsResult(res);
      toast.success(`Phân giải ${host}: ${res.addresses.length} địa chỉ`);
    } catch (e) {
      setDnsResult(null);
      toast.error(e instanceof Error ? e.message : "DNS lookup thất bại");
    } finally {
      setDnsBusy(false);
    }
  }

  async function handlePing(e: React.FormEvent) {
    e.preventDefault();
    const host = pingTarget.trim();
    if (!host) return;
    setPingBusy(true);
    try {
      const res = await pingHost(host);
      setPingResult(res);
      if (res.reachable) toast.success(`${host} tới được (${res.latency_ms} ms)`);
      else toast.error(`${host} không tới được`);
    } catch (e) {
      setPingResult(null);
      toast.error(e instanceof Error ? e.message : "Ping thất bại");
    } finally {
      setPingBusy(false);
    }
  }

  const upCount = rows.filter((r) => r.flags.startsWith("UP")).length;
  const totalRx = rows.reduce((s, r) => s + r.rx_bytes, 0);
  const totalTx = rows.reduce((s, r) => s + r.tx_bytes, 0);

  const columns: Column<NetworkInterface>[] = [
    { key: "name", header: "Interface", className: "font-mono", cell: (r) => r.name },
    {
      key: "ipv4",
      header: "IPv4",
      className: "w-40 font-mono",
      cell: (r) => r.ipv4 || "—",
    },
    {
      key: "netmask",
      header: "Netmask",
      className: "w-36 font-mono text-muted-foreground",
      cell: (r) => r.netmask || "—",
    },
    {
      key: "flags",
      header: "Trạng thái",
      className: "w-40",
      cell: (r) => {
        const up = r.flags.startsWith("UP");
        const mtu = r.flags.split(",").slice(1).join(",");
        return (
          <span className="flex items-center gap-2">
            <StatusBadge status={up ? "UP" : "DOWN"} tone={up ? "ok" : "idle"} />
            {mtu ? <span className="font-mono text-[11px] text-muted-foreground">{mtu}</span> : null}
          </span>
        );
      },
    },
    {
      key: "rx",
      header: "RX",
      className: "w-24 text-right font-mono tabular-nums",
      cell: (r) => formatBytes(r.rx_bytes),
    },
    {
      key: "tx",
      header: "TX",
      className: "w-24 text-right font-mono tabular-nums",
      cell: (r) => formatBytes(r.tx_bytes),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Tổng interface" value={loading ? "—" : rows.length} />
        <StatCard label="Đang UP" value={loading ? "—" : upCount} />
        <StatCard label="Tổng RX" value={loading ? "—" : formatBytes(totalRx)} />
        <StatCard label="Tổng TX" value={loading ? "—" : formatBytes(totalTx)} />
      </div>

      {/* Hai công cụ: DNS lookup + Ping */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* DNS lookup */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 text-sm font-medium text-foreground">DNS lookup</div>
          <form onSubmit={handleDns} className="flex items-center gap-2">
            <Input
              value={dnsTarget}
              onChange={(e) => setDnsTarget(e.target.value)}
              placeholder="vd: google.com"
              className="h-9 font-mono"
            />
            <Button type="submit" size="sm" className="h-9" disabled={dnsBusy || !dnsTarget.trim()}>
              <Search className="size-3.5" />
              {dnsBusy ? "Đang tra…" : "Tra cứu"}
            </Button>
          </form>
          {dnsResult ? (
            <div className="mt-3 rounded-md border border-border bg-secondary/40 p-3 font-mono text-[12px]">
              <div className="mb-1 text-muted-foreground">{dnsResult.host}</div>
              {dnsResult.addresses.map((ip) => (
                <div key={ip} className="text-foreground">
                  {ip}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Ping */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 text-sm font-medium text-foreground">Ping host</div>
          <form onSubmit={handlePing} className="flex items-center gap-2">
            <Input
              value={pingTarget}
              onChange={(e) => setPingTarget(e.target.value)}
              placeholder="vd: 127.0.0.1 hoặc google.com"
              className="h-9 font-mono"
            />
            <Button type="submit" size="sm" className="h-9" disabled={pingBusy || !pingTarget.trim()}>
              <Radio className="size-3.5" />
              {pingBusy ? "Đang ping…" : "Ping"}
            </Button>
          </form>
          {pingResult ? (
            <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-secondary/40 p-3 font-mono text-[12px]">
              <span className="text-muted-foreground">{pingResult.host}</span>
              <StatusBadge
                status={pingResult.reachable ? "tới được" : "không tới"}
                tone={pingResult.reachable ? "ok" : "error"}
              />
              {pingResult.reachable ? (
                <span className="text-foreground">{pingResult.latency_ms} ms</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Thanh điều khiển bảng interface */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-foreground">Card mạng (interface)</span>
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

      {/* Bảng interface */}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.name}
        loading={loading}
        error={error}
        onRetry={() => load(false)}
        emptyText="Không có interface nào"
      />

      {/* Log realtime */}
      <Terminal />
    </div>
  );
}
