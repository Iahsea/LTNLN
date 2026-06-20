"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cpu,
  Folder,
  Cable,
  Globe,
} from "lucide-react";

import { cn } from "@/lib/utils";

// 4 module + trang tổng quan. Thứ tự khớp PLAN.md.
const NAV = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/process", label: "Tiến trình", icon: Cpu },
  { href: "/files", label: "File", icon: Folder },
  { href: "/socket", label: "Socket", icon: Cable },
  { href: "/network", label: "Network", icon: Globe },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo / tên app */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Cpu className="size-4" />
        </span>
        <span className="text-sm font-medium text-foreground">
          Linux Manager
        </span>
      </div>

      {/* Điều hướng */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          // Mục active: khớp chính xác "/" hoặc tiền tố cho các trang con.
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? // mục đang chọn: nền cam mờ + chữ/đường viền accent cam
                    "bg-[rgba(249,115,22,0.12)] font-medium text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-muted-foreground">
        Backend: <span className="font-mono">:8066</span>
      </div>
    </aside>
  );
}
