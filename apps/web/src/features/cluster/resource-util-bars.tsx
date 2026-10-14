import type { ResourceUtilization } from "@/shared/api/client";

type ResourceUtilBarsProps = {
  utilization: ResourceUtilization;
};

function pct(used: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, (used / total) * 100);
}

function Bar({ label, used, total, format }: { label: string; used: number; total: number; format: (n: number) => string }) {
  const percent = pct(used, total);
  return (
    <div className="util-bar-row">
      <div className="util-bar-label">
        <span>{label}</span>
        <span className="muted small">{format(used)} / {format(total)}</span>
      </div>
      <div className="util-bar-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="util-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ResourceUtilBars({ utilization }: ResourceUtilBarsProps) {
  const gib = (n: number) => `${(n / 1024 ** 3).toFixed(2)} GiB`;
  return (
    <section className="util-bars" aria-label="Cluster resource utilization">
      <h2 className="util-bars-title">Resource utilization</h2>
      <Bar label="CPU" used={utilization.cpu_used} total={utilization.cpu_total} format={(n) => n.toFixed(1)} />
      <Bar
        label="Memory"
        used={utilization.memory_bytes_used}
        total={utilization.memory_bytes_total}
        format={gib}
      />
      <Bar
        label="Object store"
        used={utilization.object_store_bytes_used}
        total={utilization.object_store_bytes_total}
        format={gib}
      />
    </section>
  );
}
