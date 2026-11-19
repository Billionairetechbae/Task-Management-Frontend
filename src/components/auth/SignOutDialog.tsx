import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SignOutDialogProps {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

/** Shared confirmation and single logout entry point for account surfaces. */
export default function SignOutDialog({ children, onOpenChange }: SignOutDialogProps) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        {children}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of Admiino?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={logout}>Sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
