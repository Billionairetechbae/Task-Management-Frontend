import { X } from "lucide-react";

interface AttachmentPreviewProps {
  url: string;
  type: string;
  name: string;
  onClose: () => void;
}

const AttachmentPreview = ({ url, type, name, onClose }: AttachmentPreviewProps) => {
  const isImage = type.startsWith("image");
  const isPDF = type === "application/pdf";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-700 hover:text-black"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Title */}
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg truncate">{name}</h2>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[75vh] overflow-auto flex justify-center items-center">
          {isImage && (
            <img src={url} alt={name} className="max-h-[70vh] rounded-lg shadow" />
          )}

          {isPDF && (
            <iframe
              src={url}
              title="PDF Preview"
              className="w-full h-[70vh] border rounded-lg"
            />
          )}

          {!isImage && !isPDF && (
            <p className="text-center text-muted-foreground">
              Preview not available — download the file.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttachmentPreview;
