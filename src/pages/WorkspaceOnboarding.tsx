import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WorkspaceOnboarding = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("create");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [companyCode, setCompanyCode] = useState("");
  const [resolvedWorkspace, setResolvedWorkspace] = useState<string | null>(null);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        name: name.trim(),
        industry: industry ? industry : undefined,
        size: size ? size : undefined,
      } as { name: string; industry?: string; size?: string };
      const res: any = await api.createWorkspace(payload);
      const companyId = res?.data?.company?.id || res?.data?.companyId || res?.companyId;
      const wsRes: any = await api.getWorkspaces();
      localStorage.setItem("workspaces_cache", JSON.stringify(wsRes?.data?.workspaces || []));
      if (companyId) {
        localStorage.setItem("activeCompanyId", companyId);
        window.location.reload();
        return;
      }
      toast({ title: "Workspace created", description: "Reloading..." });
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Create workspace failed", description: err?.message || "Try again", variant: "destructive" as any });
    } finally {
      setCreating(false);
    }
  };

  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    try {
      if (!resolvedWorkspace) {
        const res: any = await api.resolveWorkspaceCode(companyCode.trim());
        setResolvedWorkspace(res?.data?.workspace?.name || "Workspace");
        return;
      }
      const res: any = await api.requestWorkspaceJoin(companyCode.trim());
      toast({ title: "Request sent", description: res?.message || `Your request to join ${resolvedWorkspace} has been sent for approval.` });
    } catch (err: any) {
      toast({ title: "Join request failed", description: err?.message || "Check the company code and try again", variant: "destructive" as any });
    } finally {
      setJoining(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Set up your workspace</h2>
          <p className="text-muted-foreground">Create a new workspace or request to join using its company code.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="create">Create workspace</TabsTrigger>
            <TabsTrigger value="join">Join a Workspace</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create workspace</CardTitle>
                <CardDescription>Enter a name. Industry and size are optional.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={onCreate}>
                  <div>
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Industry</Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SaaS">SaaS</SelectItem>
                          <SelectItem value="E-commerce">E-commerce</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Healthcare">Healthcare</SelectItem>
                          <SelectItem value="Technology">Technology</SelectItem>
                          <SelectItem value="Real Estate">Real Estate</SelectItem>
                          <SelectItem value="Consulting">Consulting</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Company Size</Label>
                      <Select value={size} onValueChange={setSize}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10</SelectItem>
                          <SelectItem value="11-50">11-50</SelectItem>
                          <SelectItem value="51-200">51-200</SelectItem>
                          <SelectItem value="201-500">201-500</SelectItem>
                          <SelectItem value="500+">500+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={creating}>{creating ? "Creating..." : "Create workspace"}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card>
              <CardHeader>
                <CardTitle>Join a Workspace</CardTitle>
                <CardDescription>Enter the company code shared by the workspace owner.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={onJoin}>
                  <div>
                    <Label>Company Code</Label>
                    <Input value={companyCode} onChange={(e) => { setCompanyCode(e.target.value.toUpperCase()); setResolvedWorkspace(null); }} placeholder="RICHIE-5WMZ" required />
                    <p className="text-xs text-muted-foreground mt-1">Example: RICHIE-5WMZ</p>
                  </div>
                  {resolvedWorkspace && <p className="rounded-md border p-3 font-medium">{resolvedWorkspace}</p>}
                  <Button type="submit" disabled={joining}>{joining ? "Please wait..." : resolvedWorkspace ? "Request to Join" : "Find Workspace"}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default WorkspaceOnboarding;
