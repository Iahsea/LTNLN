---
name: ui-design
description: Dùng MỖI KHI tạo hoặc sửa giao diện frontend (component, trang, layout) cho Linux System Manager. Đóng gói hệ design dark-mode hiện đại với accent rõ, dùng shadcn/ui. Bắt buộc đọc trước khi viết bất kỳ file .tsx/.jsx nào để UI nhất quán và tránh vẻ "template AI". Kích hoạt khi người dùng nói "làm giao diện", "tạo trang", "thêm component", "style lại".
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

### Accent (chọn MỘT làm chủ đạo, dùng nhất quán)
- Accent chính: `#3B82F6` (xanh dương điện) — cho nút chính, link, trạng thái active
- Hoặc đổi sang `#10B981` (xanh lá) nếu muốn cảm giác "terminal/system"
- Dùng accent **tiết chế**: nút chính, chỉ báo active, số liệu quan trọng. Không phủ accent khắp nơi.

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
- ❌ KHÔNG accent tím mặc định kiểu AI. Dùng accent đã chọn ở trên.
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

## Quy trình khi tạo UI
1. Cài shadcn component cần dùng (`npx shadcn@latest add table badge button ...`).
2. Set font Inter/Geist + JetBrains Mono trong `app/layout.tsx`.
3. Cấu hình màu token vào `globals.css` (CSS variables) và `tailwind.config`.
4. Dựng theo token, đối chiếu DANH SÁCH CẤM trước khi xong.