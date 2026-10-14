export function logLinePath(
  pathname: string,
  lineNo: number,
  query: Record<string, string> = {},
): string {
  const params = new URLSearchParams({ ...query, log_line: String(lineNo) });
  return `${pathname}?${params.toString()}`;
}

export function logLineUrl(
  pathname: string,
  lineNo: number,
  query: Record<string, string> = {},
): string {
  return `${window.location.origin}${logLinePath(pathname, lineNo, query)}`;
}
