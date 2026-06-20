---
name: ui-design
description: Dùng MỖI KHI tạo hoặc sửa giao diện frontend (component, trang, layout) cho Linux System Manager. Đóng gói hệ design dark-mode hiện đại với accent rõ, dùng shadcn/ui, KÈM nguyên tắc UX (trạng thái dữ liệu, phản hồi thao tác, auto-refresh, điều hướng). Bắt buộc đọc trước khi viết bất kỳ file .tsx/.jsx nào để UI/UX nhất quán và tránh vẻ "template AI". Kích hoạt khi người dùng nói "làm giao diện", "tạo trang", "thêm component", "style lại".
---

# UI Design — Linux System Manager

Hệ design cho dashboard. Mục tiêu: **hiện đại, dark mode, accent rõ, có chủ đích** — KHÔNG phải UI chung chung kiểu AI tự sinh. Stack: Next.js (App Router) + Tailwind + shadcn/ui.

## Nguyên tắc cốt lõi

Luôn dùng **design token cố định bên dưới**, không tự nghĩ ra màu/khoảng cách mới. Một dashboard nhất quán = dùng lại cùng một bộ token ở mọi trang.

## Design tokens

### Màu (dark mode làm chuẩn)
- Nền sâu nhất (app background): `#0A0A0B`
- Nền surface (card, panel): `#141416`
- Nền surface cao hơn (hover, nested): `#1C1C1F`
- Viền: `#26262A` (mặc định), `#33333A` (hover)
- Text chính: `#EDEDEF`
- Text phụ: `#A1A1AA`
- Text mờ (hint): `#6B6B73`

### Accent (cam ấm — chọn làm dấu ấn riêng, dùng RẤT tiết chế)
- Accent chính: `#F97316` (cam hổ phách) — cho nút chính, link, mục sidebar active, số liệu quan trọng.
- Cam nhạt hơn cho hover/nền nhẹ: `#FB923C`. Nền accent mờ (vd mục active): cam ở alpha thấp, ví dụ `rgba(249,115,22,0.12)`.
- Vì cam là màu mạnh, dùng nó như "gia vị", KHÔNG phải màu chủ đạo. Nền app vẫn là xám-đen trung tính; cam chỉ điểm xuyết ở vài chỗ quan trọng nhất.
- Quy tắc thực tế: trên một màn hình, cam chỉ nên xuất hiện ở nút hành động chính + mục sidebar đang chọn. Mọi thứ khác để trung tính.

> LƯU Ý phân biệt cam-accent với cam-cảnh báo: accent dùng `#F97316`, còn trạng thái cảnh báo dùng `#F59E0B` (ngả vàng hơn). Để tránh nhầm lẫn, KHÔNG dùng accent cam cho badge trạng thái — accent chỉ cho hành động/điều hướng, màu trạng thái chỉ cho dữ liệu.

### Màu trạng thái (cho dashboard hệ thống)
- Running / OK: `#10B981`
- Cảnh báo / sleeping: `#F59E0B`
- Lỗi / killed: `#EF4444`
- Idle / neutral: `#6B6B73`

### Typography
- Font UI: `Inter` hoặc `Geist` (sans, hiện đại) — KHÔNG dùng font mặc định hệ thống.
- Font dữ liệu kỹ thuật (PID, IP, log, đường dẫn): `JetBrains Mono` hoặc `Geist Mono`.
- Cỡ chữ: 13px body, 12px phụ, 11px caption tối thiểu. Heading 14-18px.
- Hai weight: 400 (thường) và 500 (đậm). Tránh 600/700 trừ heading lớn.

### Khoảng cách & bo góc
- Bo góc: `6px` (md) cho nút/input, `8px` (lg) cho card. KHÔNG bo góc quá lớn (>12px) — đó là dấu hiệu UI kiểu AI.
- Spacing dùng thang 4px: 4, 8, 12, 16, 24, 32.
- Viền mỏng `1px`, dùng màu viền token ở trên — không dùng shadow nặng để tách lớp.

## DANH SÁCH CẤM (chống vẻ "template AI")

- ❌ KHÔNG gradient trang trí (đặc biệt tím→hồng, xanh→tím). Nền phẳng.
- ❌ KHÔNG bo góc lớn (rounded-2xl, rounded-3xl) cho mọi thứ.
- ❌ KHÔNG shadow lớn/glow/blur làm hiệu ứng chính.
- ❌ KHÔNG emoji trong UI. Dùng icon (lucide-react, có sẵn với shadcn).
- ❌ KHÔNG accent tím/xanh-dương mặc định kiểu AI (blue-500, purple). Accent là cam `#F97316`, dùng tiết chế.
- ❌ KHÔNG center mọi thứ giữa trang với nhiều khoảng trắng kiểu landing page. Đây là dashboard — dày thông tin, căn trái, dùng không gian hiệu quả.
- ❌ KHÔNG "Card với icon tròn gradient + tiêu đề + mô tả" lặp lại — mẫu này là dấu hiệu rõ nhất của UI AI.
- ❌ KHÔNG font mặc định. Luôn set font Inter/Geist.

## NÊN LÀM

- ✅ Layout dày thông tin: sidebar trái cố định + vùng nội dung chính. Bảng dữ liệu thật.
- ✅ Dùng font mono cho mọi dữ liệu kỹ thuật (PID, IP, port, đường dẫn, log) — tạo cảm giác "công cụ kỹ thuật".
- ✅ Trạng thái dùng badge nhỏ màu trạng thái, không phủ nền lớn.
- ✅ Mật độ cao, gọn: padding vừa phải, dòng bảng không quá thưa.
- ✅ Dùng component shadcn/ui: `Table`, `Badge`, `Button`, `Card`, `Tabs`, `ScrollArea`, `Dialog`.
- ✅ Một accent duy nhất, nhất quán toàn app.

## Component shadcn/ui khuyên dùng cho từng phần
- Bảng tiến trình/file/socket/network → `Table` + `Badge` (trạng thái) + `Button` (thao tác)
- Sidebar điều hướng → tự dựng với `Button variant="ghost"`, accent cho mục active
- Khung log realtime → `ScrollArea` + font mono, nền `#0A0A0B`
- Form (spawn process, write file, dns lookup) → `Input` + `Button`
- Xác nhận xóa/kill → `Dialog` hoặc `AlertDialog`

## Nguyên tắc UX (cách dùng, không chỉ cách nhìn)

### Bốn trạng thái dữ liệu — mọi bảng/danh sách PHẢI xử lý đủ
1. **Loading:** dùng skeleton (khung xám mờ hình dạng bảng) thay vì spinner giữa màn hình. Skeleton giữ layout ổn định, đỡ giật.
2. **Có dữ liệu:** hiển thị bảng bình thường.
3. **Rỗng:** không để trống trơn. Hiện dòng gọn giữa vùng bảng: icon + câu ngắn, ví dụ "Chưa có tiến trình nào" / "Thư mục sandbox trống".
4. **Lỗi:** khi API fail, hiện thông báo rõ trong vùng đó (không phá vỡ cả trang) + nút "Thử lại". Đọc message lỗi từ response backend (`{ "error": "..." }`) nếu có.

### Phản hồi sau mỗi thao tác (toast)
- Sau hành động có hệ quả (kill process, xóa file, ghi file, chmod): hiện toast ngắn báo kết quả — thành công ("Đã kill PID 1234") hoặc lỗi ("Không đủ quyền").
- Dùng `sonner` hoặc toast của shadcn. Toast tự biến mất sau ~3s, đặt góc dưới-phải.
- Sau khi thao tác thành công, refresh lại dữ liệu liên quan để bảng phản ánh trạng thái mới.

### Xác nhận hành động nguy hiểm
- Kill process, xóa file: LUÔN mở `AlertDialog` xác nhận trước, nêu rõ đối tượng ("Kill tiến trình PID 1234 — nginx?").
- Nút xác nhận trong dialog dùng màu lỗi (`#EF4444`) để báo tính phá hủy.

### Auto-refresh không làm khó chịu
- Bảng tiến trình/kết nối nên tự cập nhật, nhưng KHÔNG được làm nhảy màn hình hay reset vị trí cuộn.
- Cập nhật dữ liệu tại chỗ (cập nhật state, không unmount cả bảng). Mặc định 3–5 giây/lần.
- Cho người dùng tắt/bật auto-refresh và nút refresh thủ công. Hiện thời điểm cập nhật gần nhất ("cập nhật 2s trước").
- Tránh hiện loading toàn bảng mỗi lần refresh — chỉ loading lần đầu.

### Điều hướng rõ ràng
- Sidebar: mục của trang hiện tại phải nổi bật (accent + nền nhẹ). Người dùng luôn biết mình đang ở đâu.
- Tiêu đề trang khớp mục sidebar. Nếu có thao tác đang chạy (vd echo server đang chạy), hiện chỉ báo trạng thái nhỏ.

### Log realtime (WebSocket)
- Khung log tự cuộn xuống dòng mới nhất, NHƯNG nếu người dùng đang cuộn lên đọc thì dừng auto-cuộn (tôn trọng thao tác đang đọc).
- Khi mất kết nối WebSocket: hiện trạng thái "mất kết nối, đang thử lại..." thay vì im lặng.
- Phân biệt mức log bằng màu trạng thái (info/cảnh báo/lỗi) để đọc lướt nhanh.

### Bàn phím & khả dụng
- Form gửi được bằng Enter. Dialog đóng được bằng Esc.
- Nút thao tác có trạng thái disabled khi đang xử lý (tránh bấm hai lần).

## Quy trình khi tạo UI
1. Cài shadcn component cần dùng (`npx shadcn@latest add table badge button dialog sonner ...`).
2. Set font Inter/Geist + JetBrains Mono trong `app/layout.tsx`.
3. Cấu hình màu token vào `globals.css` (CSS variables) và `tailwind.config`.
4. Dựng theo token, đối chiếu DANH SÁCH CẤM (UI) và bốn trạng thái dữ liệu (UX) trước khi coi là xong.