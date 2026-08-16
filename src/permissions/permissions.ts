import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { prisma } from '../database/prisma.js';
import { BlacklistService } from '../services/BlacklistService.js';
import { EmergencyModeService } from '../services/EmergencyModeService.js';
import { TemporaryPermissionService } from '../services/TemporaryPermissionService.js';

export const Permissions = {
  // ADMINISTRAÇÃO GERAL & GOVERNANÇA
  ADMIN_MASTER: 'ADMIN.MASTER',
  ADMIN_CONFIGURAR: 'ADMIN.CONFIGURAR',
  ADMIN_GERENCIAR_PERMISSOES: 'ADMIN.GERENCIAR_PERMISSOES',
  ADMIN_AUDITORIA: 'ADMIN.AUDITORIA',
  ADMIN_WORKFLOWS: 'ADMIN.WORKFLOWS',
  ADMIN_COMANDO_GERAL: 'ADMIN.COMANDO_GERAL',
  ADMIN_DOCUMENTOS: 'ADMIN.DOCUMENTOS',
  ADMIN_ESCALAS: 'ADMIN.ESCALAS',
  ADMIN_ALERTAS: 'ADMIN.ALERTAS',
  ADMIN_EXPORTAR: 'ADMIN.EXPORTAR',
  ADMIN_METAS: 'ADMIN.METAS',
  ADMIN_EMERGENCIA: 'ADMIN.EMERGENCIA',
  ADMIN_MANUTENCAO: 'ADMIN.MANUTENCAO',
  ADMIN_SEGURANCA: 'ADMIN.SEGURANCA',
  ADMIN_BACKUP: 'ADMIN.BACKUP',
  ADMIN_BLACKLIST: 'ADMIN.BLACKLIST',

  // RECURSOS HUMANOS (RH)
  RH_CADASTRAR: 'RH.CADASTRAR',
  RH_PROMOVER: 'RH.PROMOVER',
  RH_REBAIXAR: 'RH.REBAIXAR',
  RH_TRANSFERIR: 'RH.TRANSFERIR',
  RH_AFASTAR: 'RH.AFASTAR',
  RH_REINTEGRAR: 'RH.REINTEGRAR',
  RH_EXONERAR: 'RH.EXONERAR',
  RH_EDITAR_CADASTRO: 'RH.EDITAR_CADASTRO',
  RH_VER_HISTORICO: 'RH.VER_HISTORICO',

  // CORREGEDORIA
  CORREGEDORIA_CRIAR_DENUNCIA: 'CORREGEDORIA.CRIAR_DENUNCIA',
  CORREGEDORIA_CRIAR_IPM: 'CORREGEDORIA.CRIAR_IPM',
  CORREGEDORIA_CRIAR_PDO: 'CORREGEDORIA.CRIAR_PDO',
  CORREGEDORIA_JULGAR: 'CORREGEDORIA.JULGAR',
  CORREGEDORIA_APLICAR_SANCAO: 'CORREGEDORIA.APLICAR_SANCAO',
  CORREGEDORIA_CONVOCAR: 'CORREGEDORIA.CONVOCAR',
  CORREGEDORIA_ARQUIVAR: 'CORREGEDORIA.ARQUIVAR',

  // COPOM & VIATURAS
  COPOM_CRIAR_VIATURA: 'COPOM.CRIAR_VIATURA',
  COPOM_GERENCIAR_VIATURA: 'COPOM.GERENCIAR_VIATURA',
  COPOM_STATUS_VIATURA: 'COPOM.STATUS_VIATURA',
  COPOM_DESPACHAR: 'COPOM.DESPACHAR',

  // OPERACIONAL
  OPERACIONAL_PONTO: 'OPERACIONAL.PONTO',
  OPERACIONAL_PATRULHA: 'OPERACIONAL.PATRULHA',
  OPERACIONAL_PRISAO: 'OPERACIONAL.PRISAO',
  OPERACIONAL_MULTA: 'OPERACIONAL.MULTA',
  OPERACIONAL_APREENSAO: 'OPERACIONAL.APREENSAO',
  OPERACIONAL_OCORRENCIA: 'OPERACIONAL.OCORRENCIA',
  OPERACIONAL_OPERACAO: 'OPERACIONAL.OPERACAO',

  // ESCOLA DE FORMAÇÃO / ACADEMIA
  ACADEMIA_CRIAR_CURSO: 'ACADEMIA.CRIAR_CURSO',
  ACADEMIA_CRIAR_TURMA: 'ACADEMIA.CRIAR_TURMA',
  ACADEMIA_APLICAR_RESULTADO: 'ACADEMIA.APLICAR_RESULTADO',
  ACADEMIA_GERENCIAR_INSTRUTOR: 'ACADEMIA.GERENCIAR_INSTRUTOR',
  ACADEMIA_EMITIR_CERTIFICADO: 'ACADEMIA.EMITIR_CERTIFICADO',

  // TICKETS, BOLETINS & COMUNICAÇÃO
  TICKETS_ATENDER: 'TICKETS.ATENDER',
  TICKETS_GERENCIAR: 'TICKETS.GERENCIAR',
  BOLETIM_PUBLICAR_BG: 'BOLETIM.PUBLICAR_BG',
  BOLETIM_PUBLICAR_BI: 'BOLETIM.PUBLICAR_BI',
  COMUNICACAO_SOCIAL: 'COMUNICACAO.SOCIAL'
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];

export class PermissionService {
  /**
   * Verifica se o membro possui uma determinada permissão interna
   */
  public static async hasPermission(member: GuildMember, permission: string): Promise<boolean> {
    const guildId = member.guild.id;

    // 0. Salvaguarda de Blacklist (usuários bloqueados são impedidos de ações sensíveis)
    const blacklistCheck = await BlacklistService.isBlacklisted(guildId, member.id);
    if (blacklistCheck.blocked) {
      return false;
    }

    // Administradores nativos do Discord possuem bypass total
    if (member.permissions.has(PermissionFlagsBits.Administrator) || member.guild.ownerId === member.id) {
      return true;
    }

    // 1. Salvaguarda do Modo Emergência (bloqueia RH e Corregedoria se não for admin master)
    const emergencyCheck = await EmergencyModeService.isEmergencyActive(guildId);
    if (emergencyCheck.active && (permission.startsWith('RH.') || permission.startsWith('CORREGEDORIA.'))) {
      return false;
    }

    // 2. Verificar Permissões Temporárias ou Substituição de Função
    const hasTempPerm = await TemporaryPermissionService.hasActiveTemporaryPermission(guildId, member.id, permission);
    if (hasTempPerm) {
      return true;
    }

    const roleIds = Array.from(member.roles.cache.keys());

    // 3. Verificar se o usuário possui cargo configurado em GuildSettings
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId }
    });

    if (settings) {
      if (settings.adminRoleId && roleIds.includes(settings.adminRoleId)) return true;

      if (permission.startsWith('ADMIN.') && settings.adminRoleId && roleIds.includes(settings.adminRoleId)) {
        return true;
      }
      if (permission.startsWith('RH.') && settings.rhRoleId && roleIds.includes(settings.rhRoleId)) {
        return true;
      }
      if (permission.startsWith('CORREGEDORIA.') && settings.corregedoriaRoleId && roleIds.includes(settings.corregedoriaRoleId)) {
        return true;
      }
      if (permission.startsWith('COPOM.') && settings.copomRoleId && roleIds.includes(settings.copomRoleId)) {
        return true;
      }
      if (permission.startsWith('ACADEMIA.') && settings.academyRoleId && roleIds.includes(settings.academyRoleId)) {
        return true;
      }
    }

    // 4. Verificar na tabela personalizada de permissões (role_permissions)
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        guildId,
        roleId: { in: roleIds }
      }
    });

    const hasExplicitPerm = rolePermissions.some(
      (rp) => rp.permission === permission || rp.permission === Permissions.ADMIN_MASTER
    );

    return hasExplicitPerm;
  }

  /**
   * Valida a relação hierárquica entre executor e alvo
   * Retorna true se o executor tem nível superior ou permissão administrativa para a ação
   */
  public static async canActOnTarget(
    guildId: string,
    executorMember: GuildMember,
    targetUserId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (executorMember.permissions.has(PermissionFlagsBits.Administrator) || executorMember.guild.ownerId === executorMember.id) {
      return { allowed: true };
    }

    if (executorMember.id === targetUserId) {
      return { allowed: false, reason: 'Você não pode executar ações disciplinares ou hierárquicas sobre si mesmo (Conflito de Interesse).' };
    }

    const [executorProfile, targetProfile] = await Promise.all([
      prisma.policeProfile.findUnique({
        where: { guildId_userId: { guildId, userId: executorMember.id } },
        include: { rank: true }
      }),
      prisma.policeProfile.findUnique({
        where: { guildId_userId: { guildId, userId: targetUserId } },
        include: { rank: true }
      })
    ]);

    if (!targetProfile || !targetProfile.rank) {
      return { allowed: true };
    }

    const executorRankLevel = executorProfile?.rank?.level ?? 0;
    const targetRankLevel = targetProfile.rank.level;

    if (executorRankLevel <= targetRankLevel) {
      return {
        allowed: false,
        reason: `Hierarquia insuficiente: Seu nível hierárquico (${executorRankLevel}) é menor ou igual ao do alvo (${targetRankLevel}).`
      };
    }

    return { allowed: true };
  }
}
