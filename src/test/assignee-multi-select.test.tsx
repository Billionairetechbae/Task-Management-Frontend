import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AssigneeMultiSelect } from "@/components/tasks/AssigneeMultiSelect";
import { assignableMembers, memberLabel } from "@/lib/memberIdentity";

beforeAll(() => {
  (globalThis as any).ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView ||= vi.fn();
  Element.prototype.hasPointerCapture ||= () => false;
  Element.prototype.releasePointerCapture ||= () => {};
});

const m = (userId: string, firstName: string, lastName: string, email: string, extra: Record<string, unknown> = {}) => ({
  id: `m-${userId}`, userId, companyId: "w1", role: "member", status: "active", isVerified: true, invitedBy: null, createdAt: "", updatedAt: "",
  user: { id: userId, firstName, lastName, email, isActive: true, ...extra },
}) as any;

const people = [
  m("kv", "Kehinde", "Victor", "kehinde@example.com"),
  m("r1", "Richard", "Kehinde", "richard.one@example.com"),
  m("r2", "Richard", "Kehinde", "richard.two@example.com"),
  m("long", "Longname", "Person", `${"x".repeat(80)}@example.com`),
];

function Harness({ onChange = () => {}, members = people, loading = false }: { onChange?: (ids: string[]) => void; members?: any[]; loading?: boolean }) {
  const [value, setValue] = useState<string[]>([]);
  return <AssigneeMultiSelect members={members} value={value} loading={loading} meId="kv" onChange={(ids) => { setValue(ids); onChange(ids); }} />;
}
const open = async () => { await userEvent.click(screen.getByRole("combobox")); };

describe("assignee identification helpers", () => {
  it("labels duplicates with email, marks the signed-in user, and filters ineligible accounts and duplicate rows", () => {
    expect(memberLabel(people[1], "kv")).toBe("Richard Kehinde (richard.one@example.com)");
    expect(memberLabel(people[2], "kv")).toBe("Richard Kehinde (richard.two@example.com)");
    expect(memberLabel(people[0], "kv")).toBe("Me — Kehinde Victor (kehinde@example.com)");
    const list = assignableMembers([...people, people[1], m("gone", "G", "One", "g@e.com", { isActive: false }), { ...m("rm", "R", "M", "rm@e.com"), status: "removed" }, { ...m("uv", "U", "V", "uv@e.com"), isVerified: false }], "kv");
    expect(list.map((x) => x.userId)).toEqual(["kv", "long", "r1", "r2"]);
    expect(list.map((x) => x.userId)).not.toContain("gone");
    expect(list.map((x) => x.userId)).not.toContain("rm");
    expect(list.map((x) => x.userId)).not.toContain("uv");
    expect(list[0].userId).toBe("kv");
    expect(new Set(list.map((x) => x.userId)).size).toBe(list.length);
  });
});

describe("AssigneeMultiSelect", () => {
  it("shows two identical names distinguished by email, with the signed-in user marked Me", async () => {
    render(<Harness />);
    await open();
    expect(screen.getByRole("option", { name: "Richard Kehinde (richard.one@example.com)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Richard Kehinde (richard.two@example.com)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Me — Kehinde Victor (kehinde@example.com)" })).toBeInTheDocument();
  });

  it("selects by id (not by position) and emits stable user ids for duplicates", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await open();
    await userEvent.click(screen.getByRole("option", { name: "Richard Kehinde (richard.two@example.com)" }));
    expect(onChange).toHaveBeenLastCalledWith(["r2"]);
    await userEvent.click(screen.getByRole("option", { name: "Richard Kehinde (richard.one@example.com)" }));
    expect(onChange).toHaveBeenLastCalledWith(["r2", "r1"]);
  });

  it("searches by email and by name", async () => {
    render(<Harness />);
    await open();
    await userEvent.type(screen.getByPlaceholderText(/search by name or email/i), "richard.one");
    expect(screen.getByRole("option", { name: /richard\.one@example\.com/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /richard\.two@example\.com/ })).not.toBeInTheDocument();
    await userEvent.clear(screen.getByPlaceholderText(/search by name or email/i));
    await userEvent.type(screen.getByPlaceholderText(/search by name or email/i), "kehinde");
    expect(screen.getAllByRole("option").length).toBe(3);
  });

  it("supports keyboard selection and chip removal; shows the count and clears all", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await open();
    const input = screen.getByPlaceholderText(/search by name or email/i);
    await userEvent.type(input, "richard.two");
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["r2"]);
    expect(screen.getByTestId("assignee-count")).toHaveTextContent("1 selected");
    await userEvent.keyboard("{Escape}");
    const chip = screen.getByRole("button", { name: "Remove Richard Kehinde (richard.two@example.com)" });
    chip.focus(); await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith([]);
    await open();
    await userEvent.click(screen.getByRole("option", { name: /richard\.one/ }));
    await userEvent.click(screen.getByRole("option", { name: /richard\.two/ }));
    expect(screen.getByTestId("assignee-count")).toHaveTextContent("2 selected");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(screen.queryByTestId("assignee-count")).not.toBeInTheDocument();
  });

  it("long emails are truncated visually but remain fully available to assistive technology", async () => {
    render(<Harness />);
    await open();
    const option = screen.getByRole("option", { name: new RegExp(`${"x".repeat(80)}@example\\.com`) });
    const email = within(option).getByTitle(`${"x".repeat(80)}@example.com`);
    expect(email.className).toMatch(/truncate/);
  });

  it("loading and empty states", async () => {
    const loading = render(<Harness loading />);
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByText(/Loading people/)).toBeInTheDocument();
    loading.unmount();
    render(<Harness members={[]} />);
    await open();
    expect(screen.getByText(/No eligible people in this workspace/)).toBeInTheDocument();
  });
});
