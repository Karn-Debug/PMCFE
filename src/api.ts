import { useQuery } from "@tanstack/react-query";
import type { Project, Row, User } from "./types";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const result = await fetch("/api" + url, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  if (!result.ok) {
    const data = await result
      .json()
      .catch(() => ({ error: "The server could not be reached" }));
    throw new ApiError(result.status, data.error || "Request failed");
  }
  return result.status === 204 ? (undefined as T) : result.json();
}
export const json = (data: unknown) => JSON.stringify(data);
export const useProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/projects"),
  });
export const useTeam = () =>
  useQuery({ queryKey: ["team"], queryFn: () => api<User[]>("/team") });
export function useRecords(
  module: string,
  filters: Record<string, string> = {},
) {
  const qs = new URLSearchParams(filters).toString();
  return useQuery({
    queryKey: ["records", module, filters],
    queryFn: () =>
      api<{ items: Row[]; total: number; page: number }>(
        "/records/" + module + "?" + qs,
      ),
  });
}
export const money = (value: unknown, compact = false) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: compact ? 1 : 2,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(Number(value || 0));
export const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
export const initials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]),
    cell = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
  const csv = [
    keys.map(cell).join(","),
    ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
  ].join("\r\n");
  const a = document.createElement("a"),
    url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
    );
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
