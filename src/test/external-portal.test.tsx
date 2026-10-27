import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExternalPortal from "@/pages/ExternalPortal";

const REF = "ref_abc123";
const SESSION_KEY = `admiino_external_session:${REF}`;
const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

const view = (permission: "viewer" | "commenter") => ({
  status: "success",
  data: { organization: "Richie Tech", permission, canComment: permission === "commenter", resourceType: "task", shareReference: REF, accessExpiresAt: null, viewer: { email: "c@x.test" }, task: { title: "Approve logo", description: "Pick final", status: "pending", dueDate: null } },
});
const comment = (id: string, content: string, kind: "external" | "internal" = "external") => ({ id, authorKind: kind, authorName: kind === "external" ? "c@x.test" : "Ada Okoro", authorOrganization: kind === "internal" ? "Richie Tech" : null, content, createdAt: "2026-10-27T10:00:00Z", editedAt: null, isMine: kind === "external" });

let calls: Array<{ url: string; init?: RequestInit }>;
const fetchMock = vi.fn();

function mount() {
  return render(
    <MemoryRouter initialEntries={[`/external/task/${REF}`]}>
      <Routes><Route path="/external/task/:shareReference" element={<ExternalPortal />} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  calls = [];
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => { calls.push({ url, init }); return fetchMock(url, init); });
});
afterEach(() => vi.unstubAllGlobals());

describe("external client portal", () => {
  it("shows a Viewer the shared task and conversation without a comment composer", async () => {
    window.localStorage.setItem(SESSION_KEY, "sess");
    fetchMock.mockImplementation((url: string) => (url.endsWith("/comments") ? json(200, { data: { comments: [comment("1", "<script>alert(1)</script>")] } }) : json(200, view("viewer"))));
    const { container } = mount();
    expect(await screen.findByText("Approve logo")).toBeInTheDocument();
    expect(screen.getByText("Viewer")).toBeInTheDocument();
    expect(screen.getByText(/view-only access/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Comment")).not.toBeInTheDocument();
    // hostile comment text is shown as text, never parsed as markup
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    // no internal navigation or signup prompts
    expect(screen.queryByText(/sign up|log in|dashboard|billing/i)).not.toBeInTheDocument();
    expect(calls.every((c) => (c.init?.headers as Record<string, string>).Authorization === "External sess")).toBe(true);
  });

  it("lets a Commenter post and sends only the external session credential", async () => {
    window.localStorage.setItem(SESSION_KEY, "sess");
    window.localStorage.setItem("auth_token", "ADMIINO-USER-JWT");
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") return json(201, { data: { comment: comment("2", "Looks great") } });
      return url.endsWith("/comments") ? json(200, { data: { comments: [comment("1", "Earlier", "internal")] } }) : json(200, view("commenter"));
    });
    mount();
    await userEvent.type(await screen.findByLabelText("Comment"), "Looks great");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByText("Looks great")).toBeInTheDocument();
    expect(screen.getByText("Earlier")).toBeInTheDocument();
    const post = calls.find((c) => c.init?.method === "POST")!;
    expect(JSON.parse(post.init!.body as string)).toEqual({ content: "Looks great" });
    for (const c of calls) expect(JSON.stringify(c.init?.headers)).not.toContain("ADMIINO-USER-JWT");
  });

  it("redeems the fragment token once, removes it from the address bar and keeps the session", async () => {
    window.history.replaceState(null, "", `/external/task/${REF}#token=SECRET_TOKEN_VALUE_1234567890`);
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith("/redeem")) return json(200, { data: { sessionToken: "new-session", shareReference: REF, resourceType: "task" } });
      return url.endsWith("/comments") ? json(200, { data: { comments: [] } }) : json(200, view("viewer"));
    });
    mount();
    expect(await screen.findByText("Approve logo")).toBeInTheDocument();
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain("SECRET_TOKEN");
    expect(window.localStorage.getItem(SESSION_KEY)).toBe("new-session");
    const redeem = calls.filter((c) => c.url.endsWith("/redeem"));
    expect(redeem).toHaveLength(1);
    expect(JSON.parse(redeem[0].init!.body as string)).toEqual({ token: "SECRET_TOKEN_VALUE_1234567890" });
    expect(calls.some((c) => c.url.includes("SECRET_TOKEN"))).toBe(false);
  });

  it("shows the expired state and clears the stored session when the server rejects it", async () => {
    window.localStorage.setItem(SESSION_KEY, "stale");
    fetchMock.mockImplementation(() => json(401, { status: "error", code: "session_invalid", message: "gone" }));
    mount();
    expect(await screen.findByText(/expired or been revoked/i)).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("offers a new link without revealing whether the email has access", async () => {
    fetchMock.mockImplementation(() => json(202, { status: "success" }));
    mount();
    await userEvent.type(await screen.findByLabelText("Your email address"), "anyone@x.test");
    await userEvent.click(screen.getByRole("button", { name: /email me a new link/i }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/if that email has access/i));
    expect(JSON.parse(calls[0].init!.body as string)).toEqual({ shareReference: REF, email: "anyone@x.test" });
  });
});
