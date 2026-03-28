"use client";

import { getMockDashboardBundle } from "@/lib/mock-data";
import type {
  AiReportDTO,
  DashboardBundle,
  PeriodMode,
  SessionBootstrapRequest,
  SessionDTO,
  SseEvent,
  TransactionDTO,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

type TransactionQuery = {
  from?: string;
  to?: string;
  type?: "INCOME" | "EXPENSE";
  category?: string;
};

type FetchOptions = RequestInit & {
  allowMock?: boolean;
};

async function fetchJSON<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export const apiClient = {
  async bootstrapSession(payload: SessionBootstrapRequest) {
    return fetchJSON<SessionDTO>("/session/bootstrap", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async getSession() {
    return fetchJSON<SessionDTO>("/session/me");
  },
  async getTransactions(query: TransactionQuery = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value);
      }
    });

    const qs = searchParams.toString();
    return fetchJSON<TransactionDTO[]>(`/transactions${qs ? `?${qs}` : ""}`);
  },
  async getReport(period: string) {
    return fetchJSON<AiReportDTO>(`/reports/${period}`);
  },
  async getDashboardBundle(mode: PeriodMode): Promise<DashboardBundle> {
    try {
      const session = await apiClient.getSession();
      const reportPeriod = mode === "month" ? "2026-03" : "2026-W13";
      const [transactions, report] = await Promise.all([
        apiClient.getTransactions(),
        apiClient.getReport(reportPeriod),
      ]);

      return { session, transactions, report };
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Using mock dashboard bundle because API is unavailable.", error);
      }

      return getMockDashboardBundle(mode);
    }
  },
  createFamilyEventSource(familyId: string) {
    return new EventSource(`${API_BASE_URL}/events/family/${familyId}`, {
      withCredentials: true,
    });
  },
};

export function parseFamilyEvent(event: MessageEvent<string>) {
  try {
    return JSON.parse(event.data) as SseEvent<unknown>;
  } catch {
    return null;
  }
}

