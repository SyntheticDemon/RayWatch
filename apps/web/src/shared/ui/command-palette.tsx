import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";

import { searchEntities } from "@/shared/api/client";
import {
  paletteItemsForQuery,
  pathForSearchHit,
  type PaletteNavItem,
} from "@/shared/ui/command-palette-nav";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<import("@/shared/api/client").SearchHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();

  const items = useMemo(() => paletteItemsForQuery(q, hits), [q, hits]);

  useEffect(() => {
    setActiveIndex(0);
  }, [q, hits, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onPalette = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("raywatch:open-palette", onPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("raywatch:open-palette", onPalette);
    };
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

  const close = () => {
    setOpen(false);
    setQ("");
    setHits([]);
  };

  const activate = (item: PaletteNavItem) => {
    close();
    if (item.type === "command") navigate(item.path);
    else navigate(pathForSearchHit(item.hit));
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length) setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length) setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter" && items.length) {
      e.preventDefault();
      activate(items[activeIndex]!);
    }
  };

  if (!open) return null;

  return (
    <div className="palette-backdrop" role="presentation" onClick={close}>
      <div
        className="palette-panel"
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          className="search-input palette-input"
          placeholder="Search jobs, tasks, actors, nodes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onInputKeyDown}
          autoFocus
        />
        <ul className="palette-list" role="listbox">
          {items.map((item, index) => {
            const active = index === activeIndex;
            if (item.type === "command") {
              return (
                <li key={`cmd-${item.id}`} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`palette-item ${active ? "palette-item-active" : ""}`}
                    onClick={() => activate(item)}
                  >
                    <span className="palette-kind">nav</span>
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            }
            const hit = item.hit;
            return (
              <li key={`${hit.kind}-${hit.id}`} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`palette-item ${active ? "palette-item-active" : ""}`}
                  onClick={() => activate(item)}
                >
                  <span className="palette-kind">{hit.kind}</span>
                  <span className="mono">{hit.id}</span>
                  <span className="muted truncate">{hit.label}</span>
                  {hit.status ? <span className="palette-status">{hit.status}</span> : null}
                </button>
              </li>
            );
          })}
          {q.trim().length >= 2 && hits.length === 0 && items.length === 0 && (
            <li className="muted">No matches</li>
          )}
        </ul>
      </div>
    </div>
  );
}
