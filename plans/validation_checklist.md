# Checklist de Validação (Smoke Test)

Este roteiro guia você pela validação ponta a ponta do sistema após o deploy inicial. Siga os passos na ordem para garantir que cada componente esteja funcionando corretamente.

---

## 1. Infraestrutura & Inicialização

**Objetivo:** Garantir que todos os containers estão rodando e se comunicando.

1.  **Subir os containers:**
    ```bash
    docker-compose up -d --build
    ```

2.  **Verificar status:**
    Execute o comando abaixo e verifique se `leads_app`, `leads_db` e `leads_redis` estão com status `Up`.
    ```bash
    docker ps
    ```

3.  **Checar Logs da Aplicação:**
    Verifique se a aplicação conectou ao banco e iniciou na porta 3000.
    ```bash
    docker-compose logs -f app
    ```
    *Sucesso:* Você deve ver mensagens como "Database connection established successfully" e "Server running on port 3000".
    *(Pressione `Ctrl+C` para sair dos logs)*

---

## 2. Autenticação (Frontend)

**Objetivo:** Validar a integração do Login com Facebook.

1.  Abra o navegador em [http://localhost:3000](http://localhost:3000).
2.  Abra o Console do Desenvolvedor (F12) para monitorar erros.
3.  Clique no botão **"Login com Facebook"**.
4.  Realize o login com uma conta de teste ou sua conta pessoal (vinculada ao App na Meta).
5.  **Confirmação:**
    *   A página deve recarregar ou atualizar.
    *   Seu nome e foto devem aparecer na tela.
    *   O botão deve mudar para "Logout" (ou similar).

---

## 3. Banco de Dados (Usuário)

**Objetivo:** Confirmar que o login persistiu os dados no Postgres.

1.  Acesse o container do banco:
    ```bash
    docker exec -it leads_db psql -U user -d leads_db
    ```
    *(Nota: Se você mudou as credenciais no `.env`, ajuste o comando acima)*

2.  Verifique a tabela de usuários:
    ```sql
    SELECT id, name, email, facebook_id FROM "Users";
    ```
    *Sucesso:* Você deve ver uma linha correspondente ao usuário que acabou de logar.

---

## 4. Conexão com Webhook (Meta Challenge)

**Objetivo:** Simular o teste que a Meta faz para validar a URL do seu Webhook.

1.  Abra um novo terminal (Git Bash ou similar).
2.  Execute o `curl` abaixo para simular a validação (substitua `meu_token_secreto_webhook` pelo valor que está no seu `.env`, se alterado):
    ```bash
    curl -X GET "http://localhost:3000/webhooks?hub.mode=subscribe&hub.verify_token=meu_token_secreto_webhook&hub.challenge=123456789"
    ```

3.  **Confirmação:**
    *   A resposta deve ser exatamente: `123456789`
    *   O status HTTP deve ser 200.

---

## 5. Fluxo de Leads (Simulação)

**Objetivo:** Testar o recebimento, processamento e salvamento de um Lead.

**Pré-requisito:** Para este teste funcionar 100% (incluindo buscar dados na API do Facebook), você precisaria de um `page_id` e `access_token` válidos no banco. Como é um teste local, o passo de buscar na API vai falhar se não tivermos esses dados reais, mas podemos testar se o *Webhook recebe e tenta processar*.

Para um teste "mockado" completo, precisaríamos inserir uma Página fake no banco primeiro.

1.  **Inserir Página de Teste (Mock):**
    No terminal do banco de dados (aberto no passo 3):
    ```sql
    INSERT INTO "Pages" (page_id, name, access_token, "UserId", created_at, updated_at)
    VALUES ('111222333', 'Página Teste', 'token_fake_123', 1, NOW(), NOW());
    ```
    *(Assumindo que o UserId 1 existe)*

2.  **Enviar Payload de Lead (Simulação):**
    Execute este `curl` no terminal:
    ```bash
    curl -X POST http://localhost:3000/webhooks \
    -H "Content-Type: application/json" \
    -d '{
      "object": "page",
      "entry": [
        {
          "id": "111222333",
          "time": 1699999999,
          "changes": [
            {
              "field": "leadgen",
              "value": {
                "created_time": 1700000000,
                "leadgen_id": "444555666",
                "page_id": "111222333",
                "form_id": "777888999"
              }
            }
          ]
        }
      ]
    }'
    ```

3.  **Verificar Logs do App:**
    ```bash
    docker-compose logs -f app
    ```
    *Esperado:*
    *   "Novo lead recebido: 444555666 da página 111222333"
    *   Provavelmente um erro de "FacebookService.getLeadDetails" (pois o token é fake), mas isso confirma que o fluxo chegou no controller!

4.  **Verificar Banco de Dados (Se o Mock funcionou ou se pulamos a validação de token):**
    ```sql
    SELECT * FROM "Leads";
    ```

---

## 6. Frontend (Visualização de Leads)

**Objetivo:** Ver se o lead aparece na tela.

1.  Recarregue a página `http://localhost:3000`.
2.  Se você implementou a listagem de leads, o lead simulado acima (se salvo com sucesso) deveria aparecer na tabela/lista.
3.  Caso tenha dado erro na API do Facebook (passo 5.3), o lead não terá sido salvo.
    *   *Solução para Teste Real:* Use a [Ferramenta de Teste de Leads da Meta](https://developers.facebook.com/tools/lead-ads-testing) apontando para o seu ngrok (se estiver expondo localhost).

---

## 7. Próximos Passos (Se tudo passou)

*   [ ] Configurar HTTPS (obrigatório para Meta Apps em produção).
*   [ ] Criar Túnel (ngrok) para permitir que a Meta acesse seu localhost durante o desenvolvimento.
*   [ ] Submeter App para Revisão (App Review) na Meta.