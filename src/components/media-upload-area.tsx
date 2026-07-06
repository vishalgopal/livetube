"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, File, RefreshCw } from "lucide-react";

interface MediaUploadAreaProps {
  channelId: string;
  folderId: string;
}

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: "UPLOADING" | "SUCCESS" | "FAILED";
  error?: string;
}

export default function MediaUploadArea({ channelId, folderId }: MediaUploadAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
    }
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  const uploadFiles = (files: File[]) => {
    files.forEach((file) => {
      const uploadId = Math.random().toString(36).substring(7);
      
      const newUpload: UploadTask = {
        id: uploadId,
        name: file.name,
        progress: 0,
        status: "UPLOADING",
      };

      setUploads((prev) => [newUpload, ...prev]);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("channelId", channelId);
      formData.append("folderId", folderId);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/media/upload", true);

      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploads((prev) =>
            prev.map((up) => (up.id === uploadId ? { ...up, progress: percent } : up))
          );
        }
      });

      // Handle response
      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
            setUploads((prev) =>
              prev.map((up) => (up.id === uploadId ? { ...up, status: "SUCCESS", progress: 100 } : up))
            );
            // Refresh server components to display new file
            router.refresh();
          } else {
            let errorMessage = "Upload failed.";
            try {
              const payload = JSON.parse(xhr.responseText || "{}");
              if (payload?.error) {
                errorMessage = String(payload.error);
              }
            } catch (_) {
              if (xhr.status === 413) {
                errorMessage = "Upload rejected because the file exceeds the server or proxy body-size limit.";
              }
            }

            setUploads((prev) =>
              prev.map((up) =>
                up.id === uploadId ? { ...up, status: "FAILED", error: errorMessage } : up
              )
            );
          }
        }
      };

      xhr.send(formData);
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Upload Drag & Drop Panel */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerSelect}
        className={`w-full p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? "border-primary bg-canvas-soft-2"
            : "border-hairline bg-canvas hover:border-hairline-strong hover:bg-canvas-soft/40"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
          accept="video/*,audio/*,image/*"
        />
        <div className="w-12 h-12 rounded-full bg-canvas-soft-2 border border-hairline flex items-center justify-center shadow-xs">
          <UploadCloud className="w-5 h-5 text-mute" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-ink">
            Drag & drop media here, or <span className="text-link hover:underline">browse</span>
          </p>
          <p className="text-xs text-mute font-medium">
            Supports MP4, MKV, MOV, MP3, WAV, JPG, PNG, WEBP (up to 2GB)
          </p>
        </div>
      </div>

      {/* Upload Progress List */}
      {uploads.length > 0 && (
        <div className="p-4 bg-canvas border border-hairline rounded-xl flex flex-col gap-3">
          <span className="text-xs font-bold text-ink font-mono uppercase tracking-wider">
            Uploading ({uploads.filter((u) => u.status === "UPLOADING").length})
          </span>

          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
            {uploads.map((task) => (
              <div key={task.id} className="flex flex-col gap-1.5 p-2 rounded-lg bg-canvas-soft-2/50 border border-hairline/40">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <File className="w-3.5 h-3.5 text-mute shrink-0" />
                    <span className="font-semibold text-ink truncate" title={task.name}>
                      {task.name}
                    </span>
                  </div>
                  <span className="font-mono text-mute shrink-0">
                    {task.status === "UPLOADING" && `${task.progress}%`}
                    {task.status === "SUCCESS" && <span className="text-success font-semibold">Ready</span>}
                    {task.status === "FAILED" && <span className="text-error-deep font-semibold">Failed</span>}
                  </span>
                </div>

                {task.status === "UPLOADING" && (
                  <div className="h-1.5 w-full bg-canvas rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-150" style={{ width: `${task.progress}%` }} />
                  </div>
                )}

                {task.status === "FAILED" && task.error && (
                  <div className="text-[11px] text-error-deep break-words">{task.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
