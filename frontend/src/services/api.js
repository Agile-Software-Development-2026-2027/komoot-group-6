const API_URL = import.meta.env.VITE_API_URL;

// Errore generato quando una richiesta al backend non va a buon fine.
// Mantiene lo stato HTTP, consentendo alle pagine di reagire in modo diverso a codici come 400, 409, ecc.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Invia una richiesta al backend e restituisce il corpo JSON analizzato.
// Genera un ApiError in caso di stati di errore o quando non è possibile raggiungere il server.
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
    // in questo caso fetch non va a buon fine se il backend è spento o se il browser blocca la chiamata.
    throw new ApiError('Cannot reach the server. Please try again later.', 0);
  }

  // Alcune risposte sono prive di corpo (ad es. 204 in seguito a un logout).
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    // Il backend risponde sempre agli errori nel formato { error: '...' }
    throw new ApiError(data?.error ?? 'Something went wrong. Please try again.', response.status);
  }

  return data;
}