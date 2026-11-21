import { describe, expect, it } from "vitest";
import { activeTeamMemberCount, splitTeamsByActiveMembership } from "@/lib/teamMembershipSections";

const memberLink = (userId: string, status = "active") => ({
  companyMemberId: `member-${userId}`,
  companyMember: { id: `member-${userId}`, userId, status },
});

describe("team membership sections", () => {
  it("uses active memberships only and supports membership in several teams", () => {
    const teams = [
      { id: "design", memberLinks: [memberLink("current"), memberLink("other")] },
      { id: "engineering", memberLinks: [memberLink("current")] },
      { id: "lead-only", memberLinks: [memberLink("other")] },
    ];

    expect(splitTeamsByActiveMembership(teams, "current")).toEqual({
      myTeams: [teams[0], teams[1]],
      otherTeams: [teams[2]],
    });
  });

  it("does not infer membership from inactive or removed membership rows", () => {
    const team = { id: "former", memberLinks: [memberLink("current", "removed")] };
    expect(splitTeamsByActiveMembership([team], "current")).toEqual({
      myTeams: [],
      otherTeams: [team],
    });
  });

  it("places every visible team under Other Workspace Teams when the user has no active memberships", () => {
    const teams = [{ id: "one", memberLinks: [] }, { id: "two" }];
    expect(splitTeamsByActiveMembership(teams, "current")).toEqual({
      myTeams: [],
      otherTeams: teams,
    });
    expect(splitTeamsByActiveMembership([], "current")).toEqual({ myTeams: [], otherTeams: [] });
  });

  it("counts unique active members rather than inactive or duplicate links", () => {
    const team = {
      id: "team",
      memberLinks: [memberLink("one"), memberLink("one"), memberLink("two", "removed")],
    };
    expect(activeTeamMemberCount(team)).toBe(1);
  });
});
