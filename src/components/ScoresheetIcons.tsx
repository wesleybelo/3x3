import React from 'react';

/**
 * Logotipo estilizado da Federação Paulista de Basketball (FPB) / Basquetebol
 */
export const FpbLogo: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    {/* Círculo do brasão */}
    <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
    <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
    
    {/* Linhas da bola de basquete */}
    <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
    <line x1="50" y1="22" x2="50" y2="78" stroke="currentColor" strokeWidth="3" />
    <line x1="22" y1="50" x2="78" y2="50" stroke="currentColor" strokeWidth="3" />
    <path d="M 30 29 C 42 38 42 62 30 71" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M 70 29 C 58 38 58 62 70 71" fill="none" stroke="currentColor" strokeWidth="2.5" />
    
    {/* Sigla FPB */}
    <text
      x="50"
      y="91"
      textAnchor="middle"
      fontSize="10"
      fontWeight="900"
      fontFamily="sans-serif"
      letterSpacing="1.5"
      fill="currentColor"
    >
      FPB
    </text>
    <text
      x="50"
      y="14"
      textAnchor="middle"
      fontSize="7"
      fontWeight="700"
      fontFamily="sans-serif"
      letterSpacing="1"
      fill="currentColor"
    >
      FEDERAÇÃO
    </text>
  </svg>
);

/**
 * Logotipo Oficial FIBA 3x3 com a tipografia stencil característica
 */
export const Fiba3x3Logo: React.FC<{ className?: string }> = ({ className = 'h-10' }) => (
  <div className={`inline-flex items-center gap-1.5 select-none ${className}`}>
    <div className="flex flex-col items-end justify-center leading-none">
      <span className="text-[10px] font-black tracking-widest text-[#F27D26]">FIBA</span>
    </div>
    <div className="bg-black text-white px-2 py-0.5 font-black text-xl italic tracking-tighter rounded-xs border border-black flex items-center shadow-xs">
      <span className="text-white">3</span>
      <span className="text-[#F27D26] mx-0.5">X</span>
      <span className="text-white">3</span>
    </div>
  </div>
);

/**
 * Ícone da Mão com 2 dedos apontados (Sinal de 2 Lances Livres - Faltas 7 a 9)
 * Conforme diagrama oficial FIBA 3x3 no regulamento e na súmula em branco
 */
export const HandTwoFingersIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-5' }) => (
  <svg viewBox="0 0 32 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Pulso e dorso */}
    <path d="M2 17 L8 17 L10 13 L15 13" fill="none" />
    {/* Dedos anelar e mínimo dobrados */}
    <rect x="8" y="11" width="5" height="4" rx="1.5" fill="currentColor" fillOpacity="0.1" />
    <rect x="8" y="7" width="6" height="4" rx="1.5" fill="currentColor" fillOpacity="0.1" />
    {/* Polegar dobrado segurando os dedos */}
    <path d="M12 14 C14 14 16 11 14 9" />
    {/* Dedo indicador estendido para a direita/cima */}
    <path d="M14 6 L26 6 C27.5 6 27.5 9 26 9 L15 9" fill="currentColor" fillOpacity="0.2" />
    {/* Dedo médio estendido para a direita/cima */}
    <path d="M14 2 L28 2 C29.5 2 29.5 5 28 5 L15 5" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

/**
 * Ícone da Mão com 2 dedos apontados + Bola de Basquete (Sinal de 2 LL + Posse de Bola - Falta 10+)
 * Conforme diagrama oficial FIBA 3x3 no regulamento e na súmula em branco
 */
export const HandTwoFingersWithBallIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-5' }) => (
  <div className={`inline-flex items-center gap-0.5 ${className}`}>
    <HandTwoFingersIcon className="w-5 h-4 text-black shrink-0" />
    {/* Bola de basquete */}
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-black shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="10" cy="10" r="8.5" fill="#FFF" />
      <line x1="10" y1="1.5" x2="10" y2="18.5" />
      <line x1="1.5" y1="10" x2="18.5" y2="10" />
      <path d="M 4 4 C 7 7 7 13 4 16" />
      <path d="M 16 4 C 13 7 13 13 16 16" />
    </svg>
  </div>
);
