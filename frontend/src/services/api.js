// Base URL of the backend API, read from frontend/.env (VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL;

// Error thrown when a request to the backend fails.
// It keeps the HTTP status, so pages can react differently to 400, 409, etc.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Sends a request to the backend and returns the parsed JSON body.
// Throws an ApiError for error statuses and when the server cannot be reached.
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch fails this way when the backend is off or the browser blocks the call (CORS)
    throw new ApiError('Cannot reach the server. Please try again later.', 0);
  }

  // Some responses have no body (e.g. 204 from logout)
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    // The backend always answers errors as { error: '...' }
    throw new ApiError(data?.error ?? 'Something went wrong. Please try again.', response.status);
  }

  return data;
}