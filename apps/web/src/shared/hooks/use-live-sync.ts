import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { JobResponse, SyncMeta } from "@/shared/api/client";

type LiveSyncMessage = {
  type?: string;
  sync?: SyncMeta;
  job?: JobResponse["job"];
};

type UseLiveSyncOptions = {
  onSync?: () => void;
};

export function useLiveSync(jobId?: string, options?: UseLiveSyncOptions) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const onSyncRef = useRef(options?.onSync);
  onSyncRef.current = options?.onSync;

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
      ws.onmessage = (event) => {
        let message: LiveSyncMessage | null = null;
        try {
          message = JSON.parse(event.data as string) as LiveSyncMessage;
        } catch {
          message = null;
        }

        if (message?.type === "sync") {
          onSyncRef.current?.();
          if (!jobId) {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
          } else if (message.job) {
            queryClient.setQueryData<JobResponse>(["job", jobId], (prev) => {
              const sync = message.sync ?? prev?.sync;
              if (!sync) return prev;
              return { job: message.job!, sync };
            });
            queryClient.invalidateQueries({ queryKey: ["job-tasks", jobId] });
          } else {
            queryClient.invalidateQueries({ queryKey: ["job", jobId] });
            queryClient.invalidateQueries({ queryKey: ["job-tasks", jobId] });
          }
          return;
        }

        queryClient.invalidateQueries({ queryKey: jobId ? ["job", jobId] : ["jobs"] });
        if (jobId) {
          queryClient.invalidateQueries({ queryKey: ["job-tasks", jobId] });
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
