// src/pages/Profile.tsx
import { useEffect, useMemo, useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Upload,
  Edit,
  LogOut,
  Download,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Github,
  Twitter,
  Briefcase,
  GraduationCap,
  Award,
  Languages,
  FolderKanban,
  Sparkles,
  Save,
  X,
  Loader2,
  ShieldCheck,
  Building2,
  User as UserIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  api,
  ProfessionalProfileBundle,
  ProfessionalProfileDetails,
  EducationItem,
  WorkExperienceItem,
  SkillItem,
  CertificationItem,
  ProfileProjectItem,
  LanguageItem,
  ProfileVisibility,
  WorkspaceItem,
  WorkspaceRole,
} from "@/lib/api";

/* ============== HELPERS ============== */

const fmtDate = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
};

const dateRange = (start?: string | null, end?: string | null, isCurrent?: boolean) => {
  const s = fmtDate(start);
  const e = isCurrent ? "Present" : fmtDate(end);
  if (s && e) return `${s} · ${e}`;
  return s || e || "";
};

const toDateInput = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

/* ============== SECTION WRAPPER ============== */

interface SectionProps {
  title: string;
  icon: ReactNode;
  onAdd?: () => void;
  children: ReactNode;
  empty?: boolean;
  emptyText?: string;
}

const Section = ({ title, icon, onAdd, children, empty, emptyText }: SectionProps) => (
  <Card className="rounded-xl">
    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        {icon}
        {title}
      </CardTitle>
      {onAdd && (
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      )}
    </CardHeader>
    <CardContent>
      {empty ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {emptyText || "Nothing here yet. Click Add to get started."}
        </p>
      ) : (
        children
      )}
    </CardContent>
  </Card>
);

/* ============== ITEM CARD ============== */

const ItemCard = ({
  title,
  subtitle,
  meta,
  description,
  bullets,
  url,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  description?: string | null;
  bullets?: string[];
  url?: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div className="group rounded-lg border bg-background p-4 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm">{title}</p>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        {meta && <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>}
      </div>
      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
    {description && <p className="text-sm whitespace-pre-wrap leading-6">{description}</p>}
    {bullets && bullets.length > 0 && (
      <ul className="list-disc pl-5 text-sm space-y-1">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    )}
    {url && (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Globe className="h-3 w-3" />
        {url}
      </a>
    )}
  </div>
);

/* ============== CONFIRM DELETE ============== */

const useConfirm = () => {
  const [state, setState] = useState<{ open: boolean; onOk?: () => void; label?: string }>({
    open: false,
  });
  const confirm = (label: string, onOk: () => void) => setState({ open: true, onOk, label });
  const node = (
    <AlertDialog open={state.open} onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {state.label}?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              state.onOk?.();
              setState({ open: false });
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { confirm, node };
};

/* ============== FORM DIALOG ============== */

const FormDialog = ({
  open,
  onOpenChange,
  title,
  onSubmit,
  submitting,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  onSubmit: () => void;
  submitting?: boolean;
  children: ReactNode;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        {children}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

const Field = ({
  label,
  children,
  full,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) => (
  <div className={full ? "sm:col-span-2" : ""}>
    <Label className="text-xs">{label}</Label>
    <div className="mt-1">{children}</div>
  </div>
);

/* ============================================================
   MAIN PAGE
============================================================ */

const Profile = () => {
  const { user, refreshUser, logout, setUser } = useAuth();
  const { toast } = useToast();
  const { confirm, node: confirmNode } = useConfirm();

  const [bundle, setBundle] = useState<ProfessionalProfileBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // NEW: export state (kept, even if you move exports to the new Audit Export page)
  const [exporting, setExporting] = useState(false);

  // NEW: settings center meta
  const [activeWorkspaceName, setActiveWorkspaceName] = useState<string>("Active workspace");
  const [activeWorkspaceRole, setActiveWorkspaceRole] = useState<WorkspaceRole | null>(null);

  /* dialog state */
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [eduOpen, setEduOpen] = useState<{ open: boolean; item?: EducationItem }>({ open: false });
  const [workOpen, setWorkOpen] = useState<{ open: boolean; item?: WorkExperienceItem }>({ open: false });
  const [skillOpen, setSkillOpen] = useState<{ open: boolean; item?: SkillItem }>({ open: false });
  const [certOpen, setCertOpen] = useState<{ open: boolean; item?: CertificationItem }>({ open: false });
  const [projOpen, setProjOpen] = useState<{ open: boolean; item?: ProfileProjectItem }>({ open: false });
  const [langOpen, setLangOpen] = useState<{ open: boolean; item?: LanguageItem }>({ open: false });
  const [submitting, setSubmitting] = useState(false);

  const activeCompanyId = useMemo(() => localStorage.getItem("activeCompanyId"), []);

  const loadWorkspaceMeta = async () => {
    try {
      const storedName = localStorage.getItem("activeWorkspaceName");
      const storedRole = localStorage.getItem("activeWorkspaceRole") as WorkspaceRole | null;

      if (storedName) setActiveWorkspaceName(storedName);
      if (storedRole) setActiveWorkspaceRole(storedRole);

      const companyId = localStorage.getItem("activeCompanyId");
      if (!companyId) {
        setActiveWorkspaceName("No workspace selected");
        setActiveWorkspaceRole(null);
        return;
      }

      const wsRes = await api.getMyWorkspaces();

      // be defensive (your backend responses vary across endpoints)
      const workspaces: WorkspaceItem[] =
        (wsRes as any)?.data?.workspaces ||
        (wsRes as any)?.data?.data?.workspaces ||
        (wsRes as any)?.workspaces ||
        [];

      const active = workspaces.find((w) => w.companyId === companyId);

      if (active) {
        const name = active.company?.name || active.company?.companyCode || "Active workspace";
        setActiveWorkspaceName(name);
        setActiveWorkspaceRole(active.role || null);

        localStorage.setItem("activeWorkspaceName", name);
        if (active.role) localStorage.setItem("activeWorkspaceRole", active.role);
      }
    } catch {
      // soft-fail: do not block profile
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getMyProfessionalProfile();
      setBundle(res.data);
      await loadWorkspaceMeta();
    } catch (err: any) {
      toast({ title: "Failed to load profile", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const profile = bundle?.profile || ({} as ProfessionalProfileDetails);

  /* ============ profile picture upload (preserved) ============ */
  const handleUploadPicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 2MB", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      const result: any = await api.uploadProfilePicture(file);
      if (result?.data?.user) setUser(result.data.user);
      toast({ title: "Profile picture updated" });
      await refreshUser();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  /* ============ download CV ============ */
  /* COMMENTED OUT
  const handleDownloadCv = async () => {
    try {
      const filename = `${user.firstName}_${user.lastName}_CV.pdf`.split(" ").join("_");
      await api.downloadMyCv(filename);
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };
  */

  /* ============ NEW: Workspace Audit Export (ZIP) ============ */
  // NOTE:
  // - Keeping this here for now since you already had it.
  // - If you move exports fully to /audit-exports, you can delete this handler and just keep the redirect button.
  const handleExportWorkspaceAudit = async () => {
    try {
      setExporting(true);

      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const companyId = localStorage.getItem("activeCompanyId");
      if (!token) throw new Error("Not authenticated");
      if (!companyId) throw new Error("No active workspace selected");

      const res = await fetch(`${(import.meta as any).env.VITE_API_BASE_URL}/exports/workspace`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-company-id": companyId,
        },
      });

      if (!res.ok) {
        let msg = "Export failed";
        try {
          const j = await res.json();
          msg = j?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const blob = await res.blob();

      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const filename = `workspace-audit-export-${companyId}-${y}${m}${d}.zip`;

      triggerBlobDownload(blob, filename);

      toast({ title: "Export ready", description: "Your workspace export has been downloaded." });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err.message || "Could not export workspace data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  /* ============ generic save wrapper ============ */
  const runMutation = async (fn: () => Promise<any>, successMsg: string, after?: () => void) => {
    try {
      setSubmitting(true);
      await fn();
      toast({ title: successMsg });
      await load();
      after?.();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  /* ============================== RENDER ============================== */

  if (loading && !bundle) {
    return (
      <div className="min-h-screen bg-muted/30 py-12 px-4">
        <div className="w-full space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings…
          </div>
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Permission: only for owner/admin of active workspace OR global executive/admin
  const canAccessAuditExports =
    user.role === "admin" ||
    user.role === "executive" ||
    activeWorkspaceRole === "owner" ||
    activeWorkspaceRole === "admin";

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4 sm:px-6">
      <div className="w-full space-y-8">
        {/* Back */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* SETTINGS HEADER (more “settings center” vibe, but keeps your profile image section) */}
        <Card className="rounded-2xl overflow-hidden border-none shadow-sm">
          <div className="h-28 bg-gradient-to-r from-primary/25 via-primary/10 to-accent/25" />
          <CardContent className="p-6 -mt-12">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                {/* Profile picture block (restored) */}
                <div className="relative">
                  {user.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-background shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/10 border-4 border-background shadow-md flex items-center justify-center text-2xl font-bold text-primary">
                      {user.firstName?.[0]}
                      {user.lastName?.[0]}
                    </div>
                  )}

                  <label
                    htmlFor="pp-input"
                    className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow"
                    title="Upload profile picture"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </label>
                  <input
                    id="pp-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadPicture}
                    disabled={uploading}
                  />
                </div>

                {/* Title + meta */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Settings</p>
                    <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                      {user.firstName} {user.lastName}
                    </h1>
                    {profile.professionalHeadline && (
                      <p className="text-sm sm:text-base text-foreground/80">
                        {profile.professionalHeadline}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="inline-flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5" />
                      {String(user.role).toUpperCase()}
                    </Badge>

                    <Badge variant="outline" className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {activeWorkspaceName}
                      {activeWorkspaceRole ? ` · ${activeWorkspaceRole}` : ""}
                    </Badge>
{/* 
                    {activeCompanyId && (
                      <Badge variant="outline" className="text-muted-foreground">
                        {activeCompanyId}
                      </Badge>
                    )} */}
                  </div>

                  {/* COMMENTED OUT - Location, phone, links, etc.
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {profile.currentLocation && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {profile.currentLocation}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {profile.contactEmail || user.email}
                    </span>
                    {profile.phoneNumber && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {profile.phoneNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {profile.linkedinUrl && (
                      <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {profile.githubUrl && (
                      <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                        <Github className="h-4 w-4" />
                      </a>
                    )}
                    {profile.twitterUrl && (
                      <a href={profile.twitterUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                        <Twitter className="h-4 w-4" />
                      </a>
                    )}
                    {profile.websiteUrl && (
                      <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  */}
                </div>
              </div>

              {/* Top-right actions */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setEditProfileOpen(true)}>
                  <Edit className="h-4 w-4 mr-1" /> Edit Profile
                </Button>

                {/* Redirect button to Audit Export page (permissioned) */}
                {canAccessAuditExports && (
                  <Link to="/audit-exports">
                    <Button>
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      Audit exports
                    </Button>
                  </Link>
                )}

                {/* OPTIONAL: keep ZIP export here too (permissioned). You can remove later if you prefer only /audit-exports */}
                {/* {canAccessAuditExports && (
                  <Button
                    variant="outline"
                    onClick={handleExportWorkspaceAudit}
                    disabled={exporting}
                    title="Download a ZIP of workspace audit data"
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Exporting…
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-1" />
                        Export ZIP
                      </>
                    )}
                  </Button>
                )} */}

                {/* COMMENTED OUT Download CV
                <Button onClick={handleDownloadCv}>
                  <Download className="h-4 w-4 mr-1" /> Download CV
                </Button>
                */}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SETTINGS CENTER GRID */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Workspace card */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Workspace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs text-muted-foreground">Active workspace</p>
                <p className="font-semibold mt-1">{activeWorkspaceName}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeWorkspaceRole && <Badge variant="secondary">{activeWorkspaceRole}</Badge>}
                  {/* {activeCompanyId && <Badge variant="outline">{activeCompanyId}</Badge>} */}
                </div>
              </div>

              {!activeCompanyId && (
                <p className="text-sm text-muted-foreground">
                  Select a workspace to enable workspace features like exports.
                </p>
              )}

              {canAccessAuditExports ? (
                <div className="flex flex-wrap gap-2">
                  <Link to="/audit-exports">
                    <Button variant="outline">
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      Open audit exports
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Audit exports are available to workspace Owner/Admin and global Executive/Admin only.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Account card */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="font-semibold mt-1">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{profile.contactEmail || user.email}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="destructive" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-1" /> Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TABS - COMMENTED OUT all CV-related, kept only minimal
        <Tabs defaultValue="overview">
          <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-muted/60 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="certifications">Certifications</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="languages">Languages</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        */}

        {/* OVERVIEW - COMMENTED OUT
          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Professional Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {profile.professionalSummary ? (
                  <p className="whitespace-pre-wrap leading-6">{profile.professionalSummary}</p>
                ) : (
                  <p className="text-muted-foreground">No summary added yet.</p>
                )}
                {profile.careerObjective && (
                  <div>
                    <p className="font-semibold mb-1">Career Objective</p>
                    <p className="whitespace-pre-wrap leading-6">{profile.careerObjective}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg">Contact & Links</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                <div><span className="text-muted-foreground">Email: </span>{profile.contactEmail || user.email}</div>
                <div><span className="text-muted-foreground">Phone: </span>{profile.phoneNumber || "—"}</div>
                <div><span className="text-muted-foreground">Website: </span>{profile.websiteUrl || "—"}</div>
                <div><span className="text-muted-foreground">LinkedIn: </span>{profile.linkedinUrl || "—"}</div>
                <div><span className="text-muted-foreground">GitHub: </span>{profile.githubUrl || "—"}</div>
                <div><span className="text-muted-foreground">Twitter: </span>{profile.twitterUrl || "—"}</div>
                <div><span className="text-muted-foreground">Portfolio: </span>{profile.portfolioUrl || "—"}</div>
                <div><span className="text-muted-foreground">Location: </span>{profile.currentLocation || "—"}</div>
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">Demographics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
                <div>Nationality: {profile.nationality || "—"}</div>
                <div>Gender: {profile.gender || "—"}</div>
                <div>Date of birth: {profile.dateOfBirth ? fmtDate(profile.dateOfBirth) : "—"}</div>
                <div>Visibility: {profile.profileVisibility || "private"}</div>
              </CardContent>
            </Card>
          </TabsContent>
          */}

        {/* EXPERIENCE - COMMENTED OUT
          <TabsContent value="experience" className="mt-4">
            <Section
              title="Work Experience"
              icon={<Briefcase className="h-4 w-4 text-primary" />}
              onAdd={() => setWorkOpen({ open: true })}
              empty={!bundle?.workExperience?.length}
            >
              <div className="space-y-3">
                {bundle?.workExperience?.map((it) => (
                  <ItemCard
                    key={it.id}
                    title={it.jobTitle}
                    subtitle={[it.companyName, it.employmentType].filter(Boolean).join(" · ")}
                    meta={[dateRange(it.startDate, it.endDate, it.isCurrent), it.location]
                      .filter(Boolean)
                      .join(" · ")}
                    description={it.description}
                    bullets={it.achievements}
                    onEdit={() => setWorkOpen({ open: true, item: it })}
                    onDelete={() =>
                      confirm("work experience", () =>
                        runMutation(() => api.deleteWorkExperience(it.id!), "Removed")
                      )
                    }
                  />
                ))}
              </div>
            </Section>
          </TabsContent>
          */}

        {/* EDUCATION - COMMENTED OUT
          <TabsContent value="education" className="mt-4">
            <Section
              title="Education"
              icon={<GraduationCap className="h-4 w-4 text-primary" />}
              onAdd={() => setEduOpen({ open: true })}
              empty={!bundle?.education?.length}
            >
              <div className="space-y-3">
                {bundle?.education?.map((it) => (
                  <ItemCard
                    key={it.id}
                    title={it.institution}
                    subtitle={[it.degree, it.fieldOfStudy].filter(Boolean).join(" · ")}
                    meta={[dateRange(it.startDate, it.endDate, it.isCurrent), it.location]
                      .filter(Boolean)
                      .join(" · ")}
                    description={it.description}
                    onEdit={() => setEduOpen({ open: true, item: it })}
                    onDelete={() =>
                      confirm("education", () =>
                        runMutation(() => api.deleteEducation(it.id!), "Removed")
                      )
                    }
                  />
                ))}
              </div>
            </Section>
          </TabsContent>
          */}

        {/* SKILLS - COMMENTED OUT
          <TabsContent value="skills" className="mt-4">
            <Section
              title="Skills"
              icon={<Sparkles className="h-4 w-4 text-primary" />}
              onAdd={() => setSkillOpen({ open: true })}
              empty={!bundle?.skills?.length}
            >
              <div className="flex flex-wrap gap-2">
                {bundle?.skills?.map((it) => (
                  <div
                    key={it.id}
                    className="group inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm"
                  >
                    <span className="font-medium">{it.name}</span>
                    {it.proficiency && (
                      <Badge variant="secondary" className="text-[10px]">
                        {it.proficiency}
                      </Badge>
                    )}
                    <button onClick={() => setSkillOpen({ open: true, item: it })} className="text-muted-foreground hover:text-primary">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() =>
                        confirm("skill", () => runMutation(() => api.deleteSkill(it.id!), "Removed"))
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          </TabsContent>
          */}

        {/* CERTIFICATIONS - COMMENTED OUT
          <TabsContent value="certifications" className="mt-4">
            <Section
              title="Certifications"
              icon={<Award className="h-4 w-4 text-primary" />}
              onAdd={() => setCertOpen({ open: true })}
              empty={!bundle?.certifications?.length}
            >
              <div className="space-y-3">
                {bundle?.certifications?.map((it) => (
                  <ItemCard
                    key={it.id}
                    title={it.title}
                    subtitle={it.issuingOrganization || ""}
                    meta={[
                      it.issueDate ? `Issued ${fmtDate(it.issueDate)}` : "",
                      it.expiryDate ? `Expires ${fmtDate(it.expiryDate)}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    description={it.description}
                    url={it.credentialUrl}
                    onEdit={() => setCertOpen({ open: true, item: it })}
                    onDelete={() =>
                      confirm("certification", () =>
                        runMutation(() => api.deleteCertification(it.id!), "Removed")
                      )
                    }
                  />
                ))}
              </div>
            </Section>
          </TabsContent>
          */}

        {/* PROJECTS - COMMENTED OUT
          <TabsContent value="projects" className="mt-4">
            <Section
              title="Projects"
              icon={<FolderKanban className="h-4 w-4 text-primary" />}
              onAdd={() => setProjOpen({ open: true })}
              empty={!bundle?.projects?.length}
            >
              <div className="space-y-3">
                {bundle?.projects?.map((it) => (
                  <ItemCard
                    key={it.id}
                    title={it.title}
                    subtitle={[it.role, it.organization].filter(Boolean).join(" · ")}
                    meta={dateRange(it.startDate, it.endDate, it.isCurrent)}
                    description={it.description}
                    bullets={it.achievements}
                    url={it.projectUrl}
                    onEdit={() => setProjOpen({ open: true, item: it })}
                    onDelete={() =>
                      confirm("project", () =>
                        runMutation(() => api.deleteProfileProject(it.id!), "Removed")
                      )
                    }
                  />
                ))}
              </div>
            </Section>
          </TabsContent>
          */}

        {/* LANGUAGES - COMMENTED OUT
          <TabsContent value="languages" className="mt-4">
            <Section
              title="Languages"
              icon={<Languages className="h-4 w-4 text-primary" />}
              onAdd={() => setLangOpen({ open: true })}
              empty={!bundle?.languages?.length}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {bundle?.languages?.map((it) => (
                  <div key={it.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{it.language}</p>
                      {it.proficiency && (
                        <p className="text-xs text-muted-foreground">{it.proficiency}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setLangOpen({ open: true, item: it })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() =>
                          confirm("language", () =>
                            runMutation(() => api.deleteLanguage(it.id!), "Removed")
                          )
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </TabsContent>
          */}

        {/* SETTINGS - COMMENTED OUT
          <TabsContent value="settings" className="mt-4">
            <SettingsTab
              profile={profile}
              onSave={(visibility) =>
                runMutation(
                  () => api.updateMyProfessionalProfile({ profileVisibility: visibility }),
                  "Settings saved"
                )
              }
            />
            <Card className="rounded-xl mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Account</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-1" /> Logout
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        */}
      </div>

      {/* DIALOGS - kept ProfileEditDialog, commented others out*/}
      <ProfileEditDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        initial={profile}
        user={user}
        submitting={submitting}
        onSubmit={(payload, names) =>
          runMutation(
            async () => {
              if (names) await api.updateUserProfile(names);
              await api.updateMyProfessionalProfile(payload);
              await refreshUser();
            },
            "Profile updated",
            () => setEditProfileOpen(false)
          )
        }
      />

      {/* COMMENTED OUT CV-related dialogs
      <EducationDialog
        open={eduOpen.open}
        onOpenChange={(o) => setEduOpen({ open: o })}
        initial={eduOpen.item}
        submitting={submitting}
        onSubmit={(payload) =>
          runMutation(
            () =>
              eduOpen.item?.id
                ? api.updateEducation(eduOpen.item.id, payload)
                : api.createEducation(payload),
            eduOpen.item ? "Updated" : "Added",
            () => setEduOpen({ open: false })
          )
        }
      />

      <WorkDialog
        open={workOpen.open}
        onOpenChange={(o) => setWorkOpen({ open: o })}
        initial={workOpen.item}
        submitting={submitting}
        onSubmit={(payload) =>
          runMutation(
            () =>
              workOpen.item?.id
                ? api.updateWorkExperience(workOpen.item.id, payload)
                : api.createWorkExperience(payload),
            workOpen.item ? "Updated" : "Added",
            () => setWorkOpen({ open: false })
          )
        }
      />

      <SkillDialog
        open={skillOpen.open}
        onOpenChange={(o) => setSkillOpen({ open: o })}
        initial={skillOpen.item}
        submitting={submitting}
        onSubmit={(payload) =>
          runMutation(
            () =>
              skillOpen.item?.id
                ? api.updateSkill(skillOpen.item.id, payload)
                : api.createSkill(payload),
            skillOpen.item ? "Updated" : "Added",
            () => setSkillOpen({ open: false })
          )
        }
      />

      <CertDialog
        open={certOpen.open}
        onOpenChange={(o) => setCertOpen({ open: o })}
        initial={certOpen.item}
        submitting={submitting}
        onSubmit={(payload) =>
          runMutation(
            () =>
              certOpen.item?.id
                ? api.updateCertification(certOpen.item.id, payload)
                : api.createCertification(payload),
            certOpen.item ? "Updated" : "Added",
            () => setCertOpen({ open: false })
          )
        }
      />

      <ProjDialog
        open={projOpen.open}
        onOpenChange={(o) => setProjOpen({ open: o })}
        initial={projOpen.item}
        submitting={submitting}
        onSubmit={(payload) =>
          runMutation(
            () =>
              projOpen.item?.id
                ? api.updateProfileProject(projOpen.item.id, payload)
                : api.createProfileProject(payload),
            projOpen.item ? "Updated" : "Added",
            () => setProjOpen({ open: false })
          )
        }
      />

      <LangDialog
        open={langOpen.open}
        onOpenChange={(o) => setLangOpen({ open: o })}
        initial={langOpen.item}
        submitting={submitting}
        onSubmit={(payload) =>
          runMutation(
            () =>
              langOpen.item?.id
                ? api.updateLanguage(langOpen.item.id, payload)
                : api.createLanguage(payload),
            langOpen.item ? "Updated" : "Added",
            () => setLangOpen({ open: false })
          )
        }
      />
      */}

      {confirmNode}
    </div>
  );
};

/* ============================================================
   SETTINGS TAB (COMMENTED OUT)
============================================================
const SettingsTab = ({
  profile,
  onSave,
}: {
  profile: ProfessionalProfileDetails;
  onSave: (v: ProfileVisibility) => void;
}) => {
  const [visibility, setVisibility] = useState<ProfileVisibility>(
    (profile.profileVisibility as ProfileVisibility) || "private"
  );
  useEffect(() => {
    setVisibility((profile.profileVisibility as ProfileVisibility) || "private");
  }, [profile.profileVisibility]);

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg">Profile Visibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-sm">
          <Label className="text-xs">Who can see your profile</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as ProfileVisibility)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private — only me</SelectItem>
              <SelectItem value="workspace">Workspace — my teammates</SelectItem>
              <SelectItem value="public">Public — anyone with the link</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => onSave(visibility)}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </CardContent>
    </Card>
  );
};
*/

/* ============================================================
   MAIN PROFILE EDIT DIALOG
============================================================ */
const ProfileEditDialog = ({
  open,
  onOpenChange,
  initial,
  user,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: ProfessionalProfileDetails;
  user: { firstName: string; lastName: string };
  submitting?: boolean;
  onSubmit: (
    payload: Partial<ProfessionalProfileDetails>,
    names?: { firstName?: string; lastName?: string }
  ) => void;
}) => {
  const [s, setS] = useState<
    Partial<ProfessionalProfileDetails> & { firstName: string; lastName: string }
  >({
    firstName: user.firstName,
    lastName: user.lastName,
    ...initial,
    dateOfBirth: toDateInput(initial?.dateOfBirth),
  });

  useEffect(() => {
    setS({
      firstName: user.firstName,
      lastName: user.lastName,
      ...initial,
      dateOfBirth: toDateInput(initial?.dateOfBirth),
    });
  }, [open, initial, user.firstName, user.lastName]);

  const set = (k: string, v: any) => setS((prev) => ({ ...prev, [k]: v }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Profile"
      submitting={submitting}
      onSubmit={() => {
        const { firstName, lastName, ...rest } = s;
        onSubmit(rest, { firstName, lastName });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name">
          <Input value={s.firstName || ""} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Last name">
          <Input value={s.lastName || ""} onChange={(e) => set("lastName", e.target.value)} />
        </Field>

        <Field label="Professional headline" full>
          <Input
            value={s.professionalHeadline || ""}
            onChange={(e) => set("professionalHeadline", e.target.value)}
            placeholder="e.g., Senior Product Designer"
          />
        </Field>

        {/* COMMENTED OUT other fields
        <Field label="Professional summary" full>
          <Textarea rows={4} value={s.professionalSummary || ""} onChange={(e) => set("professionalSummary", e.target.value)} />
        </Field>

        <Field label="Career objective" full>
          <Textarea rows={3} value={s.careerObjective || ""} onChange={(e) => set("careerObjective", e.target.value)} />
        </Field>
        */}

        <Field label="Contact email">
          <Input
            type="email"
            value={s.contactEmail || ""}
            onChange={(e) => set("contactEmail", e.target.value)}
          />
        </Field>

        {/* COMMENTED OUT phone, location, nationality, links, etc.
        <Field label="Phone number"><Input value={s.phoneNumber || ""} onChange={(e) => set("phoneNumber", e.target.value)} /></Field>
        <Field label="Location"><Input value={s.currentLocation || ""} onChange={(e) => set("currentLocation", e.target.value)} /></Field>
        <Field label="Nationality"><Input value={s.nationality || ""} onChange={(e) => set("nationality", e.target.value)} /></Field>
        */}

        <Field label="Gender">
          <Input value={s.gender || ""} onChange={(e) => set("gender", e.target.value)} />
        </Field>

        {/* COMMENTED OUT date of birth, links, etc.
        <Field label="Date of birth"><Input type="date" value={s.dateOfBirth || ""} onChange={(e) => set("dateOfBirth", e.target.value)} /></Field>
        <Field label="Website"><Input type="url" value={s.websiteUrl || ""} onChange={(e) => set("websiteUrl", e.target.value)} /></Field>
        <Field label="LinkedIn"><Input type="url" value={s.linkedinUrl || ""} onChange={(e) => set("linkedinUrl", e.target.value)} /></Field>
        <Field label="GitHub"><Input type="url" value={s.githubUrl || ""} onChange={(e) => set("githubUrl", e.target.value)} /></Field>
        <Field label="Twitter"><Input type="url" value={s.twitterUrl || ""} onChange={(e) => set("twitterUrl", e.target.value)} /></Field>
        <Field label="Portfolio" full><Input type="url" value={s.portfolioUrl || ""} onChange={(e) => set("portfolioUrl", e.target.value)} /></Field>
        */}
      </div>
    </FormDialog>
  );
};

export default Profile;