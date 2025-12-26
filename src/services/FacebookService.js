import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const FACEBOOK_API_VERSION = 'v24.0';
const BASE_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

class FacebookService {
  constructor() {
    this.appId = process.env.VITE_FACEBOOK_APP_ID || process.env.FACEBOOK_APP_ID;
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
  }

  // ... (existing code)

  /**
   * Debugs the token to check for scopes/permissions
   * @param {string} inputToken
   * @returns {Promise<Object>}
   */
  async debugToken(inputToken) {
    try {
      const response = await axios.get(`${BASE_URL}/debug_token`, {
        params: {
          input_token: inputToken,
          access_token: `${this.appId}|${this.appSecret}` // App Access Token
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Debug Token Error:', error.response?.data || error.message);
      return null;
    }
  }

  async getPages(accessToken) {
    console.log('[FacebookService] getPages (consolidated) called.');

    // DEBUG: Check Permissions
    const tokenInfo = await this.debugToken(accessToken);
    if (tokenInfo) {
      console.log('[FacebookService] Token Scopes:', tokenInfo.scopes);
      console.log('[FacebookService] Token ID:', tokenInfo.user_id);
    } else {
      console.warn('[FacebookService] Could not inspect token.');
    }

    try {
      // 1. Busca páginas diretas (/me/accounts)
      console.log('[FacebookService] Fetching direct pages (/me/accounts)...');
      const directPagesPromise = axios.get(`${BASE_URL}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,category,tasks',
        },
      }).then(res => {
        console.log(`[FacebookService] Direct pages found: ${res.data.data?.length}`);
        return res.data.data;
      }).catch(err => {
        console.error('[FacebookService] Error fetching direct pages:', err.message);
        if (err.response) {
          console.error('[FacebookService] Direct Pages Error Data:', JSON.stringify(err.response.data, null, 2));
        }
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

      console.log(`[FacebookService] Total unique pages combined: ${uniquePages.length}`);
      return uniquePages;
    } catch (error) {
      console.error('[FacebookService] Error consolidating pages:', error.message);
      if (error.response) {
        console.error('[FacebookService] Consolidating Error Data:', JSON.stringify(error.response.data, null, 2));
      }
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