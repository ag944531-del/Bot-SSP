import { ServerResponse } from 'http';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { prisma } from '../../database/prisma.js';

export class AcademyController {
  public static async getCoursesAndInstructors(req: AuthenticatedRequest, res: ServerResponse) {
    try {
      const [courses, instructors, certificates] = await Promise.all([
        prisma.course.findMany({
          where: { deletedAt: null },
          include: {
            classes: {
              include: { _count: { select: { students: true } } }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.instructorProfile.findMany({
          include: { profile: { include: { rank: true } } }
        }),
        prisma.certificate.findMany({
          orderBy: { issueDate: 'desc' },
          take: 10
        })
      ]);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          courses,
          instructors,
          certificates
        })
      );
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
}
