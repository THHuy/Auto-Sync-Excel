# Auto Sync Excel

Phan mem Node.js co web UI keo tha file va CLI de dong bo du lieu tu file ton kho sang file danh muc theo mapping cot.

## Cai dat

```powershell
npm install
```

## Chay voi 2 file mau

```powershell
npm run sync:sample
```

File ket qua mac dinh:

```text
outputs/danh-muc-da-dong-bo.xlsx
```

## Chay giao dien web

```powershell
npm run dev
```

Lenh tren chay React UI bang Vite tai:

```text
http://localhost:5173
```

Neu can chay API Express khi dev local:

```powershell
npm run dev:api
```

Tren web, keo tha:

- File ton kho vao o `File tồn kho`.
- File danh muc vao o `File danh mục`.
- Bam `Đồng bộ và tải file`.

## Chay voi file khac

```powershell
node scripts/cli.js --source "duong-dan-file-nguon.xls" --target "duong-dan-file-dich.xlsx" --output "outputs/ket-qua.xlsx"
```

## Deploy len AWS Ubuntu

Da co san GitHub Actions pipeline tai:

```text
.github/workflows/deploy.yml
```

Huong dan cau hinh AWS Ubuntu, Nginx, HTTPS va domain Mat Bao nam tai:

```text
deploy/README.md
```

Tuy chon:

- `--source-sheet "Ten sheet"`: chon sheet nguon, neu bo trong se lay sheet dau tien.
- `--target-sheet "Ten sheet"`: chon sheet dich, neu bo trong se lay sheet dau tien.
- `--key "MA_LR,SO_LO,MA_BHYT,HAN_DUNG"`: cot khoa o file dich, dung dau phay neu can ghep nhieu cot.

App tu nhan dien chieu dong bo:

- File nguon co header tieng Viet va file dich co header ma cot: ghi tu `Mã VT`, `Tên vật tư`... sang `MA_LR`, `TEN_BD`...
- File nguon co header ma cot va file dich co header tieng Viet: ghi theo chieu nguoc lai.

Khoa ghep mac dinh:

- Chieu tieng Viet sang ma cot: `MA_LR,SO_LO,MA_BHYT,HAN_DUNG`.
- Chieu ma cot sang tieng Viet: `Mã VT,Số lô,Số Thầu,Ngày hết hạn`.

## Mapping dang dung

| File dich | File nguon |
| --- | --- |
| Mã VT | MA_LR |
| Tên Vật Tư | TEN_BD |
| Hoạt chất | TEN_HC |
| Hàm Lượng | HL_ND_QC |
| ĐVT | DVT |
| Số lô | SO_LO |
| Số Thầu | MA_BHYT |
| Ngày hết hạn | HAN_DUNG |
| Đơn giá | GIA_NHAP |
| Số lượng | TON_KHO |
