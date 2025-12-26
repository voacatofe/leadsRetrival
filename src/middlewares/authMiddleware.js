import FacebookService from '../services/FacebookService.js';
import User from '../models/User.js';

/**
 * Middleware de autenticação simplificado.
 * Valida o token do Facebook e popula req.user com o usuário do banco.
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Token format invalid. Expected: Bearer <token>' });
    }

    const token = parts[1];

    // 1. Validar token chamando API do Facebook
    // Isso garante que o token é válido e obtemos o ID do usuário no Facebook
    const userProfile = await FacebookService.getUserProfile(token);

    if (!userProfile || !userProfile.id) {
        return res.status(401).json({ error: 'Invalid Facebook token' });
    }

    // 2. Buscar usuário no banco pelo Facebook ID
    const user = await User.findOne({
      where: { facebook_id: userProfile.id }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not registered in system' });
    }

    // 3. Anexar usuário à requisição
    req.user = user;
    
    // Opcional: Atualizar o token no banco se for diferente, para manter o mais recente?
    // Por enquanto, vamos manter simples.

    next();

  } catch (error) {
    console.error('Auth Middleware Error:', error.message);
    // Diferenciar erro de rede/servidor de erro de token inválido pode ser útil, 
    // mas por segurança retornamos 401 genericamente ou 500 se for erro grave.
    if (error.response && error.response.status === 401) {
        return res.status(401).json({ error: 'Token expired or invalid' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
};