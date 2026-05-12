import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Share2, Loader2, Check } from "lucide-react";
import { api, ClientViewResourceType } from "@/lib/api";

interface Props {
  resourceType: ClientViewResourceType;
  resourceId: string;
  label?: string;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
}

const ClientViewShareButton = ({
  resourceType,
  resourceId,
  label = "Copy Client View Link",
  size = "sm",
  variant = "outline",
}: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.createClientViewShareLink({
        resourceType,
        resourceId,
        visibilityLevel: "summary",
      });
      const url = res?.data?.shareLink?.publicUrl;
      if (!url) throw new Error("No public URL returned");
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Client view link copied", description: url });
    } catch (e: any) {
      toast({
        title: "Failed to create link",
        description: e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      size={size}
      variant={variant}
      disabled={loading}
      className="h-8 gap-1.5 shadow-sm"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Share2 className="w-3.5 h-3.5" />
      )}
      <span className="hidden sm:inline text-[11px]">
        {copied ? "Copied" : label}
      </span>
    </Button>
  );
};

export default ClientViewShareButton;
