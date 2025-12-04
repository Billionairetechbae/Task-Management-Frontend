import {
  File as FileIcon,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  FileType,
  FileCode,
  FileAudio,
  FileVideo,
  Presentation,
  FileJson2,
} from "lucide-react";

export const getFileIcon = (mime: string, name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";

  if (mime.startsWith("image")) return FileImage;
  if (mime === "application/pdf") return FileText;

  if (["csv", "xls", "xlsx"].includes(ext)) return FileSpreadsheet;
  if (["ppt", "pptx"].includes(ext)) return Presentation;

  if (["zip", "rar", "7z"].includes(ext)) return FileArchive;

  if (["json"].includes(ext)) return FileJson2;

  if (mime.startsWith("audio")) return FileAudio;
  if (mime.startsWith("video")) return FileVideo;

  if (["doc", "docx"].includes(ext)) return FileType;

  if (["js", "ts", "tsx", "html", "css", "json"].includes(ext)) return FileCode;

  return FileIcon;
};
