import type { ReactNode } from "react";

import { CommandPalette } from "@/shared/ui/command-palette";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell" data-theme="dark">
      <header className="app-header">
        <span className="app-brand">RayWatch</span>
        <span className="muted header-hint">⌘K search</span>
      </header>
      <div className="app-body">{children}</div>
      <CommandPalette />
    </div>
  );
}
