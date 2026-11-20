# Finanças AI | React + TypeScript + Vite

Aplicativo de finanças pessoais com dashboard, autenticação, transações, chat Gemini (ou OpenAI / local), metas, relatórios e CSV. CSS tradicional, layout responsivo, tema claro/escuro. A API Express conserva o esquema e o arquivo SQLite da versão anterior.

## 1. Executar no Windows / VS Code

Requisitos: Node.js 22.12 ou superior (recomendado 22 LTS atualizado), npm e terminal PowerShell.

```powershell
npm install
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Cole o resultado em `SESSION_SECRET` no `.env`. Se você já possui o arquivo `.env`, preserve-o e não execute `Copy-Item` sobre ele. Configure a chave Gemini somente no `.env` da API. Sem chave, o assistente usa as regras locais. O modelo é configurável; confirme a disponibilidade para sua conta.

```dotenv
PORT=3000
NODE_ENV=development
SESSION_SECRET=SUBSTITUA_POR_UMA_CHAVE_SEGURA
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
APP_ORIGIN=
API_ONLY=false
DATA_DIR=
TRUST_PROXY_HOPS=
```

```powershell
npm run dev
```

Abra http://localhost:5173. A API fica na porta 3000. O proxy do Vite encaminha `/api` ao Express. Não é preciso criar `dist` para desenvolver. Se mudar PORT, ajuste também o destino do proxy no Vite. O `npm run build` verifica tipos do frontend e gera `dist/`.

## 2. Atualizar a versão anterior sem perder dados

Desligue os servidores. Faça uma cópia segura da pasta `data/` inteira, incluindo eventuais arquivos WAL/SHM, e do `.env`. Não coloque esses arquivos em Git ou no ZIP. Extraia esta versão em uma nova pasta, copie o `.env` e a pasta `data/` para a raiz do novo projeto e rode os comandos de instalação. O arquivo `data/financas.sqlite` continua usando o mesmo esquema. Guarde a versão anterior até concluir os testes.

## 3. Organização

```
src/
  components/   UI compartilhada, formulários, modal e proteção do chat
  pages/        Auth, Dashboard, Chat, Transactions, Goals, Reports, Profile
  hooks/        Gerenciamento dos dados, ações e tema
  layout/       Barra de navegação superior
  services/     Cliente HTTP e tratamento de erros
  types/        Contratos e tipos de domínio
  lib/          Formatação, categorias, navegação
  styles/       CSS e identidade visual
  App.tsx       Composição das telas
  main.tsx      Inicialização
server/
  app.ts        API Express e rotas
  db/           Conexão e schema SQLite
  lib/          Regras de segurança
  services/     Integração de IA, somente servidor
tests/          Testes unitários de segurança e IA
vite.config.ts  Vite e proxy de desenvolvimento
vercel.ts       Configuração de deploy do frontend e rewrite da API
```

## 4. Publicação na Vercel (dois serviços)

**Não publique a API SQLite em uma Vercel Function usando um arquivo local:** o filesystem da função não oferece durabilidade e compartilhamento entre instâncias. Esta entrega mantém a compatibilidade com o banco existente e usa a Vercel para o frontend, com uma API Node em um host que ofereça disco persistente. Não existe ainda migração para banco remoto nem deploy efetivo. Você precisará de um host externo para o Express + SQLite (VPS ou outro serviço Node com volume persistente; verifique custos). Use uma única instância para a API SQLite, com backups e HTTPS.

### A. Hospedar a API

1. Envie o código ao repositório, sem `.env`, sem banco, sem `dist` e sem `node_modules`.
2. No host Node configure a instalação `npm install`, comando `npm start` e um volume persistente. Não é preciso instalar ou compilar o frontend para a API isolada.
3. Cadastre as variáveis abaixo no ambiente privado do host. `APP_ORIGIN` deve ser a origem HTTPS exata do frontend Vercel. `PORT` geralmente é fornecida pelo próprio host; siga sua configuração. `DATA_DIR` deve apontar ao volume persistente real, jamais a uma pasta temporária. `TRUST_PROXY_HOPS` só deve ser definido conforme a topologia de proxies confiáveis do host.

```dotenv
NODE_ENV=production
API_ONLY=true
SESSION_SECRET=SEGREDO_GERADO_NO_TERMINAL
AI_PROVIDER=gemini
GEMINI_API_KEY=CHAVE_REAL_GEMINI
GEMINI_MODEL=gemini-2.5-flash
APP_ORIGIN=https://seu-front-end.vercel.app
DATA_DIR=/caminho/do/volume/persistente
```

4. Confirme que `https://seu-host-api.example/api/health` retorna JSON com `ok: true`. Se for transportar dados existentes, faça migração/backup seguro diretamente no volume; não utilize GitHub. Não exponha o arquivo SQLite por uma rota pública.

### B. Hospedar o React na Vercel

1. Importe o mesmo repositório na Vercel, com Root Directory na raiz e Framework Preset Vite. Escolha Node 22.x. Build Command `npm run build`, Output Directory `dist`.
2. Cadastre `API_ORIGIN` nas Environment Variables da Vercel (somente o endereço HTTPS da API, sem caminho). Exemplo fictício: `https://api.seudominio.com`. O arquivo `vercel.ts` gera o rewrite `/api/*` para o host. A Vercel não precisa receber a chave Gemini nem acessar o SQLite neste desenho. Não use prefixo VITE_ em nenhum segredo.
3. Faça o deploy. Se o domínio público mudar, ajuste `APP_ORIGIN` no host da API e reinicie. Para ambientes Preview use uma API separada com a origem exata correspondente; esta versão autoriza apenas uma origem de produção.
4. Teste registro, login, cookies HttpOnly/Secure, leitura e escrita pela origem correta, logout, chat, metas e persistência dos dados após reiniciar o servidor. Verifique que `/api/health` via Vercel retorna JSON e que `/api/rota-inexistente` retorna 404 JSON.

Referências: https://vercel.com/docs/frameworks/frontend/vite ; https://vercel.com/docs/routing/rewrites ; https://vercel.com/docs/project-configuration/vercel-ts ; https://vercel.com/docs/marketplace-storage .

### Publicar todos os serviços na Vercel

Para uma arquitetura integralmente serverless, será necessário migrar o acesso síncrono ao SQLite para uma base remota durável (por exemplo PostgreSQL ou Turso), reimplementar o ciclo de conexão da API e validar transações concorrentes. Isso NÃO foi realizado nesta versão para não substituir silenciosamente o banco funcional anterior.

## 5. Testes e segurança

```powershell
npm test
npm run typecheck
npm run build
npm audit
```

Use Node 22.12+ com a opção de remoção de tipos, já presente nos scripts do servidor. O TypeScript do frontend usa `strict: true`. O backend foi convertido para `.ts` para manutenção, com tipos em fronteiras importantes, mas a checagem semântica completa e estrita do servidor ainda não foi validada. Não há chave real no pacote. `.env` e `data/` ficam ignorados. Operações são autorizadas por usuário, cookies HttpOnly/SameSite/Secure em produção, confirmação para gravações do chat e proteção de origem preservada. Os endpoints de API retornam `Cache-Control: private, no-store`.

**Privacidade:** quando Gemini/OpenAI está ativo, a mensagem e o resumo financeiro agregado do usuário são enviados ao provedor. Informe essa prática aos usuários, revise as condições de dados/LGPD e não use dados reais sem os testes finais. A IA não tem acesso direto ao banco, e não realiza transferências bancárias. Não foi implementada recuperação de senha por e-mail.

Em 20/11/2026: 10 testes unitários anteriores executados com sucesso no ambiente de revisão; sintaxe TypeScript verificada. A resolução do registry npm falhou neste ambiente, então a instalação, verificação semântica com dependências reais, build Vite, auditoria npm, verificação visual no navegador, testes integrados e deploy Vercel ainda precisam ser executados. Não há validação ponta a ponta ou garantia de prontidão comercial.
