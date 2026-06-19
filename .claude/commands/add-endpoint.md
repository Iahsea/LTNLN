---
description: Thêm một API endpoint mới vào backend FastAPI theo đúng chuẩn project
---

Thêm endpoint mới vào backend theo yêu cầu: $ARGUMENTS

Làm theo thứ tự:
1. Xác định module phù hợp (process / files / socket / network) và mở router tương ứng trong `backend/routers/`.
2. Định nghĩa schema request & response trong `backend/core/schemas.py`.
3. Viết hàm xử lý; bọc `try/except` cho phần đặc thù Linux, ưu tiên `psutil`.
4. Mọi thao tác file/process giới hạn trong `./sandbox/`.
5. Đánh dấu `[x]` vào dòng tương ứng trong `PLAN.md` và `docs/api-spec.md`.
6. Chạy `uvicorn main:app --reload --port 8066`, kiểm tra không lỗi, rồi hướng dẫn tôi cách test trên `/docs`.