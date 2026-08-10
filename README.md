# Smart School Ecosystem Web

React + TypeScript console cho Admin, giáo viên, học sinh và phụ huynh. Các màn hình nghiệp vụ và dashboard gọi SSE Backend; dữ liệu mẫu chỉ phục vụ profile phát triển local của Backend.

## Chạy local

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Khi chạy local, frontend tự gọi backend ở cổng `4000` với cùng hostname đang mở
(`localhost` hoặc `127.0.0.1`) để refresh cookie hoạt động sau khi tải lại trang.
Đặt `VITE_API_BASE` thành URL HTTPS công khai của backend khi triển khai thật.

Tài khoản profile local: `admin/admin@123`, `gv.hoa/teacher@123`, `hs.minh/student@123`, `ph.pham/parent@123`.

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

## CI/CD

- `Web CI` chạy lint, test, kiểm tra TypeScript và production build trên mọi push, pull request hoặc khi chạy thủ công.
- `Web Release` chạy trên `main`, tag `v*` hoặc thủ công; image được phát hành tại `ghcr.io/<owner>/<repository>`.
- Repository variable `VITE_API_BASE` là URL HTTPS công khai của Backend.
- Để tự động triển khai VPS, đặt repository variable `DEPLOY_ENABLED=true`, tạo GitHub Environment `production` và thêm các secret `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_PATH`.

Máy chủ triển khai cần chứa `docker-compose.prod.yml` và `.env.production` trong `DEPLOY_PATH`. Workflow chỉ cập nhật service `web`, không ghi hoặc in secret ra log.
