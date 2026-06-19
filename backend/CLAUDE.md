# CLAUDE.md — Backend (FastAPI)

Quy tắc riêng cho `backend/`. Đọc kèm `CLAUDE.md` gốc.

## Cấu trúc
```
backend/
├── main.py            # khởi tạo app, CORS, mount router
├── routers/           # process.py, files.py, socket_mod.py, network.py
├── core/              # schemas.py (Pydantic), epoll_demo.py (chạy riêng)
└── requirements.txt
```

## Quy ước
- Mỗi module là một `APIRouter`, mount vào `main.py` với prefix `/api`.
- Schema request/response gom trong `core/schemas.py`, không rải rác.
- Ưu tiên `psutil` cho tiến trình & network (cross-platform).
- Chức năng đặc thù Linux: bọc `try/except`; trên Windows trả thông báo "chỉ hỗ trợ Linux" thay vì crash.
- WebSocket `/ws/logs` dùng `asyncio` stream log realtime.

## Cảnh báo Windows
`os.fork`, `signal.SIGCHLD`, `socket.AF_UNIX`, `select.epoll` **không có trên Windows**. Kiểm tra `sys.platform` khi viết các phần này.

## Test
Sau khi viết xong một router: `uvicorn main:app --reload --port 8066`, test từng endpoint trên `http://127.0.0.1:8066/docs`.