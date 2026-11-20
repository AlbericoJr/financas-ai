// Vercel serves the Vite frontend; the API runs on a persistent Node host.
// API_ORIGIN is the backend's public HTTPS origin, not an API key.
const raw = process.env.API_ORIGIN;
if (!raw) throw new Error('Configure API_ORIGIN na Vercel antes do deploy (endereço HTTPS da API).');
const url = new URL(raw);
if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('API_ORIGIN deve ser uma origem HTTPS, sem caminho ou credenciais.');
}
export const config = {
  framework: 'vite',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  rewrites: [{ source: '/api/:path*', destination: `${url.origin}/api/:path*` }],
  headers: [
    { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    {
      source: '/(.*)', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" }
      ]
    }
  ]
};
