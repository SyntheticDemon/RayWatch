import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell" data-theme="dark">
      <header className="app-header">
        <span className="app-brand">RayWatch</span>
      </header>
      <div className="app-body">{children}</div>
    </div>
  );
}
