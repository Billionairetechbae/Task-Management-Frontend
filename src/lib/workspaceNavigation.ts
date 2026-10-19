/** Canonical route for the Phase 1C Subscription & Seats page (relative: the app origin comes from the router, never hard-coded). */
export const SUBSCRIPTION_PATH = "/settings/workspace/subscription";

/** Same rule the page and the API enforce: only active workspace owners and admins may view subscription data. */
export const canViewSubscription = (workspaceRole: string | null | undefined) => workspaceRole === "owner" || workspaceRole === "admin";
