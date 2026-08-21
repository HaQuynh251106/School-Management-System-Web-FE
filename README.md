# Smart School Ecosystem Web

React + TypeScript console cho Admin, giáo viên, học sinh và phụ huynh. Các màn hình nghiệp vụ và dashboard gọi SSE Backend; dữ liệu mẫu chỉ phục vụ profile phát triển local của Backend.

## Chạy local

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Backend local mặc định ở `http://localhost:4000`; thay `VITE_API_BASE` khi cần.

Tài khoản profile local theo đúng bốn vai trò: `admin/admin@123`, `gv.hoa/teacher@123`, `hs.minh/student@123`, `ph.pham/parent@123`. Admin chính thực hiện cả đợt thu, đối soát và hoàn tiền.

## Kiểm tra

```bash
npm run check
```

Lệnh này bắt buộc ESLint, Vitest, TypeScript và Vite production build cùng thành công. CI chạy lại cùng lệnh trên mọi pull request.

## Production image

```bash
docker build --build-arg VITE_API_BASE=https://api.example.com -t smart-school-web .
docker run --rm -p 8080:80 smart-school-web
```

Nginx phục vụ SPA fallback, cache asset có hash và các security header cơ bản. URL API là compile-time value của Vite nên phải truyền đúng khi build image.
