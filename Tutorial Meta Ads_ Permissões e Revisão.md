# **Relatório Técnico de Engenharia: Arquitetura, Implementação e Conformidade para Aplicações Meta Ads (SaaS e Tech Providers)**

## **Sumário Executivo**

A integração com o ecossistema Meta Ads e a Graph API representa um dos desafios mais complexos no desenvolvimento de software moderno voltado para o marketing digital (MarTech). O paradigma de "Walled Garden" (Jardim Murado) da Meta evoluiu drasticamente das versões iniciais da API para um modelo de governança rígida, centrado na privacidade do usuário e na verificação estrita das entidades empresariais. Para desenvolvedores e arquitetos de software encarregados de construir soluções "robustas" — especificamente plataformas SaaS (Software as a Service) que gerenciam ativos de publicidade e recuperação de leads (Lead Ads) em nome de terceiros — o conhecimento técnico de codificação é insuficiente sem uma compreensão profunda dos protocolos de conformidade, hierarquia de permissões (Escopos) e arquitetura de dados corporativos.1

Este relatório técnico foi elaborado para servir como o guia definitivo e exaustivo para a criação de aplicativos Meta Ads no cenário atual. Ele transcende a documentação básica, abordando as nuances não documentadas que frequentemente bloqueiam integrações em produção, como a distinção crítica entre acesso a dados de "usuário" versus "negócio", a armadilha do Acesso Padrão versus Acesso Avançado, e os roteiros exatos para aprovação no temido processo de App Review.2 A análise a seguir disseca cada etapa, desde a concepção arquitetural até a manutenção operacional, fornecendo um tutorial granular sobre como obter, justificar e implementar cada permissão necessária para uma aplicação de classe mundial.

## ---

**Parte I: Fundamentos da Arquitetura e Tipologia do Aplicativo**

A primeira decisão arquitetural ao iniciar um projeto Meta Ads define todo o ciclo de vida do desenvolvimento. A escolha incorreta do tipo de aplicativo ou da categoria de negócio pode inviabilizar o acesso a APIs críticas de marketing, como a leads\_retrieval ou a business\_management.

### **1.1 O Modelo de Aplicativo "Empresa" (Business Type)**

No painel *Meta for Developers*, a criação de um aplicativo não é agnóstica. A Meta segmentou o ecossistema em tipos distintos (Consumidor, Jogos, Empresa). Para qualquer aplicação que pretenda interagir com ativos comerciais — Páginas do Facebook, Contas de Anúncios, Catálogos de Produtos ou WhatsApp Business API — a seleção mandatória é o tipo **Empresa (Business)**.5

A seleção do tipo "Empresa" pré-configura o manifesto do aplicativo com acesso a produtos específicos que não estão disponíveis para outros tipos, nomeadamente:

* **Facebook Login for Business:** Uma variação do login social otimizada para solicitar permissões de gerenciamento de ativos em vez de dados pessoais (como aniversário ou lista de amigos).7  
* **Marketing API:** O conjunto de endpoints necessários para gerenciar campanhas, conjuntos de anúncios e criativos.8  
* **Instagram Graph API:** Para interações comerciais no Instagram.9

**Implicação Arquitetural:** Ao escolher o tipo "Empresa", o desenvolvedor implicitamente concorda com um nível mais alto de escrutínio. Diferente de apps de jogos, que podem operar com verificações leves, apps de negócios exigem que a entidade legal por trás do software seja verificada e validada.

### **1.2 A Distinção "Tech Provider" (Provedor de Tecnologia)**

Para um SaaS que visa atender múltiplos clientes — por exemplo, um CRM que importa leads de várias imobiliárias ou uma ferramenta de automação que otimiza anúncios para diversos e-commerces — a classificação correta é **Tech Provider** (Provedor de Tecnologia).

Esta não é apenas uma etiqueta; é um status contratual dentro da plataforma.

1. **Definição:** Um Tech Provider é definido pela Meta como um desenvolvedor cujo objetivo principal é permitir que *outros* usuários (seus clientes) acessem e usem a Plataforma ou Dados da Plataforma. Você atua como um intermediário técnico.10  
2. **Requisitos de Onboarding:** O processo de se tornar um Tech Provider exige a assinatura de adendos contratuais específicos (Tech Provider Amendment), que estabelecem responsabilidades sobre o processamento de dados (Data Processing). Isso é crucial para conformidade com GDPR e leis similares, pois transfere ou compartilha a responsabilidade do tratamento de dados de leads entre a Meta, o Tech Provider e o Anunciante final.10  
3. **Fluxo de Verificação:** Apenas Tech Providers verificados conseguem desbloquear o "Acesso Avançado" para permissões sensíveis como business\_management. Sem esse status, o aplicativo ficará permanentemente restrito ao "Acesso Padrão", o que significa que ele só funcionará para usuários que tenham uma função administrativa no próprio aplicativo (inviável para um SaaS com 1000 clientes).1

### **1.3 Verificação do Negócio (Business Verification \- BV)**

A barreira de entrada para o ecossistema "robusto" é a Verificação do Negócio. Antes de escrever uma linha de código que consuma dados de produção, o arquiteto deve garantir que a organização possui um **Meta Business Portfolio** (anteriormente Business Manager) verificado.

Procedimento de Verificação Exaustivo:  
A verificação não ocorre no painel de desenvolvedor, mas no Meta Business Suite (Configurações do Negócio \-\> Centro de Segurança). Os requisitos documentados incluem:

* **Documentação Legal:** Envio de Contrato Social, Cartão CNPJ ou registro governamental equivalente que mostre o nome legal exato da empresa.12  
* **Endereço Físico e Telefone:** Faturas de serviços públicos (luz, telefone) que coincidam *exatamente* com o nome legal e endereço registrados. A Meta utiliza sistemas automatizados de OCR e verificação cruzada; divergências mínimas (ex: "Rua" vs "R.") podem causar rejeição.12  
* **Presença Web:** Um site funcional que utilize o domínio de e-mail da empresa (não Gmail/Hotmail) e que contenha as informações legais no rodapé. O site deve ter certificado SSL (HTTPS).12  
* **Vínculo com o App:** No painel do desenvolvedor, o aplicativo deve ser "reivindicado" por este Business Manager verificado. Isso cria a cadeia de confiança: Desenvolvedor \-\> App \-\> Business Manager Verificado \-\> Meta.6

## ---

**Parte II: Arquitetura de Autenticação e Gestão de Tokens**

A robustez de um aplicativo Meta Ads reside na sua capacidade de manter sessões autenticadas de forma segura e duradoura. O modelo de tokens da Graph API é complexo e possui armadilhas que frequentemente derrubam operações de SaaS.

### **2.1 O Ciclo de Vida do Token de Acesso (OAuth 2.0)**

A autenticação na Meta segue o padrão OAuth 2.0, mas com extensões proprietárias para gestão de sessões. Compreender os tipos de token é vital para evitar que seus clientes precisem refazer o login a cada hora.

#### **2.1.1 User Access Token (Curta Duração)**

Quando um usuário realiza o login através do *Facebook Login for Business* no frontend (via JavaScript SDK ou redirecionamento web), o aplicativo recebe um **Token de Usuário de Curta Duração**.

* **Validade:** Aproximadamente 1 a 2 horas.  
* **Uso:** Serve apenas para a troca imediata. Não deve ser armazenado para tarefas em background.13

#### **2.1.2 User Access Token (Longa Duração)**

Para operações de servidor (backend), o token de curta duração deve ser trocado por um **Token de Longa Duração**.

* **Mecanismo de Troca:** O backend deve fazer uma chamada *server-to-server* para o endpoint oauth/access\_token enviando o client\_id (App ID), client\_secret (App Secret) e o token de curta duração.14  
* **Validade:** Aproximadamente 60 dias.  
* **Comportamento de Renovação:** Em aplicativos móveis nativos (iOS/Android), esse token é renovado automaticamente pelo SDK. Em aplicações web/SaaS, o token expira se não for usado ou renovado, exigindo que o usuário se re-autentique a cada dois meses, o que é uma fricção inaceitável para muitos modelos de negócio.14

#### **2.1.3 Page Access Token (O Token Perpétuo)**

Este é o segredo para a estabilidade de um SaaS de Lead Ads. Para ler dados de uma Página (como leads), o aplicativo não deve usar o token do usuário diretamente. Em vez disso, deve usar o token do usuário para solicitar um **Token de Acesso à Página**.

* **Mecanismo:** Chamada ao endpoint /{user-id}/accounts ou /{page-id}?fields=access\_token.  
* **Validade:** O Token de Página obtido a partir de um Token de Usuário de Longa Duração **não tem data de expiração** (é perpétuo), a menos que o usuário altere sua senha do Facebook, perca as permissões administrativas na página ou desinstale o aplicativo.15  
* **Estratégia Robusta:** O aplicativo deve obter o token de usuário, trocá-lo pelo de longa duração, usar este para obter o token da página específica que será gerenciada, e armazenar *apenas* o token da página para as operações de leitura de leads (leads\_retrieval).

### **2.2 System Users (Usuários do Sistema)**

Para arquiteturas *High-End* e Tech Providers, a dependência de um usuário humano (que pode sair da empresa ou mudar a senha) é um risco. A solução robusta é a implementação de **System Users**.

* **Conceito:** Um System User é uma identidade programática criada dentro do Business Manager. Ele não é uma pessoa, não tem perfil social e não tem senha. Ele possui apenas tokens.17  
* **Aplicação:** Ideal para integrações onde o Tech Provider precisa gerar tokens programmaticamente para gerenciar ativos. O fluxo envolve instalar o aplicativo no Business Manager do cliente e gerar um System User *dentro* do BM do cliente (via API business\_on\_behalf\_of), garantindo que o acesso sobreviva a mudanças de pessoal.7

### **2.3 Segurança com appsecret\_proof**

Em uma implementação robusta, todas as chamadas de servidor para a Graph API devem incluir o parâmetro appsecret\_proof.

* **O que é:** Um hash SHA-256 do token de acesso usando o App Secret como chave.  
* **Por que usar:** Impede que tokens roubados sejam usados por malwares ou outros apps. No painel do aplicativo (Configurações Avançadas), deve-se ativar a opção "Exigir appsecret\_proof para chamadas de servidor". Isso blinda a API contra uso não autorizado de tokens vazados.7

## ---

**Parte III: Mapeamento Detalhado e Aquisição de Permissões (Escopos)**

A solicitação do usuário exige um tutorial sobre "como ter a permissão de cada escopo". No contexto do Meta Ads e Tech Providers, isso significa navegar pelo processo de **App Review (Revisão do Aplicativo)**. A Meta não concede permissões baseada apenas na necessidade técnica; ela exige uma justificativa de negócio (Business Use Case) e uma demonstração funcional (Screencast) para cada escopo individual.

Abaixo, detalhamos as permissões críticas, sua função técnica, e o roteiro exato para aprovação.

### **3.1 leads\_retrieval (Recuperação de Leads)**

Esta é a permissão central para qualquer aplicativo que processa Lead Ads. Sem ela, o aplicativo recebe um erro de permissão ao tentar ler os dados de contato de um lead, mesmo que tenha acesso à página.

* **Função Técnica:** Permite acesso aos dados PII (Personally Identifiable Information) gerados pelos formulários instantâneos (Lead Forms). Habilita o uso de Webhooks para o campo leadgen e leitura via API Graph.8  
* **Dependências:** Exige obrigatoriamente pages\_manage\_ads e pages\_show\_list para funcionar.20  
* **Justificativa para App Review:** O desenvolvedor deve argumentar que o aplicativo é um CRM ou ferramenta de integração que move dados do Facebook para o sistema do cliente em tempo real para ação imediata (ex: contato de vendas). A latência na resposta aos leads é o argumento chave de valor.20

**Roteiro de Screencast para Aprovação (leads\_retrieval):**

1. **Cenário:** Use o *Lead Ads Testing Tool* da Meta em uma aba e o seu aplicativo em outra.  
2. **Ação 1:** Mostre o usuário logando no seu app e concedendo permissões (o popup de login deve mostrar explicitamente "Acessar leads para suas Páginas").  
3. **Ação 2:** No seu app, mostre a configuração onde o usuário seleciona a página que deseja monitorar.  
4. **Ação 3:** Vá ao *Lead Ads Testing Tool*, selecione a página conectada e clique em "Criar Lead" (Create Lead).  
5. **Ação 4:** Volte imediatamente ao seu aplicativo e mostre o lead aparecendo na interface (tabela ou dashboard).  
6. **Narrativa Visual:** O revisor deve ver claramente a conexão de causa e efeito: Lead criado no Facebook \-\> Lead aparecendo no App.20

### **3.2 ads\_management (Gestão de Anúncios)**

Frequentemente mal compreendida, esta permissão é necessária não apenas para criar anúncios, mas para *configurar* a recuperação de leads em muitos contextos, pois a Meta considera a configuração de Webhooks de leads uma atividade de "gestão de anúncios".

* **Função Técnica:** Permite criar, editar, pausar e arquivar campanhas, conjuntos de anúncios e anúncios. Permite também a leitura de estrutura de contas de anúncios complexas.8  
* **Uso em SaaS:** Fundamental se o aplicativo promete funcionalidades como "Pausar anúncios que geram leads ruins" ou "Criar públicos semelhantes (Lookalikes) a partir de leads convertidos".  
* **Roteiro de Screencast:** Demonstre o usuário criando uma campanha ou editando um orçamento através da interface do seu aplicativo. Se o seu app for apenas de leitura de leads, a Meta pode rejeitar ads\_management e sugerir ads\_read. Se for rejeitado, argumente que a configuração de Webhooks e a associação de formulários a anúncios requer privilégios de gestão.1

### **3.3 pages\_show\_list (Listar Páginas)**

Parece trivial, mas é a base da interface de configuração.

* **Função Técnica:** Permite ao aplicativo listar os nomes, IDs e fotos de perfil das Páginas que o usuário administra. Sem isso, você não consegue montar o "Menu de Seleção" para o usuário escolher qual página integrar.9  
* **Roteiro de Screencast:**  
  1. Inicie o processo de conexão no seu app.  
  2. Clique em "Login com Facebook".  
  3. No popup, clique em "Editar Configurações" para mostrar a lista de páginas disponíveis.  
  4. Conclua o login.  
  5. **Crucial:** Mostre a lista de páginas carregada na interface do seu app, correspondendo às páginas do usuário. A Meta rejeita se não vir a lista sendo exibida para o usuário final.9

### **3.4 business\_management (Gestão de Negócios) \- A Mais Difícil**

Esta é a permissão que separa os amadores dos profissionais. É a fonte da maioria das frustrações e rejeições em App Reviews.

* **A Necessidade Crítica:** Usuários que trabalham em Agências ou Grandes Empresas geralmente não são "Donos" diretos das páginas. Eles recebem acesso através de um **Business Manager**. Para esses usuários, o endpoint /me/accounts (que depende de pages\_show\_list) frequentemente retorna vazio ou incompleto. A permissão business\_management é a única que permite "perfurar" a camada do Business Manager e listar as páginas delegadas (client\_pages).4  
* **Função Técnica:** Permite ler e escrever na API do Business Manager, listar ativos de clientes, reivindicar páginas e criar System Users.9  
* **Justificativa de Tech Provider:** A justificativa deve ser enfática: "Nosso aplicativo serve agências de marketing que gerenciam ativos em nome de terceiros. A permissão pages\_show\_list é insuficiente para listar páginas atribuídas via Business Manager. Necessitamos de business\_management para mapear a estrutura organizacional do cliente e permitir a seleção de ativos delegados.".26

**Roteiro de Screencast Estrito (business\_management):**

1. **Cenário:** O usuário de teste deve ser um funcionário de um Business Manager, não o dono da página.  
2. **Ação:** Demonstre o login.  
3. **Diferencial:** Mostre uma funcionalidade no seu app que dependa do BM, como "Importar ativos do Business Manager" ou "Selecionar Conta de Negócios".  
4. **Prova:** Mostre que, ao selecionar um Business Manager no seu app, a lista de páginas associadas a *aquele* BM é carregada. Isso prova que você está lendo a estrutura do negócio, não apenas o perfil do usuário.28

### **3.5 Outras Permissões Relevantes**

* **pages\_read\_engagement:** Necessária para ler metadados de conteúdo. Muitas vezes exigida em conjunto com leads\_retrieval para acessar o contexto do anúncio (qual post gerou o lead?).20  
* **instagram\_basic e instagram\_manage\_messages:** Se a sua estratégia de "Meta Ads" incluir anúncios com destino para Direct do Instagram (Click-to-Instagram Direct), você precisará dessas permissões para gerenciar a conversa que se inicia após o clique no anúncio.9

## ---

**Parte IV: A Arquitetura de "Agência" e o Problema das Páginas Ocultas**

Uma das maiores falhas em tutoriais básicos é ignorar o cenário de Agências. Seu app "robusto" falhará se não tratar a hierarquia do Business Manager.

### **4.1 O Fenômeno /me/accounts Vazio**

Desenvolvedores frequentemente relatam que, para certos usuários, a chamada GET /me/accounts retorna uma lista vazia data:, mesmo o usuário sendo admin da página no Facebook.

* **Causa:** Isso ocorre quando a Página é propriedade de um Business Manager e o usuário tem acesso apenas através de uma "Tarefa" (Task) no BM, e não como admin clássico. A partir da Graph API v17+, a Meta restringiu a visibilidade desses ativos.4

### **4.2 A Solução Arquitetural: Varredura de Ativos de Negócios**

Para garantir que todas as páginas sejam listadas para um usuário de agência, o aplicativo deve implementar uma lógica de descoberta em duas etapas (requer business\_management):

1. Listar Negócios do Usuário:  
   Primeiro, descubra quais Business Managers o usuário acessa.  
   HTTP  
   GET /me/businesses?fields=id,name

2. Iterar e Listar Páginas por Negócio:  
   Para cada business\_id retornado, faça chamadas específicas para descobrir as páginas. Existem dois edges críticos aqui:  
   * /{business-id}/owned\_pages: Páginas que o Business Manager *possui* (propriedade legal).33  
   * /{business-id}/client\_pages: Páginas que o Business Manager *tem acesso* (páginas de clientes da agência).33  
3. **Consolidação:** O backend do aplicativo deve agregar os resultados de /me/accounts (páginas diretas), owned\_pages e client\_pages (páginas via BM), remover duplicatas (pelo ID da página) e apresentar a lista unificada ao usuário.

Este nível de robustez diferencia um "script" de uma plataforma SaaS profissional.

## ---

**Parte V: Engenharia de Recuperação de Leads (Webhook vs. Bulk Read)**

Para uma aplicação "MetaAds", a velocidade e a confiabilidade na entrega do lead são os KPIs (Key Performance Indicators) principais.

### **5.1 Implementação de Webhooks em Tempo Real**

O método preferencial e mais robusto é o uso de Webhooks. Ele evita o *polling* (consultas repetitivas) que consome cota de API e atrasa o contato com o lead.

#### **5.1.1 Configuração do Endpoint**

O seu servidor deve expor uma rota (ex: /webhooks/meta) capaz de lidar com dois métodos HTTP:

* **GET:** Usado para verificação (Handshake). A Meta envia hub.mode, hub.challenge e hub.verify\_token. Seu código deve validar se o verify\_token bate com o que você configurou no painel e retornar o hub.challenge como texto puro (status 200).2  
* **POST:** Usado para receber os dados. A Meta envia um JSON contendo as alterações.

#### **5.1.2 Subscrição Granular (A Etapa Esquecida)**

Configurar o webhook no painel do aplicativo não é suficiente. O webhook precisa ser "instalado" em cada página individualmente.  
Após o usuário conectar a página no seu app (e você obter o Page Access Token), seu backend deve disparar:

HTTP

POST /{page-id}/subscribed\_apps  
params:  
  subscribed\_fields: \['leadgen'\]  
  access\_token: {PAGE\_ACCESS\_TOKEN}

Sem essa chamada explícita, a Meta não sabe que deve enviar leads daquela página específica para o seu app.2

### **5.2 O Fluxo de Enriquecimento de Dados (Payload Decryption)**

Por razões de segurança e privacidade, o payload do webhook **não contém os dados do lead** (nome, email). Ele contém apenas um ponteiro: o leadgen\_id.

**Payload Típico:**

JSON

{  
  "entry": \[  
    {  
      "changes": \[  
        {  
          "field": "leadgen",  
          "value": {  
            "leadgen\_id": "44444444",  
            "page\_id": "12345",  
            "form\_id": "67890",  
            "created\_time": 1422222222  
          }  
        }  
      \]  
    }  
  \]  
}

Ação Imediata do Backend:  
Ao receber esse JSON, o sistema deve:

1. Identificar o page\_id.  
2. Recuperar do banco de dados o page\_access\_token correspondente a essa página.  
3. Fazer uma chamada GET para recuperar os dados reais:  
   HTTP  
   GET /{leadgen\_id}?access\_token={PAGE\_ACCESS\_TOKEN}

4. A resposta dessa chamada conterá os campos field\_data com as respostas do usuário (email, telefone, nome, etc.).8

### **5.3 CRM Integration e Deduplicação**

Para um tutorial robusto, é necessário abordar a integração com o destino final (CRM).

* **Deduplicação:** Use o leadgen\_id como chave primária única. Webhooks podem ser enviados mais de uma vez em caso de falha de rede (retries da Meta). Seu sistema deve ser idempotente: se receber o mesmo ID duas vezes, não deve criar dois leads no CRM.19  
* **Mapeamento de Campos:** Os formulários de leads são dinâmicos. Seu app deve ler a estrutura do formulário (/{form-id}) para entender quais perguntas foram feitas e mapeá-las corretamente para os campos do CRM do cliente.

## ---

**Parte VI: Solução de Problemas e Armadilhas Comuns**

Em produção, as coisas falham. Um tutorial robusto deve preparar o desenvolvedor para o "Dia 2".

### **6.1 Erros de Autenticação (Códigos 190, 102, 4xx)**

* **Erro 190 (Invalid OAuth Access Token):** Ocorre quando o usuário altera a senha, a sessão expira ou a permissão é revogada.  
  * *Tratamento:* Seu app deve capturar esse erro e marcar a conexão da página como "Desconectada" no banco de dados, enviando um e-mail ou notificação no dashboard pedindo para o usuário "Reconectar com o Facebook".35 Não tente renovar automaticamente; a intervenção do usuário é necessária.  
* **Erro 200 (Permissions Error):** Ocorre quando o token é válido, mas não tem o escopo necessário (ex: tentando ler leads sem leads\_retrieval). Isso indica falha na configuração inicial do login ou que o usuário desmarcou permissões no momento do consentimento (Granular Permissions).36

### **6.2 O Caso do Campo "Username" Desaparecido**

Recentemente, desenvolvedores notaram que o campo username (o @ da página) desapareceu ou retorna erro em chamadas /me/accounts.

* **Diagnóstico:** A Meta está depreciando campos antigos.  
* **Solução:** Não dependa do username para lógica de negócio. Use sempre o page\_id (numérico) como identificador imutável. Se precisar exibir um nome amigável, use o campo name.37

### **6.3 Limites de Taxa (Rate Limiting)**

A Graph API possui limites baseados no número de usuários ativos do app.

* **Sintoma:** Erro 4 (Application request limit reached).  
* **Mitigação:**  
  * Use Webhooks (não contam para o limite da mesma forma que GETs repetitivos).  
  * Implemente *backoff exponencial* (se der erro, espere 1s, depois 2s, depois 4s antes de tentar de novo).  
  * Para leitura de muitos leads antigos, use a API de *Bulk Read* em vez de iterar lead por lead.8

## ---

**Parte VII: Guia de Script e Preparação para Screencasts (Tech Provider)**

Para finalizar, apresentamos um checklist prático para a gravação dos vídeos de submissão, focado na persona de Tech Provider. A qualidade desta submissão determina o sucesso do projeto.

| Elemento do Vídeo | Requisito do Tech Provider | Erro Comum a Evitar |
| :---- | :---- | :---- |
| **Idioma da UI** | A interface do seu app deve estar, preferencialmente, em Inglês para facilitar a revisão global. | Gravar com UI em português sem legendas explicativas em inglês.38 |
| **Identidade** | O logo e nome do app no vídeo devem bater com o cadastro no painel. | Usar um nome de desenvolvimento ("Teste App") diferente do nome de produção. |
| **Login Facebook** | Mostrar o clique no botão e o popup de permissões abrindo. | Cortar o vídeo e já aparecer logado. O revisor *precisa* ver o fluxo de concessão. |
| **Granularidade** | Ao pedir business\_management, mostrar a seleção de BMs. | Mostrar apenas seleção de Páginas simples para uma permissão de nível Business. |
| **Resultado** | Mostrar o dado obtido da API (o lead, o nome da página) renderizado na tela. | Mostrar apenas "Conexão com Sucesso" sem provar que o dado foi consumido. |

**Script de Exemplo para pages\_show\_list e business\_management:**

"Neste screencast, demonstramos como o \[Nome do App\] utiliza pages\_show\_list e business\_management.

1. O usuário clica em 'Conectar'. O diálogo de Login for Business abre.  
2. O usuário seleciona o Business Manager 'Agência X'. (Note que estamos solicitando acesso ao nível de negócio).  
3. O usuário seleciona as páginas 'Cliente A' e 'Cliente B' delegadas a este BM.  
4. De volta ao app, exibimos a lista hierárquica: Negócio \-\> Páginas. Isso justifica business\_management para descobrir ativos que não são de propriedade direta do usuário."

## ---

**Conclusão**

A construção de um aplicativo robusto para Meta Ads exige uma mudança de mentalidade: de "codificador de API" para "arquiteto de conformidade". O sucesso não depende apenas de fazer a requisição HTTP correta, mas de orquestrar uma cadeia de confiança que envolve verificação empresarial, autenticação segura de longa duração, tratamento de erros resiliente e uma navegação precisa pela burocracia do App Review. Ao seguir a arquitetura de Tech Provider detalhada neste relatório — privilegiando System Users, Webhooks granulares e Tokens de Página perpétuos — sua aplicação estará posicionada para escalar com estabilidade no exigente mercado de SaaS B2B.

---

**Tabela de Referência Rápida de Escopos Críticos:**

| Escopo | Nível de Acesso Necessário | Dependência | Endpoint Principal |
| :---- | :---- | :---- | :---- |
| leads\_retrieval | Avançado (App Review) | pages\_manage\_ads | GET /{lead-id} |
| pages\_manage\_ads | Avançado (App Review) | pages\_show\_list | POST /{page-id}/subscribed\_apps |
| pages\_show\_list | Avançado (App Review) | Nenhuma | GET /me/accounts |
| business\_management | Avançado (App Review \+ BV) | Nenhuma | GET /me/businesses, /client\_pages |
| ads\_read | Avançado (App Review) | ads\_management (opcional) | GET /act\_{id}/insights |

*(Fim do Relatório Técnico)*

#### **Referências citadas**

1. Facebook Marketing API: The Advanced Access Trap That Nearly Killed My Project, acessado em dezembro 22, 2025, [https://medium.com/@bilal.105.ahmed/facebook-marketing-api-the-advanced-access-trap-that-nearly-killed-my-project-7227ea2ee2c2](https://medium.com/@bilal.105.ahmed/facebook-marketing-api-the-advanced-access-trap-that-nearly-killed-my-project-7227ea2ee2c2)  
2. Get started as a Solution Partner | Developer Documentation, acessado em dezembro 22, 2025, [https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-solution-partners](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-solution-partners)  
3. App Review | Developer Documentation, acessado em dezembro 22, 2025, [https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/app-review](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/app-review)  
4. https://graph.facebook.com/v18.0/me/accounts not returning pages that user has access to via the Business Manager \- Developer Community Forum \- Meta for Developers, acessado em dezembro 22, 2025, [https://developers.facebook.com/community/threads/944979893810511/](https://developers.facebook.com/community/threads/944979893810511/)  
5. Tech Provider Program: Step-by-step WhatsApp integration guide | Infobip, acessado em dezembro 22, 2025, [https://www.infobip.com/docs/whatsapp/tech-provider-program/setup-and-integration](https://www.infobip.com/docs/whatsapp/tech-provider-program/setup-and-integration)  
6. WhatsApp Integration Using Meta App | PDF \- Scribd, acessado em dezembro 22, 2025, [https://www.scribd.com/document/931484169/WhatsApp-Integration-Using-Meta-App](https://www.scribd.com/document/931484169/WhatsApp-Integration-Using-Meta-App)  
7. Facebook Login for Business \- Meta for Developers, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/](https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/)  
8. Retrieving Leads \- Marketing API \- Meta for Developers, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/)  
9. Permissions Reference \- Graph API \- Meta for Developers \- Facebook, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/permissions/](https://developers.facebook.com/docs/permissions/)  
10. Overview \- Commerce Platform \- Meta for Developers \- Facebook, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/commerce-platform/partners/overview/](https://developers.facebook.com/docs/commerce-platform/partners/overview/)  
11. Terms and Policies FAQs \- App Development with Meta, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/development/terms-and-policies/faqs/](https://developers.facebook.com/docs/development/terms-and-policies/faqs/)  
12. WhatsApp Business API Process Steps | PDF | Cloud Computing | Mobile App \- Scribd, acessado em dezembro 22, 2025, [https://www.scribd.com/document/953855051/WhatsApp-Business-API-Process-Steps](https://www.scribd.com/document/953855051/WhatsApp-Business-API-Process-Steps)  
13. Access Token Guide \- Facebook Login \- Meta for Developers, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/facebook-login/guides/access-tokens/](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/)  
14. Get Long-Lived Tokens \- Facebook Login, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/)  
15. Generate a never-expiring Facebook page access token \- Squiz Help Center, acessado em dezembro 22, 2025, [https://docs.squiz.net/funnelback/docs/latest/build/data-sources/facebook/facebook-page-access-token.html](https://docs.squiz.net/funnelback/docs/latest/build/data-sources/facebook/facebook-page-access-token.html)  
16. Get Page Access Tokens with Facebook Graph API \- YouTube, acessado em dezembro 22, 2025, [https://www.youtube.com/watch?v=eIeDKLCgP6A](https://www.youtube.com/watch?v=eIeDKLCgP6A)  
17. Pages \- Business Management APIs \- Meta for Developers, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/business-management-apis/business-asset-management/guides/pages/](https://developers.facebook.com/docs/business-management-apis/business-asset-management/guides/pages/)  
18. On Behalf Of \- Business Management APIs \- Meta for Developers, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/business-management-apis/business-manager/guides/on-behalf-of/](https://developers.facebook.com/docs/business-management-apis/business-manager/guides/on-behalf-of/)  
19. Marketing API Access Tier Simplification and Lead Ads Retrieval \- Meta for Developers, acessado em dezembro 22, 2025, [https://developers.facebook.com/ads/blog/post/v2/2018/07/02/lead-ads-retrieval/](https://developers.facebook.com/ads/blog/post/v2/2018/07/02/lead-ads-retrieval/)  
20. Completing the Facebook App Review \- Convertr Help Centre, acessado em dezembro 22, 2025, [https://support.convertrmedia.com/hc/en-us/articles/360010746573-Completing-the-Facebook-App-Review](https://support.convertrmedia.com/hc/en-us/articles/360010746573-Completing-the-Facebook-App-Review)  
21. How to streamline your process with Facebook Lead Ads & SFCC Integration (Exclusive guide) \- Kodly, acessado em dezembro 22, 2025, [https://kodly.io/blog/645a3b2a65f19d69cef85f26](https://kodly.io/blog/645a3b2a65f19d69cef85f26)  
22. Create an App with Meta \- Meta for Developers \- Facebook, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/development/create-an-app/](https://developers.facebook.com/docs/development/create-an-app/)  
23. Permissions Reference \- API Graph \- Meta for Developers \- Facebook, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/permissions?locale=es\_LA](https://developers.facebook.com/docs/permissions?locale=es_LA)  
24. Why is my Facebook Graph API call to /me/accounts returning an empty pages array?, acessado em dezembro 22, 2025, [https://stackoverflow.com/questions/79554245/why-is-my-facebook-graph-api-call-to-me-accounts-returning-an-empty-pages-array](https://stackoverflow.com/questions/79554245/why-is-my-facebook-graph-api-call-to-me-accounts-returning-an-empty-pages-array)  
25. Stopped to return some accounts under me/accounts \- Developer Community Forum, acessado em dezembro 22, 2025, [https://developers.facebook.com/community/threads/672345581624608/](https://developers.facebook.com/community/threads/672345581624608/)  
26. Facebook Ads to your destination | Fivetran documentation, acessado em dezembro 22, 2025, [https://fivetran.com/docs/connectors/applications/facebook-ads](https://fivetran.com/docs/connectors/applications/facebook-ads)  
27. Cloodot for Facebook: The AI Guide to Managing Your Business Place, acessado em dezembro 22, 2025, [https://skywork.ai/skypage/en/cloodot-facebook-ai-guide/1977564088975290368](https://skywork.ai/skypage/en/cloodot-facebook-ai-guide/1977564088975290368)  
28. Permissions Reference \- API Graph \- Meta for Developers \- Facebook, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/permissions?locale=es\_ES](https://developers.facebook.com/docs/permissions?locale=es_ES)  
29. Permissions Reference \- 图谱API \- Meta for Developers \- Facebook, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/permissions?locale=zh\_CN](https://developers.facebook.com/docs/permissions?locale=zh_CN)  
30. Missing Permissions (business\_management, leads\_retrieval) in Access Token Despite User Approval \- Stack Overflow, acessado em dezembro 22, 2025, [https://stackoverflow.com/questions/79295717/missing-permissions-business-management-leads-retrieval-in-access-token-despi](https://stackoverflow.com/questions/79295717/missing-permissions-business-management-leads-retrieval-in-access-token-despi)  
31. Permissions Reference \- API Đồ thị \- Meta for Developers \- Facebook, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/permissions?locale=vi\_VN](https://developers.facebook.com/docs/permissions?locale=vi_VN)  
32. Why does the Meta Graph API return old pages in owned\_pages if they can't be used in OAuth or queried? : r/facebook \- Reddit, acessado em dezembro 22, 2025, [https://www.reddit.com/r/facebook/comments/1pj1o9s/why\_does\_the\_meta\_graph\_api\_return\_old\_pages\_in/](https://www.reddit.com/r/facebook/comments/1pj1o9s/why_does_the_meta_graph_api_return_old_pages_in/)  
33. API Graph, справочный документ v24.0: Business \- Meta for Developers, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/marketing-api/reference/business/v5.0?locale=ru\_RU](https://developers.facebook.com/docs/marketing-api/reference/business/v5.0?locale=ru_RU)  
34. v2.11 \- Graph API \- Meta for Developers, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/graph-api/changelog/version2.11/](https://developers.facebook.com/docs/graph-api/changelog/version2.11/)  
35. Connect Facebook Ads and Track your Social Marketing Dashboard \- Databox, acessado em dezembro 22, 2025, [https://databox.com/metric-library/data-source/facebook-ads](https://databox.com/metric-library/data-source/facebook-ads)  
36. Some of my Pages are not listed in me/accounts \- Developer Community Forum, acessado em dezembro 22, 2025, [https://developers.facebook.com/community/threads/752309298467801/](https://developers.facebook.com/community/threads/752309298467801/)  
37. Facebook Graph API /me/accounts username field gone \- Stack Overflow, acessado em dezembro 22, 2025, [https://stackoverflow.com/questions/79828429/facebook-graph-api-me-accounts-username-field-gone](https://stackoverflow.com/questions/79828429/facebook-graph-api-me-accounts-username-field-gone)  
38. App Review \- Tutorial \- Meta for Developers, acessado em dezembro 22, 2025, [https://developers.facebook.com/docs/resp-plat-initiatives/individual-processes/app-review/submission-guide/](https://developers.facebook.com/docs/resp-plat-initiatives/individual-processes/app-review/submission-guide/)