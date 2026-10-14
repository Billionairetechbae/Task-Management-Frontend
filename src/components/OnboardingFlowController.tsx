import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isOnboardingBusy, useOverlayState } from "@/lib/overlayCoordinator";

export const WORKSPACE_SETUP_PATH = "/onboarding/workspace";

/**
 * Sequential first-run flow:
 *   1. onboarding overlays (welcome / tour) show one at a time, with workspace selectors locked out;
 *   2. when the last one is finished OR skipped, a user with no workspace is taken to the workspace setup
 *      page (Create workspace / Join workspace);
 *   3. only once a workspace exists do the normal workspace selectors appear (see WorkspaceSwitcher).
 * Users who already have a workspace are left where they are.
 */
export default function OnboardingFlowController() {
  const overlayState = useOverlayState();
  const busy = isOnboardingBusy(overlayState);
  const { user, loading, workspaces } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const wasActive = useRef(false);
  const latest = useRef({ user, loading, workspaces, path: location.pathname });
  latest.current = { user, loading, workspaces, path: location.pathname };

  useEffect(() => {
    const active = busy;
    if (wasActive.current && !active) {
      const { user: u, loading: l, workspaces: w, path } = latest.current;
      if (u && !l && w.length === 0 && !path.startsWith(WORKSPACE_SETUP_PATH)) navigate(WORKSPACE_SETUP_PATH, { replace: true });
    }
    wasActive.current = active;
  }, [busy, navigate]);

  return null;
}
