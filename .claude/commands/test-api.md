---
description: Chạy backend và kiểm tra các endpoint hoạt động
---

Kiểm tra backend:
1. Chạy `uvicorn main:app --reload --port 8066` (nếu chưa chạy).
2. Dùng `curl` gọi thử các endpoint vừa làm, in kết quả.
3. Nếu có lỗi, phân tích và sửa, rồi chạy lại.
4. Báo tôi endpoint nào OK, endpoint nào còn lỗi.