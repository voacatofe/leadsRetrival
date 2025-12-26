import express from 'express';
import WebhookController from '../controllers/WebhookController.js';

const router = express.Router();

// Rota para verificação do webhook (GET challenge da Meta)
router.get('/', WebhookController.verifyWebhook);

// Rota para receber as notificações de leads
router.post('/', WebhookController.handleWebhook);

export default router;