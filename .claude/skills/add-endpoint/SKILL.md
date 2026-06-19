---
name: add-endpoint
description: Dùng khi cần thêm một API endpoint mới vào backend FastAPI của project Linux System Manager. Đóng gói quy trình tạo route, schema Pydantic, xử lý cross-platform, và cập nhật tài liệu. Kích hoạt khi người dùng nói "thêm endpoint", "thêm API", "tạo route mới".
---

# Thêm API endpoint mới

Quy trình chuẩn để thêm một endpoint vào backend, đảm bảo nhất quán giữa code và tài liệu.

## Các bước

1. **Chọn router.** Xác định endpoint thuộc module nào và mở file tương ứng trong `backend/routers/`:
   - tiến trình → `process.py`
   - file → `files.py`
   - socket → `socket_mod.py`
   - network → `network.py`

2. **Định nghĩa schema.** Thêm Pydantic model cho request (nếu có body) và response vào `backend/core/schemas.py`. Đặt tên rõ ràng, ví dụ `FileReadRequest`, `ProcessInfo`.

3. **Viết handler.** Trong router:
   - Dùng decorator đúng method (`@router.get`, `@router.post`...).
   - Ưu tiên `psutil` cho tiến trình/network để chạy được cả Windows.
   - Phần đặc thù Linux (`/proc`, signal, `AF_UNIX`, `epoll`): bọc `try/except`, kiểm tra `sys.platform`, trên Windows trả thông báo "chỉ hỗ trợ Linux".

4. **An toàn.** Mọi thao tác file/process chỉ trong `./sandbox/`. Validate đường dẫn để không thoát ra ngoài sandbox.

5. **Cập nhật tài liệu.**
   - Đánh dấu `[x]` dòng tương ứng trong `PLAN.md`.
   - Cập nhật cột "Trạng thái" trong bảng API của `PLAN.md`.
   - Bổ sung chi tiết request/response vào `docs/api-spec.md`.

6. **Test.** Chạy `uvicorn main:app --reload --port 8066`, kiểm tra import không lỗi, rồi hướng dẫn người dùng test trên `http://127.0.0.1:8066/docs`.

## Lưu ý
- Tên và method endpoint phải khớp đúng bảng API trong `PLAN.md`.
- Comment tiếng Việt ngắn gọn ở chỗ dùng system call (phục vụ báo cáo môn học).