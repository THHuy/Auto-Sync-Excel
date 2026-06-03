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

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!sourceInput.files[0] || !targetInput.files[0]) {
    setStatus("Thiếu file", "is-error");
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
