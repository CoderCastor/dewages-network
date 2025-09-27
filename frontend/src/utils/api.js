// frontend/src/utils/api.js
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error(typeof data === "string" ? data : data?.message || "Request failed");
  }
  return data;
}

export async function postWorkerSignup(payload) {
  return request("/v1/worker/signup", { method: "POST", body: payload });
}


