# CLAUDE.md — Linux System Manager

Bối cảnh để Claude Code làm việc trên project. Đọc kỹ trước khi code. Kế hoạch & checklist nằm trong `PLAN.md` — luôn bám theo file đó. Đặc tả API chi tiết ở `docs/api-spec.md`.

## Mục tiêu

Ứng dụng web quản lý **tiến trình, file, socket và network** trên Ubuntu (bài tập môn Lập trình nhân Linux).

- **Backend:** FastAPI (Python), chạy bằng `uvicorn`
- **Frontend:** Next.js (App Router) — UI thuần, gọi thẳng FastAPI qua `fetch`
- **Môi trường chạy thật:** Ubuntu Server

## Bối cảnh môi trường QUAN TRỌNG

- Dev trên **Windows** (Git Bash / MINGW64), nhưng app **chạy thật trên Ubuntu**.
- Chức năng đặc thù Linux — `/proc`, signal `SIGCHLD`/`SIGTERM`, Unix domain socket, `epoll` — **lỗi hoặc không tồn tại trên Windows**.
- Code phải **cross-platform khi có thể** (ưu tiên `psutil`); mọi lời gọi đặc thù Linux phải bọc `try/except` hoặc kiểm tra `sys.platform` để không crash lúc dev.

## Quy tắc làm việc

1. **Làm tuần tự từng module**, không làm hết một lượt: process → file → socket → network → websocket → frontend.
2. **Test sau mỗi module** rồi mới sang module kế; báo cách test qua Swagger UI tại `/docs`.
3. Hoàn thành tính năng nào thì **đánh dấu `[x]`** vào checkbox tương ứng trong `PLAN.md`.
4. **Dừng và hỏi** trước khi: cài thư viện mới, tạo nhiều file frontend cùng lúc, đổi cấu trúc thư mục.

## An toàn (BẮT BUỘC)

- Mọi thao tác file và process **chỉ trong thư mục `./sandbox/`**. Tạo nếu chưa có.
- **Không bao giờ** xóa/ghi đè/đổi quyền file ngoài sandbox, kể cả khi test.
- Không chạy lệnh phá hủy (`rm -rf`, format, kill tiến trình hệ thống).

## Cấu trúc thư mục

```
linux-system-manager/
├── backend/      # FastAPI — xem backend/CLAUDE.md
├── frontend/     # Next.js (App Router) — xem frontend/CLAUDE.md
├── sandbox/      # vùng an toàn cho thao tác file/process
├── docs/         # tài liệu tham chiếu (api-spec.md)
├── PLAN.md       # checklist & kế hoạch (nguồn chân lý)
└── CLAUDE.md     # file này
```

## Lệnh hay dùng

```bash
# Backend (từ backend/)
uvicorn main:app --reload --port 8066
# Frontend (từ frontend/)
npm run dev
npm run build
```

## Phong cách code

- Backend: router theo module trong `routers/`, schema Pydantic gom trong `core/schemas.py`.
- Đặt tên endpoint đúng bảng API trong `PLAN.md` / `docs/api-spec.md`.
- Trả JSON cấu trúc rõ ràng để frontend dễ parse.
- Comment tiếng Việt ngắn gọn ở chỗ dùng system call để phục vụ báo cáo môn học.