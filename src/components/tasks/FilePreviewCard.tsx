import { getFileIcon } from "@/utils/fileIcons";
import { cn } from "@/lib/utils";

export interface FilePreviewCardData {
  id?: string;
  name: string;
  url: string;
  type: string;
  sizeLabel?: string;
}

interface Props {
  file: FilePreviewCardData;
  onClick?: () => void;
  compact?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

const isImageFile = (type: string, name: string) =>
  (type || "").toLowerCase().startsWith("image") ||
  /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);

const FilePreviewCard = ({ file, onClick, compact = false, actions, className }: Props) => {
  const Icon = getFileIcon(file.type, file.name);
  const isImage = isImageFile(file.type, file.name);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card hover:shadow-md transition cursor-pointer",
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Thumbnail area */}
      <div
        className={cn(
          "relative w-full flex items-center justify-center bg-muted/50 overflow-hidden",
          compact ? "h-20" : "h-28 sm:h-32"
        )}
      >
        {isImage ? (
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Icon className={cn("text-primary/70", compact ? "w-8 h-8" : "w-10 h-10 sm:w-12 sm:h-12")} />
        )}
      </div>

      {/* Meta */}
      <div className="p-2">
        <p className={cn("font-medium truncate", compact ? "text-[11px]" : "text-xs")}>
          {file.name}
        </p>
        <div className="flex items-center justify-between mt-0.5 gap-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
            {(file.type || "file").split("/").pop()}
          </span>
          {file.sizeLabel && (
            <span className="text-[10px] text-muted-foreground shrink-0">{file.sizeLabel}</span>
          )}
        </div>
      </div>

      {actions && (
        <div
          className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
};

export default FilePreviewCard;
