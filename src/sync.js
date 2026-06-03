import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

export const DEFAULT_MAPPING = [
  ["Mã VT", "MA_LR"],
  ["Tên Vật Tư", "TEN_BD"],
  ["Hoạt chất", "TEN_HC"],
  ["Hàm Lượng", "HL_ND_QC"],
  ["ĐVT", "DVT"],
  ["Số lô", "SO_LO"],
  ["Số Thầu", "MA_BHYT"],
  ["Ngày hết hạn", "HAN_DUNG"],
  ["Đơn giá", "GIA_NHAP"],
  ["Số lượng", "TON_KHO"],
];

export function parseKeyHeaders(value, fallback) {
  if (!value) {
    return fallback;
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("vi-VN");
}

function normalizeKey(value) {
  return String(value ?? "").trim();
}

function formatDateYmd(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  const dmy = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const ymd = text.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
  if (ymd) {
    const [, year, month, day] = ymd;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return text;
}

function normalizeOutputValue(targetHeader, value) {
  if (normalizeHeader(targetHeader) === normalizeHeader("HAN_DUNG")) {
    return formatDateYmd(value);
  }

  return value;
}

function pickSheet(workbook, sheetName, label) {
  const name = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[name];

  if (!sheet) {
    throw new Error(
      `Khong tim thay sheet ${label}: ${name}. Cac sheet hien co: ${workbook.SheetNames.join(", ")}`,
    );
  }

  return { name, sheet };
}

function sheetToRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
}

function getBestHeaderMatch(rows, requiredHeaders) {
  const normalizedRequired = requiredHeaders.map(normalizeHeader);
  let best = { index: -1, count: 0 };

  rows.forEach((row, index) => {
    const headers = new Set(row.map(normalizeHeader));
    const count = normalizedRequired.filter((header) => headers.has(header)).length;
    if (count > best.count) {
      best = { index, count };
    }
  });

  return best;
}

function findHeaderRow(rows, requiredHeaders) {
  const best = getBestHeaderMatch(rows, requiredHeaders);

  if (best.index === -1 || best.count === 0) {
    throw new Error(`Khong tim thay dong header co cac cot: ${requiredHeaders.join(", ")}`);
  }

  return best.index;
}

function detectSyncConfig(sourceRows, targetRows, mapping, explicitTargetKey) {
  const displayHeaders = mapping.map(([displayHeader]) => displayHeader);
  const codeHeaders = mapping.map(([, codeHeader]) => codeHeader);
  const sourceDisplay = getBestHeaderMatch(sourceRows, displayHeaders);
  const sourceCode = getBestHeaderMatch(sourceRows, codeHeaders);
  const targetDisplay = getBestHeaderMatch(targetRows, displayHeaders);
  const targetCode = getBestHeaderMatch(targetRows, codeHeaders);

  if (sourceDisplay.count >= sourceCode.count && sourceDisplay.count > 0) {
    return {
      mapping: mapping.map(([displayHeader, codeHeader]) => [codeHeader, displayHeader]),
      keyHeaders: parseKeyHeaders(explicitTargetKey, ["MA_LR", "SO_LO", "MA_BHYT", "HAN_DUNG"]),
      direction: "vietnamese-to-code",
    };
  }

  if (sourceCode.count > 0) {
    return {
      mapping: mapping.map(([displayHeader, codeHeader]) => [displayHeader, codeHeader]),
      keyHeaders: parseKeyHeaders(explicitTargetKey, ["Mã VT", "Số lô", "Số Thầu", "Ngày hết hạn"]),
      direction: "code-to-vietnamese",
    };
  }

  const sourcePreview = Math.max(sourceDisplay.count, sourceCode.count);
  const targetPreview = Math.max(targetDisplay.count, targetCode.count);
  throw new Error(
    `Khong nhan dien duoc chieu dong bo. Cot khop o file nguon: ${sourcePreview}, file dich: ${targetPreview}`,
  );
}

function indexHeaders(headerRow) {
  const map = new Map();
  headerRow.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized && !map.has(normalized)) {
      map.set(normalized, index);
    }
  });
  return map;
}

function ensureColumns(rows, headerIndex, targetHeaders) {
  const headerRow = rows[headerIndex];
  const headerMap = indexHeaders(headerRow);

  for (const header of targetHeaders) {
    const normalized = normalizeHeader(header);
    if (!headerMap.has(normalized)) {
      headerMap.set(normalized, headerRow.length);
      headerRow.push(header);
    }
  }

  return headerMap;
}

function getCell(row, headerMap, headerName) {
  const index = headerMap.get(normalizeHeader(headerName));
  return index === undefined ? "" : row[index];
}

function setCell(row, headerMap, headerName, value) {
  const index = headerMap.get(normalizeHeader(headerName));
  row[index] = value ?? "";
}

function buildMappingLookup(mapping) {
  return new Map(mapping.map(([targetHeader, sourceHeader]) => [normalizeHeader(targetHeader), sourceHeader]));
}

function makeCompositeKey(row, headerMap, headers) {
  return headers.map((header) => normalizeKey(getCell(row, headerMap, header))).join("||");
}

function hasUsefulKey(key) {
  return key.split("||").some(Boolean);
}

function buildSourceRecords(sourceRows, sourceHeaderIndex, mapping, keyHeaders) {
  const sourceHeaderMap = indexHeaders(sourceRows[sourceHeaderIndex]);
  const mappingLookup = buildMappingLookup(mapping);
  const missingSource = mapping
    .map(([, sourceHeader]) => sourceHeader)
    .filter((header) => !sourceHeaderMap.has(normalizeHeader(header)));

  if (missingSource.length > 0) {
    throw new Error(`File nguon thieu cot: ${missingSource.join(", ")}`);
  }

  const sourceKeyHeaders = keyHeaders.map((targetHeader) => {
    const sourceHeader = mappingLookup.get(normalizeHeader(targetHeader));
    if (!sourceHeader) {
      throw new Error(`Cot khoa khong nam trong mapping: ${targetHeader}`);
    }
    return sourceHeader;
  });

  const records = [];

  for (let i = sourceHeaderIndex + 1; i < sourceRows.length; i += 1) {
    const row = sourceRows[i];
    const key = makeCompositeKey(row, sourceHeaderMap, sourceKeyHeaders);
    if (hasUsefulKey(key)) {
      records.push({ key, row });
    }
  }

  return { records, sourceHeaderMap };
}

function syncRows({ sourceRows, targetRows, keyHeaders, mapping }) {
  const sourceHeaderIndex = findHeaderRow(
    sourceRows,
    mapping.map(([, sourceHeader]) => sourceHeader),
  );
  const targetHeaderIndex = findHeaderRow(targetRows, keyHeaders);
  const targetHeaderMap = ensureColumns(
    targetRows,
    targetHeaderIndex,
    mapping.map(([targetHeader]) => targetHeader),
  );
  const { records, sourceHeaderMap } = buildSourceRecords(sourceRows, sourceHeaderIndex, mapping, keyHeaders);

  const targetByKey = new Map();
  for (let i = targetHeaderIndex + 1; i < targetRows.length; i += 1) {
    const row = targetRows[i];
    const key = makeCompositeKey(row, targetHeaderMap, keyHeaders);
    if (hasUsefulKey(key)) {
      if (!targetByKey.has(key)) {
        targetByKey.set(key, []);
      }
      targetByKey.get(key).push(row);
    }
  }

  let updated = 0;
  let added = 0;
  const usedByKey = new Map();

  for (const { key, row: sourceRow } of records) {
    const targetRowsForKey = targetByKey.get(key) || [];
    const usedCount = usedByKey.get(key) || 0;
    let targetRow = targetRowsForKey[usedCount];

    if (!targetRow) {
      targetRow = [];
      targetRows.push(targetRow);
      added += 1;
    } else {
      updated += 1;
    }
    usedByKey.set(key, usedCount + 1);

    for (const [targetHeader, sourceHeader] of mapping) {
      const sourceValue = getCell(sourceRow, sourceHeaderMap, sourceHeader);
      setCell(targetRow, targetHeaderMap, targetHeader, normalizeOutputValue(targetHeader, sourceValue));
    }
  }

  return {
    sourceHeaderRow: sourceHeaderIndex + 1,
    targetHeaderRow: targetHeaderIndex + 1,
    sourceRecords: records.length,
    updated,
    added,
  };
}

function writeRowsToSheet(workbook, sheetName, rows) {
  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rows);
}

export function syncWorkbooks({ sourceWorkbook, targetWorkbook, sourceSheet, targetSheet, key }) {
  const source = pickSheet(sourceWorkbook, sourceSheet, "nguon");
  const target = pickSheet(targetWorkbook, targetSheet, "dich");
  const sourceRows = sheetToRows(source.sheet);
  const targetRows = sheetToRows(target.sheet);
  const config = detectSyncConfig(sourceRows, targetRows, DEFAULT_MAPPING, key);
  const stats = syncRows({
    sourceRows,
    targetRows,
    keyHeaders: config.keyHeaders,
    mapping: config.mapping,
  });

  writeRowsToSheet(targetWorkbook, target.name, targetRows);

  return {
    workbook: targetWorkbook,
    stats: {
      ...stats,
      sourceSheet: source.name,
      targetSheet: target.name,
      direction: config.direction,
      keyHeaders: config.keyHeaders,
    },
  };
}

export function readWorkbookFile(filePath) {
  return XLSX.readFile(filePath, { cellDates: true, raw: false });
}

export function readWorkbookBuffer(buffer) {
  return XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
}

export function writeWorkbookFile(workbook, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  XLSX.writeFile(workbook, outputPath, { bookType: "xlsx" });
}

export function writeWorkbookBuffer(workbook) {
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
