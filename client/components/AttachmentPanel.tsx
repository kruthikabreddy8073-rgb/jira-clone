"use client";

import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "./ui/button";
import { Paperclip, Download, Trash2, AlertCircle, FileText, Image as ImageIcon, File as FileIcon } from "lucide-react";

const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "docx"];
const MAX_BYTES = 10 * 1024 * 1024;

type Props = {
  issue: any;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const iconFor = (contentType: string) => {
  if (contentType?.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  if (contentType === "application/pdf") return <FileText className="h-4 w-4" />;
  return <FileIcon className="h-4 w-4" />;
};

const AttachmentPanel = ({ issue }: Props) => {
  const { user } = useAuth();

  const [attachments, setAttachments] = useState<any[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputId = "attachment-file-input";

  const loadUserName = async (userId: string) => {
    if (!userId || userNames[userId]) return;
    try {
      const res = await axiosInstance.get(`/api/users/${userId}`);
      setUserNames((prev) => ({ ...prev, [userId]: res.data.name }));
    } catch {
      // non-fatal - falls back to showing the raw id
    }
  };

  const loadAttachments = async () => {
    if (!issue?.id || !user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(
        `/api/issues/${issue.id}/attachments?actingUserId=${user.id}`
      );
      setAttachments(res.data || []);
      (res.data || []).forEach((a: any) => loadUserName(a.uploadedByUserId));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load attachments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue?.id, user?.id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.id) return;

    setError(null);

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError("Unsupported file type - only PDF, PNG, JPG, and DOCX are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That file is too large - the maximum size is 10MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await axiosInstance.post(
        `/api/issues/${issue.id}/attachments?actingUserId=${user.id}`,
        formData,
        { headers: { "Content-Type": undefined } }
      );
      loadAttachments();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (attachment: any) => {
    if (!user?.id) return;
    const url = `${axiosInstance.defaults.baseURL}/api/attachments/${attachment.id}/download?actingUserId=${user.id}`;
    window.open(url, "_blank");
  };

  const confirmDelete = async (attachmentId: string) => {
    if (!user?.id) return;
    setError(null);
    try {
      await axiosInstance.delete(
        `/api/attachments/${attachmentId}?actingUserId=${user.id}`
      );
      setDeletingId(null);
      loadAttachments();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to delete attachment");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Attachments
        </h3>
        <span className="text-xs text-[#6B778C]">{attachments.length} file(s)</span>
      </div>

      {error && (
        <div className="mb-3 flex gap-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#6B778C] italic">Loading…</p>
      ) : (
        <div className="space-y-2 mb-3">
          {attachments.length === 0 && (
            <p className="text-sm text-[#6B778C] italic">No files attached yet</p>
          )}
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-md border border-[#DFE1E6] bg-white p-2 text-sm"
            >
              <span className="text-[#6B778C] shrink-0">{iconFor(a.contentType)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#172B4D]">{a.originalFileName}</p>
                <p className="text-xs text-[#6B778C]">
                  {formatBytes(a.fileSize)} - {userNames[a.uploadedByUserId] || a.uploadedByUserId}
                  {" - "}
                  {new Date(a.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                title="Download"
                onClick={() => handleDownload(a)}
                className="text-[#6B778C] hover:text-[#0052CC] p-1 shrink-0"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Delete"
                onClick={() => setDeletingId(a.id)}
                className="text-[#6B778C] hover:text-red-600 p-1 shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {attachments.map((a) =>
            deletingId === a.id ? (
              <div
                key={`confirm-${a.id}`}
                className="rounded-md border border-red-200 bg-red-50 p-2 space-y-2"
              >
                <p className="text-xs text-red-800">
                  Delete "{a.originalFileName}"? This cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => confirmDelete(a.id)}
                  >
                    Yes, delete
                  </Button>
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      <input
        id={inputId}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.docx"
        className="hidden"
        onChange={handleFileChange}
      />
      <label
        htmlFor={inputId}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-[#DFE1E6] bg-white px-4 py-2 text-sm font-medium text-[#172B4D] hover:bg-[#F4F5F7]"
      >
        <Paperclip className="h-4 w-4" />
        {uploading ? "Uploading…" : "Attach a file"}
      </label>
      <p className="text-[11px] text-[#6B778C] mt-1 text-center">
        PDF, PNG, JPG, or DOCX - max 10MB
      </p>
    </div>
  );
};

export default AttachmentPanel;