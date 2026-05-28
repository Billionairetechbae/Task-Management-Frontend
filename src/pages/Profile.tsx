// src/pages/Profile.tsx
import { useEffect, useState, ReactNode } from "react";
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

  // NEW: export state
  const [exporting, setExporting] = useState(false);

  /* dialog state */
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [eduOpen, setEduOpen] = useState<{ open: boolean; item?: EducationItem }>({ open: false });
  const [workOpen, setWorkOpen] = useState<{ open: boolean; item?: WorkExperienceItem }>({ open: false });
  const [skillOpen, setSkillOpen] = useState<{ open: boolean; item?: SkillItem }>({ open: false });
  const [certOpen, setCertOpen] = useState<{ open: boolean; item?: CertificationItem }>({ open: false });
  const [projOpen, setProjOpen] = useState<{ open: boolean; item?: ProfileProjectItem }>({ open: false });
  const [langOpen, setLangOpen] = useState<{ open: boolean; item?: LanguageItem }>({ open: false });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getMyProfessionalProfile();
      setBundle(res.data);
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
  const handleExportWorkspaceAudit = async () => {
    try {
      setExporting(true);

      const companyId = localStorage.getItem("activeCompanyId");
      if (!companyId) throw new Error("No active workspace selected");

      // NOTE: backend decides permission (owner/executive/admin)
      const res = await api.exportWorkspaceZip();

      if (!res.ok) {
        // try to read error payload
        let msg = "Export failed";
        try {
          const j = await res.json();
          msg = j?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      const blob = await res.blob();

      // file naming: workspace + date (keep it simple)
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
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Show button for executive/admin on UI.
  // Workspace owner permissions are enforced on backend anyway.
  const canShowExportBtn = user.role === "executive" || user.role === "admin";

  return (
    <div className="min-h-screen bg-background py-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* HEADER */}
        <Card className="rounded-2xl overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
          <CardContent className="p-6 -mt-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="relative">
                  {user.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-background shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/10 border-4 border-background shadow-md flex items-center justify-center text-2xl font-bold text-primary">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </div>
                  )}
                  <label
                    htmlFor="pp-input"
                    className="absolute bottom-1 right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </label>
                  <input
                    id="pp-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadPicture}
                  />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                    {user.firstName} {user.lastName}
                  </h1>
                  {profile.professionalHeadline && (
                    <p className="text-sm sm:text-base text-foreground/80">
                      {profile.professionalHeadline}
                    </p>
                  )}
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

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setEditProfileOpen(true)}>
                  <Edit className="h-4 w-4 mr-1" /> Edit Profile
                </Button>

                {/* NEW: Workspace audit export button */}
                {canShowExportBtn && (
                  <Button
                    variant="outline"
                    onClick={handleExportWorkspaceAudit}
                    disabled={exporting}
                    title="Download a ZIP of workspace audit data"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {exporting ? "Exporting..." : "Export workspace data"}
                  </Button>
                )}

                {/* COMMENTED OUT Download CV
                <Button onClick={handleDownloadCv}>
                  <Download className="h-4 w-4 mr-1" /> Download CV
                </Button>
                */}
              </div>
            </div>
          </CardContent>
        </Card>

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
            ...
          </TabsContent>
        */}

        {/* EXPERIENCE - COMMENTED OUT
          <TabsContent value="experience" className="mt-4">
            ...
          </TabsContent>
        */}

        {/* EDUCATION - COMMENTED OUT
          <TabsContent value="education" className="mt-4">
            ...
          </TabsContent>
        */}

        {/* SKILLS - COMMENTED OUT
          <TabsContent value="skills" className="mt-4">
            ...
          </TabsContent>
        */}

        {/* CERTIFICATIONS - COMMENTED OUT
          <TabsContent value="certifications" className="mt-4">
            ...
          </TabsContent>
        */}

        {/* PROJECTS - COMMENTED OUT
          <TabsContent value="projects" className="mt-4">
            ...
          </TabsContent>
        */}

        {/* LANGUAGES - COMMENTED OUT
          <TabsContent value="languages" className="mt-4">
            ...
          </TabsContent>
        */}

        {/* SETTINGS - COMMENTED OUT
          <TabsContent value="settings" className="mt-4">
            ...
          </TabsContent>
        </Tabs>
        */}

        {/* Added simple settings/account section instead of tabs */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>

            {/* Optional: also show export here for executives/admins if you want */}
            {/* {canShowExportBtn && (
              <Button variant="outline" onClick={handleExportWorkspaceAudit} disabled={exporting}>
                <Download className="h-4 w-4 mr-1" />
                {exporting ? "Exporting..." : "Export workspace data"}
              </Button>
            )} */}
          </CardContent>
        </Card>
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
      <EducationDialog ... />
      <WorkDialog ... />
      <SkillDialog ... />
      <CertDialog ... />
      <ProjDialog ... />
      <LangDialog ... />
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
  ...
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