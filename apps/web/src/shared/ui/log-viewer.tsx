import { useMemo, useState } from "react";

import { Button, Input, Select } from "@/shared/ui/primitives";

type LogLevel = "ALL" | "ERROR" | "WARN" | "INFO" | "DEBUG";

type LogViewerProps = {
  text: string;
  errorMessage?: string | null;
  pollPaused: boolean;
  onTogglePause: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

function lineLevel(line: string): LogLevel {
  const upper = line.toUpperCase();
  if (upper.includes("ERROR") || upper.includes("FAILED") || upper.includes("TRACEBACK")) {
    return "ERROR";
  }
  if (upper.includes("WARN") || upper.includes("WARNING")) {
    return "WARN";
  }
  if (upper.includes("DEBUG")) {
    return "DEBUG";
  }
  return "INFO";
}

export function LogViewer({
  text,
  errorMessage,
  pollPaused,
  onTogglePause,
  onRefresh,
  isRefreshing,
}: LogViewerProps) {
  const [level, setLevel] = useState<LogLevel>("ALL");
  const [filter, setFilter] = useState("");
  const [wrap, setWrap] = useState(true);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const lines = useMemo(() => text.split("\n"), [text]);
  const visible = useMemo(() => {
    return lines.filter((line) => {
      if (level !== "ALL" && lineLevel(line) !== level) {
        return false;
      }
      if (filter && !line.toLowerCase().includes(filter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [lines, level, filter]);

  const copyAll = async () => {
    const payload = visible.join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setCopyHint("Copied");
    } catch {
      setCopyHint("Copy blocked — select text in the panel");
    }
    window.setTimeout(() => setCopyHint(null), 2500);
  };

  return (
    <div className="log-panel">
      {errorMessage && (
        <p className="log-error-banner" role="alert">
          {errorMessage}
        </p>
      )}
      <div className="log-toolbar">
        <Select
          aria-label="Log level"
          value={level}
          onChange={(e) => setLevel(e.target.value as LogLevel)}
        >
          <option value="ALL">All levels</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
          <option value="DEBUG">DEBUG</option>
        </Select>
        <Input
          className="log-filter-input"
          placeholder="Filter lines…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter log lines"
        />
        <Button variant="secondary" size="sm" onClick={onTogglePause}>
          {pollPaused ? "Resume tail" : "Pause tail"}
        </Button>
        {onRefresh && (
          <Button variant="secondary" size="sm" disabled={isRefreshing} onClick={onRefresh}>
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => setWrap((w) => !w)}>
          {wrap ? "No wrap" : "Wrap"}
        </Button>
        <Button variant="secondary" size="sm" onClick={copyAll}>
          Copy filtered
        </Button>
        {pollPaused && <span className="log-toolbar-hint">Tail paused</span>}
        {copyHint && <span className="log-toolbar-hint">{copyHint}</span>}
      </div>
      <pre className={`log-viewer ${wrap ? "log-wrap" : ""}`}>
        {errorMessage && !text
          ? "(no log body — use Refresh after fixing API or switching to live Ray jobs)"
          : visible.length
            ? visible.join("\n")
            : "(no lines match filter)"}
      </pre>
    </div>
  );
}
