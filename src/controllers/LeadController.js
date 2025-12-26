import { Lead, Page } from '../models/index.js';

class LeadController {
    async index(req, res) {
        try {
            const userId = req.user.id;

            const leads = await Lead.findAll({
                include: [{
                    model: Page,
                    as: 'page',
                    where: { user_id: userId },
                    attributes: ['name', 'page_id']
                }],
                order: [['createdAt', 'DESC']]
            });
            return res.json(leads);
        } catch (error) {
            console.error('Error fetching leads:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

export default new LeadController();