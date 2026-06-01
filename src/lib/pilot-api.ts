// API service placeholders. Wire to real backend later.
// All functions resolve with mock data — the UI uses the local pilot-store for state.

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  // Placeholder — in MVP we don't actually hit the network.
  return new Promise((resolve) => setTimeout(() => resolve({} as T), 200));
}

export const authApi = {
  sendOtp: (mobile: string) => req(`${BASE}/auth/send-otp`, { method: "POST", body: JSON.stringify({ mobile }) }),
  verifyOtp: (mobile: string, otp: string) => req(`${BASE}/auth/verify-otp`, { method: "POST", body: JSON.stringify({ mobile, otp }) }),
};

export const missionApi = {
  list: () => req(`${BASE}/pilot/missions`),
  get: (id: string) => req(`${BASE}/missions/${id}`),
  start: (id: string) => req(`${BASE}/missions/${id}/start`, { method: "POST" }),
  pause: (id: string) => req(`${BASE}/missions/${id}/pause`, { method: "POST" }),
  complete: (id: string) => req(`${BASE}/missions/${id}/complete`, { method: "POST" }),
};

export const mediaApi = {
  upload: (id: string, formData: FormData) => req(`${BASE}/missions/${id}/upload-media`, { method: "POST", body: formData }),
  list: (id: string) => req(`${BASE}/missions/${id}/media`),
};

export const telemetryApi = {
  send: (id: string, payload: unknown) => req(`${BASE}/missions/${id}/telemetry`, { method: "POST", body: JSON.stringify(payload) }),
  list: (id: string) => req(`${BASE}/missions/${id}/telemetry`),
};

export const sprayApi = {
  submit: (id: string, payload: unknown) => req(`${BASE}/missions/${id}/spray-log`, { method: "POST", body: JSON.stringify(payload) }),
  get: (id: string) => req(`${BASE}/missions/${id}/spray-log`),
};

export const syncApi = {
  pending: () => req(`${BASE}/sync/pending`),
  all: () => req(`${BASE}/sync/all`, { method: "POST" }),
  retry: (itemId: string) => req(`${BASE}/sync/retry/${itemId}`, { method: "POST" }),
};
