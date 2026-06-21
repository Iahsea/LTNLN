"use client";

import { useEffect, useRef, useState } from "react";

import { openLogSocket, type LogEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_LINES = 500;

// Màu chữ theo mức log (dùng màu trạng thái, đọc lướt nhanh).
const LEVEL_CLASS: Record<string, string> = {
  INFO: "text-status-ok",
  WARN: "text-status-warn",
  ERROR: "text-status-error",
};

export function Terminal({ className }: { className?: string }) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  // Có bám đáy không — nếu user cuộn lên đọc thì tạm dừng auto-cuộn.
  const stickRef = useRef(true);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false; // unmount → không kết nối lại nữa

    const connect = () => {
      ws = openLogSocket();
      ws.onopen = () => setConnected(true);
      ws.onmessage = (e) => {
        try {
          const item = JSON.parse(e.data) as LogEvent;
          setLogs((prev) => {
            const next = [...prev, item];
            return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
          });
        } catch {
          // bỏ qua message không phải JSON
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 2000); // tự thử lại
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, []);

  // Auto-cuộn xuống dòng mới nhất CHỈ khi đang bám đáy.
  useEffect(() => {
    const el = viewportRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const onScroll = () => {
    const el = viewportRef.current;
    if (!el) return;
    // Còn cách đáy < 24px coi như đang bám đáy.
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-lg border border-border", className)}>
      <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-3 py-1.5">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Log hệ thống (realtime)
        </span>
        <span className="flex items-center gap-1.5 text-[11px]">
          <span
            className={cn(
              "size-1.5 rounded-full",
              connected ? "bg-status-ok" : "bg-status-warn",
            )}
          />
          <span className={connected ? "text-status-ok" : "text-status-warn"}>
            {connected ? "đã kết nối" : "mất kết nối, đang thử lại…"}
          </span>
        </span>
      </div>
      <div
        ref={viewportRef}
        onScroll={onScroll}
        className="h-56 overflow-y-auto bg-[#0a0a0b] p-3 font-mono text-[12px] leading-relaxed"
      >
        {logs.length === 0 ? (
          <div className="text-muted-foreground">Chưa có log. Thực hiện một thao tác để xem log hiện ở đây.</div>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap break-words">
              <span className="text-muted-foreground">{l.time || "--:--:--"}</span>{" "}
              <span className={cn("font-medium", LEVEL_CLASS[l.level] ?? "text-muted-foreground")}>
                [{l.level}]
              </span>{" "}
              <span className="text-status-idle">{l.module}</span>{" "}
              <span className="text-foreground">{l.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
