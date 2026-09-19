import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import TeamSelector from "@/components/TeamSelector";

const apiMock = vi.hoisted(() => ({ listTeams: vi.fn() }));
const authState = vi.hoisted(() => ({ activeCompanyId: "workspace-a" }));

vi.mock("@/lib/api", () => ({ api: apiMock }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

beforeEach(() => {
  vi.clearAllMocks();
  authState.activeCompanyId = "workspace-a";
  apiMock.listTeams.mockResolvedValue({ data: { teams: [{ id: "team-a", name: "Marketing" }] } });
});

describe("Phase 3 TeamSelector", () => {
  it("preserves an existing Team while loading and renders No Team", async () => {
    const onChange = vi.fn();
    render(<TeamSelector value="team-a" onChange={onChange} />);

    await screen.findByText("Marketing");
    expect(onChange).not.toHaveBeenCalledWith(null);
    expect(screen.getByRole("combobox")).toHaveTextContent("Marketing");
  });

  it("clears a stale Team after workspace Teams load", async () => {
    const onChange = vi.fn();
    apiMock.listTeams.mockResolvedValue({ data: { teams: [] } });
    render(<TeamSelector value="team-a" onChange={onChange} />);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
    expect(screen.getByText("No teams are available in this workspace.")).toBeInTheDocument();
  });
});
