import { prisma } from '../database/prisma.js';

export interface SearchResultItem {
  id: string;
  protocol?: string;
  category: string;
  title: string;
  subtitle?: string;
  date: Date;
  authorOrResponsible?: string;
  status?: string;
  raw: any;
}

export class SearchService {
  /**
   * Realiza busca global rápida em todas as entidades da Guild
   */
  public static async globalSearch(guildId: string, query: string, limit: number = 15): Promise<SearchResultItem[]> {
    const q = query.trim();
    if (!q) return [];

    const results: SearchResultItem[] = [];

    // 1. Policiais (Nome, Matrícula, Guerra, ID)
    const profiles = await prisma.policeProfile.findMany({
      where: {
        guildId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { operationalName: { contains: q, mode: 'insensitive' } },
          { badgeNumber: { contains: q, mode: 'insensitive' } },
          { userId: { contains: q } },
          { passportId: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: { rank: true, unit: true },
      take: 5
    });

    for (const p of profiles) {
      results.push({
        id: p.id,
        category: 'POLICIAL',
        title: `${p.rank?.abbreviation || ''} ${p.operationalName} (${p.name})`,
        subtitle: `Matrícula: ${p.badgeNumber} • Unidade: ${p.unit?.abbreviation || 'N/A'} • Status: ${p.status}`,
        date: p.hireDate,
        authorOrResponsible: p.supervisorId ? `<@${p.supervisorId}>` : 'Comando',
        status: p.status,
        raw: p
      });
    }

    // 2. Ocorrências
    const occurrences = await prisma.occurrence.findMany({
      where: {
        guildId,
        OR: [
          { protocol: { contains: q, mode: 'insensitive' } },
          { type: { contains: q, mode: 'insensitive' } },
          { location: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 5
    });

    for (const oc of occurrences) {
      results.push({
        id: oc.id,
        protocol: oc.protocol,
        category: 'OCORRENCIA',
        title: `[${oc.protocol}] ${oc.type}`,
        subtitle: `Local: ${oc.location} • Resultado: ${oc.result}`,
        date: oc.createdAt,
        authorOrResponsible: oc.authorId,
        status: 'REGISTRADA',
        raw: oc
      });
    }

    // 3. Prisões
    const arrests = await prisma.arrest.findMany({
      where: {
        guildId,
        OR: [
          { protocol: { contains: q, mode: 'insensitive' } },
          { suspectName: { contains: q, mode: 'insensitive' } },
          { articles: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 5
    });

    for (const ar of arrests) {
      results.push({
        id: ar.id,
        protocol: ar.protocol,
        category: 'PRISAO',
        title: `[${ar.protocol}] Prisão: ${ar.suspectName}`,
        subtitle: `Artigos: ${ar.articles} • Pena: ${ar.penaltyMonths} meses`,
        date: ar.createdAt,
        authorOrResponsible: ar.officerId,
        status: 'EFETIVADA',
        raw: ar
      });
    }

    // 4. Corregedoria (IPM & PDO)
    const cases = await prisma.corregedoriaCase.findMany({
      where: {
        guildId,
        OR: [
          { protocol: { contains: q, mode: 'insensitive' } },
          { factNarrative: { contains: q, mode: 'insensitive' } },
          { investigatedId: { contains: q } }
        ]
      },
      take: 5
    });

    for (const c of cases) {
      results.push({
        id: c.id,
        protocol: c.protocol,
        category: c.type,
        title: `[${c.protocol}] Processo ${c.type}`,
        subtitle: `Investigado: <@${c.investigatedId}> • Status: ${c.status}`,
        date: c.createdAt,
        authorOrResponsible: c.officerInChargeId,
        status: c.status,
        raw: c
      });
    }

    // 5. Viaturas
    const vehicles = await prisma.vehicle.findMany({
      where: {
        guildId,
        OR: [
          { prefix: { contains: q, mode: 'insensitive' } },
          { model: { contains: q, mode: 'insensitive' } },
          { plate: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: { unit: true },
      take: 5
    });

    for (const v of vehicles) {
      results.push({
        id: v.id,
        category: 'VIATURA',
        title: `VTR ${v.prefix} - ${v.model}`,
        subtitle: `Placa: ${v.plate} • Unidade: ${v.unit?.abbreviation || 'Geral'} • Status: ${v.status}`,
        date: v.createdAt,
        status: v.status,
        raw: v
      });
    }

    // 6. Documentos Institucionais
    const docs = await prisma.document.findMany({
      where: {
        guildId,
        OR: [
          { protocol: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 5
    });

    for (const d of docs) {
      results.push({
        id: d.id,
        protocol: d.protocol,
        category: 'DOCUMENTO',
        title: `[${d.protocol}] ${d.title}`,
        subtitle: `Tipo: ${d.type} • Autor: ${d.authorName}`,
        date: d.createdAt,
        authorOrResponsible: d.authorId,
        status: 'EMITIDO',
        raw: d
      });
    }

    // 7. Workflows de Aprovação
    const requests = await prisma.approvalRequest.findMany({
      where: {
        guildId,
        OR: [
          { protocol: { contains: q, mode: 'insensitive' } },
          { reason: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 5
    });

    for (const r of requests) {
      results.push({
        id: r.id,
        protocol: r.protocol,
        category: 'WORKFLOW',
        title: `[${r.protocol}] Solicitação de ${r.actionType}`,
        subtitle: `Alvo: <@${r.targetId}> • Status: ${r.status}`,
        date: r.createdAt,
        authorOrResponsible: r.requesterId,
        status: r.status,
        raw: r
      });
    }

    return results.slice(0, limit);
  }

  /**
   * Autocomplete otimizado para comandos do Discord
   */
  public static async autocomplete(guildId: string, focusedValue: string): Promise<Array<{ name: string; value: string }>> {
    const q = focusedValue.trim();
    if (!q) {
      // Retornar os 10 últimos registros diversos
      const recent = await prisma.occurrence.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      return recent.map((r) => ({
        name: `[OCORRÊNCIA] ${r.protocol} - ${r.type.substring(0, 40)}`,
        value: r.protocol
      }));
    }

    const items = await this.globalSearch(guildId, q, 15);
    return items.map((it) => {
      const display = it.protocol
        ? `[${it.category}] ${it.protocol} - ${it.title.substring(0, 50)}`
        : `[${it.category}] ${it.title.substring(0, 60)}`;
      return {
        name: display.length > 100 ? display.substring(0, 97) + '...' : display,
        value: it.protocol || (it.raw.userId ? it.raw.userId : it.id)
      };
    });
  }
}
