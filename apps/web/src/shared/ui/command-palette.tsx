import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { searchEntities, type SearchHit } from "@/shared/api/client";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      searchEntities(q.trim())
        .then((r) => setHits(r.items))
        .catch(() => setHits([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [open, q]);

  if (!open) return null;

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQ("");
    if (hit.kind === "job") navigate(`/jobs/${hit.id}`);
    else if (hit.job_id) navigate(`/jobs/${hit.job_id}?task=${hit.id}`);
    else navigate(`/tasks/${hit.id}`);
  };

  return (
    <div className="palette-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <div
        className="palette-panel"
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          className="search-input palette-input"
          placeholder="Search job or task id…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <ul className="palette-list">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.id}`}>
              <button type="button" className="palette-item" onClick={() => go(hit)}>
                <span className="palette-kind">{hit.kind}</span>
                <span className="mono">{hit.id}</span>
                <span className="muted truncate">{hit.label}</span>
              </button>
            </li>
          ))}
          {q.trim().length >= 2 && hits.length === 0 && <li className="muted">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
