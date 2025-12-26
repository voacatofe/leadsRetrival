import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const FACEBOOK_API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

class FacebookService {
  constructor() {
    this.appId = process.env.VITE_FACEBOOK_APP_ID;
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
  }

  /**
   * Troca um token de usuário de curta duração por um de longa duração (60 dias).
   * @param {string} shortLivedToken 
   * @returns {Promise<{access_token: string, expires_in: number}>}
   */
  async exchangeShortLivedToken(shortLivedToken) {
    try {
      const response = await axios.get(`${BASE_URL}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: shortLivedToken,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao trocar token:', error.response?.data || error.message);
      throw new Error('Falha ao obter token de longa duração');
    }
  }

  /**
   * Obtém o perfil do usuário (ID e Nome).
   * @param {string} accessToken 
   * @returns {Promise<{id: string, name: string}>}
   */
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${BASE_URL}/me`, {
        params: {
          fields: 'id,name',
          access_token: accessToken,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter perfil:', error.response?.data || error.message);
      throw new Error('Falha ao obter dados do usuário');
    }
  }

  /**
   * Lista as páginas que o usuário administra.
   * @param {string} accessToken 
   * @returns {Promise<Array>}
   */
  async getPages(accessToken) {
    try {
      const response = await axios.get(`${BASE_URL}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,category,tasks',
        },
      });
      // Retorna o array de páginas. A paginação estaria em response.data.paging, 
      // mas para este MVP vamos retornar a primeira página de resultados.
      return response.data.data;
    } catch (error) {
      console.error('Erro ao obter páginas:', error.response?.data || error.message);
      throw new Error('Falha ao listar páginas');
    }
  }

  /**
   * Obtém o token de acesso específico de uma página.
   * Na verdade, o endpoint /me/accounts já retorna o access_token da página se tivermos permissão,
   * mas podemos buscar explicitamente se necessário ou para garantir permissões atualizadas.
   * @param {string} pageId 
   * @param {string} userAccessToken 
   * @returns {Promise<string>} Page Access Token
   */
  async getPageAccessToken(pageId, userAccessToken) {
    try {
      const response = await axios.get(`${BASE_URL}/${pageId}`, {
        params: {
          fields: 'access_token',
          access_token: userAccessToken,
        },
      });
      return response.data.access_token;
    } catch (error) {
      console.error(`Erro ao obter token da página ${pageId}:`, error.response?.data || error.message);
      throw new Error('Falha ao obter token da página');
    }
  }

  /**
   * Inscreve o aplicativo para receber webhooks da página (leadgen).
   * @param {string} pageId 
   * @param {string} pageAccessToken 
   * @returns {Promise<boolean>}
   */
  async subscribeAppToPage(pageId, pageAccessToken) {
    try {
      const response = await axios.post(`${BASE_URL}/${pageId}/subscribed_apps`, null, {
        params: {
          subscribed_fields: 'leadgen',
          access_token: pageAccessToken,
        },
      });
      return response.data.success;
    } catch (error) {
      console.error(`Erro ao inscrever app na página ${pageId}:`, error.response?.data || error.message);
      throw new Error('Falha ao ativar webhooks para a página');
    }
  }

  /**
   * Obtém os detalhes de um lead específico.
   * @param {string} leadgenId
   * @param {string} pageAccessToken
   * @returns {Promise<Object>}
   */
  async getLeadDetails(leadgenId, pageAccessToken) {
    try {
      const response = await axios.get(`${BASE_URL}/${leadgenId}`, {
        params: {
          access_token: pageAccessToken,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Erro ao obter detalhes do lead ${leadgenId}:`, error.response?.data || error.message);
      throw new Error('Falha ao obter detalhes do lead');
    }
  }
}

export default new FacebookService();