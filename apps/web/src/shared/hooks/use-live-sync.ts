import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useLiveSync(jobId?: string) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const path = jobId ? `/ws/live?job_id=${encodeURIComponent(jobId)}` : "/ws/live";
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}${path}`;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      ws = new WebSocket(url);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        retry = setTimeout(connect, 3000);
      };
      ws.onmessage = () => {
        queryClient.invalidateQueries({ queryKey: jobId ? ["job", jobId] : ["jobs"] });
        if (jobId) {
          queryClient.invalidateQueries({ queryKey: ["job-tasks", jobId] });
          queryClient.invalidateQueries({ queryKey: ["job-logs", jobId] });
        }
      };
    };

    connect();
    return () => {
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, [jobId, queryClient]);

  return { connected };
}
