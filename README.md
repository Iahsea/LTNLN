# Linux System Manager

Ứng dụng web quản lý **tiến trình, file, socket và network** trên Ubuntu.

- **Backend:** FastAPI (Python)
- **Frontend:** Next.js (App Router)
- **Môi trường chạy:** Ubuntu Server (VMware)

Xem chi tiết kế hoạch tại [`PLAN.md`](./PLAN.md).

## Cấu trúc thư mục

```
linux-system-manager/
├── backend/                  # FastAPI
│   ├── main.py               # khởi tạo app, mount router, CORS
│   ├── routers/              # process, files, socket_mod, network
│   ├── core/                 # schemas (Pydantic), epoll_demo
│   └── requirements.txt
├── frontend/                 # Next.js (App Router) — gọi backend qua rewrites proxy
├── README.md
└── .gitignore
```

## Chạy backend (dev)

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8066 --reload
```

Sau khi chạy, mở Swagger UI để kiểm tra API tại: <http://localhost:8066/docs>
Kiểm tra nhanh: <http://localhost:8066/api/health>

## Chạy frontend (dev)

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000, proxy /api và /ws về backend (8066)
```

Backend và frontend chạy thành **2 tiến trình song song** (uvicorn 8066 +
Next.js 3000); frontend gọi backend qua rewrites proxy.

## Trạng thái

Khung dự án đã dựng xong; các router hiện rỗng và sẽ được implement theo
lộ trình trong `PLAN.md`.
# LTNLN
