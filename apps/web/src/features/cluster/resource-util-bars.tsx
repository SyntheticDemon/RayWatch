import type { ResourceUtilization, UtilizationSample } from "@/shared/api/client";
import { Sparkline } from "@/shared/ui/sparkline";

type ResourceUtilBarsProps = {
  utilization: ResourceUtilization;
  history?: UtilizationSample[];
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

export function ResourceUtilBars({ utilization, history = [] }: ResourceUtilBarsProps) {
  const gib = (n: number) => `${(n / 1024 ** 3).toFixed(2)} GiB`;
  const cpuTrend = history.map((s) => (s.cpu_total > 0 ? s.cpu_used / s.cpu_total : 0));
  const memTrend = history.map((s) =>
    s.memory_bytes_total > 0 ? s.memory_bytes_used / s.memory_bytes_total : 0,
  );
  return (
    <section className="util-bars" aria-label="Cluster resource utilization">
      <div className="util-bars-header">
        <h2 className="util-bars-title">Resource utilization</h2>
        {cpuTrend.length >= 2 && (
          <div className="util-sparklines">
            <Sparkline values={cpuTrend} label="CPU utilization trend" />
            <Sparkline values={memTrend} label="Memory utilization trend" />
          </div>
        )}
      </div>
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
