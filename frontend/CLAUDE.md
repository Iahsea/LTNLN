# CLAUDE.md — Frontend (React + Vite)

Quy tắc riêng cho `frontend/`. Đọc kèm `CLAUDE.md` gốc.

## Cấu trúc
```
frontend/
├── src/
│   ├── App.jsx          # layout + routing 4 trang
│   ├── components/      # Sidebar, Table, Terminal, StatCard
│   ├── pages/           # Process, Files, Socket, Network
│   └── api.js           # mọi lời gọi backend gom ở đây
├── vite.config.js       # proxy /api và /ws về backend
└── package.json
```

## Quy ước
- Backend ở `http://localhost:8066`. Cấu hình `vite.config.js` proxy `/api` và `/ws` về đó (tránh CORS lúc dev).
- Mọi lời gọi API tập trung trong `src/api.js`, không gọi `fetch` rải rác.
- Tách component tái sử dụng (bảng, sidebar, terminal) thay vì lặp code.
- Làm xong trang nào chạy `npm run dev` kiểm tra rồi mới sang trang kế.
- Tên & method endpoint khớp đúng bảng API trong `PLAN.md`.