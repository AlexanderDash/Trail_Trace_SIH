import type { ApiListResponse, BankRecord, DashboardSummary, HealthResponse, SystemInfo } from "@anvesh/shared";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${path}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => getJson<HealthResponse>("/health"),
  system: () => getJson<SystemInfo>("/system"),
  dashboard: () => getJson<DashboardSummary>("/dashboard/summary"),
  banks: () => getJson<ApiListResponse<BankRecord>>("/banks"),
};
