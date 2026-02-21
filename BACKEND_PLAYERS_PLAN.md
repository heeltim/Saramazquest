# Plano de back-end para players (contas com e-mail)

## 1. Objetivo
Definir uma estrutura simples e segura para:
- cadastro de players com e-mail e senha;
- login/logout;
- recuperação de conta;
- progressão e inventário vinculados ao player;
- base para escalar depois (social login, antifraude, etc.).

## 2. Fluxo da conta do player

### 2.1 Cadastro
1. Player informa e-mail + senha.
2. API valida formato de e-mail e força mínima da senha.
3. Senha é hasheada (Argon2id ou bcrypt com custo alto).
4. Conta é criada com status `PENDING_VERIFICATION`.
5. Sistema envia e-mail com token assinado de verificação.
6. Player confirma o e-mail e status vira `ACTIVE`.

### 2.2 Login
1. Player envia e-mail + senha.
2. API busca usuário por e-mail normalizado (`lowercase`).
3. Senha é verificada contra hash.
4. Em caso de sucesso, API emite:
   - `access_token` (curta duração, ex: 15 min);
   - `refresh_token` (duração maior, ex: 30 dias, rotacionável).
5. Sessão é registrada para auditoria (IP, user-agent, created_at).

### 2.3 Recuperação de senha
1. Player solicita "esqueci minha senha".
2. Sistema envia link de reset com token de uso único e expiração curta.
3. Player define nova senha.
4. Tokens/sessões antigas podem ser invalidadas por segurança.

## 3. Modelo de dados (MVP)

### Tabela `players`
- `id` (UUID, PK)
- `email` (único)
- `password_hash`
- `status` (`PENDING_VERIFICATION`, `ACTIVE`, `BANNED`)
- `created_at`, `updated_at`
- `last_login_at`

### Tabela `player_profiles`
- `player_id` (FK)
- `nickname` (único no jogo)
- `avatar_url`
- `locale`

### Tabela `player_progress`
- `player_id` (FK)
- `xp`
- `level`
- `gold`
- `checkpoint_story`

### Tabela `refresh_tokens`
- `id` (UUID)
- `player_id` (FK)
- `token_hash` (nunca guardar token puro)
- `expires_at`
- `revoked_at`
- `created_at`

### Tabela `email_verification_tokens`
- `id` (UUID)
- `player_id` (FK)
- `token_hash`
- `expires_at`
- `used_at`

## 4. Endpoints sugeridos

### Auth
- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

### Player
- `GET /players/me`
- `PATCH /players/me/profile`
- `GET /players/me/progress`
- `PATCH /players/me/progress`

## 5. Regras de segurança (mínimo obrigatório)
- Hash de senha forte (Argon2id preferencial).
- Rate limit por IP e por e-mail em login/register/reset.
- Validação e sanitização de input.
- JWT assinado com rotação de chave planejada.
- Refresh token com rotação + revogação por sessão.
- Logs de segurança sem expor dados sensíveis.
- CORS restrito ao domínio do jogo.
- HTTPS obrigatório em produção.

## 6. Estratégia de implementação (fases)

### Fase 1 (MVP funcional)
- Cadastro, verificação de e-mail, login, refresh e logout.
- Estrutura das tabelas `players`, `refresh_tokens`, `player_profiles`.
- Endpoint `GET /players/me`.

### Fase 2 (conta robusta)
- Recuperação de senha completa.
- Gestão de sessões ativas (listar/dispositivos e encerrar sessões).
- Observabilidade e trilha de auditoria.

### Fase 3 (escala e produto)
- Social login (Google/Apple/Steam, se fizer sentido).
- Anti-abuso (captcha adaptativo e detecção de brute force).
- Feature flags e rollout gradual.

## 7. Exemplo de stack para este projeto
Como o projeto atual é front estático, uma evolução simples:
- API: Node.js com Express ou Fastify;
- Banco: PostgreSQL;
- ORM/query builder: Prisma ou Knex;
- Cache/rate-limit: Redis;
- E-mail transacional: Resend, SendGrid ou SES;
- Deploy: Docker + serviço cloud com HTTPS.

## 8. Próximos passos práticos
1. Criar pasta `backend/` com API Node.
2. Definir schema inicial do banco com migrations.
3. Implementar `POST /auth/register` e `POST /auth/login`.
4. Integrar envio de e-mail de verificação.
5. Conectar front-end aos endpoints de auth.
6. Testes de integração para auth (happy path + falhas).
