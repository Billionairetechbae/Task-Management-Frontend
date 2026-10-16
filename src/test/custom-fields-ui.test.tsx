import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getTaskCustomFields: vi.fn(), listCustomFields: vi.fn(), createCustomField: vi.fn(), updateCustomField: vi.fn(),
  previewCustomFieldConfig: vi.fn(), reorderCustomFields: vi.fn(), archiveCustomField: vi.fn(), restoreCustomField: vi.fn(),
  addCustomFieldOption: vi.fn(), updateCustomFieldOption: vi.fn(), archiveCustomFieldOption: vi.fn(), restoreCustomFieldOption: vi.fn(), reorderCustomFieldOptions: vi.fn(),
  createTask: vi.fn(), createProjectTask: vi.fn(), getProjectCustomFields: vi.fn(), createProject: vi.fn(), updateProject: vi.fn(), patchTaskCustomFields: vi.fn(), updateTask: vi.fn(), getTaskById: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ api }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: "manager", user: { role: "user" } }) }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: (key: string) => key !== "assign_workspace_members" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: api.toast }) }));
vi.mock("@/hooks/use-google-integration", () => ({ default: () => ({ data: { connected: false } }) }));
vi.mock("@/components/TeamSelector", () => ({ default: () => <div /> }));
vi.mock("@/components/templates/useTemplateNavigation", () => ({ useTemplateNavigation: () => vi.fn() }));
vi.mock("@/components/templates/UseTemplateFlow", () => ({ default: () => null }));
vi.mock("@/components/tasks/SubtaskList", () => ({ default: () => null }));
vi.mock("@/components/tasks/TaskWatcherSection", () => ({ default: () => null }));
vi.mock("@/components/tasks/TaskActivityTimeline", () => ({ default: () => null }));
vi.mock("@/components/CompanyBadge", () => ({ default: () => null }));

import { CalendarEventPopoverBody } from "@/components/calendar/CalendarEventPopover";
import CustomFieldsForm from "@/components/customFields/CustomFieldsForm";
import CustomFieldsManager from "@/components/customFields/CustomFieldsManager";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import CreateProjectTaskDialog from "@/components/projects/CreateProjectTaskDialog";
import EditProjectDrawer from "@/components/projects/EditProjectDrawer";
import TaskEditDrawer from "@/components/dashboard/TaskEditDrawer";
import type { CalendarEvent } from "@/types/calendar";

const field = (id: string, fieldType: string, extra: Record<string, unknown> = {}) => ({
  id, companyId: "workspace-1", entityType: "task" as const, fieldType: fieldType as any,
  name: id, status: "active" as const, position: 0, isRequired: false, description: null, config: {}, options: [], ...extra,
});

function withQueryClient(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

describe("custom fields UI integration", () => {
  beforeEach(() => api.getTaskCustomFields.mockReset());

  it("template-safe form omits user and datetime fields, labels required fields, and updates values", async () => {
    const onChange = vi.fn();
    const definitions = [
      field("Name", "text", { isRequired: true, description: "Helpful text" }),
      field("Reviewer", "user"), field("Start time", "datetime"), field("Done", "boolean"),
    ] as any;
    function ControlledForm() {
      const [values, setValues] = useState<Record<string, unknown>>({});
      return <CustomFieldsForm entityType="task" templateSafeOnly definitionsOverride={definitions} value={values} onChange={(next) => { onChange(next); setValues(next); }} />;
    }
    render(<ControlledForm />);
    expect(await screen.findByLabelText("Name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Reviewer")).toBeNull();
    expect(screen.queryByLabelText("Start time")).toBeNull();
    expect(screen.getByText("Name *")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Name"), "North");
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ Name: "North" })));
  });

  it("Calendar popover lazily loads up to five populated active fields when mounted", async () => {
    api.getTaskCustomFields.mockResolvedValue({ data: { values: [
      ...Array.from({ length: 7 }, (_, index) => ({ id: `value-${index}`, value: `Value ${index}`, field: { fieldType: "text", name: `Field ${index}`, status: "active", options: [] } })),
      { id: "empty", value: "", field: { fieldType: "text", name: "Empty", status: "active", options: [] } },
      { id: "archived", value: "Old", field: { fieldType: "text", name: "Archived", status: "archived", options: [] } },
    ] } });
    const event: CalendarEvent = {
      id: "event-1", taskId: "task-1", title: "Calendar task", start: "2026-10-19T10:00:00.000Z", end: "2026-10-19T11:00:00.000Z",
      priority: "medium", status: "pending", creator: { id: "creator", firstName: "A", lastName: "B" }, assignees: [], task: { deadline: "2026-10-19T10:00:00.000Z" },
    };
    withQueryClient(<CalendarEventPopoverBody event={event} onOpen={() => undefined} />);
    expect(api.getTaskCustomFields).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Value 4")).toBeInTheDocument();
    expect(screen.queryByText("Value 5")).toBeNull();
    expect(screen.getAllByText(/^Field /)).toHaveLength(5);
    expect(screen.queryByText("Empty")).toBeNull();
    expect(screen.queryByText("Archived")).toBeNull();
  });

  it("field manager switches entity tabs, creates fields, and warns before confirming tightening", async () => {
    const taskField = { ...field("field-region", "text"), config: {}, options: [] } as any;
    const projectField = { ...field("field-budget", "number", { entityType: "project" }), config: {}, options: [] } as any;
    api.listCustomFields.mockImplementation(async (entityType: string) => ({ data: { definitions: entityType === "task" ? [taskField] : [projectField] } }));
    api.createCustomField.mockResolvedValue({ status: "success" });
    api.previewCustomFieldConfig.mockResolvedValue({ data: { existingViolationCount: 12 } });
    api.updateCustomField.mockResolvedValue({ status: "success" });
    window.confirm = vi.fn(() => true);
    window.prompt = vi.fn().mockImplementationOnce(() => "Region updated").mockImplementationOnce(() => "Help text").mockImplementationOnce(() => '{"maxLength":5}').mockImplementationOnce(() => '"North"');
    render(<CustomFieldsManager />);
    expect(await screen.findByText("field-region")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Project fields" }));
    await waitFor(() => expect(api.listCustomFields).toHaveBeenLastCalledWith("project", "all"));
    expect(await screen.findByText("field-budget")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Task fields" }));
    await screen.findByText("field-region");
    const name = screen.getByLabelText("Field name");
    await userEvent.type(name, "New task field");
    await userEvent.click(screen.getByRole("button", { name: "Add field" }));
    expect(api.createCustomField).toHaveBeenCalledWith({ entityType: "task", fieldType: "text", name: "New task field" });
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await waitFor(() => expect(api.previewCustomFieldConfig).toHaveBeenCalledWith("field-region", { maxLength: 5 }));
    expect(window.confirm).toHaveBeenCalledWith("12 existing values do not satisfy this new rule. They will not be changed automatically. Continue?");
    expect(api.updateCustomField).toHaveBeenCalledWith("field-region", expect.objectContaining({ name: "Region updated", description: "Help text", confirmTightening: true }));
  });

  it("field manager handles required/default, reorder, archive/restore, Board visibility, and option lifecycle", async () => {
    const region = { ...field("field-region", "text", { name: "Region", position: 0, isRequired: false, defaultValue: null }), options: [] } as any;
    const stage = { ...field("field-stage", "single_select", { name: "Stage", position: 1, showOnBoard: false }), options: [
      { id: "opt-a", fieldId: "field-stage", label: "Alpha", color: null, position: 0, isActive: true },
      { id: "opt-b", fieldId: "field-stage", label: "Beta", color: null, position: 1, isActive: true },
    ] } as any;
    let fields = [region, stage];
    api.listCustomFields.mockImplementation(async (entityType: string) => ({ data: { definitions: entityType === "task" ? fields.map(f => ({ ...f, options: [...(f.options || [])] })) : [] } }));
    api.previewCustomFieldConfig.mockResolvedValue({ data: { existingViolationCount: 0 } });
    api.updateCustomField.mockImplementation(async (id: string, patch: any) => { Object.assign(fields.find(f => f.id === id)!, patch); return { status: "success" }; });
    api.archiveCustomField.mockImplementation(async (id: string) => { fields.find(f => f.id === id)!.status = "archived"; return { status: "success" }; });
    api.restoreCustomField.mockImplementation(async (id: string) => { fields.find(f => f.id === id)!.status = "active"; return { status: "success" }; });
    api.reorderCustomFields.mockImplementation(async (_entity: string, ids: string[]) => { ids.forEach((id, position) => { fields.find(f => f.id === id)!.position = position; }); return { status: "success" }; });
    api.addCustomFieldOption.mockImplementation(async (_id: string, option: any) => { stage.options.push({ id: "opt-c", fieldId: stage.id, color: null, isActive: true, ...option }); return { status: "success" }; });
    api.updateCustomFieldOption.mockImplementation(async (_id: string, optionId: string, patch: any) => { Object.assign(stage.options.find((o: any) => o.id === optionId), patch); return { status: "success" }; });
    api.archiveCustomFieldOption.mockImplementation(async (_id: string, optionId: string) => { stage.options.find((o: any) => o.id === optionId).isActive = false; return { status: "success" }; });
    api.restoreCustomFieldOption.mockImplementation(async (_id: string, optionId: string) => { stage.options.find((o: any) => o.id === optionId).isActive = true; return { status: "success" }; });
    api.reorderCustomFieldOptions.mockImplementation(async (_id: string, ids: string[]) => { ids.forEach((id, position) => { stage.options.find((o: any) => o.id === id).position = position; }); return { status: "success" }; });
    window.prompt = vi.fn().mockImplementationOnce(() => "Region name").mockImplementationOnce(() => "Pick a region").mockImplementationOnce(() => "{}").mockImplementationOnce(() => '"West"');
    render(<CustomFieldsManager />);
    await screen.findByText("Region");
    const initialRegionRow = screen.getByText("Region").closest("div.py-3")!;
    await userEvent.click(within(initialRegionRow).getByRole("button", { name: "Optional" }));
    await waitFor(() => expect(region.isRequired).toBe(true));
    await userEvent.click(within(screen.getByText("Region").closest("div.py-3")!).getByRole("button", { name: "Edit", exact: true }));
    await waitFor(() => expect(api.updateCustomField).toHaveBeenCalledWith(region.id, expect.objectContaining({ name: "Region name", description: "Pick a region", defaultValue: "West" })));
    expect(api.updateCustomField.mock.calls.at(-1)?.[1]).not.toHaveProperty("fieldType");
    expect(api.updateCustomField.mock.calls.at(-1)?.[1]).not.toHaveProperty("entityType");
    await userEvent.click(screen.getByRole("button", { name: "Show on Board" }));
    await waitFor(() => expect(stage.showOnBoard).toBe(true));
    const stageRow = screen.getByText("Stage").closest("div.py-3")!;
    await userEvent.click(within(stageRow).getByRole("button", { name: "Move up" }));
    await waitFor(() => expect(api.reorderCustomFields).toHaveBeenCalledWith("task", [stage.id, region.id]));
    const regionRow = screen.getByText("Region name").closest("div.py-3")!;
    await userEvent.click(within(regionRow).getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(region.status).toBe("archived"));
    await userEvent.click(await screen.findByRole("button", { name: "Restore" }));
    await waitFor(() => expect(region.status).toBe("active"));

    const currentStageRow = screen.getByText("Stage").closest("div.py-3")!;
    window.prompt = vi.fn().mockReturnValueOnce("Gamma");
    await userEvent.click(within(currentStageRow).getByRole("button", { name: "Add option" }));
    await waitFor(() => expect(stage.options).toHaveLength(3));
    window.prompt = vi.fn().mockImplementationOnce(() => "Alpha renamed").mockImplementationOnce(() => "#123456");
    await userEvent.click(within(screen.getByText("Alpha").closest("div.flex.items-center")!).getByRole("button", { name: "Edit" }));
    await waitFor(() => expect(stage.options[0]).toMatchObject({ label: "Alpha renamed", color: "#123456" }));
    const optionRow = screen.getByText("Beta").closest("div.flex.items-center")!;
    await userEvent.click(within(optionRow).getByRole("button", { name: "↓" }));
    await waitFor(() => expect(api.reorderCustomFieldOptions).toHaveBeenCalled());
    await userEvent.click(within(screen.getByText("Alpha renamed").closest("div.flex.items-center")!).getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(stage.options.find((o: any) => o.id === "opt-a").isActive).toBe(false));
    await userEvent.click(within(screen.getByText("Alpha renamed").closest("div.flex.items-center")!).getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(stage.options.find((o: any) => o.id === "opt-a").isActive).toBe(true));
  });

  it("Create Task and Create Project Task load required fields and submit custom values through their API contracts", async () => {
    const required = field("task-region", "text", { id: "76000000-0000-4000-8000-000000000001", name: "Region", isRequired: true, defaultValue: null }) as any;
    api.listCustomFields.mockResolvedValue({ data: { definitions: [required] } });
    const toast = vi.fn();
    const requestValues: Record<string, unknown>[] = [];
    api.createTask.mockImplementation(async (form: FormData) => {
      const values = JSON.parse(String(form.get("customFields"))); requestValues.push(values);
      if (!values[required.id]) throw new Error("Region is required");
      return { data: { task: { id: "task-created", customFields: values } } };
    });
    const onSuccess = vi.fn();
    const taskDialog = withQueryClient(<CreateTaskDialog open onOpenChange={() => undefined} onSuccess={onSuccess} initialDeadline="2026-11-01T10:00" />);
    expect(await screen.findByText("Region *")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Enter task title"), "Prepare report");
    await userEvent.type(screen.getByPlaceholderText("Describe the task..."), "Details");
    await waitFor(() => expect(document.querySelector('input[type="datetime-local"]')).toHaveValue("2026-11-01T10:00"));
    fireEvent.submit(screen.getByRole("button", { name: "Create Task" }).closest("form")!);
    await waitFor(() => expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error", description: "Region is required" })));
    expect(requestValues).toEqual([{}]);
    expect(onSuccess).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Region"), "West");
    await waitFor(() => expect(screen.getByLabelText("Region")).toHaveValue("West"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Create Task" })).toBeEnabled());
    fireEvent.submit(screen.getByRole("button", { name: "Create Task" }).closest("form")!);
    await waitFor(() => expect(requestValues).toHaveLength(2));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(requestValues[1]).toEqual({ [required.id]: "West" });

    taskDialog.unmount();
    api.createProjectTask.mockResolvedValue({ data: { task: { id: "project-task", customFields: { [required.id]: "East" } } } });
    render(<CreateProjectTaskDialog projectId="project-1" open onOpenChange={() => undefined} onSuccess={() => undefined} />);
    expect(await screen.findByText("Region *")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Task title"), "Project work");
    await userEvent.type(screen.getByLabelText("Region"), "East");
    await userEvent.click(screen.getByRole("button", { name: "Create Task" }));
    await waitFor(() => expect(api.createProjectTask).toHaveBeenCalledWith("project-1", expect.objectContaining({ customFields: { [required.id]: "East" } })));
  });

  it("Create and Edit Project load definitions and submit values with core changes; legacy empty values remain untouched", async () => {
    const required = field("project-region", "text", { id: "77000000-0000-4000-8000-000000000001", name: "Region", entityType: "project", isRequired: true, defaultValue: null }) as any;
    api.listCustomFields.mockResolvedValue({ data: { definitions: [required] } });
    api.createProject.mockRejectedValueOnce(new Error("Region is required")).mockResolvedValueOnce({ data: { project: { id: "project-created", name: "Launch", customFields: { [required.id]: "East" } } } });
    const onSuccess = vi.fn();
    const first = render(<EditProjectDrawer project={null} open onOpenChange={() => undefined} onSuccess={onSuccess} mode="create" />);
    expect(await screen.findByText("Region *")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("e.g. Website Redesign"), "Launch");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(api.createProject).toHaveBeenCalledWith(expect.objectContaining({ customFields: {} })));
    expect(onSuccess).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Region"), "East");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: "project-created" })));
    first.unmount();

    const project = { id: "project-1", name: "Before", description: "", status: "planning", startDate: null, endDate: null, teamId: null } as any;
    api.getProjectCustomFields.mockResolvedValue({ data: { values: [{ fieldId: required.id, value: "East", field: required }], missingRequired: [], archivedValues: [] } });
    api.updateProject.mockResolvedValue({ data: { project: { ...project, name: "After", customFields: { [required.id]: "West" } } } });
    render(<EditProjectDrawer project={project} open onOpenChange={() => undefined} onSuccess={onSuccess} mode="edit" />);
    await screen.findByDisplayValue("East");
    await userEvent.clear(screen.getByPlaceholderText("e.g. Website Redesign"));
    await userEvent.type(screen.getByPlaceholderText("e.g. Website Redesign"), "After");
    await userEvent.clear(screen.getByLabelText("Region"));
    await userEvent.type(screen.getByLabelText("Region"), "West");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.updateProject).toHaveBeenCalledWith("project-1", expect.objectContaining({ name: "After", customFields: { [required.id]: "West" } })));
  });

  it("Task Edit loads existing values, rejects clearing required values, and allows unrelated legacy edits", async () => {
    const required = field("task-region", "text", { id: "78000000-0000-4000-8000-000000000001", name: "Region", isRequired: true }) as any;
    api.listCustomFields.mockResolvedValue({ data: { definitions: [required] } });
    api.getTaskById.mockResolvedValue({ data: { task: { id: "task-1", title: "Before", description: "Details", status: "pending", priority: "medium", deadline: null, assignees: [], attachments: [], activities: [] }, access: { canEdit: true, readOnly: false } } });
    api.getTaskCustomFields.mockResolvedValue({ data: { values: [{ id: "value-1", fieldId: required.id, value: "North", field: required }], missingRequired: [], archivedValues: [] } });
    api.updateTask.mockImplementation(async (_id: string, payload: any) => {
      const customFields = payload instanceof FormData ? JSON.parse(String(payload.get("customFields") || "{}")) : payload.customFields;
      if (customFields?.[required.id] === "") throw new Error("Region is required");
      return { data: { task: { id: "task-1", title: payload.title, customFields } } };
    });
    const onTaskUpdated = vi.fn();
    withQueryClient(<TaskEditDrawer inline open taskId="task-1" onOpenChange={() => undefined} onTaskUpdated={onTaskUpdated} onTaskDeleted={() => undefined} />);
    expect(await screen.findByDisplayValue("North")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Region"));
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error", description: "Region is required" })));
    await userEvent.type(screen.getByLabelText("Region"), "West");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(api.updateTask).toHaveBeenCalledWith("task-1", expect.objectContaining({ customFields: { [required.id]: "West" } })));
    expect(onTaskUpdated).toHaveBeenCalled();
  });

  it("Task Edit lets a legacy Task with a missing new required field save an unrelated title", async () => {
    const required = field("task-region", "text", { id: "79000000-0000-4000-8000-000000000001", name: "Region", isRequired: true }) as any;
    api.listCustomFields.mockResolvedValue({ data: { definitions: [required] } });
    api.getTaskById.mockResolvedValue({ data: { task: { id: "task-legacy", title: "Before", description: "Details", status: "pending", priority: "medium", deadline: null, assignees: [], attachments: [], activities: [] }, access: { canEdit: true, readOnly: false } } });
    api.getTaskCustomFields.mockResolvedValue({ data: { values: [], missingRequired: [{ fieldId: required.id, name: "Region" }], archivedValues: [] } });
    api.updateTask.mockResolvedValue({ data: { task: { id: "task-legacy", title: "After" } } });
    withQueryClient(<TaskEditDrawer inline open taskId="task-legacy" onOpenChange={() => undefined} onTaskUpdated={() => undefined} onTaskDeleted={() => undefined} />);
    await screen.findByText("Region *");
    const title = screen.getByDisplayValue("Before");
    await userEvent.clear(title);
    await userEvent.type(title, "After");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(api.updateTask).toHaveBeenCalledWith("task-legacy", expect.objectContaining({ title: "After", customFields: {} })));
  });
});
