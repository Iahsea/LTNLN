"use client";

import { usePathname } from "next/navigation";

// Tiêu đề khớp mục sidebar đang chọn.
const TITLES: Record<string, string> = {
  "/": "Tổng quan",
  "/process": "Quản lý tiến trình",
  "/files": "Quản lý file",
  "/socket": "Socket",
  "/network": "Network",
};

function titleFor(pathname: string): string {
  if (pathname === "/") return TITLES["/"];
  const key = Object.keys(TITLES).find(
    (k) => k !== "/" && pathname.startsWith(k),
  );
  return key ? TITLES[key] : "Linux System Manager";
}

export function Topbar() {
  const pathname = usePathname();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
      <h1 className="text-sm font-medium text-foreground">
        {titleFor(pathname)}
      </h1>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-status-ok" />
        Ubuntu System Manager
      </span>
    </header>
  );
}
