/**
 * Gom MỌI lời gọi backend FastAPI ở đây (không gọi fetch rải rác nơi khác).
 * Đường dẫn dùng tương đối /api/* và /ws/* để đi qua rewrites proxy trong
 * next.config.ts → backend localhost:8066 (tránh CORS lúc dev).
 */

// ── Kiểu dữ liệu (khớp core/schemas.py của backend) ──────────────────────

export interface ProcessInfo {
  pid: number;
  name: string;
  ppid: number;
  status: string;
  cpu_percent: number;
  memory_kb: number;
}
export interface ProcessListResponse {
  items: ProcessInfo[];
  total: number;
  running: number;
  page: number;
  page_size: number;
  total_pages: number;
}
export interface SpawnResponse {
  pid: number;
  status: string;
}
export interface KillResponse {
  pid: number;
  killed: boolean;
}

export interface FileInfo {
  name: string;
  size: number;
  permissions: string;
  is_dir: boolean;
  modified: string;
}
export interface FileReadResponse {
  path: string;
  content: string;
}
export interface FileWriteResponse {
  path: string;
  bytes_written: number;
}
export interface FileDeleteResponse {
  path: string;
  deleted: boolean;
}
export interface ChmodResponse {
  path: string;
  mode: string;
}

export interface SocketConnection {
  fd: number;
  type: string;
  local_addr: string;
  remote_addr: string;
  status: string;
}
export interface EchoResponse {
  transport: string;
  sent: string;
  received: string;
}

export interface NetworkInterface {
  name: string;
  ipv4: string;
  netmask: string;
  flags: string;
  rx_bytes: number;
  tx_bytes: number;
}
export interface DnsResponse {
  host: string;
  addresses: string[];
}
export interface PingResponse {
  host: string;
  reachable: boolean;
  latency_ms: number | null;
}

export interface LogEvent {
  time: string;
  level: string;
  module: string;
  message: string;
}

// ── Helper fetch: ném lỗi kèm message từ backend ─────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    // FastAPI trả lỗi dạng { detail: "..." }; fallback { error: "..." }.
    let message = `Lỗi ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail || body.error || message;
    } catch {
      // body không phải JSON — giữ message mặc định.
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

const qs = (params: Record<string, string>) =>
  "?" + new URLSearchParams(params).toString();

// ── Health ───────────────────────────────────────────────────────────────

export const getHealth = () => request<{ status: string }>("/api/health");

// ── Module tiến trình ─────────────────────────────────────────────────────

export const listProcesses = (page = 1, pageSize = 20) =>
  request<ProcessListResponse>(
    "/api/process" + qs({ page: String(page), page_size: String(pageSize) })
  );

export const spawnProcess = (command: string) =>
  request<SpawnResponse>("/api/process/spawn", {
    method: "POST",
    body: JSON.stringify({ command }),
  });

export const killProcess = (pid: number) =>
  request<KillResponse>(`/api/process/${pid}/kill`, { method: "DELETE" });

// ── Module file ────────────────────────────────────────────────────────────

export const listFiles = (path = "") =>
  request<FileInfo[]>("/api/files" + (path ? qs({ path }) : ""));

export const readFile = (path: string) =>
  request<FileReadResponse>("/api/files/read" + qs({ path }));

export const writeFile = (path: string, content: string) =>
  request<FileWriteResponse>("/api/files/write", {
    method: "POST",
    body: JSON.stringify({ path, content }),
  });

export const deleteFile = (path: string) =>
  request<FileDeleteResponse>("/api/files/delete" + qs({ path }), {
    method: "DELETE",
  });

export const chmodFile = (path: string, mode: string) =>
  request<ChmodResponse>("/api/files/chmod", {
    method: "PATCH",
    body: JSON.stringify({ path, mode }),
  });

// ── Module socket ──────────────────────────────────────────────────────────

export const listConnections = () =>
  request<SocketConnection[]>("/api/socket/connections");

export const tcpEcho = (message: string) =>
  request<EchoResponse>("/api/socket/echo", {
    method: "POST",
    body: JSON.stringify({ message }),
  });

export const udpEcho = (message: string) =>
  request<EchoResponse>("/api/socket/udp-echo", {
    method: "POST",
    body: JSON.stringify({ message }),
  });

export const unixEcho = (message: string) =>
  request<EchoResponse>("/api/socket/unix-echo", {
    method: "POST",
    body: JSON.stringify({ message }),
  });

// ── Module network ─────────────────────────────────────────────────────────

export const listInterfaces = () =>
  request<NetworkInterface[]>("/api/network/interfaces");

export const dnsLookup = (host: string) =>
  request<DnsResponse>("/api/network/dns" + qs({ host }));

export const pingHost = (host: string) =>
  request<PingResponse>("/api/network/ping" + qs({ host }));

// ── Realtime log (WebSocket /ws/logs) ───────────────────────────────────────

/** Mở WebSocket tới /ws/logs. Trả về đối tượng WebSocket để caller tự quản lý. */
export function openLogSocket(): WebSocket {
  // Dùng cùng host trang web; rewrites của Next forward /ws → backend.
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return new WebSocket(`${proto}://${window.location.host}/ws/logs`);
}
