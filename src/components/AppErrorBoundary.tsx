import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sentry } from "@/lib/sentry";

export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setTag("feature", "react_render");
      scope.setExtra("component_stack", info.componentStack || "");
      Sentry.captureException(error);
    });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="flex min-h-screen items-center justify-center p-6"><section className="max-w-md text-center"><h1 className="text-xl font-semibold">Something went wrong</h1><p className="mt-2 text-sm text-muted-foreground">Please try again. If the problem continues, contact your workspace administrator.</p><Button className="mt-5" onClick={() => window.location.reload()}>Reload page</Button></section></main>;
  }
}
