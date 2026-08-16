import { Course, CourseClass, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { ProtocolGenerator } from '../utils/protocolGenerator.js';
import { AuditLogService } from './AuditLogService.js';

export class AcademyService {
  /**
   * Cria um novo curso na Escola de Formação
   */
  public static async createCourse(data: {
    guildId: string;
    name: string;
    abbreviation: string;
    description: string;
    workloadHours: number;
    unitInCharge?: string;
    prerequisites?: string;
    vacancies?: number;
  }): Promise<Course> {
    return prisma.course.create({
      data: {
        guildId: data.guildId,
        name: data.name,
        abbreviation: data.abbreviation.toUpperCase(),
        description: data.description,
        workloadHours: data.workloadHours,
        unitInCharge: data.unitInCharge,
        prerequisites: data.prerequisites,
        vacancies: data.vacancies || 20
      }
    });
  }

  /**
   * Lista todos os cursos da academia
   */
  public static async listCourses(guildId: string) {
    return prisma.course.findMany({
      where: { guildId, isActive: true },
      include: {
        classes: { where: { isOpen: true } },
        _count: { select: { classes: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Abre uma nova turma para um curso
   */
  public static async openClass(data: {
    courseId: string;
    code: string;
    startDate: Date;
    endDate?: Date;
  }): Promise<CourseClass> {
    return prisma.courseClass.create({
      data: {
        courseId: data.courseId,
        code: data.code.toUpperCase(),
        startDate: data.startDate,
        endDate: data.endDate,
        isOpen: true
      }
    });
  }

  /**
   * Inscreve um aluno em uma turma
   */
  public static async enrollStudent(classId: string, studentId: string) {
    const courseClass = await prisma.courseClass.findUnique({
      where: { id: classId },
      include: { course: true, students: true }
    });

    if (!courseClass || !courseClass.isOpen) {
      throw new Error('Esta turma não está aberta para novas inscrições.');
    }

    if (courseClass.students.length >= courseClass.course.vacancies) {
      throw new Error('O limite de vagas desta turma foi atingido.');
    }

    const alreadyEnrolled = courseClass.students.some((s) => s.studentId === studentId);
    if (alreadyEnrolled) {
      throw new Error('O policial já se encontra matriculado nesta turma.');
    }

    return prisma.studentEnrollment.create({
      data: {
        classId,
        studentId
      }
    });
  }

  /**
   * Lança o resultado final de um aluno com emissão de certificado e atualização estatística do instrutor
   */
  public static async evaluateStudent(data: {
    enrollmentId: string;
    passed: boolean;
    finalGrade: number;
    notes?: string;
    evaluatorId: string;
  }) {
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { id: data.enrollmentId },
      include: {
        class: {
          include: { course: true }
        }
      }
    });

    if (!enrollment) throw new Error('Matrícula não localizada.');

    const guildId = enrollment.class.course.guildId;
    const certificateCode = await ProtocolGenerator.generate('CERT', guildId);

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedEnrollment = await tx.studentEnrollment.update({
        where: { id: data.enrollmentId },
        data: {
          passed: data.passed,
          finalGrade: new Prisma.Decimal(data.finalGrade),
          notes: data.notes
        }
      });

      let certificate = null;

      // Se aprovado, emitir certificado oficial e vincular ao perfil funcional
      if (data.passed) {
        const studentProfile = await tx.policeProfile.findUnique({
          where: {
            guildId_userId: {
              guildId,
              userId: enrollment.studentId
            }
          }
        });

        if (studentProfile) {
          certificate = await tx.certificate.create({
            data: {
              profileId: studentProfile.id,
              courseName: enrollment.class.course.name,
              code: certificateCode,
              issuerId: data.evaluatorId
            }
          });
        }
      }

      // Atualizar perfil estatístico do instrutor avaliador
      const instructorProfileRecord = await tx.policeProfile.findUnique({
        where: {
          guildId_userId: {
            guildId,
            userId: data.evaluatorId
          }
        }
      });

      if (instructorProfileRecord) {
        await tx.instructorProfile.upsert({
          where: { profileId: instructorProfileRecord.id },
          update: {
            studentsTotal: { increment: 1 },
            approvedTotal: { increment: data.passed ? 1 : 0 },
            rejectedTotal: { increment: data.passed ? 0 : 1 },
            workloadTaught: { increment: enrollment.class.course.workloadHours }
          },
          create: {
            profileId: instructorProfileRecord.id,
            coursesTaught: 1,
            studentsTotal: 1,
            approvedTotal: data.passed ? 1 : 0,
            rejectedTotal: data.passed ? 0 : 1,
            workloadTaught: enrollment.class.course.workloadHours
          }
        });
      }

      return { updatedEnrollment, certificate };
    });

    await AuditLogService.logAction({
      guildId,
      executorId: data.evaluatorId,
      targetId: enrollment.studentId,
      action: 'ACADEMIA_AVALIACAO',
      details: `Avaliação no curso ${enrollment.class.course.name}: ${data.passed ? 'APROVADO' : 'REPROVADO'} (Nota: ${data.finalGrade})`
    });

    return result;
  }

  /**
   * Consulta o perfil estatístico de um instrutor
   */
  public static async getInstructorStats(guildId: string, userId: string) {
    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId, userId } },
      include: { instructorProfile: true, rank: true }
    });

    return profile;
  }

  /**
   * Valida a autenticidade de um certificado
   */
  public static async verifyCertificate(code: string) {
    return prisma.certificate.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        profile: {
          include: { rank: true, unit: true }
        }
      }
    });
  }
}
