# CLAUDE.md — Frontend (Next.js)

Quy tắc riêng cho `frontend/`. Đọc kèm `CLAUDE.md` gốc.

## Thiết kế giao diện (BẮT BUỘC đọc trước khi code UI)

Trước khi tạo hoặc sửa BẤT KỲ component/trang/layout nào, đọc `.claude/skills/ui-design/SKILL.md` và bám theo design token + danh sách cấm trong đó. Đây là điều kiện để UI không bị vẻ "template AI".

## Vai trò
Next.js chỉ đóng vai trò **giao diện (UI thuần)**. Mọi logic hệ thống nằm ở backend FastAPI.
- **KHÔNG** dùng API route của Next (`app/api/`) để gọi system call — JS không gọi syscall Linux tự nhiên như Python.
- Frontend gọi thẳng FastAPI qua `fetch`. Next chỉ render và quản lý state.

## Cấu trúc (App Router)
```
frontend/
├── app/
│   ├── layout.tsx        # layout chung: sidebar + topbar
│   ├── page.tsx          # trang chủ / dashboard
│   ├── process/page.tsx  # trang tiến trình
│   ├── files/page.tsx    # trang file
│   ├── socket/page.tsx   # trang socket
│   └── network/page.tsx  # trang network
├── components/           # Sidebar, Table, Terminal, StatCard
├── lib/
│   └── api.ts            # mọi lời gọi backend gom ở đây
├── next.config.js        # rewrites proxy /api và /ws về backend
└── package.json
```

## Quy ước
- Backend ở `http://localhost:8066`. Cấu hình `next.config.js` rewrites `/api/*` và `/ws/*` về đó để tránh CORS lúc dev:
  ```js
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:8066/api/:path*' },
      { source: '/ws/:path*',  destination: 'http://localhost:8066/ws/:path*' },
    ];
  }
  ```
- Các trang gọi API dùng `'use client'` + `useEffect`/`useState` (vì cần fetch realtime, không cần SSR).
- Mọi lời gọi API tập trung trong `lib/api.ts`, không gọi `fetch` rải rác.
- Tách component tái sử dụng (bảng, sidebar, terminal) thay vì lặp code.
- Làm xong trang nào chạy `npm run dev` kiểm tra rồi mới sang trang kế.
- Tên & method endpoint khớp đúng bảng API trong `PLAN.md` / `docs/api-spec.md`.

## Lưu ý
- Dashboard này là nội bộ, không cần SEO/SSR — ưu tiên client component cho đơn giản.
- WebSocket `/ws/logs`: kết nối trong client component, không dùng qua API route.