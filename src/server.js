import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_MAPPING, readWorkbookBuffer, syncWorkbooks, writeWorkbookBuffer } from "./sync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

function normalizeDownloadName(value) {
  const cleanName = String(value || "danh-muc-da-dong-bo.xlsx")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-");

  if (!cleanName) {
    return "danh-muc-da-dong-bo.xlsx";
  }

  return cleanName.toLocaleLowerCase("vi-VN").endsWith(".xlsx") ? cleanName : `${cleanName}.xlsx`;
}

function parseMapping(value) {
  if (!value) {
    return DEFAULT_MAPPING;
  }

  try {
    const mapping = JSON.parse(value);
    if (!Array.isArray(mapping)) {
      throw new Error("Mapping khong phai danh sach.");
    }
    return mapping;
  } catch {
    throw new Error("Mapping khong dung dinh dang JSON.");
  }
}

app.use(express.static(path.join(__dirname, "..", "dist")));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post(
  "/api/sync",
  upload.fields([
    { name: "source", maxCount: 1 },
    { name: "target", maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const sourceFile = req.files?.source?.[0];
      const targetFile = req.files?.target?.[0];

      if (!sourceFile || !targetFile) {
        return res.status(400).json({ error: "Vui long chon du 2 file Excel." });
      }

      const { workbook, stats } = syncWorkbooks({
        sourceWorkbook: readWorkbookBuffer(sourceFile.buffer),
        targetWorkbook: readWorkbookBuffer(targetFile.buffer),
        sourceSheet: req.body.sourceSheet,
        targetSheet: req.body.targetSheet,
        key: req.body.key,
        mapping: parseMapping(req.body.mappingJson),
      });
      const output = writeWorkbookBuffer(workbook);
      const payload = Buffer.from(output);
      const downloadName = encodeURIComponent(normalizeDownloadName(req.body.outputName));

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${downloadName}`);
      res.setHeader("X-Sync-Stats", encodeURIComponent(JSON.stringify(stats)));
      return res.send(payload);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
);

app.get(/^(?!\/api\/|\/health$).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
});

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
app.listen(port, host, () => {
  console.log(`Auto Sync Excel dang chay tai http://${host}:${port}`);
});
