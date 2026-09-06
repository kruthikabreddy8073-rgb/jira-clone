"use client";

import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import axiosInstance from "@/lib/Axiosinstance";
import { AlertCircle, ImagePlus } from "lucide-react";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB - mirrors the backend limit

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentAvatarUrl?: string;
  fallbackLabel: string;
  onUploaded: (updatedUser: any) => void;
};

const AvatarUploadDialog = ({
  isOpen,
  onClose,
  userId,
  currentAvatarUrl,
  fallbackLabel,
  onUploaded,
}: Props) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputId = "avatar-file-input";
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const resetState = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setUploading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file again later
    if (!file) return;

    setError(null);

    // Client-side validation for immediate feedback - the backend
    // re-validates the same rules independently, since this check alone
    // can always be bypassed.
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Unsupported format - please choose a JPG or PNG image.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is too large - the maximum size is 5MB.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await axiosInstance.post(
        `/api/users/${userId}/avatar?actingUserId=${userId}`,
        formData,
        {
          // Explicitly drop the axiosInstance default of
          // "Content-Type: application/json" for this one request, so the
          // browser can generate the correct multipart boundary itself.
          headers: { "Content-Type": undefined },
        }
      );
      onUploaded(res.data);
      resetState();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Profile Picture</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <Avatar className="h-28 w-28">
            <AvatarImage src={previewUrl || currentAvatarUrl || "/placeholder.svg"} />
            <AvatarFallback className="text-2xl">{fallbackLabel}</AvatarFallback>
          </Avatar>

          {error && (
            <div className="flex w-full gap-2 rounded-md bg-red-50 p-2.5 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleFileChange}
          />
          <label
            htmlFor={inputId}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-[#DFE1E6] bg-white px-4 py-2 text-sm font-medium text-[#172B4D] hover:bg-[#F4F5F7]"
          >
            <ImagePlus className="h-4 w-4" />
            {selectedFile ? "Choose a different image" : "Select an image"}
          </label>

          <p className="text-[11px] text-[#6B778C] text-center">
            JPG or PNG - max 5MB
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
            disabled={!selectedFile || uploading}
            onClick={handleSave}
          >
            {uploading ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarUploadDialog;