// Single place that decides where the backend lives.
// VITE_BACKEND_BASE_URL empty (default) = same-origin relative paths, as today.
const base = (import.meta.env.VITE_BACKEND_BASE_URL || "").replace(/\/+$/, "");

export const backendUrl = (path) => `${base}${path}`;
