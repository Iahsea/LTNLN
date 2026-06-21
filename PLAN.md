# PLAN.md — Checklist lập trình

## Lập trình quản lý tiến trình, file, socket và network trong Ubuntu

**Backend:** FastAPI (Python) · **Frontend:** Next.js (App Router)

---

## 1. Backend — Khung ứng dụng

- [x] `main.py`: khởi tạo FastAPI app
- [x] Cấu hình CORS middleware
- [x] Mount 4 router (`process`, `files`, `socket_mod`, `network`)
- [x] Định nghĩa schema Pydantic chung trong `core/schemas.py`
- [x] CORS cho phép origin Next.js dev (`http://localhost:3000`)

---

## 2. Module tiến trình (Process)

- [x] `GET /api/process` — liệt kê tiến trình đang chạy (đọc `/proc` hoặc `psutil`)
- [x] `POST /api/process/spawn` — tạo tiến trình con bằng `subprocess.Popen` (fork/exec)
- [x] `DELETE /api/process/{pid}/kill` — gửi signal kết thúc bằng `os.kill`
- [x] Thu hồi tiến trình con (`wait` / tránh zombie process)
- [x] Xử lý signal: bắt `SIGCHLD`, `SIGTERM`
- [x] Trả về thông tin: PID, PPID, tên, trạng thái, CPU%, bộ nhớ

---

## 3. Module file (File I/O)

- [x] `GET /api/files` — liệt kê file + metadata (`os.listdir`, `os.stat`)
- [x] `GET /api/files/read` — đọc nội dung file (`open`, `read`)
- [x] `POST /api/files/write` — ghi / tạo file (`open`, `write`)
- [x] `DELETE /api/files/delete` — xóa file (`os.remove`)
- [x] `PATCH /api/files/chmod` — đổi quyền file (`os.chmod`)
- [x] Duyệt thư mục (`opendir` / `os.scandir`)
- [x] Hiển thị quyền truy cập dạng `rwxr-xr-x`
- [x] Giới hạn thao tác trong thư mục sandbox (tránh xóa nhầm file hệ thống)

---

## 4. Module socket (Socket Programming)

- [x] `POST /api/socket/echo` — TCP echo server demo (`socket`, `bind`, `listen`, `accept`)
- [x] `GET /api/socket/connections` — liệt kê kết nối socket (`psutil.net_connections`)
- [x] Gửi / nhận dữ liệu (`send` / `recv`)
- [x] Demo UDP socket
- [x] Demo Unix domain socket (IPC giữa 2 tiến trình)
- [x] Hiển thị trạng thái kết nối: LISTEN, ESTABLISHED, CLOSE_WAIT...

---

## 5. Module network (Network Programming)

- [x] `GET /api/network/interfaces` — liệt kê card mạng (`psutil.net_if_addrs` / `getifaddrs`)
- [x] `GET /api/network/dns` — DNS lookup (`socket.getaddrinfo`)
- [x] `GET /api/network/ping` — ping host
- [x] Hiển thị IPv4, netmask, flags, RX/TX bytes của từng interface
- [x] Module độc lập demo `select` / `epoll` xử lý nhiều client cùng lúc (`core/epoll_demo.py`)

---

## 6. Realtime (WebSocket)

- [x] `WS /ws/logs` — stream log realtime bằng `asyncio`
- [x] Đẩy log của các thao tác (spawn process, đọc file, kết nối socket...) về frontend
- [x] Xử lý kết nối / ngắt kết nối WebSocket

---

## 7. Frontend — Next.js (App Router)

> Next.js chỉ làm UI thuần, gọi thẳng FastAPI qua `fetch`. KHÔNG dùng API route của Next (`app/api/`) cho system call.
> Thư viện dự kiến (theo skill `ui-design`): Tailwind CSS, shadcn/ui, lucide-react, font Inter/Geist + JetBrains Mono. Cài qua `create-next-app` + `npx shadcn` — dừng & hỏi trước khi cài thêm gì khác.

- [x] Layout gốc (`app/layout.tsx`): sidebar 4 module + topbar
- [x] Component tái sử dụng: `Sidebar`, `Table` (`DataTable`), `Terminal`, `StatCard` (+ `StatusBadge`)
- [x] `lib/api.ts`: hàm gọi backend bằng `fetch`
- [x] Trang Process (`app/process/page.tsx`): bảng tiến trình + nút kill / spawn
- [x] Trang Files (`app/files/page.tsx`): bảng file + nút đọc / ghi / xóa / chmod
- [x] Trang Socket (`app/socket/page.tsx`): bảng kết nối + form echo
- [x] Trang Network (`app/network/page.tsx`): bảng interface + form DNS lookup / ping
- [x] Đánh dấu `"use client"` cho các trang/component có state, polling, WebSocket
- [x] Auto refresh dữ liệu (`setInterval` / polling)
- [x] Khung terminal hiển thị log realtime qua WebSocket
- [x] Cấu hình `next.config.js` rewrites proxy `/api` và `/ws` → backend (dùng `next.config.ts`)

---

## 8. Tích hợp & đóng gói

> Mô hình: **2 tiến trình song song** — `uvicorn` (8066) + Next.js (3000). Frontend gọi backend qua rewrites proxy (`/api`, `/ws`), không để FastAPI serve frontend.

- [ ] Kết nối FE-BE qua rewrites proxy, kiểm tra `/api` và `/ws` thông
- [ ] `next dev` (dev) / `next build` + `next start` (chạy thật) cho frontend
- [ ] `uvicorn main:app --port 8066` cho backend (tiến trình riêng)
- [ ] Test end-to-end từng chức năng trên Ubuntu (chạy cả 2 tiến trình)

---

## Cấu trúc thư mục

```
linux-manager/
├── backend/                  # FastAPI
│   ├── main.py               # khởi tạo app, mount router, CORS
│   ├── routers/
│   │   ├── process.py        # /api/process
│   │   ├── files.py          # /api/files
│   │   ├── socket_mod.py     # /api/socket
│   │   └── network.py        # /api/network
│   ├── core/
│   │   ├── schemas.py        # Pydantic models
│   │   └── epoll_demo.py     # select/epoll độc lập
│   └── requirements.txt      # fastapi, uvicorn, psutil
├── frontend/                 # Next.js (App Router)
│   ├── app/
│   │   ├── layout.tsx        # layout + sidebar/topbar
│   │   ├── page.tsx          # trang chủ / dashboard
│   │   ├── process/page.tsx  # các trang Process / Files / Socket / Network
│   │   ├── files/page.tsx
│   │   ├── socket/page.tsx
│   │   └── network/page.tsx
│   ├── components/           # Sidebar, Table, Terminal, StatCard
│   ├── lib/
│   │   └── api.ts            # fetch gọi backend
│   ├── next.config.js        # rewrites proxy /api và /ws → backend
│   └── package.json
└── README.md
```

---

## Bảng tổng hợp API endpoint

| Module | Endpoint | Method | System call / lib | Chức năng | Trạng thái |
|---|---|---|---|---|---|
| Tiến trình | `/api/process` | GET | `psutil`, `/proc` | Liệt kê tiến trình | [x] |
| Tiến trình | `/api/process/spawn` | POST | `subprocess.Popen` | Tạo tiến trình con | [x] |
| Tiến trình | `/api/process/{pid}/kill` | DELETE | `os.kill` + signal | Gửi tín hiệu kết thúc | [x] |
| File | `/api/files` | GET | `os.listdir`, `os.stat` | Liệt kê file + metadata | [x] |
| File | `/api/files/read` | GET | `open`, `read` | Đọc nội dung file | [x] |
| File | `/api/files/write` | POST | `open`, `write` | Ghi/tạo file | [x] |
| File | `/api/files/delete` | DELETE | `os.remove` | Xóa file | [x] |
| File | `/api/files/chmod` | PATCH | `os.chmod` | Đổi quyền file | [x] |
| Socket | `/api/socket/connections` | GET | `psutil.net_connections` | Liệt kê kết nối | [x] |
| Socket | `/api/socket/echo` | POST | `socket` | TCP echo server | [x] |
| Socket | `/api/socket/udp-echo` | POST | `socket` (UDP) | UDP echo demo | [x] |
| Socket | `/api/socket/unix-echo` | POST | `socket` (AF_UNIX) | Unix socket demo (Linux) | [x] |
| Network | `/api/network/interfaces` | GET | `psutil.net_if_addrs` | Liệt kê card mạng | [x] |
| Network | `/api/network/dns` | GET | `socket.getaddrinfo` | DNS lookup | [x] |
| Network | `/api/network/ping` | GET | `socket` / `subprocess` | Ping host | [x] |
| Realtime | `/ws/logs` | WebSocket | `asyncio` | Stream log trực tiếp | [x] |

---

## Lưu ý kỹ thuật

- [x] Phần `select` / `epoll` tách thành file demo độc lập (`epoll_demo.py`) chạy riêng bằng terminal để thể hiện đúng kiến thức môn học.
- [x] Mọi thao tác file/process giới hạn trong thư mục sandbox để an toàn.
- [x] Định nghĩa schema Pydantic rõ ràng cho mọi response để frontend dễ parse.