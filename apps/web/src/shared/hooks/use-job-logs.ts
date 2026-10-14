import { useCallback, useEffect, useRef, useState } from "react";

import { fetchJobLogs, type JobLogsResponse } from "@/shared/api/client";

type UseJobLogsOptions = {
  paused: boolean;
  pollMs: number;
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

export function useJobLogs(jobId: string, options: UseJobLogsOptions) {
  const { paused, pollMs } = options;
  const [text, setText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const contentLengthRef = useRef(0);
  const textRef = useRef("");

  const load = useCallback(
    async (incremental: boolean) => {
      if (!jobId) return;
      setFetching(true);
      try {
        const body = await fetchJobLogs(jobId, {
          after_offset:
            incremental && contentLengthRef.current > 0 ? contentLengthRef.current : undefined,
        });
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
    if (paused || !jobId) return;
    const id = window.setInterval(() => void load(true), pollMs);
    return () => window.clearInterval(id);
  }, [paused, jobId, pollMs, load]);

  const refresh = useCallback(() => {
    contentLengthRef.current = 0;
    textRef.current = "";
    return load(false);
  }, [load]);

  const tailFromSync = useCallback(() => {
    if (!paused) void load(true);
  }, [load, paused]);

  return {
    text,
    errorMessage,
    loading,
    fetching,
    refresh,
    tailFromSync,
  };
}
