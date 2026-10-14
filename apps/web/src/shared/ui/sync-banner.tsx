import type { SyncMeta } from "@/shared/api/client";

const STALE_MS = 15_000;

type SyncBannerProps = {
  sync: SyncMeta | undefined;
};

export function SyncBanner({ sync }: SyncBannerProps) {
  if (!sync) {
    return null;
  }
  const delay = sync.sync_delay_ms ?? 0;
  const stale = sync.ray_out_of_sync || delay > STALE_MS;
  return (
    <p className="sync-banner" data-out-of-sync={stale}>
      sync_delay {sync.sync_delay_ms ?? "—"} ms
      {sync.ray_out_of_sync ? " · ray_out_of_sync" : ""}
      {stale && !sync.ray_out_of_sync ? " · data may be stale" : ""}
    </p>
  );
}
