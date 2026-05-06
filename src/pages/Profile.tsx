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
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
};

const toDateInput = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
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
  const handleDownloadCv = async () => {
    try {
      const filename = `${user.firstName}_${user.lastName}_CV.pdf`.split(" ").join("_");
      await api.downloadMyCv(filename);
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
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
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setEditProfileOpen(true)}>
                  <Edit className="h-4 w-4 mr-1" /> Edit Profile
                </Button>
                <Button onClick={handleDownloadCv}>
                  <Download className="h-4 w-4 mr-1" /> Download CV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABS */}
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

          {/* OVERVIEW */}
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

          {/* EXPERIENCE */}
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

          {/* EDUCATION */}
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

          {/* SKILLS */}
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

          {/* CERTIFICATIONS */}
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

          {/* PROJECTS */}
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

          {/* LANGUAGES */}
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

          {/* SETTINGS */}
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
      </div>

      {/* DIALOGS */}
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

      {confirmNode}
    </div>
  );
};

/* ============================================================
   SETTINGS TAB
============================================================ */
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
  const [s, setS] = useState<Partial<ProfessionalProfileDetails> & { firstName: string; lastName: string }>({
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
        <Field label="First name"><Input value={s.firstName || ""} onChange={(e) => set("firstName", e.target.value)} /></Field>
        <Field label="Last name"><Input value={s.lastName || ""} onChange={(e) => set("lastName", e.target.value)} /></Field>

        <Field label="Professional headline" full>
          <Input value={s.professionalHeadline || ""} onChange={(e) => set("professionalHeadline", e.target.value)} placeholder="e.g. Senior Product Designer" />
        </Field>

        <Field label="Professional summary" full>
          <Textarea rows={4} value={s.professionalSummary || ""} onChange={(e) => set("professionalSummary", e.target.value)} />
        </Field>

        <Field label="Career objective" full>
          <Textarea rows={3} value={s.careerObjective || ""} onChange={(e) => set("careerObjective", e.target.value)} />
        </Field>

        <Field label="Contact email"><Input type="email" value={s.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} /></Field>
        <Field label="Phone number"><Input value={s.phoneNumber || ""} onChange={(e) => set("phoneNumber", e.target.value)} /></Field>
        <Field label="Location"><Input value={s.currentLocation || ""} onChange={(e) => set("currentLocation", e.target.value)} /></Field>
        <Field label="Nationality"><Input value={s.nationality || ""} onChange={(e) => set("nationality", e.target.value)} /></Field>
        <Field label="Gender"><Input value={s.gender || ""} onChange={(e) => set("gender", e.target.value)} /></Field>
        <Field label="Date of birth"><Input type="date" value={s.dateOfBirth || ""} onChange={(e) => set("dateOfBirth", e.target.value)} /></Field>

        <Field label="Website"><Input type="url" value={s.websiteUrl || ""} onChange={(e) => set("websiteUrl", e.target.value)} /></Field>
        <Field label="LinkedIn"><Input type="url" value={s.linkedinUrl || ""} onChange={(e) => set("linkedinUrl", e.target.value)} /></Field>
        <Field label="GitHub"><Input type="url" value={s.githubUrl || ""} onChange={(e) => set("githubUrl", e.target.value)} /></Field>
        <Field label="Twitter"><Input type="url" value={s.twitterUrl || ""} onChange={(e) => set("twitterUrl", e.target.value)} /></Field>
        <Field label="Portfolio" full><Input type="url" value={s.portfolioUrl || ""} onChange={(e) => set("portfolioUrl", e.target.value)} /></Field>
      </div>
    </FormDialog>
  );
};

/* ============================================================
   EDUCATION DIALOG
============================================================ */
const EducationDialog = ({
  open,
  onOpenChange,
  initial,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: EducationItem;
  submitting?: boolean;
  onSubmit: (p: Partial<EducationItem>) => void;
}) => {
  const [s, setS] = useState<Partial<EducationItem>>({});
  useEffect(() => {
    setS({
      institution: initial?.institution || "",
      degree: initial?.degree || "",
      fieldOfStudy: initial?.fieldOfStudy || "",
      location: initial?.location || "",
      startDate: toDateInput(initial?.startDate),
      endDate: toDateInput(initial?.endDate),
      isCurrent: initial?.isCurrent || false,
      description: initial?.description || "",
      sortOrder: initial?.sortOrder ?? 0,
    });
  }, [open, initial]);
  const set = (k: string, v: any) => setS((p) => ({ ...p, [k]: v }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Edit Education" : "Add Education"}
      submitting={submitting}
      onSubmit={() => {
        if (!s.institution) return;
        onSubmit(s);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Institution *" full>
          <Input required value={s.institution || ""} onChange={(e) => set("institution", e.target.value)} />
        </Field>
        <Field label="Degree"><Input value={s.degree || ""} onChange={(e) => set("degree", e.target.value)} /></Field>
        <Field label="Field of study"><Input value={s.fieldOfStudy || ""} onChange={(e) => set("fieldOfStudy", e.target.value)} /></Field>
        <Field label="Location"><Input value={s.location || ""} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Start date"><Input type="date" value={s.startDate || ""} onChange={(e) => set("startDate", e.target.value)} /></Field>
        <Field label="End date"><Input type="date" value={s.endDate || ""} onChange={(e) => set("endDate", e.target.value)} disabled={!!s.isCurrent} /></Field>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Switch checked={!!s.isCurrent} onCheckedChange={(v) => set("isCurrent", v)} />
          <Label className="text-sm">I am currently studying here</Label>
        </div>
        <Field label="Description" full>
          <Textarea rows={3} value={s.description || ""} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </div>
    </FormDialog>
  );
};

/* ============================================================
   WORK DIALOG
============================================================ */
const WorkDialog = ({
  open,
  onOpenChange,
  initial,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: WorkExperienceItem;
  submitting?: boolean;
  onSubmit: (p: Partial<WorkExperienceItem>) => void;
}) => {
  const [s, setS] = useState<any>({});
  useEffect(() => {
    setS({
      companyName: initial?.companyName || "",
      jobTitle: initial?.jobTitle || "",
      location: initial?.location || "",
      employmentType: initial?.employmentType || "",
      startDate: toDateInput(initial?.startDate),
      endDate: toDateInput(initial?.endDate),
      isCurrent: initial?.isCurrent || false,
      description: initial?.description || "",
      achievementsText: (initial?.achievements || []).join("\n"),
      sortOrder: initial?.sortOrder ?? 0,
    });
  }, [open, initial]);
  const set = (k: string, v: any) => setS((p: any) => ({ ...p, [k]: v }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Edit Experience" : "Add Experience"}
      submitting={submitting}
      onSubmit={() => {
        if (!s.companyName || !s.jobTitle) return;
        const { achievementsText, ...rest } = s;
        onSubmit({
          ...rest,
          achievements: (achievementsText || "")
            .split("\n")
            .map((x: string) => x.trim())
            .filter(Boolean),
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Job title *"><Input required value={s.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} /></Field>
        <Field label="Company *"><Input required value={s.companyName} onChange={(e) => set("companyName", e.target.value)} /></Field>
        <Field label="Employment type"><Input value={s.employmentType} onChange={(e) => set("employmentType", e.target.value)} placeholder="Full-time, Contract..." /></Field>
        <Field label="Location"><Input value={s.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Start date"><Input type="date" value={s.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
        <Field label="End date"><Input type="date" value={s.endDate} onChange={(e) => set("endDate", e.target.value)} disabled={!!s.isCurrent} /></Field>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Switch checked={!!s.isCurrent} onCheckedChange={(v) => set("isCurrent", v)} />
          <Label className="text-sm">I currently work here</Label>
        </div>
        <Field label="Description" full><Textarea rows={3} value={s.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Achievements (one per line)" full>
          <Textarea rows={4} value={s.achievementsText} onChange={(e) => set("achievementsText", e.target.value)} />
        </Field>
      </div>
    </FormDialog>
  );
};

/* ============================================================
   SKILL DIALOG
============================================================ */
const SkillDialog = ({
  open,
  onOpenChange,
  initial,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: SkillItem;
  submitting?: boolean;
  onSubmit: (p: Partial<SkillItem>) => void;
}) => {
  const [s, setS] = useState<Partial<SkillItem>>({});
  useEffect(() => {
    setS({
      name: initial?.name || "",
      category: initial?.category || "",
      proficiency: initial?.proficiency || "",
      sortOrder: initial?.sortOrder ?? 0,
    });
  }, [open, initial]);
  const set = (k: string, v: any) => setS((p) => ({ ...p, [k]: v }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Edit Skill" : "Add Skill"}
      submitting={submitting}
      onSubmit={() => s.name && onSubmit(s)}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Skill name *" full><Input required value={s.name || ""} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Category"><Input value={s.category || ""} onChange={(e) => set("category", e.target.value)} /></Field>
        <Field label="Proficiency">
          <Select value={s.proficiency || ""} onValueChange={(v) => set("proficiency", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
              <SelectItem value="Expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </FormDialog>
  );
};

/* ============================================================
   CERTIFICATION DIALOG
============================================================ */
const CertDialog = ({
  open,
  onOpenChange,
  initial,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: CertificationItem;
  submitting?: boolean;
  onSubmit: (p: Partial<CertificationItem>) => void;
}) => {
  const [s, setS] = useState<Partial<CertificationItem>>({});
  useEffect(() => {
    setS({
      title: initial?.title || "",
      issuingOrganization: initial?.issuingOrganization || "",
      issueDate: toDateInput(initial?.issueDate),
      expiryDate: toDateInput(initial?.expiryDate),
      credentialUrl: initial?.credentialUrl || "",
      description: initial?.description || "",
      sortOrder: initial?.sortOrder ?? 0,
    });
  }, [open, initial]);
  const set = (k: string, v: any) => setS((p) => ({ ...p, [k]: v }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Edit Certification" : "Add Certification"}
      submitting={submitting}
      onSubmit={() => s.title && onSubmit(s)}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title *" full><Input required value={s.title || ""} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Issuing organization" full><Input value={s.issuingOrganization || ""} onChange={(e) => set("issuingOrganization", e.target.value)} /></Field>
        <Field label="Issue date"><Input type="date" value={s.issueDate || ""} onChange={(e) => set("issueDate", e.target.value)} /></Field>
        <Field label="Expiry date"><Input type="date" value={s.expiryDate || ""} onChange={(e) => set("expiryDate", e.target.value)} /></Field>
        <Field label="Credential URL" full><Input type="url" value={s.credentialUrl || ""} onChange={(e) => set("credentialUrl", e.target.value)} /></Field>
        <Field label="Description" full><Textarea rows={3} value={s.description || ""} onChange={(e) => set("description", e.target.value)} /></Field>
      </div>
    </FormDialog>
  );
};

/* ============================================================
   PROJECT DIALOG
============================================================ */
const ProjDialog = ({
  open,
  onOpenChange,
  initial,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: ProfileProjectItem;
  submitting?: boolean;
  onSubmit: (p: Partial<ProfileProjectItem>) => void;
}) => {
  const [s, setS] = useState<any>({});
  useEffect(() => {
    setS({
      title: initial?.title || "",
      role: initial?.role || "",
      organization: initial?.organization || "",
      startDate: toDateInput(initial?.startDate),
      endDate: toDateInput(initial?.endDate),
      isCurrent: initial?.isCurrent || false,
      description: initial?.description || "",
      achievementsText: (initial?.achievements || []).join("\n"),
      projectUrl: initial?.projectUrl || "",
      sortOrder: initial?.sortOrder ?? 0,
    });
  }, [open, initial]);
  const set = (k: string, v: any) => setS((p: any) => ({ ...p, [k]: v }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Edit Project" : "Add Project"}
      submitting={submitting}
      onSubmit={() => {
        if (!s.title) return;
        const { achievementsText, ...rest } = s;
        onSubmit({
          ...rest,
          achievements: (achievementsText || "")
            .split("\n")
            .map((x: string) => x.trim())
            .filter(Boolean),
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Project title *" full><Input required value={s.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Role"><Input value={s.role} onChange={(e) => set("role", e.target.value)} /></Field>
        <Field label="Organization"><Input value={s.organization} onChange={(e) => set("organization", e.target.value)} /></Field>
        <Field label="Start date"><Input type="date" value={s.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
        <Field label="End date"><Input type="date" value={s.endDate} onChange={(e) => set("endDate", e.target.value)} disabled={!!s.isCurrent} /></Field>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Switch checked={!!s.isCurrent} onCheckedChange={(v) => set("isCurrent", v)} />
          <Label className="text-sm">Ongoing</Label>
        </div>
        <Field label="Project URL" full><Input type="url" value={s.projectUrl} onChange={(e) => set("projectUrl", e.target.value)} /></Field>
        <Field label="Description" full><Textarea rows={3} value={s.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Achievements (one per line)" full>
          <Textarea rows={4} value={s.achievementsText} onChange={(e) => set("achievementsText", e.target.value)} />
        </Field>
      </div>
    </FormDialog>
  );
};

/* ============================================================
   LANGUAGE DIALOG
============================================================ */
const LangDialog = ({
  open,
  onOpenChange,
  initial,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: LanguageItem;
  submitting?: boolean;
  onSubmit: (p: Partial<LanguageItem>) => void;
}) => {
  const [s, setS] = useState<Partial<LanguageItem>>({});
  useEffect(() => {
    setS({
      language: initial?.language || "",
      proficiency: initial?.proficiency || "",
      sortOrder: initial?.sortOrder ?? 0,
    });
  }, [open, initial]);
  const set = (k: string, v: any) => setS((p) => ({ ...p, [k]: v }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Edit Language" : "Add Language"}
      submitting={submitting}
      onSubmit={() => s.language && onSubmit(s)}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Language *"><Input required value={s.language || ""} onChange={(e) => set("language", e.target.value)} /></Field>
        <Field label="Proficiency">
          <Select value={s.proficiency || ""} onValueChange={(v) => set("proficiency", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Basic">Basic</SelectItem>
              <SelectItem value="Conversational">Conversational</SelectItem>
              <SelectItem value="Fluent">Fluent</SelectItem>
              <SelectItem value="Native">Native</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </FormDialog>
  );
};

export default Profile;
