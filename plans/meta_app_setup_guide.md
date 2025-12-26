# Guia de Configuração do Painel Meta for Developers (Tech Provider)

Este guia prático descreve o passo a passo para configurar seu aplicativo no painel da Meta. Siga estas instruções rigorosamente para evitar problemas de permissão e bloqueios futuros.

**Pré-requisitos:**
*   Uma conta pessoal no Facebook.
*   Acesso ao [Meta for Developers](https://developers.facebook.com/).
*   Um Business Manager (Portfólio de Negócios) criado.

---

## Passo 1: Criação do Aplicativo (A Escolha Crítica)

1.  Acesse "Meus Apps" e clique no botão verde **"Criar App"**.
2.  **Tela "O que você deseja que seu app faça?"**:
    *   Selecione **"Outro"** (ou a opção que mais se assemelha a "Gerenciar integrações de negócios" se a UI tiver mudado).
3.  **Tela "Selecionar um tipo de app"**:
    *   ⚠ **CRUCIAL:** Selecione **"Empresa" (Business)**.
    *   *Por que?* Apenas este tipo permite acesso às permissões `leads_retrieval` e ao produto "Login for Business". Não escolha "Consumidor" ou "Nenhum".
4.  **Tela "Detalhes"**:
    *   **Nome do App:** Escolha um nome profissional (ex: "Leads Integrator Pro"). Evite termos genéricos como "Teste" ou marcas registradas da Meta ("Face", "Insta").
    *   **Email de contato:** Seu email comercial.
    *   **Conta Empresarial:** Selecione seu Business Manager (Portfólio) verificado (ou em processo de verificação). Isso é obrigatório para o status de *Tech Provider*.
5.  Clique em **"Criar aplicativo"**.

---

## Passo 2: Configurações Básicas

1.  No menu lateral esquerdo, vá em **Configurações > Básico**.
2.  Anote (copie para um bloco de notas seguro) o **ID do Aplicativo** e a **Chave Secreta do Aplicativo** (App Secret). Vamos usar isso no arquivo `.env` do código.
3.  Preencha os campos obrigatórios para futura aprovação:
    *   **Domínio do App:** (Se ainda não tiver, deixe em branco por enquanto, mas precisará ser preenchido para ir para produção).
    *   **URL da Política de Privacidade:** Obrigatório para `leads_retrieval`. Use uma URL real ou gerada.
    *   **Categoria:** Selecione "Negócios e Páginas".
    *   **Ícone do App:** Carregue um logo 1024x1024 (passa credibilidade na hora do login).
4.  Clique em **"Salvar alterações"** (botão inferior).

---

## Passo 3: Adicionar "Facebook Login for Business"

Este é o motor de autenticação.

1.  No "Painel" (Dashboard), role até "Adicionar produtos ao seu app".
2.  Localize **"Login do Facebook para Empresas"** (Facebook Login for Business) e clique em **"Configurar"**.
    *   *Atenção:* Se não aparecer "for Business", selecione o "Login do Facebook" normal, mas mude para a configuração "Empresa" se solicitado.
3.  No menu lateral, sob "Login do Facebook...", clique em **Configurações**.
4.  **URIs de Redirecionamento do OAuth Válidos:**
    *   Aqui você deve colocar a URL exata para onde a Meta vai devolver o código de autorização.
    *   **Para Desenvolvimento:** Se estiver rodando localmente, você precisará de uma URL HTTPS. *Não use `localhost` diretamente se possível, a Meta frequentemente bloqueia ou exige HTTPS.*
    *   Recomendação: Use **Ngrok** ou similar. Ex: `https://seu-id-ngrok.ngrok-free.app/auth/callback`.
    *   Adicione também: `https://seu-dominio-producao.com/auth/callback` (quando tiver).
5.  Ative **"Login do OAuth do cliente"** e **"Login do OAuth da Web"**.
6.  Desative "Forçar HTTPS" (apenas se estiver tendo muitos problemas em dev, mas em produção é mandatório e geralmente já vem travado em Sim).
7.  **Salvar alterações**.

---

## Passo 4: Adicionar Produto "Webhooks"

Para receber os leads em tempo real.

1.  Volte ao "Painel" > "Adicionar produtos".
2.  Localize **"Webhooks"** e clique em **"Configurar"**.
3.  No dropdown "Selecionar um objeto", escolha **"Page"**.
4.  Clique em **"Inscrever-se neste objeto"** (Subscribe to this object).
    *   **URL de retorno de chamada (Callback URL):** Será a rota da sua API (ex: `https://seu-id-ngrok.ngrok-free.app/webhooks`). *Você só conseguirá salvar isso DEPOIS que seu código estiver rodando e respondendo ao `hub.challenge`.*
    *   **Verificar token (Verify Token):** Crie uma senha forte (ex: `meu_segredo_ultra_secreto_2025`). Anote isso para o `.env`.
5.  Por enquanto, apenas saiba onde fica. Não é possível salvar sem o código estar rodando.
6.  **Campos de inscrição:** Quando for configurar, você precisará assinar o campo **`leadgen`**.

---

## Passo 5: Permissões e Escopos (O Mapa da Mina)

Vá em **Revisão do App > Permissões e Recursos**. Aqui está a distinção entre "Funcionar pra mim" vs "Funcionar para Clientes".

### Acesso Padrão (Standard Access)
*   **Status Atual:** Seu app já tem isso por padrão.
*   **O que permite:** Testar tudo com usuários que têm uma função no App (Administrador, Desenvolvedor) ou no Business Manager dono do App.
*   **Ação:** Para a fase de desenvolvimento (Code Mode), **você não precisa pedir revisão ainda**. Basta adicionar você mesmo como usuário testador do app.

### Acesso Avançado (Advanced Access) - *O Alvo Futuro*
Para atender clientes externos (Tech Provider), você precisará solicitar Acesso Avançado para as seguintes permissões (prepare suas justificativas conforme o arquivo `Tutorial Meta Ads...`):

1.  **`leads_retrieval`**: *Essencial*. Para ler os dados do lead.
2.  **`pages_manage_ads`**: Para configurar o webhook na página do cliente.
3.  **`pages_show_list`**: Para listar as páginas no seu menu de seleção.
4.  **`pages_read_engagement`**: Útil para metadados.
5.  **`business_management`**: *Crítico para Tech Providers*. Para acessar páginas que pertencem a BMs de clientes (agências).

**Estratégia:** Desenvolva e valide tudo em Acesso Padrão. Só submeta para Revisão quando a UI estiver pronta para gravar o screencast.

---

## Passo 6: Usuário de Sistema (Configuração Avançada)

Se você planeja automação total server-to-server:

1.  No seu **Meta Business Suite** (Configurações do Negócio).
2.  Vá em **Usuários > Usuários do sistema**.
3.  Adicione um novo usuário, dê a função de "Admin".
4.  Clique em "Gerar novo token", selecione seu App e as permissões (`leads_retrieval`, etc).
5.  *Nota:* Isso é mais usado se o app for *apenas* para uso interno da sua própria agência. Para um SaaS público, o fluxo OAuth (Passo 3) é o caminho principal.

---

## Resumo do que você precisa ter em mãos para o Code Mode:

1.  **App ID**
2.  **App Secret**
3.  **Verify Token** (que você inventou)
4.  **Callback URL** (precisaremos subir um túnel/servidor para isso)

Agora estamos prontos para codar!