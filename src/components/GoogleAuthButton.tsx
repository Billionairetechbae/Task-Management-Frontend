import { IntegrationLogo } from "@/components/integrations/IntegrationLogo";
import { Button } from "./ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const GoogleAuthButton = ({ 
  variant = "outline", 
  className = "",
  disabled = false
}: { 
  variant?: "outline" | "default", 
  className?: string,
  disabled?: boolean
}) => {
  const { toast } = useToast();

  const handleGoogleAuth = async () => {
    try {
      const res = await api.getGoogleAuthUrl();
      if (res.data?.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (err: any) {
      toast({
        title: "Google login failed",
        description: err.message || "Please try again",
        variant: "destructive"
      });
    }
  };

  return (
    <Button 
      type="button"
      variant={variant} 
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-2 ${className}`}
      onClick={handleGoogleAuth}
    >

      <IntegrationLogo integration={{ id: "google", name: "Google" }} size={18} />
      Continue with Google
    </Button>
  );
};
