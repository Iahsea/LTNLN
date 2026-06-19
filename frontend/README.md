# Frontend — React + Vite

Thư mục này sẽ chứa giao diện dashboard (React + Vite).

Khởi tạo bằng:

```bash
npm create vite@latest . -- --template react
npm install
npm run dev
```

Cấu trúc dự kiến (theo PLAN.md):

```
frontend/
├── src/
│   ├── App.jsx           # layout + routing
│   ├── components/       # Sidebar, Table, Terminal
│   ├── pages/            # Process, Files, Socket, Network
│   └── api.js            # axios gọi backend
├── vite.config.js        # proxy → backend
└── package.json
```
