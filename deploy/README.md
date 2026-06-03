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

## 6. Cài GitHub self-hosted runner trên AWS

Cách này không cần mở SSH cho GitHub Actions. Server AWS tự kết nối ra GitHub qua HTTPS, nên Security Group vẫn có thể giữ SSH chỉ cho IP máy cá nhân.

Vào GitHub repo:

```text
Settings -> Actions -> Runners -> New self-hosted runner -> Linux
```

Chạy các lệnh GitHub đưa ra trên server AWS. Khi GitHub hỏi label, thêm label:

```text
auto-sync-excel
```

Ví dụ thư mục runner:

```bash
mkdir -p ~/actions-runner
cd ~/actions-runner
```

Sau khi `./config.sh` xong, cài runner thành service:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

Cho user `ubuntu` được restart service app không cần nhập password:

```bash
sudo visudo
```

Thêm dòng:

```text
ubuntu ALL=(ALL) NOPASSWD: /bin/systemctl restart auto-sync-excel, /bin/systemctl status auto-sync-excel, /bin/journalctl -u auto-sync-excel -n 120 --no-pager
```

## 7. Auto deploy

Mỗi lần push vào nhánh `main`, workflow `.github/workflows/deploy.yml` sẽ:

1. Cài dependency.
2. Chạy `npm run check`.
3. Copy source vào `/var/www/auto-sync-excel/releases/<commit>`.
4. Chạy `npm ci --omit=dev`.
5. Trỏ `/var/www/auto-sync-excel/current` sang release mới.
6. Restart service `auto-sync-excel`.
7. Kiểm tra `/health`.

Kiểm tra log trên server:

```bash
sudo journalctl -u auto-sync-excel -f
```
