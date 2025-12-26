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
   * Busca páginas pertencentes a Business Managers (Agências).
   * @param {string} accessToken
   * @returns {Promise<Array>}
   */
  async getBusinessPages(accessToken) {
    try {
      // 1. Buscar Negócios
      const businessesResponse = await axios.get(`${BASE_URL}/me/businesses`, {
        params: {
          access_token: accessToken,
          fields: 'id,name',
        },
      });

      const businesses = businessesResponse.data.data || [];
      let allBusinessPages = [];

      // 2. Para cada negócio, buscar client_pages
      // Usamos Promise.all para paralelizar as chamadas
      const promises = businesses.map(async (business) => {
        try {
          const pagesResponse = await axios.get(`${BASE_URL}/${business.id}/client_pages`, {
            params: {
              access_token: accessToken,
              fields: 'name,access_token,id,tasks',
            },
          });
          return pagesResponse.data.data || [];
        } catch (err) {
          console.warn(`Falha ao buscar páginas do negócio ${business.id}:`, err.message);
          return [];
        }
      });

      const results = await Promise.all(promises);
      results.forEach(pages => {
        allBusinessPages = allBusinessPages.concat(pages);
      });

      return allBusinessPages;

    } catch (error) {
      // Se falhar (ex: usuário não tem permissão de business), apenas loga e retorna vazio
      // para não quebrar o fluxo principal de getPages
      console.warn('Erro ao buscar Business Pages (pode ser falta de permissão ou nenhum negócio):', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Lista as páginas que o usuário administra (diretas e via Business Manager).
   * @param {string} accessToken
   * @returns {Promise<Array>}
   */
  async getPages(accessToken) {
    try {
      // 1. Busca páginas diretas (/me/accounts)
      const directPagesPromise = axios.get(`${BASE_URL}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,category,tasks',
        },
      }).then(res => res.data.data).catch(err => {
        console.error('Erro ao obter páginas diretas:', err.message);
        throw err;
      });

      // 2. Busca páginas de Business Manager
      const businessPagesPromise = this.getBusinessPages(accessToken);

      const [directPages, businessPages] = await Promise.all([
        directPagesPromise,
        businessPagesPromise
      ]);

      // 3. Combina e remove duplicatas por ID
      const allPages = [...(directPages || []), ...(businessPages || [])];
      const uniquePages = Array.from(new Map(allPages.map(item => [item.id, item])).values());

      return uniquePages;
    } catch (error) {
      console.error('Erro ao consolidar lista de páginas:', error.response?.data || error.message);
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

  /**
   * Obtém os formulários de cadastro (Lead Gen Forms) de uma página.
   * @param {string} pageId
   * @param {string} pageAccessToken
   * @returns {Promise<Array>}
   */
  async getPageForms(pageId, pageAccessToken) {
    try {
      const response = await axios.get(`${BASE_URL}/${pageId}/leadgen_forms`, {
        params: {
          access_token: pageAccessToken,
          fields: 'id,name,status,leadgen_export_csv_url,locale,created_time',
        },
      });
      return response.data.data;
    } catch (error) {
      console.error(`Erro ao obter formulários da página ${pageId}:`, error.response?.data || error.message);
      throw new Error('Falha ao obter formulários da página');
    }
  }
}

export default new FacebookService();