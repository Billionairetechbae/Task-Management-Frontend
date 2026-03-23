import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";

interface ProjectLogoUploaderProps {
  projectId: string;
  currentLogoUrl?: string | null;
  onLogoUpdated: (newUrl: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

const ProjectLogoUploader = ({
  projectId,
  currentLogoUrl,
  onLogoUpdated,
  isOpen,
  onClose,
}: ProjectLogoUploaderProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (e.g., 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum size is 2MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const res = await api.uploadProjectLogo(projectId, file);
      onLogoUpdated(res.data.logoUrl);
      toast({ title: "Logo updated successfully" });
      onClose();
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.deleteProjectLogo(projectId);
      onLogoUpdated(null);
      toast({ title: "Logo removed" });
      onClose();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Project Logo</DialogTitle>
          <DialogDescription>
            Upload a custom logo for your project to make it easily identifiable.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <div className="relative group w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
            {currentLogoUrl ? (
              <img
                src={currentLogoUrl}
                alt="Project Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImagePlus className="w-10 h-10 text-muted-foreground" />
            )}
            
            {uploading && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-[2px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="flex flex-col w-full gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            <Button
              variant="default"
              className="w-full gap-2"
              disabled={uploading || deleting}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {currentLogoUrl ? "Change Logo" : "Upload Logo"}
            </Button>

            {currentLogoUrl && (
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={uploading || deleting}
                onClick={handleDelete}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Remove Logo
              </Button>
            )}
          </div>
          
          <p className="text-[11px] text-muted-foreground text-center">
            Recommended: Square image, max 2MB (JPG, PNG)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectLogoUploader;
