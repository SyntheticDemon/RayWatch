import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { CommandPalette } from "@/shared/ui/command-palette";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const onOverview = location.pathname.startsWith("/overview");
  const onJobs = location.pathname === "/" || location.pathname.startsWith("/jobs");
  const onCluster = location.pathname.startsWith("/cluster");
  const onActors = location.pathname.startsWith("/actors");
  const onInternal = location.pathname.startsWith("/internal-runs");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-start">
            <Link to="/" className="app-brand">
              RayWatch
            </Link>
            <nav className="app-nav" aria-label="Primary">
              <Link to="/overview" className={`app-nav-link ${onOverview ? "active" : ""}`}>
                Overview
              </Link>
              <Link to="/" className={`app-nav-link ${onJobs ? "active" : ""}`}>
                Jobs
              </Link>
              <Link to="/actors" className={`app-nav-link ${onActors ? "active" : ""}`}>
                Actors
              </Link>
              <Link to="/cluster" className={`app-nav-link ${onCluster ? "active" : ""}`}>
                Cluster
              </Link>
              <Link to="/internal-runs" className={`app-nav-link ${onInternal ? "active" : ""}`}>
                Internal runs
              </Link>
            </nav>
          </div>
          <button type="button" className="kbd-hint" onClick={() => window.dispatchEvent(new Event("raywatch:open-palette"))}>
            <kbd>⌘</kbd>
            <kbd>K</kbd>
            <span>Search</span>
          </button>
        </div>
      </header>
      <div className="app-body">
        <div className="page-container">{children}</div>
      </div>
      <CommandPalette />
    </div>
  );
}
