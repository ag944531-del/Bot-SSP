import { IncomingMessage, ServerResponse } from 'http';

export interface AuthenticatedRequest extends IncomingMessage {
  user?: {
    id: string;
    username: string;
    role: string;
    guildId?: string;
  };
}

/**
 * Middleware simples de autenticação para requisições de API
 */
export function authMiddleware(req: AuthenticatedRequest, res: ServerResponse, next: () => void) {
  const authHeader = req.headers['authorization'];

  // Para ambiente de desenvolvimento ou chamadas com token institucional
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    req.user = {
      id: 'WEB_OPERATOR',
      username: 'Operador Web Institucional',
      role: 'ADMIN',
      guildId: req.headers['x-guild-id'] as string || undefined
    };
  } else {
    // Modo padrão de acesso com credencial básica de sessão
    req.user = {
      id: 'WEB_USER',
      username: 'Usuário Web',
      role: 'VIEWER',
      guildId: req.headers['x-guild-id'] as string || undefined
    };
  }

  next();
}
