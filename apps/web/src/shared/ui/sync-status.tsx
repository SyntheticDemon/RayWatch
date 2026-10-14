import type { SyncMeta } from "@/shared/api/client";

const STALE_MS = 15_000;

type SyncStatusProps = {
  sync: SyncMeta | undefined;
  connected: boolean;
  compact?: boolean;
};

export function SyncStatus({ sync, connected, compact }: SyncStatusProps) {
  const delay = sync?.sync_delay_ms;
  const stale = Boolean(sync?.ray_out_of_sync || (delay ?? 0) > STALE_MS);

  return (
    <div className="sync-status" data-stale={stale} data-compact={compact ?? false}>
      <span className="status-pill" data-live={connected}>
        <span className="status-dot" aria-hidden />
        {connected ? "Live" : "Polling"}
      </span>
      {sync && !compact && (
        <span className="sync-meta">
          {delay != null ? `${delay} ms lag` : "—"}
          {sync.ray_out_of_sync ? " · Ray unreachable" : stale ? " · Stale" : " · Fresh"}
        </span>
      )}
    </div>
  );
}
