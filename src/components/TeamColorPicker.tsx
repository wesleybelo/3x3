import React from 'react';
import { Palette, Check, Pipette } from 'lucide-react';
import {
  OFFICIAL_UNIFORM_COLORS,
  getContrastTextColor,
  hexToRgba,
} from '../utils/colors';

interface TeamColorPickerProps {
  label: string;
  selectedColor: string;
  onChange: (color: string) => void;
  teamLetter: 'A' | 'B';
  teamName: string;
}

export const TeamColorPicker: React.FC<TeamColorPickerProps> = ({
  label,
  selectedColor,
  onChange,
  teamLetter,
  teamName,
}) => {
  const contrastText = getContrastTextColor(selectedColor);
  const matchedPreset = OFFICIAL_UNIFORM_COLORS.find(
    (c) => c.hex.toLowerCase() === selectedColor.toLowerCase()
  );

  return (
    <div className="space-y-2 p-3 rounded-xl bg-neutral-900/80 border border-neutral-700/80">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-[#F27D26]" />
          <span className="text-xs font-bold text-neutral-300">{label}</span>
        </div>

        {/* Pré-visualização do distintivo / camisa */}
        <div
          style={{
            backgroundColor: selectedColor,
            color: contrastText,
            borderColor: selectedColor.toLowerCase() === '#ffffff' ? '#94A3B8' : 'rgba(255,255,255,0.3)',
            boxShadow: `0 2px 8px ${hexToRgba(selectedColor, 0.4)}`,
          }}
          className="px-2.5 py-0.5 rounded-lg border text-[11px] font-mono font-black flex items-center gap-1.5 shadow-sm transition-all"
          title={`Cor selecionada para Equipe ${teamLetter}`}
        >
          <span className="w-2 h-2 rounded-full border border-black/20" style={{ backgroundColor: selectedColor }} />
          <span>{matchedPreset ? matchedPreset.name : selectedColor.toUpperCase()}</span>
        </div>
      </div>

      {/* Paleta de Cores Predefinidas + Seletor Customizado */}
      <div className="flex flex-wrap items-center gap-1.5">
        {OFFICIAL_UNIFORM_COLORS.map((preset) => {
          const isSelected = selectedColor.toLowerCase() === preset.hex.toLowerCase();
          const checkColor = getContrastTextColor(preset.hex);

          return (
            <button
              key={`color-${teamLetter}-${preset.hex}`}
              type="button"
              onClick={() => onChange(preset.hex)}
              title={`${preset.name} (${preset.hex})`}
              style={{
                backgroundColor: preset.hex,
                borderColor: preset.borderHex || (isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.2)'),
                boxShadow: isSelected ? `0 0 10px ${hexToRgba(preset.hex, 0.8)}` : undefined,
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'scale-110 ring-2 ring-white ring-offset-1 ring-offset-neutral-900 z-10'
                  : 'hover:scale-105 hover:border-white/60 opacity-90 hover:opacity-100'
              }`}
            >
              {isSelected && (
                <Check
                  className="w-4 h-4 stroke-[3]"
                  style={{ color: checkColor }}
                />
              )}
            </button>
          );
        })}

        {/* Seletor Customizado / Color Picker Nativo */}
        <label
          title="Escolher cor personalizada (Color Picker)"
          className="relative h-7 sm:h-8 px-2 rounded-lg border border-dashed border-neutral-600 hover:border-[#F27D26] bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center gap-1 text-[10px] font-bold font-mono uppercase transition-all cursor-pointer"
        >
          <Pipette className="w-3.5 h-3.5 text-[#F27D26]" />
          <span className="hidden xs:inline">Outra</span>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
