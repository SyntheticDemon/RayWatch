import { useCallback, useEffect, useRef, useState } from "react";

import { fetchJobLogs, type JobLogsResponse } from "@/shared/api/client";

const INITIAL_TAIL_LINES = 400;

type UseJobLogsOptions = {
  paused: boolean;
  pollMs: number;
  /** When set and not `fixture`, tail live logs via `/ws/job-logs` instead of HTTP poll. */
  clusterEpoch?: string;
};

function applyLogBody(
  incremental: boolean,
  prevText: string,
  prevLength: number,
  body: JobLogsResponse,
): { text: string; length: number } | null {
  if (body.content_length < prevLength) {
    return { text: body.logs, length: body.content_length };
  }
  if (incremental && body.content_offset === prevLength && body.logs) {
    return { text: prevText + body.logs, length: body.content_length };
  }
  if (incremental && body.content_length === prevLength && !body.logs) {
    return null;
  }
  return { text: body.logs, length: body.content_length };
}

function appendLogChunk(prev: string, chunk: string): string {
  if (!chunk) return prev;
  if (!prev) return chunk;
  if (prev.endsWith(chunk) || chunk.startsWith(prev)) {
    return chunk.length > prev.length ? chunk : prev;
  }
  return prev + chunk;
}

export function useJobLogs(jobId: string, options: UseJobLogsOptions) {
  const { paused, pollMs, clusterEpoch } = options;
  const useRayTail = Boolean(clusterEpoch && clusterEpoch !== "fixture");
  const [text, setText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const contentLengthRef = useRef(0);
  const textRef = useRef("");

  const load = useCallback(
    async (incremental: boolean) => {
      if (!jobId) return;
      setFetching(true);
      try {
        const body = await fetchJobLogs(
          jobId,
          incremental && contentLengthRef.current > 0
            ? { after_offset: contentLengthRef.current }
            : { tail_lines: INITIAL_TAIL_LINES },
        );
        setErrorMessage(body.error_message);
        const applied = applyLogBody(
          incremental,
          textRef.current,
          contentLengthRef.current,
          body,
        );
        if (applied) {
          textRef.current = applied.text;
          contentLengthRef.current = applied.length;
          setText(applied.text);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load logs");
      } finally {
        setLoading(false);
        setFetching(false);
      }
    },
    [jobId],
  );

  useEffect(() => {
    contentLengthRef.current = 0;
    textRef.current = "";
    setText("");
    setErrorMessage(null);
    setLoading(true);
    void load(false);
  }, [jobId, load]);

  useEffect(() => {
    if (paused || !jobId || useRayTail) return;
    const id = window.setInterval(() => void load(true), pollMs);
    return () => window.clearInterval(id);
  }, [paused, jobId, pollMs, load, useRayTail]);

  useEffect(() => {
    if (paused || !jobId || !useRayTail) {
      setStreaming(false);
      return;
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/ws/job-logs?job_id=${encodeURIComponent(jobId)}`;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      ws = new WebSocket(url);
      ws.onopen = () => setStreaming(true);
      ws.onclose = () => {
        setStreaming(false);
        retry = setTimeout(connect, 3000);
      };
      ws.onerror = () => setStreaming(false);
      ws.onmessage = (event) => {
        const chunk = String(event.data);
        const next = appendLogChunk(textRef.current, chunk);
        textRef.current = next;
        contentLengthRef.current = next.length;
        setText(next);
      };
    };

    connect();
    return () => {
      if (retry) clearTimeout(retry);
      ws?.close();
      setStreaming(false);
    };
  }, [paused, jobId, useRayTail]);

  const refresh = useCallback(() => {
    contentLengthRef.current = 0;
    textRef.current = "";
    return load(false);
  }, [load]);

  const tailFromSync = useCallback(() => {
    if (!paused && !useRayTail) void load(true);
  }, [load, paused, useRayTail]);

  return {
    text,
    errorMessage,
    loading,
    fetching,
    streaming,
    refresh,
    tailFromSync,
  };
}
