# Deploy Auto Sync Excel lên AWS Ubuntu + domain Mắt Bão

## 1. Chuẩn bị AWS Ubuntu

SSH vào server:

```bash
ssh -i ExcelSync.pem ubuntu@YOUR_AWS_PUBLIC_IP
```

Cài Node.js, Nginx, Git và Certbot:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg nginx git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Tạo thư mục deploy:

```bash
sudo mkdir -p /var/www/auto-sync-excel/releases
sudo chown -R ubuntu:ubuntu /var/www/auto-sync-excel
```

## 2. Cài systemd service

Copy file `deploy/auto-sync-excel.service` lên server:

```bash
sudo nano /etc/systemd/system/auto-sync-excel.service
```

Dán nội dung file vào, rồi chạy:

```bash
sudo systemctl daemon-reload
sudo systemctl enable auto-sync-excel
```

Lần đầu service sẽ chỉ chạy sau khi GitHub Actions deploy code lên server.

## 3. Cấu hình Nginx

Copy file `deploy/nginx-auto-sync-excel.conf` lên server:

```bash
sudo nano /etc/nginx/sites-available/auto-sync-excel
```

Đổi dòng này thành domain thật:

```nginx
server_name thhinfo.xyz;
```

Bật site:

```bash
sudo ln -s /etc/nginx/sites-available/auto-sync-excel /etc/nginx/sites-enabled/auto-sync-excel
sudo nginx -t
sudo systemctl reload nginx
```

## 4. Trỏ domain Mắt Bão

Trong quản trị DNS của Mắt Bão, tạo bản ghi:

```text
Type: A
Name: excel
Value: YOUR_AWS_PUBLIC_IP
TTL: Auto hoặc 300
```

Nếu muốn dùng domain gốc:

```text
Type: A
Name: @
Value: YOUR_AWS_PUBLIC_IP
```

AWS Security Group cần mở:

```text
22/tcp  SSH
80/tcp  HTTP
443/tcp HTTPS
```

## 5. Cài HTTPS

Sau khi DNS đã trỏ về AWS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d thhinfo.xyz
```

## 6. Thêm GitHub Actions secrets

Vào GitHub repo:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

Tạo các secret:

```text
AWS_HOST      = YOUR_AWS_PUBLIC_IP
AWS_USER      = ubuntu
AWS_SSH_KEY   = nội dung private key .pem
APP_DIR       = /var/www/auto-sync-excel
APP_PORT      = 3000
```

Lấy nội dung key:

```bash
cat ExcelSync.pem
```

Không commit file `.pem` lên GitHub.

## 7. Auto deploy

Mỗi lần push vào nhánh `main`, workflow `.github/workflows/deploy.yml` sẽ:

1. Cài dependency.
2. Chạy `npm run check`.
3. Đóng gói source.
4. Upload lên AWS.
5. Chạy `npm ci --omit=dev`.
6. Restart service `auto-sync-excel`.
7. Kiểm tra `/health`.

Kiểm tra log trên server:

```bash
sudo journalctl -u auto-sync-excel -f
```
