import FacebookService from '../services/FacebookService.js';
import QueueService from '../services/QueueService.js';
import Lead from '../models/Lead.js';
import Page from '../models/Page.js';

class WebhookController {
  /**
   * Verifica o webhook (GET challenge)
   */
  async verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // O token de verificação deve ser uma string aleatória definida por você
    // e configurada no painel de desenvolvedor do Facebook e no .env
    const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'meu_token_secreto_webhook';

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verificado com sucesso!');
        return res.status(200).send(challenge);
      } else {
        return res.status(403).send('Token de verificação inválido.');
      }
    }

    res.status(400).send('Bad Request');
  }

  /**
   * Recebe as notificações do webhook (POST)
   */
  async handleWebhook(req, res) {
    try {
      const body = req.body;

      // Verifica se é um evento de página
      if (body.object === 'page') {
        // Itera sobre cada entrada (pode haver várias se forem enviadas em lote)
        for (const entry of body.entry) {
          const webhookEvent = entry.changes[0];
          
          // Verifica se é um leadgen
          if (webhookEvent.field === 'leadgen') {
            await this.processLeadGen(webhookEvent.value);
          }
        }

        // Retorna 200 OK para confirmar o recebimento
        return res.status(200).send('EVENT_RECEIVED');
      }

      // Se não for um evento de página, retorna 404
      res.sendStatus(404);
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      res.sendStatus(500);
    }
  }

  /**
   * Processa o evento leadgen
   * @param {Object} leadGenData 
   */
  async processLeadGen(leadGenData) {
    const { leadgen_id, page_id, created_time, form_id } = leadGenData;

    console.log(`Novo lead recebido: ${leadgen_id} da página ${page_id}`);

    try {
      // 1. Busca a página no banco para pegar o token de acesso
      const page = await Page.findOne({ where: { page_id: page_id } });

      if (!page || !page.access_token) {
        console.error(`Página ${page_id} não encontrada ou sem token.`);
        return;
      }

      // 2. Busca os detalhes do lead na API do Facebook
      const leadDetails = await FacebookService.getLeadDetails(leadgen_id, page.access_token);

      // 3. Salva o lead no banco de dados
      const newLead = await Lead.create({
        leadgen_id,
        page_id: page.id, // ID interno da página
        form_id,
        created_time: new Date(created_time * 1000), // Convertendo timestamp unix
        field_data: leadDetails.field_data, // Dados brutos do formulário
        status: 'new'
      });

      console.log(`Lead ${newLead.id} salvo no banco.`);

      // 4. Envia para a fila de processamento (para integrações futuras)
      await QueueService.addLeadToQueue({
        leadId: newLead.id,
        leadgen_id,
        page_id,
        field_data: leadDetails.field_data
      });

    } catch (error) {
      console.error(`Erro ao processar lead ${leadgen_id}:`, error.message);
      // Aqui poderíamos salvar em uma tabela de 'failed_leads' para retry posterior
    }
  }
}

export default new WebhookController();