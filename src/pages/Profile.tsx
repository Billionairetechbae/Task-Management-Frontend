// src/pages/Profile.tsx
import { useEffect, useMemo, useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Label } from "@/components/ui/label";
import {
  Upload,
  Edit,
  MapPin,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Github,
  Twitter,
  Building2,
  User as UserIcon,
  Loader2,
  Crown,
  ShieldCheck,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  Briefcase,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  api,
  ProfessionalProfileBundle,
  ProfessionalProfileDetails,
  WorkspaceItem,
  WorkspaceRole,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/* ─────────────────────────── helpers ─────────────────────────── */

const toDateInput = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const fmtDate = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
};

const ROLE_META: Record<WorkspaceRole, { label: string; icon: typeof Crown; colour: string }> = {
  owner:   { label: "Owner",   icon: Crown,       colour: "bg-yellow-500/10 text-yellow-600 border-yellow-300/50" },
  admin:   { label: "Admin",   icon: ShieldCheck, colour: "bg-purple-500/10 text-purple-600 border-purple-300/50" },
  manager: { label: "Manager", icon: Briefcase,   colour: "bg-blue-500/10   text-blue-600   border-blue-300/50"   },
  member:  { label: "Member",  icon: Users,       colour: "bg-green-500/10  text-green-600  border-green-300/50"  },
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="mt-1">{children}</div>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground text-right">{value}</span>
  </div>
);

/* ─────────────────────────── confirm hook ──────────────────────── */

const useConfirm = () => {
  const [state, setState] = useState<{ open: boolean; onOk?: () => void; label?: string }>({ open: false });
  const confirm = (label: string, onOk: () => void) => setState({ open: true, onOk, label });
  const node = (
    <AlertDialog open={state.open} onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this {state.label}?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => { state.onOk?.(); setState({ open: false }); }}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { confirm, node };
};

/* ─────────────────────────── form dialog ──────────────────────── */

const FormDialog = ({
  open, onOpenChange, title, onSubmit, submitting, children,
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
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
        {children}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

/* ─────────────────────────── workspace card ───────────────────── */

const WorkspaceCard = ({
  ws,
  isActive,
}: {
  ws: WorkspaceItem;
  isActive: boolean;
}) => {
  const meta = ROLE_META[ws.role] ?? ROLE_META.member;
  const RoleIcon = meta.icon;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 transition-all",
        isActive
          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card hover:border-border/80"
      )}
    >
      {/* logo / initials */}
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary overflow-hidden">
        {ws.company?.name?.[0]?.toUpperCase() ?? "W"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm truncate">
            {ws.company?.name || ws.company?.companyCode || "Workspace"}
          </p>
          {isActive && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          )}
        </div>

        {ws.company?.industry && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{ws.company.industry}</p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium border rounded-full px-2 py-0.5", meta.colour)}>
            <RoleIcon className="w-3 h-3" />
            {meta.label}
          </span>

          <span className={cn(
            "inline-flex items-center gap-1 text-[10px] border rounded-full px-2 py-0.5",
            ws.status === "active"
              ? "bg-green-500/10 text-green-600 border-green-300/50"
              : "bg-muted text-muted-foreground border-border"
          )}>
            {ws.status === "active"
              ? <><CheckCircle2 className="w-2.5 h-2.5" /> Active member</>
              : <><Clock className="w-2.5 h-2.5" /> {ws.status}</>}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */

const Profile = ({ embedded = false }: { embedded?: boolean }) => {
  const { user, refreshUser, setUser } = useAuth();
  const { toast } = useToast();
  const { confirm, node: confirmNode } = useConfirm();

  const [bundle, setBundle]       = useState<ProfessionalProfileBundle | null>(null);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [wsLoading, setWsLoading]   = useState(false);

  const [editOpen, setEditOpen] = useState(false);

  const activeCompanyId = useMemo(() => localStorage.getItem("activeCompanyId") ?? "", []);

  /* ── load profile ── */
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

  /* ── load all workspaces ── */
  const loadWorkspaces = async () => {
    try {
      setWsLoading(true);
      const res = await api.getMyWorkspaces();
      const list: WorkspaceItem[] =
        (res as any)?.data?.workspaces ||
        (res as any)?.data?.data?.workspaces ||
        (res as any)?.workspaces ||
        [];
      setWorkspaces(list);
    } catch {
      // soft-fail
    } finally {
      setWsLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const profile = bundle?.profile ?? ({} as ProfessionalProfileDetails);

  /* ── profile picture upload ── */
  const handleUploadPicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 2 MB", variant: "destructive" });
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

  /* ── generic mutation wrapper ── */
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

  /* ── loading skeleton ── */
  if (loading && !bundle) {
    return (
      <div className={embedded ? "" : "min-h-screen bg-muted/30 py-12 px-4"}>
        <div className="w-full space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── active workspace info ── */
  const activeWs  = workspaces.find((w) => w.companyId === activeCompanyId);
  const otherWs   = workspaces.filter((w) => w.companyId !== activeCompanyId);

  /* ── social / contact links to show ── */
  const socialLinks = [
    { href: profile.linkedinUrl,  Icon: Linkedin, label: "LinkedIn"  },
    { href: profile.githubUrl,    Icon: Github,   label: "GitHub"    },
    { href: profile.twitterUrl,   Icon: Twitter,  label: "Twitter"   },
    { href: profile.websiteUrl,   Icon: Globe,    label: "Website"   },
  ].filter((l) => !!l.href);

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-muted/30 py-10 px-4 sm:px-6"}>
      <div className="w-full space-y-6">

        {/* ── Hero card ── */}
        <Card className="rounded-2xl overflow-hidden border-none shadow-sm">
          {/* Banner */}
          <div className="h-28 bg-gradient-to-r from-primary/25 via-primary/10 to-accent/25 relative" />

          <CardContent className="p-5 sm:p-6 -mt-14">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              {/* Avatar + name */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {user.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-background shadow-md flex items-center justify-center text-2xl font-bold text-primary select-none">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                  )}
                  <label
                    htmlFor="pp-input"
                    className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow hover:bg-primary/90 transition-colors"
                    title="Upload profile picture"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </label>
                  <input id="pp-input" type="file" accept="image/*" className="hidden" onChange={handleUploadPicture} disabled={uploading} />
                </div>

                {/* Name / headline / badges */}
                <div className="space-y-1.5 pb-1">
                  <h1 className="text-2xl font-bold leading-tight">
                    {user.firstName} {user.lastName}
                  </h1>

                  {profile.professionalHeadline && (
                    <p className="text-sm text-muted-foreground">{profile.professionalHeadline}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant="secondary" className="gap-1 capitalize">
                      <UserIcon className="h-3 w-3" />
                      {String(user.role).replace("_", " ")}
                    </Badge>
                    {activeWs && (
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        {activeWs.company?.name || "Workspace"}
                        {" · "}
                        <span className="capitalize">{activeWs.role}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit button */}
              <Button variant="outline" onClick={() => setEditOpen(true)} className="shrink-0 self-end sm:self-auto">
                <Edit className="h-4 w-4 mr-1.5" /> Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Two-column layout on md+ ── */}
        <div className="grid gap-5 md:grid-cols-2">

          {/* LEFT ── Contact & about */}
          <div className="space-y-5">

            {/* Contact info */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Contact information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Email" value={profile.contactEmail || user.email || "—"} />
                <InfoRow
                  label="Phone"
                  value={
                    profile.phoneNumber
                      ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{profile.phoneNumber}</span>
                      : <span className="text-muted-foreground">—</span>
                  }
                />
                <InfoRow
                  label="Location"
                  value={
                    profile.currentLocation
                      ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.currentLocation}</span>
                      : <span className="text-muted-foreground">—</span>
                  }
                />
                <InfoRow label="Gender"      value={profile.gender      || <span className="text-muted-foreground">—</span>} />
                <InfoRow label="Nationality" value={profile.nationality || <span className="text-muted-foreground">—</span>} />
                {profile.dateOfBirth && (
                  <InfoRow label="Date of birth" value={fmtDate(profile.dateOfBirth)} />
                )}
              </CardContent>
            </Card>

            {/* Social links */}
            {socialLinks.length > 0 && (
              <Card className="rounded-xl shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {socialLinks.map(({ href, Icon, label }) => (
                    <a
                      key={label}
                      href={href!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-1.5 hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Professional summary */}
            {(profile.professionalSummary || profile.careerObjective) && (
              <Card className="rounded-xl shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-primary" />
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {profile.professionalSummary && (
                    <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {profile.professionalSummary}
                    </p>
                  )}
                  {profile.careerObjective && (
                    <>
                      {profile.professionalSummary && <Separator />}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Career objective</p>
                        <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{profile.careerObjective}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT ── Workspaces */}
          <div className="space-y-5">

            {/* Active workspace */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Active workspace
                </CardTitle>
              </CardHeader>
              <CardContent>
                {wsLoading ? (
                  <Skeleton className="h-20 w-full rounded-xl" />
                ) : activeWs ? (
                  <WorkspaceCard ws={activeWs} isActive />
                ) : (
                  <p className="text-sm text-muted-foreground py-2">No active workspace selected.</p>
                )}
              </CardContent>
            </Card>

            {/* Other workspaces */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  All workspaces
                  {workspaces.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{workspaces.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {wsLoading ? (
                  <>
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </>
                ) : workspaces.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">You haven't joined any workspaces yet.</p>
                ) : (
                  <>
                    {activeWs && <WorkspaceCard ws={activeWs} isActive />}
                    {otherWs.length > 0 && (
                      <>
                        {activeWs && (
                          <div className="flex items-center gap-2 pt-1">
                            <Separator className="flex-1" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Other workspaces</span>
                            <Separator className="flex-1" />
                          </div>
                        )}
                        {otherWs.map((ws) => (
                          <WorkspaceCard key={ws.companyId} ws={ws} isActive={false} />
                        ))}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      {/* ── Edit profile dialog ── */}
      <ProfileEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
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
            () => setEditOpen(false)
          )
        }
      />

      {confirmNode}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PROFILE EDIT DIALOG
═══════════════════════════════════════════════════════════════ */

const ProfileEditDialog = ({
  open, onOpenChange, initial, user, submitting, onSubmit,
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

        <Field label="Professional headline">
          <Input
            value={s.professionalHeadline || ""}
            onChange={(e) => set("professionalHeadline", e.target.value)}
            placeholder="e.g. Senior Product Designer"
            className="col-span-2"
          />
        </Field>

        <Field label="Contact email">
          <Input type="email" value={s.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} />
        </Field>
        <Field label="Phone number">
          <Input value={s.phoneNumber || ""} onChange={(e) => set("phoneNumber", e.target.value)} />
        </Field>
        <Field label="Location">
          <Input value={s.currentLocation || ""} onChange={(e) => set("currentLocation", e.target.value)} />
        </Field>
        <Field label="Nationality">
          <Input value={s.nationality || ""} onChange={(e) => set("nationality", e.target.value)} />
        </Field>
        <Field label="Gender">
          <Input value={s.gender || ""} onChange={(e) => set("gender", e.target.value)} />
        </Field>
        <Field label="Date of birth">
          <Input type="date" value={s.dateOfBirth || ""} onChange={(e) => set("dateOfBirth", e.target.value)} />
        </Field>

        <div className="sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Professional summary</Label>
          <textarea
            rows={3}
            value={(s as any).professionalSummary || ""}
            onChange={(e) => set("professionalSummary", e.target.value)}
            placeholder="A brief professional bio…"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <Field label="LinkedIn URL">
          <Input type="url" value={s.linkedinUrl || ""} onChange={(e) => set("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/in/…" />
        </Field>
        <Field label="GitHub URL">
          <Input type="url" value={s.githubUrl || ""} onChange={(e) => set("githubUrl", e.target.value)} placeholder="https://github.com/…" />
        </Field>
        <Field label="Twitter / X URL">
          <Input type="url" value={s.twitterUrl || ""} onChange={(e) => set("twitterUrl", e.target.value)} placeholder="https://x.com/…" />
        </Field>
        <Field label="Website / Portfolio">
          <Input type="url" value={s.websiteUrl || ""} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://…" />
        </Field>
      </div>
    </FormDialog>
  );
};

export default Profile;
