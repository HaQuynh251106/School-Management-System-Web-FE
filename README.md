# Smart School Ecosystem Web

Giao diện ReactJS ban đầu cho dự án Smart School Ecosystem, bám theo các use case trong tài liệu:

- Admin: A1-A4 cho GĐ1, kèm điểm vào A7/A8 cho GĐ2.
- Teacher: B1-B4 cho luồng điểm danh và điểm số.
- Student: C1-C3 cho hồ sơ, TKB, điểm và chuyên cần.
- Parent: D1-D2, hiển thị switch profile và giám sát học tập.
- Dashboard chỉ hiển thị KPI/chart tổng quan; các chức năng được truy cập từ menu theo role đăng nhập.
- Mỗi chức năng có tab chi tiết riêng cho danh sách, cấu hình, lịch sử/log, workflow hoặc thao tác chính.

## Chạy local

```bash
npm install
npm run dev
```

Ứng dụng dùng dữ liệu mẫu trong `src/App.tsx`; khi backend sẵn sàng có thể thay bằng TanStack Query gọi API Gateway.

## Cấu trúc source

```text
src/
├── app/                    # App shell chính
├── components/             # Layout, UI primitives, chart components
├── data/                   # Mock data và menu role
├── features/               # Màn hình nghiệp vụ theo phân hệ
│   ├── admin/
│   ├── dashboard/
│   ├── parent/
│   ├── shared/
│   ├── student/
│   └── teacher/
├── styles/                 # CSS toàn app
├── main.tsx
└── types.ts
```

Điểm bắt đầu nên đọc:

- `src/app/App.tsx`: layout tổng và điều hướng role/menu.
- `src/data/mockData.ts`: dữ liệu mẫu, role, menu chức năng.
- `src/features/FeaturePage.tsx`: map mã chức năng A1/B3/C2/D4 sang màn hình.
- `src/features/shared/FeatureWidgets.tsx`: bảng/form/widget dùng lại giữa nhiều role.
