import { prisma } from '../database/prisma.js';

export interface TimelineEntry {
  date: Date;
  type: 'INGRESSO' | 'PROMOCAO' | 'REBAIXAMENTO' | 'TRANSFERENCIA' | 'MEDALHA' | 'CURSO' | 'SANCAO' | 'AFASTAMENTO' | 'EXONERACAO';
  title: string;
  description: string;
  protocol?: string;
  authorId?: string;
}

export class TimelineService {
  /**
   * Gera a linha do tempo funcional completa de um policial
   */
  public static async getTimeline(guildId: string, userId: string): Promise<TimelineEntry[]> {
    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId, userId } },
      include: {
        rank: true,
        unit: true,
        promotions: true,
        demotions: true,
        transfers: true,
        dismissals: true,
        absences: true,
        medals: { include: { medal: true } },
        certificates: true
      }
    });

    if (!profile) return [];

    const entries: TimelineEntry[] = [];

    // 1. Ingresso
    entries.push({
      date: profile.hireDate,
      type: 'INGRESSO',
      title: 'Ingresso na Corporação',
      description: `Policial cadastrado com a matrícula ${profile.badgeNumber}.`,
      authorId: profile.supervisorId || undefined
    });

    // 2. Promoções
    for (const p of profile.promotions) {
      entries.push({
        date: p.createdAt,
        type: 'PROMOCAO',
        title: `Promoção para ${p.newRank}`,
        description: `De ${p.previousRank} para ${p.newRank}. Motivo: ${p.reason}`,
        protocol: p.protocol,
        authorId: p.authorId
      });
    }

    // 3. Rebaixamentos
    for (const d of profile.demotions) {
      entries.push({
        date: d.createdAt,
        type: 'REBAIXAMENTO',
        title: `Rebaixamento para ${d.newRank}`,
        description: `De ${d.previousRank} para ${d.newRank}. Motivo: ${d.reason}`,
        protocol: d.protocol,
        authorId: d.authorId
      });
    }

    // 4. Transferências
    for (const t of profile.transfers) {
      entries.push({
        date: t.createdAt,
        type: 'TRANSFERENCIA',
        title: `Transferência para ${t.newUnit}`,
        description: `De ${t.previousUnit} para ${t.newUnit}. Motivo: ${t.reason}`,
        protocol: t.protocol,
        authorId: t.authorId
      });
    }

    // 5. Medalhas
    for (const m of profile.medals) {
      entries.push({
        date: m.grantedAt,
        type: 'MEDALHA',
        title: `Condecoração: ${m.medal.name}`,
        description: `Medalha (${m.medal.category}). Motivo: ${m.reason}`,
        authorId: m.grantedBy
      });
    }

    // 6. Certificados / Cursos
    for (const c of profile.certificates) {
      entries.push({
        date: c.issueDate,
        type: 'CURSO',
        title: `Conclusão de Curso: ${c.courseName}`,
        description: `Certificado emitido sob código ${c.code}.`,
        protocol: c.code,
        authorId: c.issuerId
      });
    }

    // 7. Exoneração (se houver)
    for (const dis of profile.dismissals) {
      entries.push({
        date: dis.createdAt,
        type: 'EXONERACAO',
        title: 'Exoneração Funcional',
        description: `Desligamento da corporação. Motivo: ${dis.reason}`,
        protocol: dis.protocol,
        authorId: dis.authorId
      });
    }

    // 8. Sanções da Corregedoria
    const sanctions = await prisma.sanction.findMany({
      where: { guildId, profileId: profile.id }
    });

    for (const s of sanctions) {
      entries.push({
        date: s.createdAt,
        type: 'SANCAO',
        title: `Sanção Disciplinar: ${s.type}`,
        description: `Penalidade aplicada. Motivo: ${s.reason}${s.daysSuspended ? ` (${s.daysSuspended} dias)` : ''}`,
        protocol: s.protocol,
        authorId: s.authorId
      });
    }

    // Ordenar cronologicamente decrescente (mais recente primeiro)
    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
