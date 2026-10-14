import { useEffect, useMemo, useRef, useState } from "react";

import { logLineUrl } from "@/shared/lib/log-line-link";
import { Button, Input, Select } from "@/shared/ui/primitives";

type LogLevel = "ALL" | "ERROR" | "WARN" | "INFO" | "DEBUG";

/** Cap DOM nodes so huge cluster logs do not freeze the tab. */
export const MAX_DOM_LOG_LINES = 2500;

export function capLogLinesForDom<T>(lines: T[], max = MAX_DOM_LOG_LINES): { domLines: T[]; hidden: number } {
  if (lines.length <= max) return { domLines: lines, hidden: 0 };
  return { domLines: lines.slice(-max), hidden: lines.length - max };
}

type LogViewerProps = {
  text: string;
  errorMessage?: string | null;
  pollPaused: boolean;
  onTogglePause: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  followTail?: boolean;
  deepLinkPath?: string;
  deepLinkQuery?: Record<string, string>;
  highlightLine?: number | null;
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
  followTail = false,
  deepLinkPath,
  deepLinkQuery,
  highlightLine,
}: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const [level, setLevel] = useState<LogLevel>("ALL");
  const [filter, setFilter] = useState("");
  const [wrap, setWrap] = useState(true);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const lines = useMemo(() => text.split("\n"), [text]);
  const visibleLines = useMemo(() => {
    const out: { line: string; lineNo: number }[] = [];
    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      if (level !== "ALL" && lineLevel(line) !== level) return;
      if (filter && !line.toLowerCase().includes(filter.toLowerCase())) return;
      out.push({ line, lineNo });
    });
    return out;
  }, [lines, level, filter]);

  const { domLines, hidden: hiddenLineCount } = capLogLinesForDom(visibleLines);

  useEffect(() => {
    if (!followTail || pollPaused) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [followTail, pollPaused, visibleLines.length, text]);

  useEffect(() => {
    if (!highlightLine) return;
    highlightRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightLine, visibleLines.length, text]);

  const downloadFiltered = () => {
    const blob = new Blob(
      [visibleLines.map((row) => row.line).join("\n")],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "job-logs.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyAll = async () => {
    const payload = visibleLines.map((row) => row.line).join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setCopyHint("Copied");
    } catch {
      setCopyHint("Copy blocked — select text in the panel");
    }
    window.setTimeout(() => setCopyHint(null), 2500);
  };

  const copyLineLink = async (lineNo: number) => {
    if (!deepLinkPath) return;
    const url = logLineUrl(deepLinkPath, lineNo, deepLinkQuery);
    try {
      await navigator.clipboard.writeText(url);
      setCopyHint(`Link to line ${lineNo} copied`);
    } catch {
      setCopyHint("Copy blocked");
    }
    window.setTimeout(() => setCopyHint(null), 2500);
  };

  const emptyMessage =
    errorMessage && !text
      ? "(no log body — use Refresh after fixing API or switching to live Ray jobs)"
      : "(no lines match filter)";

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
        <Button variant="secondary" size="sm" onClick={downloadFiltered}>
          Download
        </Button>
        {pollPaused && <span className="log-toolbar-hint">Tail paused</span>}
        {hiddenLineCount > 0 && (
          <span className="log-toolbar-hint">
            Showing last {MAX_DOM_LOG_LINES.toLocaleString()} of {visibleLines.length.toLocaleString()} lines
          </span>
        )}
        {copyHint && <span className="log-toolbar-hint">{copyHint}</span>}
      </div>
      <div ref={scrollRef} className={`log-viewer log-viewer-lines ${wrap ? "log-wrap" : ""}`}>
        {domLines.length === 0 ? (
          <p className="log-empty">{emptyMessage}</p>
        ) : (
          domLines.map(({ line, lineNo }) => {
            const highlighted = highlightLine === lineNo;
            return (
              <div
                key={lineNo}
                ref={highlighted ? highlightRef : undefined}
                className={`log-line ${highlighted ? "log-line-highlight" : ""}`}
                data-line={lineNo}
              >
                {deepLinkPath ? (
                  <button
                    type="button"
                    className="log-lineno"
                    title="Copy link to line"
                    onClick={() => void copyLineLink(lineNo)}
                  >
                    {lineNo}
                  </button>
                ) : (
                  <span className="log-lineno-static">{lineNo}</span>
                )}
                <span className="log-line-text">{line || " "}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
