import { useMemo, useState } from "react";

type LogLevel = "ALL" | "ERROR" | "WARN" | "INFO" | "DEBUG";

type LogViewerProps = {
  text: string;
  errorMessage?: string | null;
  pollPaused: boolean;
  onTogglePause: () => void;
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

export function LogViewer({ text, errorMessage, pollPaused, onTogglePause }: LogViewerProps) {
  const [level, setLevel] = useState<LogLevel>("ALL");
  const [filter, setFilter] = useState("");
  const [wrap, setWrap] = useState(true);

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
    await navigator.clipboard.writeText(visible.join("\n"));
  };

  if (errorMessage) {
    return <p className="error">Could not fetch logs: {errorMessage}</p>;
  }

  return (
    <div className="log-panel">
      <div className="log-toolbar">
        <select
          aria-label="Log level"
          value={level}
          onChange={(e) => setLevel(e.target.value as LogLevel)}
        >
          <option value="ALL">All levels</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
          <option value="DEBUG">DEBUG</option>
        </select>
        <input
          className="search-input"
          placeholder="Filter text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="button" className="btn-secondary" onClick={onTogglePause}>
          {pollPaused ? "Resume tail" : "Pause tail"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setWrap((w) => !w)}>
          {wrap ? "No wrap" : "Wrap"}
        </button>
        <button type="button" className="btn-secondary" onClick={copyAll}>
          Copy filtered
        </button>
      </div>
      <pre className={`log-viewer ${wrap ? "log-wrap" : ""}`}>
        {visible.length ? visible.join("\n") : "(no lines match filter)"}
      </pre>
    </div>
  );
}
