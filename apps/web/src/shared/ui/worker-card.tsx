type WorkerCardProps = {
  workerId: string | null;
  activeTaskId?: string | null;
};

export function WorkerCard({ workerId, activeTaskId }: WorkerCardProps) {
  if (!workerId) {
    return <p className="muted">No worker assigned.</p>;
  }
  return (
    <div className="entity-card">
      <h4>Worker</h4>
      <dl className="meta-grid compact">
        <dt>Worker ID</dt>
        <dd className="mono">{workerId}</dd>
        {activeTaskId && (
          <>
            <dt>Active task</dt>
            <dd className="mono">{activeTaskId}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
