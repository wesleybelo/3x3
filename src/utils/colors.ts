/**
 * Utilitários de cores e paleta oficial de uniformes FIBA 3x3
 */

export interface PresetColor {
  name: string;
  hex: string;
  borderHex?: string;
  isLight?: boolean;
}

export const OFFICIAL_UNIFORM_COLORS: PresetColor[] = [
  { name: 'Vermelho', hex: '#DC2626' },
  { name: 'Azul', hex: '#2563EB' },
  { name: 'Preto', hex: '#18181B' },
  { name: 'Branco', hex: '#FFFFFF', borderHex: '#CBD5E1', isLight: true },
  { name: 'Amarelo', hex: '#EAB308', isLight: true },
  { name: 'Verde', hex: '#16A34A' },
  { name: 'Laranja', hex: '#EA580C' },
  { name: 'Roxo', hex: '#7C3AED' },
  { name: 'Marinho', hex: '#0F172A' },
  { name: 'Cinza', hex: '#64748B' },
];

/**
 * Calcula a cor ideal do texto (preto ou branco) para contraste WCAG sobre qualquer hex
 */
export function getContrastTextColor(hexColor: string): '#FFFFFF' | '#111827' {
  if (!hexColor) return '#FFFFFF';
  let clean = hexColor.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    return '#FFFFFF';
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  // Perceived luminance formula (YIQ standard)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 155 ? '#111827' : '#FFFFFF';
}

/**
 * Converte hex para rgba com opacidade customizada
 */
export function hexToRgba(hexColor: string, alpha: number): string {
  if (!hexColor) return `rgba(255, 255, 255, ${alpha})`;
  let clean = hexColor.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
