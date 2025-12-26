# Roteiro de Implementação Técnica (Refatoração MVC & Meta Integration)

Este documento define o plano técnico para refatorar a aplicação atual em uma arquitetura robusta, escalável e compatível com as exigências da Meta (Tech Provider).

## 1. Nova Estrutura de Pastas (Arquitetura MVC)

A aplicação será reorganizada para separar responsabilidades, facilitando a manutenção e testes.

```text
/
├── src/
│   ├── config/             # Configurações de ambiente (DB, Meta API keys)
│   │   ├── database.js
│   │   └── meta.js
│   ├── controllers/        # Lógica de controle (recebe requisição -> chama model -> responde)
│   │   ├── authController.js
│   │   ├── pageController.js
│   │   └── webhookController.js
│   ├── models/             # Definição de dados e interações com Banco de Dados
│   │   ├── User.js
│   │   ├── Page.js
│   │   └── Lead.js
│   ├── routes/             # Definição de rotas da API
│   │   ├── authRoutes.js
│   │   ├── pageRoutes.js
│   │   └── webhookRoutes.js
│   ├── services/           # Lógica de negócio complexa e chamadas externas (Graph API)
│   │   ├── metaGraphService.js
│   │   └── tokenService.js
│   ├── middleware/         # Middlewares (Autenticação, validação, logging)
│   │   └── authMiddleware.js
│   ├── utils/              # Funções utilitárias
│   │   └── crypto.js
│   └── app.js              # Configuração principal do Express
├── public/                 # Arquivos estáticos (Frontend)
├── .env                    # Variáveis de ambiente (NÃO COMITAR)
├── server.js               # Ponto de entrada
└── package.json
```

---

## 2. Esquema do Banco de Dados

Utilizaremos uma estrutura relacional (SQL) para garantir integridade.

### Tabela: `users`
Armazena os dados do operador do sistema ou cliente que conectou o Facebook.
- `id` (PK): UUID ou Integer
- `facebook_user_id`: ID numérico do usuário no Facebook (chave estável)
- `name`: Nome do usuário
- `email`: Email (opcional, vindo do Facebook)
- `access_token`: Token de usuário (Long-Lived) - *Criptografado*
- `token_expires_at`: Data de expiração do token
- `created_at`: Timestamp

### Tabela: `pages`
Armazena as Páginas do Facebook conectadas e seus respectivos tokens perpétuos.
- `id` (PK): UUID ou Integer
- `facebook_page_id`: ID numérico da página (chave estável)
- `name`: Nome da página
- `access_token`: Token de Página (Perpétuo) - *Criptografado*
- `user_id` (FK): Referência ao usuário que conectou a página
- `is_connected`: Boolean (para soft delete/desconexão)
- `created_at`: Timestamp

### Tabela: `leads`
Armazena os leads recebidos para histórico e redundância.
- `id` (PK): UUID ou Integer
- `leadgen_id`: ID único do lead na Meta (usado para deduplicação)
- `form_id`: ID do formulário
- `page_id` (FK): Referência à tabela `pages`
- `created_time`: Data de criação do lead na Meta
- `payload`: JSON completo com os dados do lead (nome, email, telefone, etc.)
- `status`: (Ex: 'received', 'processed', 'synced_to_crm')
- `created_at`: Timestamp local

---

## 3. Infraestrutura & Variáveis de Ambiente

Para suportar a carga de webhooks e garantir a persistência segura, a infraestrutura será baseada em containers Docker.

### Stack Tecnológica
*   **Aplicação Principal:** Node.js (Express)
*   **Banco de Dados:** PostgreSQL (Substituindo SQLite/JSON files para produção)
*   **Fila/Cache:** Redis (Essencial para desacoplar o recebimento do webhook do seu processamento)

### Variáveis de Ambiente (.env)
A nova infraestrutura requer as seguintes configurações adicionais:

**Banco de Dados (Postgres):**
*   `POSTGRES_USER`
*   `POSTGRES_PASSWORD`
*   `POSTGRES_DB`
*   `DATABASE_URL` (ex: `postgresql://user:pass@db:5432/leads_db`)

**Redis:**
*   `REDIS_HOST` (ex: `redis`)
*   `REDIS_PORT` (ex: `6379`)

**Aplicação:**
*   `PORT` (ex: `3000`)
*   `NODE_ENV` (`development` ou `production`)

---

## 4. Ordem de Codificação (Step-by-Step)

### Fase 1: Fundação
1.  **Setup do Projeto:** Criar estrutura de pastas.
2.  **Configuração DB:** Configurar conexão com banco de dados (SQLite para dev / Postgres para prod) e criar migrações para as tabelas.
3.  **Variáveis de Ambiente:** Definir `.env` com `APP_ID`, `APP_SECRET`, `VERIFY_TOKEN`.

### Fase 2: Autenticação & Tokens (Crítica)
4.  **Rota de Login:** Implementar fluxo OAuth com Facebook Login for Business.
5.  **Troca de Token:** Implementar serviço para trocar *Short-Lived User Token* por *Long-Lived User Token*.
6.  **Persistência:** Salvar usuário e token de longa duração no banco.

### Fase 3: Gestão de Páginas e Formulários
7.  **Listagem de Páginas:** Implementar rota que consulta `/me/accounts` (e lógica de Business Manager se necessário) usando o token do usuário.
8.  **Obtenção de Token de Página:** Ao selecionar uma página, chamar endpoint específico para obter o *Page Access Token* (Perpétuo).
9.  **Listagem de Formulários:** Criar endpoint `GET /pages/:pageId/forms` que utiliza o Token da Página para buscar os formulários de cadastro (`leadgen_forms`) na Graph API.
10. **Frontend de Seleção:** Atualizar a interface para permitir que o usuário selecione a página e, em seguida, visualize e selecione os formulários desejados.
11. **Salvar Configuração:** Persistir a página conectada e a lista de formulários selecionados (se aplicável) no banco.

### Fase 4: Webhooks & Processamento de Leads (Fase 2 do Projeto)
12. **Endpoint de Verificação:** Criar rota `GET /webhooks` para responder ao `hub.challenge`.
13. **Subscrição:** Implementar chamada para `/{page-id}/subscribed_apps` para garantir o recebimento de eventos em tempo real.
14. **Processamento de Leads:** Criar rota `POST /webhooks` que:
    *   Recebe o `leadgen_id`.
    *   Busca o `page_access_token` no banco.
    *   Chama a Graph API para baixar os detalhes do lead.
    *   Salva o lead no banco.

---

## 5. Lógica Complexa: Troca de Tokens (Pseudo-código)

Esta lógica deve residir em `src/services/tokenService.js`.

```javascript
// Função para garantir token de longo prazo e obter tokens de página
async function handleUserLogin(shortLivedToken) {
    
    // 1. Trocar token de curto prazo por longo prazo (60 dias)
    const longLivedTokenData = await graphApi.get('/oauth/access_token', {
        grant_type: 'fb_exchange_token',
        client_id: process.env.APP_ID,
        client_secret: process.env.APP_SECRET,
        fb_exchange_token: shortLivedToken
    });

    const longLivedToken = longLivedTokenData.access_token;

    // 2. Obter dados do usuário
    const userData = await graphApi.get('/me', { access_token: longLivedToken });

    // 3. Salvar/Atualizar User no DB com longLivedToken
    await User.upsert({
        facebook_id: userData.id,
        access_token: longLivedToken
    });

    return userData;
}

// Função chamada quando o usuário seleciona uma página para conectar
async function connectPage(userId, pageId) {
    // 1. Recuperar token do usuário do banco
    const user = await User.findById(userId);
    
    // 2. Obter Token da Página (PERPÉTUO)
    // Nota: Usar o token do usuário para pedir o token da página específica
    const pageData = await graphApi.get(`/${pageId}`, {
        fields: 'access_token,name,id',
        access_token: user.access_token
    });

    // 3. Salvar Página e Token Perpétuo no DB
    await Page.upsert({
        facebook_page_id: pageData.id,
        name: pageData.name,
        access_token: pageData.access_token, // Este token não expira!
        user_id: userId
    });
    
    // NOTA: A subscrição de webhooks (subscribed_apps) será movida para uma etapa posterior ou
    // executada automaticamente aqui, dependendo da estratégia de UX definida na Fase 4.
}

// Nova função para buscar formulários
async function getPageForms(pageId, pageAccessToken) {
    const forms = await graphApi.get(`/${pageId}/leadgen_forms`, {
        access_token: pageAccessToken,
        fields: 'id,name,status,locale'
    });
    return forms;
}
```

## 6. Próximos Passos
Após aprovação deste roteiro, o modo "Code" iniciará a criação da estrutura de pastas e instalação das dependências.