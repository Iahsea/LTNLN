# Frontend — Next.js (App Router)

Giao diện dashboard (Next.js + Tailwind + shadcn/ui). UI thuần, gọi thẳng
FastAPI qua `fetch`; **không** dùng API route của Next cho system call.

Khởi tạo bằng:

```bash
npx create-next-app@latest . --ts --app --tailwind --eslint
npm install
npm run dev   # chạy ở http://localhost:3000
```

Cấu trúc dự kiến (theo PLAN.md):

```
frontend/
├── app/
│   ├── layout.tsx        # layout + sidebar/topbar
│   ├── page.tsx          # trang chủ / dashboard
│   ├── process/page.tsx  # Process / Files / Socket / Network
│   ├── files/page.tsx
│   ├── socket/page.tsx
│   └── network/page.tsx
├── components/           # Sidebar, Table, Terminal, StatCard
├── lib/
│   └── api.ts            # mọi lời gọi backend
├── next.config.js        # rewrites proxy /api và /ws → backend (cổng 8066)
└── package.json
```

Backend chạy riêng ở cổng 8066. `next.config.js` dùng `rewrites()` proxy
`/api` và `/ws` về đó để tránh CORS lúc dev. Xem quy ước chi tiết trong
[`CLAUDE.md`](./CLAUDE.md).
