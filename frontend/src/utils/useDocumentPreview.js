import { useCallback, useEffect, useRef, useState } from "react";

const useDocumentPreview = () => {
  const blobUrlRef = useRef(null);
  const [preview, setPreview] = useState({
    open: false,
    title: "",
    fileName: "document",
    url: "",
    loading: false,
    error: null,
  });

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      window.URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const closePreview = useCallback(() => {
    revokeBlobUrl();
    setPreview({
      open: false,
      title: "",
      fileName: "document",
      url: "",
      loading: false,
      error: null,
    });
  }, [revokeBlobUrl]);

  const openPreview = useCallback(
    ({ title, fileName, url, loading = false, error = null }) => {
      revokeBlobUrl();
      if (url?.startsWith("blob:")) {
        blobUrlRef.current = url;
      }
      setPreview({
        open: true,
        title: title || fileName || "Document",
        fileName: fileName || "document",
        url: url || "",
        loading,
        error,
      });
    },
    [revokeBlobUrl]
  );

  const openPreviewFromBlob = useCallback(
    (blob, { title, fileName }) => {
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: blob.type || "application/pdf" })
      );
      openPreview({ title, fileName, url });
    },
    [openPreview]
  );

  const openPreviewWithLoader = useCallback(
    async (loader, { title, fileName }) => {
      openPreview({ title, fileName, url: "", loading: true, error: null });
      try {
        const result = await loader();
        const url = typeof result === "string" ? result : result.url;
        const resolvedName = result?.fileName || fileName;
        openPreview({ title, fileName: resolvedName, url });
      } catch (err) {
        openPreview({
          title,
          fileName,
          url: "",
          loading: false,
          error: err.message || "Failed to load document",
        });
      }
    },
    [openPreview]
  );

  useEffect(() => () => revokeBlobUrl(), [revokeBlobUrl]);

  return {
    preview,
    openPreview,
    openPreviewFromBlob,
    openPreviewWithLoader,
    closePreview,
  };
};

export default useDocumentPreview;
