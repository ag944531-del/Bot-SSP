import { ServerResponse } from 'http';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { DashboardController } from '../controllers/dashboardController.js';
import { PoliceController } from '../controllers/policeController.js';
import { CopomController } from '../controllers/copomController.js';
import { CorregedoriaController } from '../controllers/corregedoriaController.js';
import { AcademyController } from '../controllers/academyController.js';
import { DocumentController } from '../controllers/documentController.js';
import { SecurityController } from '../controllers/securityController.js';

export async function handleApiRoute(
  req: AuthenticatedRequest,
  res: ServerResponse,
  pathname: string,
  urlParams: URLSearchParams
): Promise<boolean> {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-guild-id');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  // 1. Dashboard
  if (pathname === '/api/dashboard' && req.method === 'GET') {
    await DashboardController.getMetrics(req, res);
    return true;
  }

  // 2. Policiais & RH
  if (pathname === '/api/police' && req.method === 'GET') {
    await PoliceController.listProfiles(req, res, urlParams);
    return true;
  }
  if (pathname === '/api/police/timeline' && req.method === 'GET') {
    await PoliceController.getTimeline(req, res, urlParams);
    return true;
  }

  // 3. COPOM & Operações
  if (pathname === '/api/copom' && req.method === 'GET') {
    await CopomController.getFleetAndOccurrences(req, res);
    return true;
  }

  // 4. Corregedoria
  if (pathname === '/api/corregedoria' && req.method === 'GET') {
    await CorregedoriaController.getCasesAndSanctions(req, res);
    return true;
  }

  // 5. Academia
  if (pathname === '/api/academy' && req.method === 'GET') {
    await AcademyController.getCoursesAndInstructors(req, res);
    return true;
  }

  // 6. Documentos & Assinaturas
  if (pathname === '/api/documents' && req.method === 'GET') {
    await DocumentController.listDocuments(req, res);
    return true;
  }
  if (pathname === '/api/documents/validate' && req.method === 'GET') {
    await DocumentController.validateSignature(req, res, urlParams);
    return true;
  }

  // 7. Segurança & Backups
  if (pathname === '/api/security' && req.method === 'GET') {
    await SecurityController.getSecurityOverview(req, res);
    return true;
  }
  if (pathname === '/api/security/backup' && req.method === 'POST') {
    await SecurityController.triggerBackup(req, res);
    return true;
  }

  return false;
}
