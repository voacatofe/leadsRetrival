import FacebookService from '../services/FacebookService.js';
import User from '../models/User.js';
import Page from '../models/Page.js';

class AuthController {

  /**
   * Recebe o short-lived token do frontend, troca por long-lived, 
   * obtém dados do usuário e salva/atualiza no banco.
   */
  async loginCallback(req, res) {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({ error: 'Access token is required' });
      }

      // 1. Troca o token por um de longa duração
      const tokenData = await FacebookService.exchangeShortLivedToken(accessToken);
      const longLivedToken = tokenData.access_token;

      // Calcula data de expiração (geralmente 60 dias)
      const expiresInSeconds = tokenData.expires_in || 5184000; // default 60 dias se não vier
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresInSeconds);

      // 2. Obtém perfil do usuário
      const userProfile = await FacebookService.getUserProfile(longLivedToken);

      // 3. Salva ou atualiza usuário no banco
      // upsert retorna um array [instance, created] (dependendo do dialeto, no Postgres é assim)
      // Mas para garantir compatibilidade simples, vamos usar findOne + update/create logic ou upsert direto.

      const [user, created] = await User.upsert({
        facebook_id: userProfile.id,
        name: userProfile.name,
        long_lived_token: longLivedToken,
        token_expires_at: tokenExpiresAt
      }, {
        returning: true // Importante para Postgres retornar o objeto atualizado
      });

      // Retorna sucesso e dados básicos do usuário
      // Em uma app real, aqui você geraria seu próprio JWT da aplicação para autenticar rotas futuras
      res.json({
        success: true,
        access_token: longLivedToken,
        user: {
          id: user.id,
          name: user.name,
          facebook_id: user.facebook_id
        }
      });

    } catch (error) {
      console.error('Login Callback Error:', error);
      res.status(500).json({ error: 'Internal Server Error during login' });
    }
  }

  /**
   * Lista páginas do usuário logado.
   */
  async getPages(req, res) {
    console.log('[AuthController] getPages called. User ID:', req.user?.id);
    try {
      const user = req.user;

      if (!user.long_lived_token) {
        console.warn('[AuthController] User has no long_lived_token');
        return res.status(401).json({ error: 'User has no Facebook token' });
      }

      console.log('[AuthController] Calling FacebookService.getPages...');
      const pages = await FacebookService.getPages(user.long_lived_token);

      console.log(`[AuthController] FacebookService returned ${pages?.length} pages.`);
      res.json({ pages });

    } catch (error) {
      console.error('Get Pages Error:', error);
      if (error.response) {
        console.error('[AuthController] Error Response Data:', JSON.stringify(error.response.data, null, 2));
      }
      res.status(500).json({ error: 'Failed to fetch pages' });
    }
  }

  /**
   * Conecta uma página (salva token e subscreve webhook).
   * Body: { pageName }
   * Params: :pageId
   */
  async connectPage(req, res) {
    try {
      const { pageId } = req.params;
      const { pageName } = req.body;
      const user = req.user;

      if (!pageId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // 1. Obter Token da Página
      const pageAccessToken = await FacebookService.getPageAccessToken(pageId, user.long_lived_token);

      // 2. Inscrever App nos Webhooks da Página
      const subscribed = await FacebookService.subscribeAppToPage(pageId, pageAccessToken);

      if (!subscribed) {
        // Opcional: decidir se falha totalmente ou apenas avisa
        console.warn(`Warning: Could not subscribe to webhooks for page ${pageId}`);
      }

      // 3. Salvar Página no Banco
      const [page, created] = await Page.upsert({
        page_id: pageId,
        name: pageName, // Pode vir null se o frontend não mandar, mas ideal mandar
        access_token: pageAccessToken,
        user_id: user.id
      }, {
        returning: true
      });

      res.json({
        success: true,
        message: 'Page connected successfully',
        page
      });

    } catch (error) {
      console.error('Connect Page Error:', error);
      res.status(500).json({ error: 'Failed to connect page' });
    }
  }

  /**
   * Lista os formulários de leads de uma página conectada.
   * Params: :pageId
   */
  async getPageForms(req, res) {
    try {
      const { pageId } = req.params;
      const userId = req.user.id;

      // Busca a página no banco garantindo que pertence ao usuário
      const page = await Page.findOne({
        where: {
          page_id: pageId,
          user_id: userId
        }
      });

      if (!page) {
        return res.status(404).json({ error: 'Page not found or not connected to this user' });
      }

      const forms = await FacebookService.getPageForms(pageId, page.access_token);

      res.json({
        success: true,
        forms
      });

    } catch (error) {
      console.error('Get Page Forms Error:', error);
      res.status(500).json({ error: 'Failed to fetch page forms' });
    }
  }
}

export default new AuthController();