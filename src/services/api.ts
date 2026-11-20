export class ApiError extends Error {
    constructor(message: string, public status: number) { super(message); }
}
export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> { const res = await fetch('/api' + path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options }); let data; try {
    data = await res.json();
}
catch {
    throw new ApiError('Resposta inválida da API. Verifique se o servidor está em execução.', res.status);
} if (!res.ok)
    throw new ApiError(data?.error || `Erro ${res.status}`, res.status); return data as T; }
export const request = <T = unknown>(path: string, data: unknown, method = 'POST') => api<T>(path, { method, body: JSON.stringify(data) });
export const errorMessage = (e: unknown) => e instanceof Error ? e.message : 'Falha na operação.';
