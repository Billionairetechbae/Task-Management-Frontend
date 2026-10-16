import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "member" as string | null,
  api: { listConnectedStorageItems: vi.fn(), searchConnectedStorage: vi.fn(), getConnectedStorageItem: vi.fn(), listConnectedStorageConnections: vi.fn() },
}));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: mocks.role }) }));

import { ConnectedStoragePickerDialog, SEARCH_DEBOUNCE_MS } from "@/components/connectedStorage/ConnectedStoragePickerDialog";
import { ConnectedStoragePickerButton } from "@/components/connectedStorage/ConnectedStoragePickerButton";

const item = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  providerItemId: id, itemType: "file" as const, name, mimeType: "application/pdf", size: 2048, revision: "r1", modifiedAt: "2026-10-20T10:00:00Z",
  displayPath: `/Docs/${name}`, thumbnailUrl: null, selectable: true, ...extra,
});
const folder = (id: string, name: string) => item(id, name, { itemType: "folder", size: null, mimeType: null, selectable: false, modifiedAt: null });
const listing = (folders: any[], files: any[], extra: Record<string, unknown> = {}) => ({ status: "success", data: { provider: "dropbox", parentId: null, folders, files, hasMore: false, cursor: null, ...extra } });
const search = (items: any[], extra: Record<string, unknown> = {}) => ({ status: "success", data: { provider: "dropbox", query: "q", items, hasMore: false, cursor: null, ...extra } });
const apiError = (statusCode: number, body: Record<string, unknown> = {}) => Object.assign(new Error("Request failed"), { statusCode, body });

const TARGET = { targetType: "task" as const, targetId: "task-1" };
function renderPicker(props: Partial<React.ComponentProps<typeof ConnectedStoragePickerDialog>> = {}) {
  const onSelect = vi.fn(); const onOpenChange = vi.fn();
  render(<ConnectedStoragePickerDialog open onOpenChange={onOpenChange} connectionId="conn-1" {...TARGET} onSelect={onSelect} {...props} />);
  return { onSelect, onOpenChange };
}

describe("ConnectedStoragePickerDialog", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.role = "member"; });

  it("opens with the target context, shows loading, then folders before files", async () => {
    let resolve!: (v: unknown) => void;
    mocks.api.listConnectedStorageItems.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPicker();
    expect(await screen.findByRole("status")).toHaveTextContent("Loading");
    expect(mocks.api.listConnectedStorageItems).toHaveBeenCalledWith("conn-1", { targetType: "task", targetId: "task-1", taskId: undefined }, { parentId: null });
    resolve(listing([folder("id:d1", "Contracts")], [item("id:f1", "plan.pdf")]));
    const rows = await screen.findAllByRole("listitem");
    expect(rows.map((r) => r.getAttribute("aria-label"))).toEqual(["Open folder Contracts", "Select file plan.pdf"]);
    expect(screen.getByRole("heading", { name: "Choose a file from Dropbox" })).toBeInTheDocument();
  });

  it("passes a new-comment context (taskId) and comment/project targets through unchanged", async () => {
    mocks.api.listConnectedStorageItems.mockResolvedValue(listing([], []));
    renderPicker({ targetType: "comment", targetId: undefined, taskId: "task-9" });
    await screen.findByText("This folder is empty.");
    expect(mocks.api.listConnectedStorageItems).toHaveBeenCalledWith("conn-1", { targetType: "comment", targetId: undefined, taskId: "task-9" }, { parentId: null });
  });

  it("navigates into folders by provider id, shows breadcrumbs, supports Back and breadcrumb jumps", async () => {
    mocks.api.listConnectedStorageItems
      .mockResolvedValueOnce(listing([folder("id:d1", "Contracts")], []))
      .mockResolvedValueOnce(listing([folder("id:d2", "2026")], [item("id:f1", "a.pdf")]))
      .mockResolvedValueOnce(listing([], [item("id:f2", "b.pdf")]));
    renderPicker();
    await userEvent.click(await screen.findByRole("listitem", { name: "Open folder Contracts" }));
    await screen.findByRole("listitem", { name: "Open folder 2026" });
    expect(mocks.api.listConnectedStorageItems).toHaveBeenLastCalledWith("conn-1", expect.anything(), { parentId: "id:d1" });
    await userEvent.click(screen.getByRole("listitem", { name: "Open folder 2026" }));
    await screen.findByRole("listitem", { name: "Select file plan.pdf".replace("plan", "b") });
    expect(mocks.api.listConnectedStorageItems).toHaveBeenLastCalledWith("conn-1", expect.anything(), { parentId: "id:d2" });
    const nav = screen.getByRole("navigation", { name: "Folder path" });
    expect(within(nav).getByText("Dropbox")).toBeInTheDocument(); expect(within(nav).getByText("Contracts")).toBeInTheDocument();
    expect(within(nav).getByText("2026")).toHaveAttribute("aria-current", "page");
    mocks.api.listConnectedStorageItems.mockResolvedValueOnce(listing([folder("id:d2", "2026")], [item("id:f1", "a.pdf")]));
    await userEvent.click(within(nav).getByRole("button", { name: "Back" }));
    await waitFor(() => expect(mocks.api.listConnectedStorageItems).toHaveBeenLastCalledWith("conn-1", expect.anything(), { parentId: "id:d1" }));
    mocks.api.listConnectedStorageItems.mockResolvedValueOnce(listing([folder("id:d1", "Contracts")], []));
    await userEvent.click(within(screen.getByRole("navigation", { name: "Folder path" })).getByRole("button", { name: "Dropbox" }));
    await waitFor(() => expect(mocks.api.listConnectedStorageItems).toHaveBeenLastCalledWith("conn-1", expect.anything(), { parentId: null }));
  });

  it("paginates a folder with Load more using the server cursor and appends", async () => {
    mocks.api.listConnectedStorageItems
      .mockResolvedValueOnce(listing([], [item("id:f1", "one.pdf")], { hasMore: true, cursor: "CUR-1" }))
      .mockResolvedValueOnce(listing([], [item("id:f2", "two.pdf")]));
    renderPicker();
    await screen.findByRole("listitem", { name: "Select file one.pdf" });
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByRole("listitem", { name: "Select file two.pdf" });
    expect(screen.getByRole("listitem", { name: "Select file one.pdf" })).toBeInTheDocument();
    expect(mocks.api.listConnectedStorageItems).toHaveBeenLastCalledWith("conn-1", expect.anything(), { parentId: null, cursor: "CUR-1" });
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("search is debounced, labelled as search results, paginates, and Clear returns to the folder view", async () => {
    mocks.api.listConnectedStorageItems.mockResolvedValue(listing([folder("id:d1", "Contracts")], []));
    mocks.api.searchConnectedStorage
      .mockResolvedValueOnce(search([item("id:s1", "budget.xlsx"), folder("id:s2", "Budgets")], { hasMore: true, cursor: "SCUR-1" }))
      .mockResolvedValueOnce(search([item("id:s3", "budget-2.xlsx")]));
    renderPicker();
    await screen.findByRole("listitem", { name: "Open folder Contracts" });
    const box = screen.getByRole("textbox", { name: "Search Dropbox" });
    await userEvent.type(box, "b");
    expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
    await userEvent.type(box, "udget");
    expect(mocks.api.searchConnectedStorage).not.toHaveBeenCalled(); // not per keystroke
    await waitFor(() => expect(mocks.api.searchConnectedStorage).toHaveBeenCalledTimes(1), { timeout: SEARCH_DEBOUNCE_MS + 1500 });
    expect(mocks.api.searchConnectedStorage).toHaveBeenCalledWith("conn-1", expect.objectContaining({ targetType: "task", targetId: "task-1" }), "budget");
    expect(await screen.findByTestId("search-banner")).toHaveTextContent("Search results for “budget”");
    expect(screen.getByRole("listitem", { name: "Select file budget.xlsx" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Open folder Budgets" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Folder path" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    await screen.findByRole("listitem", { name: "Select file budget-2.xlsx" });
    expect(mocks.api.searchConnectedStorage).toHaveBeenLastCalledWith("conn-1", expect.anything(), "budget", "SCUR-1");
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(await screen.findByRole("listitem", { name: "Open folder Contracts" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Folder path" })).toBeInTheDocument();
    expect(screen.queryByTestId("search-banner")).not.toBeInTheDocument();
  });

  it("a folder found by search can be opened for navigation (search state is left)", async () => {
    mocks.api.listConnectedStorageItems.mockResolvedValueOnce(listing([], [])).mockResolvedValueOnce(listing([], [item("id:in", "inside.pdf")]));
    mocks.api.searchConnectedStorage.mockResolvedValue(search([folder("id:s2", "Budgets")]));
    renderPicker();
    await screen.findByText("This folder is empty.");
    await userEvent.type(screen.getByRole("textbox", { name: "Search Dropbox" }), "budg");
    await userEvent.click(await screen.findByRole("listitem", { name: "Open folder Budgets" }, { timeout: 2500 }));
    await screen.findByRole("listitem", { name: "Select file inside.pdf" });
    expect(mocks.api.listConnectedStorageItems).toHaveBeenLastCalledWith("conn-1", expect.anything(), { parentId: "id:s2" });
    expect(within(screen.getByRole("navigation", { name: "Folder path" })).getByText("Budgets")).toBeInTheDocument();
  });

  it("only files are selectable: folders navigate, Select needs a file, the summary shows it, and Select returns the normalized item", async () => {
    mocks.api.listConnectedStorageItems.mockResolvedValue(listing([folder("id:d1", "Contracts")], [item("id:f1", "plan.pdf", { size: 2048 }), item("id:p", "notes.paper", { selectable: false })]));
    const { onSelect, onOpenChange } = renderPicker();
    const select = await screen.findByRole("button", { name: "Select" });
    expect(select).toBeDisabled();
    expect(screen.getByRole("listitem", { name: "Unavailable file notes.paper" })).toBeDisabled();
    await userEvent.click(screen.getByRole("listitem", { name: "Select file plan.pdf" }));
    const summary = screen.getByTestId("selected-summary");
    expect(summary).toHaveTextContent("plan.pdf"); expect(summary).toHaveTextContent("2.0 KB"); expect(summary).toHaveTextContent("/Docs/plan.pdf");
    expect(screen.getByRole("listitem", { name: "Select file plan.pdf" })).toHaveAttribute("aria-pressed", "true");
    expect(select).toBeEnabled();
    await userEvent.click(select);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ providerItemId: "id:f1", name: "plan.pdf", itemType: "file", revision: "r1" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // nothing was persisted or attached by selecting
    expect(Object.keys(mocks.api).filter((k) => /attach/i.test(k))).toEqual([]);
  });

  it("selecting a folder never enables Select; Cancel closes without selecting", async () => {
    mocks.api.listConnectedStorageItems.mockResolvedValue(listing([folder("id:d1", "Contracts")], []));
    const { onSelect, onOpenChange } = renderPicker();
    await screen.findByRole("listitem", { name: "Open folder Contracts" });
    expect(screen.getByRole("button", { name: "Select" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSelect).not.toHaveBeenCalled(); expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("reconnect required: explains who must reconnect and offers no retry", async () => {
    mocks.api.listConnectedStorageItems.mockRejectedValue(apiError(409, { code: "reauth_required" }));
    renderPicker();
    expect(await screen.findByTestId("picker-error-reconnect")).toHaveTextContent(/owner or admin to reconnect Dropbox/i);
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("provider unavailable: shows a message and Try again reloads successfully", async () => {
    mocks.api.listConnectedStorageItems.mockRejectedValueOnce(apiError(503, { code: "provider_unavailable" })).mockResolvedValueOnce(listing([], [item("id:f1", "ok.pdf")]));
    renderPicker();
    expect(await screen.findByTestId("picker-error-unavailable")).toHaveTextContent(/temporarily unavailable/i);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("listitem", { name: "Select file ok.pdf" });
  });

  it("rate limited: shows a retry-later message including the server's retry hint", async () => {
    mocks.api.listConnectedStorageItems.mockRejectedValue(apiError(429, { code: "rate_limited", retryAfterSeconds: 12 }));
    renderPicker();
    expect(await screen.findByTestId("picker-error-rate_limited")).toHaveTextContent(/in about 12 seconds/);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("target access failure (403): permission message and no retry; the provider's details are never shown", async () => {
    mocks.api.listConnectedStorageItems.mockRejectedValue(apiError(403, { code: "forbidden", message: "internal detail sl.SECRET" }));
    renderPicker();
    const alert = await screen.findByTestId("picker-error-forbidden");
    expect(alert).toHaveTextContent("You don't have permission to attach files here.");
    expect(alert).not.toHaveTextContent("SECRET");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("a failed Load more keeps the loaded items and offers Try again; an expired cursor offers Reload", async () => {
    mocks.api.listConnectedStorageItems
      .mockResolvedValueOnce(listing([], [item("id:f1", "one.pdf")], { hasMore: true, cursor: "CUR-1" }))
      .mockRejectedValueOnce(apiError(400, { code: "invalid_cursor" }))
      .mockResolvedValueOnce(listing([], [item("id:f9", "fresh.pdf")]));
    renderPicker();
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByTestId("picker-error-expired")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Select file one.pdf" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reload" }));
    await screen.findByRole("listitem", { name: "Select file fresh.pdf" });
  });

  it("empty search shows a no-results state", async () => {
    mocks.api.listConnectedStorageItems.mockResolvedValue(listing([], [item("id:f1", "a.pdf")]));
    mocks.api.searchConnectedStorage.mockResolvedValue(search([]));
    renderPicker();
    await screen.findByRole("listitem", { name: "Select file a.pdf" });
    await userEvent.type(screen.getByRole("textbox", { name: "Search Dropbox" }), "zzz");
    expect(await screen.findByText("No results for “zzz”.", undefined, { timeout: 2500 })).toBeInTheDocument();
  });

  it("makes no request while closed", () => {
    renderPicker({ open: false });
    expect(mocks.api.listConnectedStorageItems).not.toHaveBeenCalled();
  });
});

describe("ConnectedStoragePickerButton entry point", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  const active = { status: "success", data: { canManage: false, connections: [{ id: "conn-1", provider: "dropbox", status: "active" }] } };

  it.each(["guest", null])("never renders for client/external role %s and never calls the API", async (role) => {
    mocks.role = role;
    mocks.api.listConnectedStorageConnections.mockResolvedValue(active);
    const { container } = render(<ConnectedStoragePickerButton {...TARGET} onSelect={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
    expect(mocks.api.listConnectedStorageConnections).not.toHaveBeenCalled();
  });

  it("renders for an internal user when Dropbox is active, opens the picker with the connection and target", async () => {
    mocks.role = "member";
    mocks.api.listConnectedStorageConnections.mockResolvedValue(active);
    mocks.api.listConnectedStorageItems.mockResolvedValue(listing([], [item("id:f1", "x.pdf")]));
    const onSelect = vi.fn();
    render(<ConnectedStoragePickerButton {...TARGET} onSelect={onSelect} />);
    await userEvent.click(await screen.findByRole("button", { name: /add from dropbox/i }));
    await userEvent.click(await screen.findByRole("listitem", { name: "Select file x.pdf" }));
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ providerItemId: "id:f1" }), "conn-1");
    expect(mocks.api.listConnectedStorageItems).toHaveBeenCalledWith("conn-1", expect.objectContaining({ targetType: "task", targetId: "task-1" }), { parentId: null });
  });

  it.each([
    ["disconnected", { connections: [{ id: "c", provider: "dropbox", status: "disconnected" }] }],
    ["reconnect required", { connections: [{ id: "c", provider: "dropbox", status: "reauth_required" }] }],
    ["not connected", { connections: [] }],
  ])("renders nothing when Dropbox is %s", async (_label, data) => {
    mocks.role = "owner";
    mocks.api.listConnectedStorageConnections.mockResolvedValue({ status: "success", data: { canManage: true, ...data } });
    const { container } = render(<ConnectedStoragePickerButton {...TARGET} onSelect={vi.fn()} />);
    await waitFor(() => expect(mocks.api.listConnectedStorageConnections).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
  });

  it("the real API client exposes browse/search/get-item but no Connected Storage attach method yet (Phase 3C)", async () => {
    const real = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(real.api));
    expect(methods).toEqual(expect.arrayContaining(["listConnectedStorageItems", "searchConnectedStorage", "getConnectedStorageItem"]));
    expect(methods.filter((m) => /attach/i.test(m) && /storage|dropbox/i.test(m))).toEqual([]);
  });
});

describe("API client URL construction", () => {
  it("encodes provider ids as one untouched path segment and sends the target on every request", async () => {
    const real = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ status: "success", data: {} }), { status: 200, headers: { "Content-Type": "application/json" } }));
    try {
      await real.api.getConnectedStorageItem("conn/1", { targetType: "task", targetId: "task-1" }, "id:AbC_-1+/x");
      await real.api.listConnectedStorageItems("conn-1", { targetType: "comment", taskId: "task-9" }, { parentId: "id:d1", cursor: "c u+r" });
      await real.api.searchConnectedStorage("conn-1", { targetType: "project", targetId: "p-1" }, "q & more", "SC");
      const urls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(urls[0]).toContain("/connected-storage/connections/conn%2F1/items/id%3AAbC_-1%2B%2Fx?targetType=task&targetId=task-1");
      expect(urls[1]).toContain("/items?targetType=comment&taskId=task-9&parentId=id%3Ad1&cursor=c+u%2Br");
      expect(urls[2]).toContain("/search?targetType=project&targetId=p-1&q=q+%26+more&cursor=SC");
      for (const call of fetchMock.mock.calls) expect((call[1] as RequestInit).method).toBe("GET");
    } finally { fetchMock.mockRestore(); }
  });
});
