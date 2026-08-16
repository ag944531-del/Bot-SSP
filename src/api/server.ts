import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware, AuthenticatedRequest } from './middlewares/authMiddleware.js';
import { handleApiRoute } from './routes/apiRoutes.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '../../public');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStaticFile(req: IncomingMessage, res: ServerResponse, filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath)) return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

export function startApiServer(port: number = parseInt(process.env.PORT || '3000', 10)) {
  const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const urlParams = parsedUrl.searchParams;

    const authReq = req as AuthenticatedRequest;

    authMiddleware(authReq, res, async () => {
      // 1. Verificar se é uma rota de API
      if (pathname.startsWith('/api/')) {
        const handled = await handleApiRoute(authReq, res, pathname, urlParams);
        if (!handled) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Endpoint da API não encontrado.' }));
        }
        return;
      }

      // 2. Servir arquivos estáticos do Dashboard Web (public/)
      let staticPath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
      const served = serveStaticFile(req, res, staticPath);

      if (!served) {
        // Fallback SPA para index.html
        const spaFallback = path.join(PUBLIC_DIR, 'index.html');
        if (fs.existsSync(spaFallback)) {
          serveStaticFile(req, res, spaFallback);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 - Painel Web não encontrado.');
        }
      }
    });
  });

  server.listen(port, () => {
    logger.info(`🌐 Dashboard Web e API RESTful rodando na porta ${port}: http://localhost:${port}`);
  });

  return server;
}
