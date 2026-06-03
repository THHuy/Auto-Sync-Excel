#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import { readWorkbookFile, syncWorkbooks, writeWorkbookFile } from "../server/sync.js";

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) {
      continue;
    }

    const key = item.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = value;
    i += 1;
  }

  return args;
}

function requireFile(filePath, label) {
  if (!filePath) {
    throw new Error(`Thieu tham so --${label}`);
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Khong tim thay file ${label}: ${filePath}`);
  }
}

function usage() {
  return [
    "Cach dung:",
    '  node scripts/cli.js --source "nguon.xls" --target "dich.xlsx" --output "ket-qua.xlsx"',
    "",
    "Tuy chon:",
    "  --source-sheet <ten sheet>",
    "  --target-sheet <ten sheet>",
    '  --key "MA_LR,SO_LO,MA_BHYT,HAN_DUNG"',
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    console.log(usage());
    return;
  }

  const sourcePath = args.source;
  const targetPath = args.target;
  const outputPath = args.output || "outputs/danh-muc-da-dong-bo.xlsx";

  requireFile(sourcePath, "source");
  requireFile(targetPath, "target");

  const { workbook, stats } = syncWorkbooks({
    sourceWorkbook: readWorkbookFile(sourcePath),
    targetWorkbook: readWorkbookFile(targetPath),
    sourceSheet: args["source-sheet"],
    targetSheet: args["target-sheet"],
    key: args.key,
  });

  writeWorkbookFile(workbook, outputPath);

  console.log(`Da dong bo xong: ${outputPath}`);
  console.log(`Sheet nguon: ${stats.sourceSheet}, header dong ${stats.sourceHeaderRow}`);
  console.log(`Sheet dich: ${stats.targetSheet}, header dong ${stats.targetHeaderRow}`);
  console.log(`Chieu dong bo: ${stats.direction}`);
  console.log(`Cot khoa: ${stats.keyHeaders.join(", ")}`);
  console.log(`Ban ghi nguon: ${stats.sourceRecords}`);
  console.log(`Cap nhat: ${stats.updated}`);
  console.log(`Them moi: ${stats.added}`);
}

main().catch((error) => {
  console.error(`Loi: ${error.message}`);
  console.error("");
  console.error(usage());
  process.exitCode = 1;
});
