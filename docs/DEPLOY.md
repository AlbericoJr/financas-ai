# Publicação da versão local

O app abre o dashboard sem login. Dados persistem no localStorage por navegador e domínio; não há sincronização nem importação automática do Supabase. O chat usa interpretação local por padrão. Não compartilhe um armazenamento de navegador com outros usuários. Exporte CSV para backup de transações.

Vercel: preset Vite, raiz ./, npm ci, npm run build, dist, Node 22.x. Nenhuma variável Supabase é necessária para a interface local. O Gemini externo não está habilitado nesta versão sem autenticação: uma API pública sem controle de consumo persistente poderia gerar custos. Preserve o projeto Supabase e dados anteriores até decidir sobre migração/exportação.
