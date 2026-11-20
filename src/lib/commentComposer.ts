export const MAX_COMMENT_FILES = 10;
export const MAX_COMMENT_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".jpg", ".jpeg", ".png", ".webp", ".gif",
]);

export interface CommentFileRejection {
  file: File;
  reason: string;
}

export function validateCommentFiles(
  existing: File[],
  selected: File[],
): { accepted: File[]; rejected: CommentFileRejection[] } {
  const accepted: File[] = [];
  const rejected: CommentFileRejection[] = [];

  for (const file of selected) {
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      rejected.push({ file, reason: "This file type is not supported." });
    } else if (file.size <= 0 || file.size > MAX_COMMENT_FILE_SIZE) {
      rejected.push({ file, reason: "Files must be between 1 byte and 20 MB." });
    } else if (existing.length + accepted.length >= MAX_COMMENT_FILES) {
      rejected.push({ file, reason: `You can attach up to ${MAX_COMMENT_FILES} files.` });
    } else {
      accepted.push(file);
    }
  }

  return { accepted, rejected };
}

export function canSendTaskComment(content: string, attachmentCount: number): boolean {
  return content.trim().length > 0 || attachmentCount > 0;
}

export function shouldSendTypingStart({
  isConnected,
  canCollaborate,
  taskReady,
  alreadyTyping,
}: {
  isConnected: boolean;
  canCollaborate: boolean;
  taskReady: boolean;
  alreadyTyping: boolean;
}): boolean {
  return isConnected && canCollaborate && taskReady && !alreadyTyping;
}
