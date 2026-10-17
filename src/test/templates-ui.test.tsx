import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), archive: vi.fn(), restore: vi.fn(), preview: vi.fn(), inst: vi.fn(), saveAs: vi.fn(),
  team: vi.fn(), teams: vi.fn(), customFields: vi.fn(), toast: vi.fn(), navigate: vi.fn(),
}));

vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    statusCode: number; status = "error"; body: any;
    constructor(message: string, statusCode: number, body?: any) { super(message); this.statusCode = statusCode; this.body = body; }
  }
  return {
    ApiError,
    api: {
      listTemplates: h.list, getTemplate: h.get, createTemplate: h.create, updateTemplate: h.update, archiveTemplate: h.archive, restoreTemplate: h.restore,
      previewTemplate: h.preview, instantiateTemplate: h.inst, saveTaskAsTemplate: h.saveAs, getCompanyTeam: h.team, listTeams: h.teams, listCustomFields: h.customFields,
    },
  };
});
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: "manager" }) }));
vi.mock("react-router-dom", async (orig) => ({ ...(await orig<any>()), useNavigate: () => h.navigate }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));

import { ApiError } from "../lib/api";
import Templates from "../pages/Templates";
import UseTemplateDialog from "../components/templates/UseTemplateDialog";
import SaveAsTemplateDialog from "../components/templates/SaveAsTemplateDialog";
import TemplateEditorDialog from "../components/templates/TemplateEditorDialog";
import { blankProjectBody, blankTaskBody, projectTaskDefaults } from "../lib/templateForm";

const summary = (over: any = {}) => ({
  id: "t1", type: "task", scope: "workspace", name: "Weekly report", description: null, category: null, status: "active", currentVersion: 2,
  createdAt: "", updatedAt: "", archivedAt: null, canManage: true, summary: { taskCount: 1, subtaskCount: 0, dependencyCount: 0, hasRecurrence: false }, ...over,
});
const detail = (over: any = {}) => {
  const body = blankTaskBody(); body.task.title = "Weekly report";
  return { ...summary(), body, versions: [{ version: 1 }, { version: 2 }], ...over };
};
const wrap = (ui: any) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);

beforeEach(() => {
  for (const m of Object.values(h)) (m as any).mockReset();
  h.team.mockResolvedValue({ data: { members: [] } });
  h.teams.mockResolvedValue({ data: { teams: [] } });
  h.customFields.mockResolvedValue({ data: { definitions: [] } });
});

describe("Templates page", () => {
  it("lists task templates, switches to project templates and shows management controls to managers", async () => {
    h.list.mockImplementation(async ({ type }: any) => ({ data: { templates: type === "task" ? [summary()] : [summary({ id: "p1", type: "project", name: "Onboarding" })] } }));
    wrap(<Templates />);
    expect(await screen.findByText("Weekly report")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Weekly report" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive Weekly report" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Project Templates" }));
    expect(await screen.findByText("Onboarding")).toBeInTheDocument();
    expect(h.list).toHaveBeenLastCalledWith({ type: "project", status: "active" });
  });

  it("plain members see Use template but no management controls", async () => {
    h.list.mockResolvedValue({ data: { templates: [summary({ canManage: false })] } });
    wrap(<Templates />);
    expect(await screen.findByRole("button", { name: /Use template/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit Weekly report/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Archive Weekly report/ })).toBeNull();
  });

  it("archives, and archived templates offer Restore (no Use) with a name-conflict message on 409", async () => {
    h.list.mockResolvedValue({ data: { templates: [summary({ status: "archived" })] } });
    h.restore.mockRejectedValue(new (ApiError as any)("conflict", 409, {}));
    wrap(<Templates />);
    await userEvent.click(await screen.findByLabelText("Show archived"));
    expect(h.list).toHaveBeenLastCalledWith({ type: "task", status: "all" });
    expect(screen.queryByRole("button", { name: /Use template/ })).toBeNull();
    await userEvent.click(await screen.findByRole("button", { name: "Restore Weekly report" }));
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Name already in use" })));
  });

  it("archive calls the API and refreshes", async () => {
    h.list.mockResolvedValue({ data: { templates: [summary()] } });
    h.archive.mockResolvedValue({ data: {} });
    wrap(<Templates />);
    await userEvent.click(await screen.findByRole("button", { name: "Archive Weekly report" }));
    await waitFor(() => expect(h.archive).toHaveBeenCalledWith("t1"));
  });

  it("shows a safe message when templates are unavailable (503)", async () => {
    h.list.mockRejectedValue(new (ApiError as any)("down", 503, {}));
    wrap(<Templates />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/aren't available/i);
  });

  it("shows version indication and a version history note in the preview", async () => {
    h.list.mockResolvedValue({ data: { templates: [summary()] } });
    h.get.mockResolvedValue({ data: { template: detail() } });
    wrap(<Templates />);
    expect(await screen.findByText(/v2/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Weekly report" }));
    expect(await screen.findByText(/2 version\(s\) saved/)).toBeInTheDocument();
  });
});

describe("UseTemplateDialog", () => {
  const okPreview = (over: any = {}) => ({ data: { ok: true, errors: [], warnings: [], requiresDefaultDueTime: false, plan: { type: "task", nodes: [], summary: {}, projectMembers: [], recurrence: null }, ...over } });

  it("asks for a default due time when a node has an offset without a time, and never submits without it", async () => {
    const body = blankProjectBody(); body.project.name = "Onboarding";
    const node = projectTaskDefaults("a", 0); node.title = "Kickoff"; node.dueOffsetDays = 2; body.tasks = [node];
    h.get.mockResolvedValue({ data: { template: detail({ type: "project", body }) } });
    h.preview.mockResolvedValue(okPreview());
    h.inst.mockResolvedValue({ data: { replayed: false, projectId: "p9" } });
    const done = vi.fn();
    wrap(<UseTemplateDialog open onOpenChange={() => {}} template={{ id: "t1", type: "project", name: "Onboarding" }} onDone={done} />);
    const submit = await screen.findByRole("button", { name: "Create project" });
    await screen.findByLabelText("Default due time");
    await waitFor(() => expect(h.preview).toHaveBeenCalled());
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Default due time"), "10:30");
    await waitFor(() => expect(submit).toBeEnabled(), { timeout: 3000 });
    await userEvent.click(submit);
    await waitFor(() => expect(h.inst).toHaveBeenCalled());
    const sent = h.inst.mock.calls[0][1];
    expect(sent.defaultDueTime).toBe("10:30");
    expect(sent.timezone).toBeTruthy();
    expect(sent.idempotencyKey).toBeTruthy();
    expect(done).toHaveBeenCalled();
  });

  it("blocking errors disable submit and are shown", async () => {
    h.get.mockResolvedValue({ data: { template: detail() } });
    h.preview.mockResolvedValue(okPreview({ ok: false, errors: [{ code: "ASSIGN_PERMISSION_REQUIRED", message: "You can't assign others" }] }));
    wrap(<UseTemplateDialog open onOpenChange={() => {}} template={{ id: "t1", type: "task", name: "Weekly report" }} onDone={() => {}} />);
    const errs = await screen.findByTestId("plan-errors");
    expect(within(errs).getByText(/can't assign others/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create task" })).toBeDisabled();
  });

  it("warnings require acceptance before submit, and a retry reuses the same idempotency key", async () => {
    h.get.mockResolvedValue({ data: { template: detail() } });
    h.preview.mockResolvedValue(okPreview({ warnings: [{ code: "ASSIGNEE_STALE", message: "Alex left", key: "root" }] }));
    h.inst.mockRejectedValueOnce(new (ApiError as any)("network", 500, {})).mockResolvedValueOnce({ data: { replayed: true } });
    wrap(<UseTemplateDialog open onOpenChange={() => {}} template={{ id: "t1", type: "task", name: "Weekly report" }} onDone={() => {}} />);
    const submit = await screen.findByRole("button", { name: "Create task" });
    await screen.findByTestId("plan-warnings");
    await waitFor(() => expect(h.preview).toHaveBeenCalled());
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByLabelText("Accept warnings"));
    await waitFor(() => expect(submit).toBeEnabled(), { timeout: 3000 });
    await userEvent.click(submit);
    await screen.findByTestId("use-failure");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));
    await waitFor(() => expect(h.inst).toHaveBeenCalledTimes(2));
    expect(h.inst.mock.calls[0][1].idempotencyKey).toBe(h.inst.mock.calls[1][1].idempotencyKey);
    expect(h.inst.mock.calls[1][1].acceptWarnings).toBe(true);
  });

  it("required custom-field planner input clears the blocker and is sent to instantiate", async () => {
    const fieldId = "b1000000-0000-4000-8000-000000000001";
    h.customFields.mockImplementation(async (type: string) => ({ data: { definitions: type === "task" ? [
      { id: fieldId, companyId: "ws", entityType: "task", fieldType: "text", name: "Region", status: "active", isRequired: true, position: 0, options: [] },
    ] : [] } }));
    h.get.mockResolvedValue({ data: { template: detail() } });
    h.preview.mockImplementation(async (_id: string, input: any) => input.customFields?.tasks?.root?.[fieldId]
      ? okPreview({ plan: { type: "task", nodes: [{ key: "root", title: "Weekly report", assignees: [], dependsOn: [], customFields: { [fieldId]: input.customFields.tasks.root[fieldId] } }], summary: { taskCount: 1, subtaskCount: 0, dependencyCount: 0 }, projectMembers: [], recurrence: null } })
      : okPreview({ ok: false, errors: [{ code: "REQUIRED_CUSTOM_FIELD_MISSING", fieldId, fieldName: "Region", key: "root", message: "Region is required" }] }));
    h.inst.mockResolvedValue({ data: { replayed: false, taskIds: { root: "created" } } });
    wrap(<UseTemplateDialog open onOpenChange={() => {}} template={{ id: "t1", type: "task", name: "Weekly report" }} onDone={() => {}} />);
    expect(await screen.findByTestId("plan-errors")).toHaveTextContent("Region is required");
    expect(await screen.findByLabelText("Region")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create task" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Region"), "North");
    await waitFor(() => expect(screen.getByRole("button", { name: "Create task" })).toBeEnabled(), { timeout: 3000 });
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));
    await waitFor(() => expect(h.inst).toHaveBeenCalled());
    expect(h.inst.mock.calls[0][1].customFields.tasks.root[fieldId]).toBe("North");
  });
});

describe("SaveAsTemplateDialog", () => {
  it("sends only the opt-ins the user ticked (all off by default)", async () => {
    h.saveAs.mockResolvedValue({ data: { template: { id: "n1", name: "My tpl" } } });
    wrap(<SaveAsTemplateDialog open onOpenChange={() => {}} taskId="task1" taskTitle="My tpl" hasDueDate isRecurring={false} />);
    expect(screen.getByLabelText("Include repeat schedule")).toBeDisabled();
    await userEvent.click(screen.getByLabelText("Keep assignees"));
    await userEvent.click(screen.getByRole("button", { name: "Save template" }));
    await waitFor(() => expect(h.saveAs).toHaveBeenCalled());
    expect(h.saveAs.mock.calls[0][0]).toBe("task1");
    expect(h.saveAs.mock.calls[0][1].options).toEqual({ keepAssignees: true, deriveDueOffsets: false, includeRecurrence: false, includeCustomFieldValues: false });
    await userEvent.click(screen.getByLabelText("Include custom field values"));
    await userEvent.click(screen.getByRole("button", { name: "Save template" }));
    await waitFor(() => expect(h.saveAs).toHaveBeenCalledTimes(2));
    expect(h.saveAs.mock.calls[1][1].options.includeCustomFieldValues).toBe(true);
  });
});

describe("TemplateEditorDialog", () => {
  it("task template editor has a recurrence control; project template editor has none", async () => {
    const { unmount } = wrap(<TemplateEditorDialog open onOpenChange={() => {}} type="task" onSaved={() => {}} />);
    expect(await screen.findByLabelText("Repeat this task")).toBeInTheDocument();
    unmount();
    wrap(<TemplateEditorDialog open onOpenChange={() => {}} type="project" onSaved={() => {}} />);
    await screen.findByLabelText("Project name");
    expect(screen.queryByLabelText("Repeat this task")).toBeNull();
    expect(screen.queryByText(/repeat/i)).toBeNull();
  });

  it("editing sends expectedVersion and shows a version conflict", async () => {
    h.update.mockRejectedValue(new (ApiError as any)("stale", 409, { code: "VERSION_CONFLICT", currentVersion: 5 }));
    const d: any = detail();
    wrap(<TemplateEditorDialog open onOpenChange={() => {}} type="task" template={d} onSaved={() => {}} />);
    await userEvent.click(await screen.findByRole("button", { name: "Save as new version" }));
    await waitFor(() => expect(h.update).toHaveBeenCalled());
    expect(h.update.mock.calls[0][1].expectedVersion).toBe(2);
    expect(await screen.findByTestId("template-errors")).toHaveTextContent(/version/i);
  });

  it("task Template Editor saves active template-safe custom values in schema v2 and excludes user/datetime", async () => {
    h.customFields.mockImplementation(async (entityType: string) => ({ data: { definitions: entityType === "task" ? [
      { id: "field-region", companyId: "ws", entityType: "task", fieldType: "text", name: "Region", status: "active", isRequired: false, position: 0, options: [] },
      { id: "field-user", companyId: "ws", entityType: "task", fieldType: "user", name: "Reviewer", status: "active", isRequired: false, position: 1, options: [] },
      { id: "field-datetime", companyId: "ws", entityType: "task", fieldType: "datetime", name: "Start", status: "active", isRequired: false, position: 2, options: [] },
    ] : [] } }));
    h.create.mockResolvedValue({ data: { template: { id: "new", name: "Weekly", currentVersion: 1 } } });
    wrap(<TemplateEditorDialog open onOpenChange={() => {}} type="task" onSaved={() => {}} />);
    await userEvent.type(await screen.findByLabelText("Template name"), "Weekly");
    await userEvent.type(await screen.findByLabelText("Region"), "North");
    expect(screen.queryByLabelText("Reviewer")).toBeNull();
    expect(screen.queryByLabelText("Start")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Create template" }));
    await waitFor(() => expect(h.create).toHaveBeenCalled());
    const body = h.create.mock.calls[0][0].body;
    expect(body.schemaVersion).toBe(2);
    expect(body.task.customFields).toEqual({ "field-region": "North" });
    expect(body.task.customFields).not.toHaveProperty("field-user");
    expect(body.task.customFields).not.toHaveProperty("field-datetime");
  });
});

describe("post-use navigation", () => {
  const okPreview = { data: { ok: true, errors: [], warnings: [], requiresDefaultDueTime: false, plan: { type: "task", nodes: [], summary: {}, projectMembers: [], recurrence: null } } };
  async function useFromPage(type: "task" | "project", instResult: any | Error) {
    const body = type === "project" ? (() => { const b = blankProjectBody(); b.project.name = "Onboarding"; return b; })() : blankTaskBody();
    if (type === "task") (body as any).task.title = "Weekly report";
    h.list.mockResolvedValue({ data: { templates: [summary({ type })] } });
    h.get.mockResolvedValue({ data: { template: detail({ type, body }) } });
    h.preview.mockResolvedValue(okPreview);
    if (instResult instanceof Error) h.inst.mockRejectedValue(instResult); else h.inst.mockResolvedValue({ data: instResult });
    wrap(<Templates />);
    if (type === "project") await userEvent.click(await screen.findByRole("tab", { name: "Project Templates" }));
    await userEvent.click(await screen.findByRole("button", { name: /Use template/ }));
    const submit = await screen.findByRole("button", { name: type === "project" ? "Create project" : "Create task" });
    await waitFor(() => expect(submit).toBeEnabled(), { timeout: 3000 });
    await userEvent.click(submit);
  }
  const base = { instantiationId: "i1", templateId: "t1", templateVersion: 2, summary: {} };

  it("task template: opens the created task's canonical detail route, never /tasks", async () => {
    await useFromPage("task", { ...base, replayed: false, projectId: null, taskIds: { root: "task-123" } });
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith("/task-details/task-123"));
    expect(h.navigate).not.toHaveBeenCalledWith("/tasks");
  });

  it("an idempotent replay navigates to the SAME task", async () => {
    await useFromPage("task", { ...base, replayed: true, projectId: null, taskIds: { root: "task-123" } });
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith("/task-details/task-123"));
    expect(h.navigate).toHaveBeenCalledTimes(1);
  });

  it("a failed instantiation does not navigate", async () => {
    await useFromPage("task", new (ApiError as any)("boom", 500, {}));
    await screen.findByTestId("use-failure");
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it("project template (first run and replay) opens the project", async () => {
    await useFromPage("project", { ...base, replayed: false, projectId: "proj-9", taskIds: {} });
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith("/projects/proj-9"));
  });

  it("project replay opens the same project", async () => {
    await useFromPage("project", { ...base, replayed: true, projectId: "proj-9", taskIds: {} });
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith("/projects/proj-9"));
  });

  it("a success without the expected id falls back to an existing page and says so", async () => {
    await useFromPage("task", { ...base, replayed: false, projectId: null, taskIds: {} });
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith("/templates"));
    expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Task created" }));
  });
});

describe("route regression", () => {
  it("no template-use code navigates to the undefined /tasks route; every destination is a defined route", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const files = ["src/pages/Templates.tsx", "src/pages/Projects.tsx", "src/components/CreateTaskDialog.tsx", "src/lib/templateForm.ts",
      ...readdirSync("src/components/templates").map((f) => `src/components/templates/${f}`)];
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/navigate\(\s*["'`]\/tasks["'`]/);
    const app = readFileSync("src/App.tsx", "utf8");
    for (const route of ['path="/task-details/:id"', 'path="/projects/:id"', 'path="/templates"', 'path="/projects"']) expect(app).toContain(route);
  });
});
