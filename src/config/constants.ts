export const COLORS = {
  PRIMARY: 0x1B2A4A,   // Azul Marinho Institucional
  SUCCESS: 0x2E7D32,   // Verde Escuro Tático / Operação
  WARNING: 0xC67D00,   // Âmbar / Alerta Institucional
  DANGER: 0x8B0000,    // Vermelho Bordô / Corregedoria / Penalidade
  INFO: 0x005F9E,      // Azul Cobalto / Atendimento
  NEUTRAL: 0x2C3E50,   // Cinza Grafite Corporativo
  DARK: 0x111625       // Fundo Profundo
} as const;

export const ICONS = {
  SHIELD: '🛡️',
  BADGE: '🎖️',
  SIREN: '🚨',
  LOCK: '🔒',
  RADIO: '📻',
  DOC: '📄',
  HAMMER: '⚖️',
  CHECK: '✅',
  CROSS: '❌',
  WARN: '⚠️',
  GEAR: '⚙️',
  CLOCK: '⏱️',
  CAR: '🚓',
  LOCATION: '📍',
  USER: '👤',
  STAR: '⭐',
  CHART: '📊'
} as const;

export const PROTOCOL_PREFIXES = {
  ARREST: 'PR',
  FINE: 'MT',
  SEIZURE: 'AP',
  OCCURRENCE: 'OC',
  OPERATION: 'OP',
  IPM: 'IPM',
  PDO: 'PDO',
  TICKET: 'TK',
  SUGGESTION: 'SUG',
  BULLETIN_GENERAL: 'BG',
  BULLETIN_INTERNAL: 'BI',
  CERTIFICATE: 'CERT',
  ERROR: 'ERR',
  AUDIT: 'AUD'
} as const;
