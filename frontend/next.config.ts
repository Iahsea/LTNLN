import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép truy cập dev server qua IP mạng LAN (máy ảo Ubuntu) mà không bị
  // chặn HMR/cross-origin. Thêm IP máy chủ vào đây khi chạy `npm run dev`.
  allowedDevOrigins: ["192.168.241.50"],
  // Proxy mọi request /api và /ws sang backend FastAPI (cổng 8066).
  // Nhờ rewrites, trình duyệt thấy cùng origin (localhost:3000) nên KHÔNG dính
  // CORS lúc dev, và WebSocket /ws/logs cũng đi qua proxy này.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:8066/api/:path*" },
      { source: "/ws/:path*", destination: "http://localhost:8066/ws/:path*" },
    ];
  },
};

export default nextConfig;
