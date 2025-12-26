import { Router } from 'express';
import LeadController from '../controllers/LeadController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', authMiddleware, LeadController.index);

export default router;