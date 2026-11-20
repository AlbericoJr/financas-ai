# Finanças AI — Vercel + Supabase (4.0)
Projeto remoto: https://supabase.com/dashboard/project/fleqfnpbbbtqitfpjlrf.
A API usa Supabase Auth e PostgREST com o JWT do usuário, respeitando RLS. A chave secreta é usada exclusivamente no servidor para exclusão de conta e cota do Gemini. Nenhuma chave pertence ao Vite.
## Executar
Node 22.x, npm ci, copie .env.example para .env, preencha as chaves do projeto; npm run dev. npm test e npm run build.
## Vercel
Importe este repositório, selecione a branch da migração, preset Vite, root ./, Node 22.x, npm ci, npm run build, dist. Defina SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, AI_PROVIDER, GEMINI_API_KEY, GEMINI_MODEL e APP_ORIGIN com a origem HTTPS definitiva. Não use prefixo VITE_. Remova API_ORIGIN, SESSION_SECRET, DATA_DIR, API_ONLY e variáveis OPENAI_* antigas se estiverem cadastradas; PORT é apenas local.
Em Supabase Authentication > URL Configuration, configure Site URL e redirects para a origem da aplicação. Mantenha confirmação de e-mail ativada; verifique o envio SMTP e limites de e-mail. Cadastro sem sessão orienta a confirmar e voltar ao login. Recuperação de senha ainda requer fluxo de interface.
## Verificações antes da liberação
Faça cadastro, confirmação, login, recarga, logout, edição e exclusão; use duas contas para comprovar isolamento. Teste receitas, despesas, metas, relatórios, confirmação concorrente de chat e Gemini real. Verifique /api/health e /api/ai/status autenticado. O limite por usuário de IA é persistente (25/hora). Limite de login no processo não é global; configure proteção de abuso no provedor e Vercel. Sessão permanece em cookies HttpOnly; quando expirar, o bootstrap /me pode renovar. Recarregue ao expirar durante o uso. Não importe dados SQLite sem backup e mapeamento de novas contas. A migração não importou dados reais.
Não publique para usuários reais até os testes completos, privacidade/consentimento para envio de resumos financeiros à IA, recuperação de conta e revisão de segurança estarem aprovados.

## Diagnóstico de API
Abra /api/health no domínio publicado. A resposta deve ser JSON, com ok e supabaseConfigured verdadeiros. Isto verifica a presença da configuração, não a validade das chaves. HTML ou 404 indica problema de rota/deploy; 500 de plataforma exige logs da função. Confira o commit publicado e as variáveis no ambiente correspondente.
