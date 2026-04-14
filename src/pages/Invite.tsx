import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const Invite = () => {
  const { user, refreshUser, setActiveCompanyId, workspaces } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const params = useParams();
  const [search] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const token = useMemo(() => params.token || search.get("token") || "", [params.token, search]);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const hasAutoAcceptedRef = useRef(false);
  const inviteEmail = useMemo(
    () => (search.get("email") || search.get("inviteEmail") || "").toLowerCase().trim(),
    [search]
  );

  const resolveDashboardRoute = () => {
    if (!user) return "/dashboard";
    return user.role === "executive"
      ? "/dashboard-executive"
      : user.role === "manager"
      ? "/dashboard-manager"
      : user.role === "team_member"
      ? "/dashboard-team_member"
      : "/dashboard-admin";
  };

  const completeWorkspaceJoin = async (companyId?: string) => {
    await refreshUser();
    const fallbackWorkspaceId = workspaces?.[0]?.id;
    const nextCompanyId = companyId || fallbackWorkspaceId || localStorage.getItem("activeCompanyId");
    if (nextCompanyId) {
      setActiveCompanyId(nextCompanyId);
      localStorage.setItem("activeCompanyId", nextCompanyId);
    }
    navigate(resolveDashboardRoute());
  };

  const onAccept = async () => {
    setLoading(true);
    try {
      const res: any = await api.acceptWorkspaceInvite(token as string);
      const cid = res?.data?.company?.id || res?.data?.companyId || res?.companyId;
      await completeWorkspaceJoin(cid);
    } catch (err: any) {
      toast({ title: "Invite failed", description: err?.message || "Try again", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res: any = await api.signupWithInvite({ token: token as string, ...form });
      const cid = res?.data?.company?.id || res?.data?.companyId || res?.companyId;
      await completeWorkspaceJoin(cid);
    } catch (err: any) {
      toast({ title: "Signup failed", description: err?.message || "Try again", variant: "destructive" as any });
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => {
    const shouldAutoAccept =
      !!user &&
      !!token &&
      !!inviteEmail &&
      inviteEmail === (user.email || "").toLowerCase().trim() &&
      !hasAutoAcceptedRef.current;

    if (!shouldAutoAccept) return;
    hasAutoAcceptedRef.current = true;
    onAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, inviteEmail]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid invite</CardTitle>
            <CardDescription>No token provided.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><Link to="/">Go to Login</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Accept workspace invite</CardTitle>
            <CardDescription>Join the workspace with your existing account</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={onAccept} disabled={loading}>{loading ? "Accepting..." : "Accept Invite"}</Button>
            <Button variant="outline" asChild><Link to="/">Back to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Join workspace</CardTitle>
          <CardDescription>Create your account to accept the invite</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSignup}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First name</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div>
                <Label>Last name</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <Button type="submit" disabled={formLoading}>{formLoading ? "Creating..." : "Create account & join"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invite;
