import { Card } from "@/components/ui/card";

// Trang tổng quan — hiện mới là KHUNG. Nội dung dashboard sẽ làm sau.
const MODULES = [
  { name: "Tiến trình", desc: "Liệt kê, spawn, kill tiến trình", href: "/process" },
  { name: "File", desc: "Đọc / ghi / xóa / chmod trong sandbox", href: "/files" },
  { name: "Socket", desc: "TCP / UDP / Unix echo, kết nối", href: "/socket" },
  { name: "Network", desc: "Interface, DNS lookup, ping", href: "/network" },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Bảng điều khiển quản lý hệ thống Linux. Chọn một module ở thanh bên để
        bắt đầu.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map((m) => (
          <Card key={m.href} className="gap-1 p-4">
            <div className="text-sm font-medium text-foreground">{m.name}</div>
            <div className="text-xs text-muted-foreground">{m.desc}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
