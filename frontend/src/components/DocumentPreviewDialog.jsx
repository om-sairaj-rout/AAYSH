import { useEffect } from "react";
import { X, Download, ExternalLink } from "lucide-react";

const getPreviewType = (fileName = "") => {
  const ext = String(fileName).split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) {
    return "image";
  }
  return "other";
};

const DocumentPreviewDialog = ({
  open,
  onClose,
  title,
  fileName = "document",
  url,
  loading = false,
  error = null,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const previewType = getPreviewType(fileName);

  const handleDownload = () => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-[1px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-preview-title"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-[#FAFBFC]">
          <div className="min-w-0">
            <h3
              id="document-preview-title"
              className="text-sm font-bold text-[#1B2B4B] truncate"
            >
              {title || fileName}
            </h3>
            {title && fileName && title !== fileName && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{fileName}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {url && !loading && !error && (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Download size={14} />
                  Download
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <ExternalLink size={14} />
                  Open tab
                </a>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-slate-100 p-3 sm:p-4">
          {loading ? (
            <div className="h-[70vh] flex items-center justify-center text-sm text-slate-500 font-medium">
              Loading document...
            </div>
          ) : error ? (
            <div className="h-[70vh] flex items-center justify-center text-sm text-rose-600 font-medium px-6 text-center">
              {error}
            </div>
          ) : previewType === "pdf" ? (
            <iframe
              src={url}
              title={fileName}
              className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white"
            />
          ) : previewType === "image" ? (
            <div className="h-[70vh] flex items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-white">
              <img
                src={url}
                alt={fileName}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-[70vh] flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-6 text-center">
              <p className="text-sm text-slate-600">
                Preview is not available for this file type.
              </p>
              <p className="text-xs text-slate-400">{fileName}</p>
              {url && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B2B4B] text-white text-sm font-bold"
                >
                  <Download size={16} />
                  Download file
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewDialog;
