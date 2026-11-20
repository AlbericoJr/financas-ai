export function allowedOrigins(env: Record<string, string | undefined>) {
    const ports = ['http://localhost:5173', 'http://127.0.0.1:5173'];
    if (env.NODE_ENV === 'production')
        return env.APP_ORIGIN ? [new URL(env.APP_ORIGIN).origin] : [];
    return [...ports, `http://localhost:${env.PORT || 3000}`, `http://127.0.0.1:${env.PORT || 3000}`];
}
export function originAllowed({ origin, fetchSite, method, contentType }: {
    origin?: string;
    fetchSite?: string;
    method: string;
    contentType?: string;
}, origins: string[]) {
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method))
        return true;
    if (fetchSite === 'cross-site')
        return false;
    if (!/^application\/json(?:\s*;|$)/i.test(contentType || ''))
        return false;
    if (!origin)
        return fetchSite !== 'same-site'; // no browser origin: native API clients
    try {
        return origins.includes(new URL(origin).origin);
    }
    catch {
        return false;
    }
}
export function csvCell(value: unknown) {
    let cell = String(value ?? '');
    if (/^[\s\uFEFF]*[=+@\-]/.test(cell))
        cell = "'" + cell;
    return '"' + cell.replaceAll('"', '""') + '"';
}
