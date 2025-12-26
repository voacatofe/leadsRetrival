import express from 'express';
import AuthController from '../controllers/AuthController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route POST /auth/login
 * @desc Recebe token do frontend, troca por long-lived e loga/cria user
 */
router.post('/login', AuthController.loginCallback);

/**
 * @route GET /auth/pages
 * @desc Lista páginas do usuário
 * @access Private
 */
router.get('/pages', authMiddleware, AuthController.getPages);

/**
 * @route POST /auth/pages/:pageId/connect
 * @desc Conecta uma página e ativa webhooks
 * @access Private
 */
router.post('/pages/:pageId/connect', authMiddleware, AuthController.connectPage);

/**
 * @route GET /auth/pages/:pageId/forms
 * @desc Lista os formulários de leads da página
 * @access Private
 */
router.get('/pages/:pageId/forms', authMiddleware, AuthController.getPageForms);

export default router;