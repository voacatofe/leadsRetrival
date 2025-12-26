# Gap Analysis: Leads Retrieval App vs. Meta Ads Best Practices

Este documento detalha as lacunas identificadas entre a implementação atual (`server.js`, `app.js`) e os requisitos técnicos exigidos para uma aplicação robusta de Tech Provider Meta Ads, conforme descrito no tutorial de referência.

## 1. Resumo Executivo
A aplicação atual funciona como um protótipo "Happy Path" para um usuário administrador direto de uma página. No entanto, ela **falhará em cenários de produção reais**, especialmente para Agências e Tech Providers, devido à falta de persistência de dados, tratamento incorreto da hierarquia de Business Manager e ausência total de infraestrutura de Webhooks em tempo real.

---

## 2. Análise Detalhada das Lacunas

### 2.1. Autenticação e Gestão de Tokens
| Recurso | Implementação Atual | Requisito (Tutorial) | Severidade |
| :--- | :--- | :--- | :--- |
| **Persistência de Sessão** | Inexistente. O token reside na memória/sessão do Frontend ou é passado via URL. | **Obrigatória.** Tokens de Página Perpétuos devem ser armazenados criptografados no banco de dados para operações em background (Webhooks). | 🔴 Crítica |
| **Segurança** | Tokens são passados como query params (`GET /api/pages?access_token=...`). | **Falha de Segurança.** Tokens nunca devem transitar em URLs (ficam em logs). Falta também o uso de `appsecret_proof` nas chamadas ao Facebook. | 🔴 Crítica |
| **Renovação** | Depende do login do usuário no Frontend. | Tokens de Longa Duração devem ser obtidos no backend e trocados por Tokens de Página que nunca expiram. | 🟠 Alta |

### 2.2. Recuperação de Leads (Polling vs. Webhooks)
| Recurso | Implementação Atual | Requisito (Tutorial) | Severidade |
| :--- | :--- | :--- | :--- |
| **Método de Leitura** | Polling (`GET /{page_id}/leadgen_forms`). O usuário precisa clicar para ver. | **Real-time Webhooks.** A aplicação deve receber o lead passivamente assim que ele é criado no Facebook. | 🔴 Crítica |
| **Endpoints de Webhook** | Inexistentes. | Necessário `GET /webhooks` (verificação) e `POST /webhooks` (recebimento e processamento de `leadgen_id`). | 🔴 Crítica |
| **Subscrição** | Nenhuma lógica implementada. | O backend deve executar `POST /{page-id}/subscribed_apps` explicitamente para cada página conectada. | 🔴 Crítica |

### 2.3. Suporte a Agências (Business Manager)
| Recurso | Implementação Atual | Requisito (Tutorial) | Severidade |
| :--- | :--- | :--- | :--- |
| **Descoberta de Páginas** | `GET /me/accounts` (simples). | **Hierárquica.** Deve consultar `/me/businesses` -> `/{biz_id}/client_pages` para encontrar páginas delegadas a agências. | 🔴 Crítica |
| **Permissões** | Solicita escopos básicos via config_id ou default. | Necessita explicitamente de `business_management` para cenários de agência. | 🟠 Alta |
| **Identidade do Usuário** | Focada no User Profile. | Deve considerar **System Users** para operações escaláveis de Tech Providers. | 🟡 Média |

### 2.4. Arquitetura e Código
| Recurso | Implementação Atual | Requisito (Tutorial) | Severidade |
| :--- | :--- | :--- | :--- |
| **Banco de Dados** | Nenhum. | Essencial para guardar: Users, Pages, Page Tokens (criptografados), Leads recebidos (para deduplicação). | 🔴 Crítica |
| **Estrutura** | Monolito em `server.js` misturando rotas, lógica de API e configs. | Separação de responsabilidades: Services, Controllers, Models, Routes. | 🟠 Alta |

---

## 3. Plano de Refatoração e Arquitetura Sugerida

Para suportar a complexidade exigida, recomenda-se abandonar o arquivo único `server.js` e adotar uma estrutura modular baseada em serviços.

### 3.1. Tecnologias Necessárias
*   **Banco de Dados:** PostgreSQL ou MongoDB (para guardar tokens e leads).
*   **Filas (Opcional mas recomendado):** Redis/Bull (para processar webhooks assincronamente sem dar timeout na Meta).
*   **Criptografia:** Módulo para criptografar os tokens de acesso no banco (at-rest encryption).

### 3.2. Estrutura de Pastas Proposta

```
/src
  /config
    - database.js      # Conexão com DB
    - facebook.js      # Configs da API (App Secret, Versão)
  /controllers
    - AuthController.js     # Login, Callback, Troca de Token
    - PageController.js     # Listagem de páginas (Lógica /me/accounts + Business)
    - WebhookController.js  # Verificação e Recebimento de POST
  /models
    - User.js          # Dados do usuário do sistema
    - Page.js          # ID da Página, Nome, TOKEN PERPÉTUO
    - Lead.js          # LeadGen ID, dados do formulário (para evitar duplicatas)
  /services
    - FacebookAuthService.js  # Lógica de troca de tokens (Curto -> Longo -> Página)
    - FacebookGraphService.js # Chamadas gerais (appsecret_proof, axios instances)
    - BusinessManagerService.js # Lógica complexa de varredura de agências
    - LeadProcessingService.js  # Decriptografia de payload de webhook
  /routes
    - authRoutes.js
    - pageRoutes.js
    - webhookRoutes.js
  - app.js             # Entry point limpo
```

### 3.3. Próximos Passos (Roteiro de Implementação)

1.  **Infraestrutura:** Configurar um banco de dados local (SQLite para dev ou Docker com Postgres).
2.  **Refatoração de Auth:** Reescrever o fluxo de login para persistir o usuário e obter o Token de Longa Duração.
3.  **Módulo Business:** Implementar a lógica de varredura "Dual-Strategy" (Páginas Diretas + Páginas de Business).
4.  **Webhooks:** Criar os endpoints de validação e ingestão.
5.  **Interface:** Atualizar o Frontend para refletir o status da conexão (Conectado/Desconectado) ao invés de apenas "listar leads agora".
