# API Specification — Linux System Manager

Đặc tả chi tiết request/response của từng endpoint. Backend và frontend bám theo file này để khớp dữ liệu.

> Quy ước chung: response lỗi trả `{ "error": "mô tả lỗi" }` kèm HTTP status phù hợp. Mọi thao tác file/process giới hạn trong `./sandbox/`.

## Module tiến trình

### GET /api/process
Liệt kê tiến trình đang chạy.
**Response:** `[{ pid, name, ppid, status, cpu_percent, memory_kb }]`

### POST /api/process/spawn
Tạo tiến trình con.
**Request:** `{ "command": "string" }`
**Response:** `{ pid, status }`

### DELETE /api/process/{pid}/kill
Gửi tín hiệu kết thúc tiến trình.
**Response:** `{ pid, killed: true }`

## Module file

### GET /api/files?path=...
Liệt kê file + metadata trong thư mục (mặc định sandbox).
**Response:** `[{ name, size, permissions, is_dir, modified }]`

### GET /api/files/read?path=...
Đọc nội dung file.
**Response:** `{ path, content }`

### POST /api/files/write
Ghi / tạo file.
**Request:** `{ "path": "string", "content": "string" }`
**Response:** `{ path, bytes_written }`

### DELETE /api/files/delete?path=...
Xóa file trong sandbox.
**Response:** `{ path, deleted: true }`

### PATCH /api/files/chmod
Đổi quyền file.
**Request:** `{ "path": "string", "mode": "644" }`
**Response:** `{ path, mode }`

## Module socket

### GET /api/socket/connections
Liệt kê kết nối socket hiện tại.
**Response:** `[{ fd, type, local_addr, remote_addr, status }]`

### POST /api/socket/echo
Gửi chuỗi tới echo server demo, nhận lại.
**Request:** `{ "message": "string" }`
**Response:** `{ sent, received }`

## Module network

### GET /api/network/interfaces
Liệt kê card mạng.
**Response:** `[{ name, ipv4, netmask, flags, rx_bytes, tx_bytes }]`

### GET /api/network/dns?host=...
DNS lookup.
**Response:** `{ host, addresses: [...] }`

### GET /api/network/ping?host=...
Ping host.
**Response:** `{ host, reachable, latency_ms }`

## Realtime

### WS /ws/logs
WebSocket stream log các thao tác. Server đẩy message dạng:
`{ time, level, module, message }`