import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

class QueueService {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => console.log('Redis Client Error', err));
    this.client.on('connect', () => console.log('Redis Client Connected'));

    // Conectar ao iniciar
    this.connect();
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  /**
   * Adiciona um lead à fila de processamento
   * @param {Object} leadData 
   */
  async addLeadToQueue(leadData) {
    try {
      await this.client.lPush('leads_queue', JSON.stringify(leadData));
      console.log(`Lead adicionado à fila: ${leadData.leadgen_id}`);
    } catch (error) {
      console.error('Erro ao adicionar lead à fila:', error);
      // Aqui poderíamos ter uma estratégia de retry ou fallback
    }
  }

  /**
   * Processa leads da fila (simples worker para demonstração)
   * Na produção real, isso seria um processo separado.
   */
  async processQueue() {
    console.log('Iniciando processamento da fila...');
    while (true) {
      try {
        // Bloqueia até ter um item (timeout 0 = infinito) ou usa rPop simples com intervalo
        // Usando brPop para esperar por elementos
        const result = await this.client.brPop('leads_queue', 0);
        
        if (result) {
            // result é { key: 'leads_queue', element: 'string_json' } no redis v4+ com brPop
            // ou pode variar dependendo da versão, vamos assumir o padrão key/value
            const leadData = JSON.parse(result.element);
            console.log('Processando lead:', leadData.leadgen_id);
            
            // Simular envio para CRM ou outro processamento
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('Lead processado com sucesso:', leadData.leadgen_id);
        }
      } catch (error) {
        console.error('Erro no processamento da fila:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Espera antes de tentar novamente em caso de erro
      }
    }
  }
}

export default new QueueService();