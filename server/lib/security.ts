import crypto from 'node:crypto';
export function assertProductionConfig(env: Record<string, string | undefined>) {
    if (env.NODE_ENV !== 'production')
        return;
    const secret = env.SESSION_SECRET || '';
    if (secret.length < 32 || secret.includes('SUBSTITUA') || secret.includes('COLOQUE_AQUI') || secret.includes('CHANGE_ME')) {
        throw new Error('SESSION_SECRET forte é obrigatório em produção.');
    }
    if (env.API_ONLY === 'true') {
        if (!env.DATA_DIR?.trim() || !env.DATA_DIR.startsWith('/'))
            throw new Error('DATA_DIR absoluto em disco persistente é obrigatório para API_ONLY em produção.');
        const origin = new URL(env.APP_ORIGIN || '');
        if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash)
            throw new Error('APP_ORIGIN deve ser uma origem HTTPS sem caminho ou credenciais.');
    }
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.startsWith('VITE_')) {
        throw new Error('Configuração de chave de API inválida.');
    }
}
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
export function sessionToken() { return crypto.randomBytes(32).toString('base64url'); }
