# PLAN.md — Checklist lập trình

## Lập trình quản lý tiến trình, file, socket và network trong Ubuntu

**Backend:** FastAPI (Python) · **Frontend:** React + Vite

---

## 1. Backend — Khung ứng dụng

- [ ] `main.py`: khởi tạo FastAPI app
- [ ] Cấu hình CORS middleware
- [ ] Mount 4 router (`process`, `files`, `socket_mod`, `network`)
- [ ] Định nghĩa schema Pydantic chung trong `core/schemas.py`
- [ ] Cấu hình FastAPI serve file tĩnh React (`dist/`)

---

## 2. Module tiến trình (Process)

- [ ] `GET /api/process` — liệt kê tiến trình đang chạy (đọc `/proc` hoặc `psutil`)
- [ ] `POST /api/process/spawn` — tạo tiến trình con bằng `subprocess.Popen` (fork/exec)
- [ ] `DELETE /api/process/{pid}/kill` — gửi signal kết thúc bằng `os.kill`
- [ ] Thu hồi tiến trình con (`wait` / tránh zombie process)
- [ ] Xử lý signal: bắt `SIGCHLD`, `SIGTERM`
- [ ] Trả về thông tin: PID, PPID, tên, trạng thái, CPU%, bộ nhớ

---

## 3. Module file (File I/O)

- [ ] `GET /api/files` — liệt kê file + metadata (`os.listdir`, `os.stat`)
- [ ] `GET /api/files/read` — đọc nội dung file (`open`, `read`)
- [ ] `POST /api/files/write` — ghi / tạo file (`open`, `write`)
- [ ] `DELETE /api/files/delete` — xóa file (`os.remove`)
- [ ] `PATCH /api/files/chmod` — đổi quyền file (`os.chmod`)
- [ ] Duyệt thư mục (`opendir` / `os.scandir`)
- [ ] Hiển thị quyền truy cập dạng `rwxr-xr-x`
- [ ] Giới hạn thao tác trong thư mục sandbox (tránh xóa nhầm file hệ thống)

---

## 4. Module socket (Socket Programming)

- [ ] `POST /api/socket/echo` — TCP echo server demo (`socket`, `bind`, `listen`, `accept`)
- [ ] `GET /api/socket/connections` — liệt kê kết nối socket (`psutil.net_connections`)
- [ ] Gửi / nhận dữ liệu (`send` / `recv`)
- [ ] Demo UDP socket
- [ ] Demo Unix domain socket (IPC giữa 2 tiến trình)
- [ ] Hiển thị trạng thái kết nối: LISTEN, ESTABLISHED, CLOSE_WAIT...

---

## 5. Module network (Network Programming)

- [ ] `GET /api/network/interfaces` — liệt kê card mạng (`psutil.net_if_addrs` / `getifaddrs`)
- [ ] `GET /api/network/dns` — DNS lookup (`socket.getaddrinfo`)
- [ ] `GET /api/network/ping` — ping host
- [ ] Hiển thị IPv4, netmask, flags, RX/TX bytes của từng interface
- [ ] Module độc lập demo `select` / `epoll` xử lý nhiều client cùng lúc (`core/epoll_demo.py`)

---

## 6. Realtime (WebSocket)

- [ ] `WS /ws/logs` — stream log realtime bằng `asyncio`
- [ ] Đẩy log của các thao tác (spawn process, đọc file, kết nối socket...) về frontend
- [ ] Xử lý kết nối / ngắt kết nối WebSocket

---

## 7. Frontend — React + Vite

- [ ] Layout: sidebar 4 module + topbar
- [ ] Component tái sử dụng: `Sidebar`, `Table`, `Terminal`, `StatCard`
- [ ] `api.js`: hàm gọi backend bằng axios/fetch
- [ ] Trang Process: bảng tiến trình + nút kill / spawn
- [ ] Trang Files: bảng file + nút đọc / ghi / xóa / chmod
- [ ] Trang Socket: bảng kết nối + form echo
- [ ] Trang Network: bảng interface + form DNS lookup / ping
- [ ] Auto refresh dữ liệu (`setInterval` / polling)
- [ ] Khung terminal hiển thị log realtime qua WebSocket
- [ ] Cấu hình `vite.config.js` proxy `/api` → backend

---

## 8. Tích hợp & đóng gói

- [ ] Kết nối FE-BE, kiểm tra CORS hoạt động
- [ ] `npm run build` → FastAPI serve thư mục `dist`
- [ ] Chạy toàn bộ app bằng một lệnh `uvicorn main:app`
- [ ] Test end-to-end từng chức năng trên Ubuntu

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
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── App.jsx           # layout + routing
│   │   ├── components/       # Sidebar, Table, Terminal
│   │   ├── pages/            # Process, Files, Socket, Network
│   │   └── api.js            # axios gọi backend
│   ├── vite.config.js        # proxy → backend
│   └── package.json
└── README.md
```

---

## Bảng tổng hợp API endpoint

| Module | Endpoint | Method | System call / lib | Chức năng | Trạng thái |
|---|---|---|---|---|---|
| Tiến trình | `/api/process` | GET | `psutil`, `/proc` | Liệt kê tiến trình | [ ] |
| Tiến trình | `/api/process/spawn` | POST | `subprocess.Popen` | Tạo tiến trình con | [ ] |
| Tiến trình | `/api/process/{pid}/kill` | DELETE | `os.kill` + signal | Gửi tín hiệu kết thúc | [ ] |
| File | `/api/files` | GET | `os.listdir`, `os.stat` | Liệt kê file + metadata | [ ] |
| File | `/api/files/read` | GET | `open`, `read` | Đọc nội dung file | [ ] |
| File | `/api/files/write` | POST | `open`, `write` | Ghi/tạo file | [ ] |
| File | `/api/files/delete` | DELETE | `os.remove` | Xóa file | [ ] |
| File | `/api/files/chmod` | PATCH | `os.chmod` | Đổi quyền file | [ ] |
| Socket | `/api/socket/connections` | GET | `psutil.net_connections` | Liệt kê kết nối | [ ] |
| Socket | `/api/socket/echo` | POST | `socket` | TCP echo server | [ ] |
| Network | `/api/network/interfaces` | GET | `psutil.net_if_addrs` | Liệt kê card mạng | [ ] |
| Network | `/api/network/dns` | GET | `socket.getaddrinfo` | DNS lookup | [ ] |
| Network | `/api/network/ping` | GET | `socket` / `subprocess` | Ping host | [ ] |
| Realtime | `/ws/logs` | WebSocket | `asyncio` | Stream log trực tiếp | [ ] |

---

## Lưu ý kỹ thuật

- [ ] Phần `select` / `epoll` tách thành file demo độc lập (`epoll_demo.py`) chạy riêng bằng terminal để thể hiện đúng kiến thức môn học.
- [ ] Mọi thao tác file/process giới hạn trong thư mục sandbox để an toàn.
- [ ] Định nghĩa schema Pydantic rõ ràng cho mọi response để frontend dễ parse.