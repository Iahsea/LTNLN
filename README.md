# Linux System Manager

Ứng dụng web quản lý **tiến trình, file, socket và network** trên Ubuntu.

- **Backend:** FastAPI (Python)
- **Frontend:** React + Vite
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
├── frontend/                 # React + Vite (tạo bằng npm create vite)
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
npm run dev
```

## Trạng thái

Khung dự án đã dựng xong; các router hiện rỗng và sẽ được implement theo
lộ trình trong `PLAN.md`.
# LTNLN
