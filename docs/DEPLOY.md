# Publicação: Vercel + API Node persistente

Esta configuração preserva SQLite, autenticação e os contratos existentes. Não execute o servidor SQLite em Vercel Functions. A Vercel hospeda o Vite e encaminha /api pelo vercel.ts. O servidor Node precisa de um disco persistente; Render é um exemplo (disco exige serviço pago). Nenhuma assinatura é criada por este guia.

## 1. Antes do deploy

- Use Node 22.x. Execute npm ci, npm test, npm run build.
- Confirme que .env, data/ e arquivos SQLite não estão rastreados (inclusive no histórico). Revogue e substitua qualquer chave que tenha sido exposta anteriormente.
- Gere SESSION_SECRET em seu computador: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
- Defina o domínio final da interface Vercel. Use exatamente essa origem HTTPS em APP_ORIGIN (sem barra final). URLs de preview não são automaticamente autorizadas.

## 2. API no Render

Crie um Web Service Node com este repositório, branch revisada e raiz do projeto. Build: npm ci. Start: npm start. Health check: /api/health. Selecione Node 22.x (NODE_VERSION=22.22.0 ou outra versão 22 disponível). Não crie o serviço sem revisar o custo e adicionar o disco persistente. Monte o disco em /var/data antes de iniciar e configure DATA_DIR=/var/data. Não use o disco efêmero gratuito para dados financeiros.

Variáveis no servidor (não na Vercel):
- NODE_ENV=production
- API_ONLY=true
- DATA_DIR=/var/data
- APP_ORIGIN=https://SEU-DOMINIO-VERCEL
- SESSION_SECRET=segredo gerado
- AI_PROVIDER=gemini
- GEMINI_API_KEY=chave real (ou vazio para modo local)
- GEMINI_MODEL=gemini-2.5-flash

PORT é fornecido pelo host. Configure TRUST_PROXY_HOPS somente após verificar a cadeia real Vercel/Render; valide limites de requisição por IP sem confiar arbitrariamente em cabeçalhos fornecidos por clientes. Não coloque chaves no código, no frontend ou nos logs. A presença de um diretório não comprova que ele é um volume persistente: confirme o mount no painel do serviço.

O banco inicia vazio. Para preservar dados locais, interrompa as escritas, faça backup consistente via SQLite backup API e restaure no volume privado antes de liberar o serviço; nunca envie o banco pelo GitHub. Faça backups consistentes e teste recuperação.

## 3. Vercel

Importe o repositório. Framework Vite, raiz ./, build npm run build, saída dist, Node 22.x, instalação npm ci. Em Environment Variables, adicione API_ORIGIN=https://ENDERECO-REAL-DA-API (sem caminho ou credenciais). vercel.ts valida essa origem e encaminha /api/:path*. Não adicione outro vercel.json em paralelo. Configure o domínio definitivo no servidor e redeploy após mudanças de variáveis. Não use VITE_GEMINI_API_KEY nem inclua chaves no projeto Vite.

## 4. Validação em ambiente de teste

- Abra /api/health pela URL da API e depois pelo domínio Vercel. Ambas devem retornar JSON.
- Cadastre dois usuários de teste; confirme cookie HttpOnly, Secure, SameSite e isolamento entre contas (inclusive alterações/exclusões por ID).
- Faça login, cadastre receita/despesa, meta e contribuição, consulte relatório, confirme/cancele uma ação do chat e exporte CSV.
- Teste o Gemini com uma chave válida, verifique /api/ai/status autenticado e confirme que não há chave em JS, Network ou mensagens de erro.
- Reinicie/republique o servidor e confirme persistência. Teste logout e backup/restore.
- Verifique npm audit, logs, rate limits, privacidade, recuperação de conta e autorização antes de liberar dados reais.

É necessário consentimento para o envio de mensagens/resumos financeiros ao provedor externo. Não há garantia de prontidão comercial antes dos testes integrados. Uma migração futura para PostgreSQL/Supabase permitiria adaptar a API para serverless e reduzir dependência de disco local.
