const form = document.querySelector("#syncForm");
const sourceInput = document.querySelector("#sourceInput");
const targetInput = document.querySelector("#targetInput");
const sourceName = document.querySelector("#sourceName");
const targetName = document.querySelector("#targetName");
const statusPill = document.querySelector("#statusPill");
const syncButton = document.querySelector("#syncButton");
const downloadLink = document.querySelector("#downloadLink");
const resultCard = document.querySelector("#resultCard");
const sourceRecords = document.querySelector("#sourceRecords");
const updatedRows = document.querySelector("#updatedRows");
const addedRows = document.querySelector("#addedRows");
const editMappingButton = document.querySelector("#editMappingButton");
const mappingBody = document.querySelector("#mappingBody");
const mappingTools = document.querySelector("#mappingTools");
const addMappingButton = document.querySelector("#addMappingButton");
const resetMappingButton = document.querySelector("#resetMappingButton");
const mappingJson = document.querySelector("#mappingJson");

const defaultMapping = [
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

let mappingRows = structuredClone(defaultMapping);
let mappingEditMode = false;

function normalizeDownloadName(value) {
  const cleanName = String(value || "danh-muc-da-dong-bo.xlsx")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-");

  if (!cleanName) {
    return "danh-muc-da-dong-bo.xlsx";
  }

  return cleanName.toLocaleLowerCase("vi-VN").endsWith(".xlsx") ? cleanName : `${cleanName}.xlsx`;
}

function setStatus(text, state = "") {
  statusPill.textContent = text;
  statusPill.className = `status-pill ${state}`.trim();
}

function updateFileName(input, target) {
  target.textContent = input.files[0]?.name || "Chưa chọn file";
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function syncMappingJson() {
  mappingJson.value = JSON.stringify(
    mappingRows
      .map(([source, target]) => [source.trim(), target.trim()])
      .filter(([source, target]) => source && target),
  );
}

function readMappingFromInputs() {
  if (!mappingEditMode) {
    return;
  }

  mappingRows = [...mappingBody.querySelectorAll("tr")].map((row) => {
    const source = row.querySelector("[data-field='source']").value;
    const target = row.querySelector("[data-field='target']").value;
    return [source, target];
  });
  syncMappingJson();
}

function renderMapping() {
  mappingBody.innerHTML = "";
  mappingTools.hidden = !mappingEditMode;
  editMappingButton.textContent = mappingEditMode ? "✓" : "✎";
  editMappingButton.title = mappingEditMode ? "Khóa mapping" : "Sửa mapping";

  mappingRows.forEach(([source, target], index) => {
    const row = document.createElement("tr");

    if (mappingEditMode) {
      row.innerHTML = `
        <td><input data-field="source" type="text" value="${escapeAttribute(source)}" /></td>
        <td><input data-field="target" type="text" value="${escapeAttribute(target)}" /></td>
        <td class="mapping-actions"><button class="row-delete" type="button" title="Xóa dòng">×</button></td>
      `;
      row.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", readMappingFromInputs);
      });
      row.querySelector(".row-delete").addEventListener("click", () => {
        readMappingFromInputs();
        mappingRows.splice(index, 1);
        renderMapping();
      });
    } else {
      row.innerHTML = `
        <td>${source}</td>
        <td>${target}</td>
        <td class="mapping-actions"></td>
      `;
    }

    mappingBody.append(row);
  });

  syncMappingJson();
}

function bindDropZone(zone) {
  const input = zone.querySelector("input[type='file']");
  const nameTarget = input === sourceInput ? sourceName : targetName;

  ["dragenter", "dragover"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add("is-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove("is-over");
    });
  });

  zone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer.files;
    if (!file) {
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    updateFileName(input, nameTarget);
  });
}

document.querySelectorAll("[data-drop-zone]").forEach(bindDropZone);
sourceInput.addEventListener("change", () => updateFileName(sourceInput, sourceName));
targetInput.addEventListener("change", () => updateFileName(targetInput, targetName));
editMappingButton.addEventListener("click", () => {
  readMappingFromInputs();
  mappingEditMode = !mappingEditMode;
  renderMapping();
});
addMappingButton.addEventListener("click", () => {
  readMappingFromInputs();
  mappingRows.push(["", ""]);
  renderMapping();
});
resetMappingButton.addEventListener("click", () => {
  mappingRows = structuredClone(defaultMapping);
  renderMapping();
});
renderMapping();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  readMappingFromInputs();

  if (!sourceInput.files[0] || !targetInput.files[0]) {
    setStatus("Thiếu file", "is-error");
    return;
  }

  if (!mappingJson.value || JSON.parse(mappingJson.value).length === 0) {
    setStatus("Mapping trống", "is-error");
    return;
  }

  syncButton.disabled = true;
  downloadLink.hidden = true;
  resultCard.hidden = true;
  setStatus("Đang xử lý", "is-working");

  try {
    const formData = new FormData(form);
    const response = await fetch("/api/sync", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Không xử lý được file." }));
      throw new Error(body.error);
    }

    const statsHeader = response.headers.get("X-Sync-Stats");
    const stats = statsHeader ? JSON.parse(decodeURIComponent(statsHeader)) : {};
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const outputName = normalizeDownloadName(formData.get("outputName"));

    downloadLink.href = url;
    downloadLink.download = outputName;
    downloadLink.hidden = false;
    downloadLink.click();

    sourceRecords.textContent = stats.sourceRecords ?? 0;
    updatedRows.textContent = stats.updated ?? 0;
    addedRows.textContent = stats.added ?? 0;
    resultCard.hidden = false;
    setStatus("Hoàn tất");
  } catch (error) {
    setStatus(error.message || "Có lỗi", "is-error");
  } finally {
    syncButton.disabled = false;
  }
});
