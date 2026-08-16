import { ServerResponse } from 'http';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { prisma } from '../../database/prisma.js';
import { SignatureService } from '../../services/SignatureService.js';

export class DocumentController {
  public static async listDocuments(req: AuthenticatedRequest, res: ServerResponse) {
    try {
      const docs = await prisma.document.findMany({
        include: { signatures: true },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, documents: docs }));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  public static async validateSignature(req: AuthenticatedRequest, res: ServerResponse, urlParams: URLSearchParams) {
    try {
      const code = urlParams.get('code');
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Código de assinatura (code) obrigatório.' }));
      }

      const result = await SignatureService.verifySignature(code);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, verification: result }));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
}
