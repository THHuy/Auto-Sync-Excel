import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

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

function normalizeDownloadName(value) {
  const cleanName = String(value || "danh-muc-da-dong-bo.xlsx")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-");

  if (!cleanName) {
    return "danh-muc-da-dong-bo.xlsx";
  }

  return cleanName.toLocaleLowerCase("vi-VN").endsWith(".xlsx") ? cleanName : `${cleanName}.xlsx`;
}

function cleanMapping(rows) {
  return rows.map(([source, target]) => [source.trim(), target.trim()]).filter(([source, target]) => source && target);
}

function DropZone({ id, name, title, note, badge, icon, file, onFileChange }) {
  const [isOver, setIsOver] = React.useState(false);

  function setFile(nextFile) {
    if (nextFile) {
      onFileChange(nextFile);
    }
  }

  return (
    <label
      className={`drop-zone ${isOver ? "is-over" : ""} ${file ? "has-file" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        setFile(event.dataTransfer.files[0]);
      }}
    >
      <input
        id={id}
        name={name}
        type="file"
        accept=".xls,.xlsx"
        onChange={(event) => setFile(event.target.files[0])}
      />
      <span className="step-badge">{badge}</span>
      <span className="drop-icon">{icon}</span>
      <span className="drop-title">{title}</span>
      <span className="drop-note">{note}</span>
      <span className="file-name">{file?.name || "Chưa chọn file"}</span>
    </label>
  );
}

function MappingPanel({ mappingRows, setMappingRows, setStatus }) {
  const [editMode, setEditMode] = React.useState(false);
  const [draftRows, setDraftRows] = React.useState(mappingRows);

  function startEdit() {
    setDraftRows(structuredClone(mappingRows));
    setEditMode(true);
  }

  function saveEdit() {
    const nextRows = cleanMapping(draftRows);
    if (nextRows.length === 0) {
      setStatus("Mapping trống", "is-error");
      return;
    }
    setMappingRows(nextRows);
    setDraftRows(structuredClone(nextRows));
    setEditMode(false);
    setStatus("Đã lưu mapping");
  }

  function cancelEdit() {
    setDraftRows(structuredClone(mappingRows));
    setEditMode(false);
  }

  function updateDraft(index, side, value) {
    setDraftRows((rows) =>
      rows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }
        return side === "source" ? [value, row[1]] : [row[0], value];
      }),
    );
  }

  const rows = editMode ? draftRows : mappingRows;

  return (
    <div className="mapping-panel">
      <div className="panel-heading">
        <div>
          <h2>Mapping</h2>
          <p>{editMode ? "Đang chỉnh sửa" : "Đang khóa chỉnh sửa"}</p>
        </div>
        <div className="mapping-header-actions">
          {!editMode && (
            <button className="secondary-button" type="button" onClick={startEdit}>
              ✎ Sửa
            </button>
          )}
          {editMode && (
            <>
              <button className="secondary-button success-button" type="button" onClick={saveEdit}>
                ✓ Lưu
              </button>
              <button className="secondary-button" type="button" onClick={cancelEdit}>
                Hủy
              </button>
            </>
          )}
        </div>
      </div>

      <table className={`mapping-table ${editMode ? "is-editing" : ""}`}>
        <thead>
          <tr>
            <th>Cột báo cáo</th>
            <th>Cột danh mục</th>
            <th className="mapping-actions">Xóa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([source, target], index) => (
            <tr key={`${source}-${target}-${index}`}>
              <td>
                {editMode ? (
                  <input value={source} onChange={(event) => updateDraft(index, "source", event.target.value)} />
                ) : (
                  source
                )}
              </td>
              <td>
                {editMode ? (
                  <input value={target} onChange={(event) => updateDraft(index, "target", event.target.value)} />
                ) : (
                  target
                )}
              </td>
              <td className="mapping-actions">
                {editMode && (
                  <button
                    className="row-delete"
                    type="button"
                    title="Xóa dòng"
                    onClick={() => setDraftRows((currentRows) => currentRows.filter((_, rowIndex) => rowIndex !== index))}
                  >
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editMode && (
        <div className="mapping-tools">
          <button className="secondary-button" type="button" onClick={() => setDraftRows((rows) => [...rows, ["", ""]])}>
            + Thêm dòng
          </button>
          <button className="secondary-button danger-light-button" type="button" onClick={() => setDraftRows(defaultMapping)}>
            Khôi phục mặc định
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  const [sourceFile, setSourceFile] = React.useState(null);
  const [targetFile, setTargetFile] = React.useState(null);
  const [sourceSheet, setSourceSheet] = React.useState("");
  const [targetSheet, setTargetSheet] = React.useState("");
  const [key, setKey] = React.useState("MA_LR,SO_LO,MA_BHYT,HAN_DUNG");
  const [outputName, setOutputName] = React.useState("danh-muc-da-dong-bo.xlsx");
  const [mappingRows, setMappingRows] = React.useState(defaultMapping);
  const [status, setStatusState] = React.useState({ text: "Sẵn sàng", state: "" });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [download, setDownload] = React.useState(null);
  const [stats, setStats] = React.useState(null);

  function setStatus(text, state = "") {
    setStatusState({ text, state });
  }

  async function submit(event) {
    event.preventDefault();

    if (!sourceFile || !targetFile) {
      setStatus("Thiếu file", "is-error");
      return;
    }

    const activeMapping = cleanMapping(mappingRows);
    if (activeMapping.length === 0) {
      setStatus("Mapping trống", "is-error");
      return;
    }

    setIsSubmitting(true);
    setDownload(null);
    setStats(null);
    setStatus("Đang xử lý", "is-working");

    try {
      const formData = new FormData();
      formData.append("source", sourceFile);
      formData.append("target", targetFile);
      formData.append("sourceSheet", sourceSheet);
      formData.append("targetSheet", targetSheet);
      formData.append("key", key);
      formData.append("outputName", outputName);
      formData.append("mappingJson", JSON.stringify(activeMapping));

      const response = await fetch("/api/sync", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Không xử lý được file." }));
        throw new Error(body.error);
      }

      const statsHeader = response.headers.get("X-Sync-Stats");
      const nextStats = statsHeader ? JSON.parse(decodeURIComponent(statsHeader)) : {};
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const fileName = normalizeDownloadName(outputName);

      setDownload({ url, fileName });
      setStats(nextStats);
      setStatus("Hoàn tất");

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
    } catch (error) {
      setStatus(error.message || "Có lỗi", "is-error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <section className="toolbar">
        <div>
          <p className="eyebrow">Auto Sync Excel</p>
          <h1>Đồng bộ tồn kho vào danh mục</h1>
        </div>
        <div className={`status-pill ${status.state}`.trim()}>{status.text}</div>
      </section>

      <section className="workspace">
        <form className="sync-panel" onSubmit={submit}>
          <div className="section-heading">
            <div>
              <h2>Chọn file</h2>
              <p>Nguồn là báo cáo tồn kho, đích là file danh mục cần cập nhật.</p>
            </div>
          </div>

          <div className="drop-grid">
            <DropZone
              id="sourceInput"
              name="source"
              title="File tồn kho"
              note="Kéo thả hoặc bấm để chọn"
              badge="1"
              icon="↥"
              file={sourceFile}
              onFileChange={setSourceFile}
            />
            <DropZone
              id="targetInput"
              name="target"
              title="File danh mục"
              note="File mẫu cần ghi dữ liệu"
              badge="2"
              icon="▣"
              file={targetFile}
              onFileChange={setTargetFile}
            />
          </div>

          <div className="section-heading compact">
            <div>
              <h2>Tùy chọn</h2>
            </div>
          </div>

          <div className="options">
            <label>
              <span>Sheet nguồn</span>
              <input value={sourceSheet} onChange={(event) => setSourceSheet(event.target.value)} placeholder="Bỏ trống để lấy sheet đầu tiên" />
            </label>
            <label>
              <span>Sheet đích</span>
              <input value={targetSheet} onChange={(event) => setTargetSheet(event.target.value)} placeholder="Bỏ trống để lấy sheet đầu tiên" />
            </label>
            <label className="wide">
              <span>Khóa ghép</span>
              <input value={key} onChange={(event) => setKey(event.target.value)} />
            </label>
            <label className="wide">
              <span>Tên file kết quả</span>
              <input value={outputName} onChange={(event) => setOutputName(event.target.value)} />
            </label>
          </div>

          <div className="actions">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              <span>↧</span>
              {isSubmitting ? "Đang đồng bộ" : "Đồng bộ và tải file"}
            </button>
            {download && (
              <a className="download-link" href={download.url} download={download.fileName}>
                Tải lại file kết quả
              </a>
            )}
          </div>
        </form>

        <aside className="info-panel">
          <MappingPanel mappingRows={mappingRows} setMappingRows={setMappingRows} setStatus={setStatus} />

          {stats && (
            <div className="result-card">
              <h2>Kết quả</h2>
              <dl>
                <div>
                  <dt>Bản ghi nguồn</dt>
                  <dd>{stats.sourceRecords ?? 0}</dd>
                </div>
                <div>
                  <dt>Cập nhật</dt>
                  <dd>{stats.updated ?? 0}</dd>
                </div>
                <div>
                  <dt>Thêm mới</dt>
                  <dd>{stats.added ?? 0}</dd>
                </div>
                <div>
                  <dt>Định dạng ngày</dt>
                  <dd>yyyy-mm-dd</dd>
                </div>
              </dl>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

createRoot(document.querySelector("#root")).render(<App />);
