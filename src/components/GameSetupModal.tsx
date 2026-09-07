import React, { useState } from 'react';
import { GameState, MatchInfo, Team } from '../types';
import { GameEngine } from '../engine/GameEngine';
import { X, Settings, Users, Trophy } from 'lucide-react';

interface GameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  engine: GameEngine;
}

export const GameSetupModal: React.FC<GameSetupModalProps> = ({
  isOpen,
  onClose,
  state,
  engine,
}) => {
  const [matchInfo, setMatchInfo] = useState<MatchInfo>({ ...state.matchInfo });
  const [teamAName, setTeamAName] = useState(state.teamA.name);
  const [teamAShort, setTeamAShort] = useState(state.teamA.shortName);
  const [teamBName, setTeamBName] = useState(state.teamB.name);
  const [teamBShort, setTeamBShort] = useState(state.teamB.shortName);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedTeamA: Team = {
      ...state.teamA,
      name: teamAName.trim() || 'Equipe Alpha',
      shortName: teamAShort.trim().toUpperCase() || 'ALP',
    };

    const updatedTeamB: Team = {
      ...state.teamB,
      name: teamBName.trim() || 'Equipe Bravo',
      shortName: teamBShort.trim().toUpperCase() || 'BRV',
    };

    engine.resetMatch(matchInfo, updatedTeamA, updatedTeamB);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="game-setup-modal"
        className="w-full max-w-2xl max-h-[90vh] bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col text-neutral-100 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Configuração da Partida FIBA 3x3
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                Dados oficiais para cabeçalho da súmula e registro de equipes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Dados do Torneio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-neutral-800 pb-1">
              <Trophy className="w-4 h-4" />
              Informações do Evento
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Competição / Torneio:</label>
                <input
                  type="text"
                  value={matchInfo.competition}
                  onChange={e => setMatchInfo({ ...matchInfo, competition: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-medium focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Quadra / Court:</label>
                <input
                  type="text"
                  value={matchInfo.court}
                  onChange={e => setMatchInfo({ ...matchInfo, court: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-medium focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Jogo Nº:</label>
                <input
                  type="text"
                  value={matchInfo.matchNumber}
                  onChange={e => setMatchInfo({ ...matchInfo, matchNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-mono focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Categoria:</label>
                <input
                  type="text"
                  value={matchInfo.category}
                  onChange={e => setMatchInfo({ ...matchInfo, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-medium focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Data:</label>
                <input
                  type="date"
                  value={matchInfo.date}
                  onChange={e => setMatchInfo({ ...matchInfo, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-mono focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Hora:</label>
                <input
                  type="time"
                  value={matchInfo.time}
                  onChange={e => setMatchInfo({ ...matchInfo, time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-mono focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Oficiais de Mesa e Árbitros */}
            <div className="pt-2 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-neutral-400 font-medium mb-0.5">Apontador (Scorer):</label>
                <input
                  type="text"
                  value={matchInfo.scorerName || ''}
                  onChange={e => setMatchInfo({ ...matchInfo, scorerName: e.target.value })}
                  placeholder="Carlos M. Silva"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-0.5">Cronometrista (Timer):</label>
                <input
                  type="text"
                  value={matchInfo.timerName || ''}
                  onChange={e => setMatchInfo({ ...matchInfo, timerName: e.target.value })}
                  placeholder="Mariana R. Costa"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-0.5">Operador 12":</label>
                <input
                  type="text"
                  value={matchInfo.operator12Name || ''}
                  onChange={e => setMatchInfo({ ...matchInfo, operator12Name: e.target.value })}
                  placeholder="Lucas B. Andrade"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-0.5">Árbitro 1:</label>
                <input
                  type="text"
                  value={matchInfo.referee1Name || ''}
                  onChange={e => setMatchInfo({ ...matchInfo, referee1Name: e.target.value })}
                  placeholder="Roberto N. Santos"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-0.5">Árbitro 2:</label>
                <input
                  type="text"
                  value={matchInfo.referee2Name || ''}
                  onChange={e => setMatchInfo({ ...matchInfo, referee2Name: e.target.value })}
                  placeholder="Fernanda P. Lima"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Equipes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 border-b border-neutral-800 pb-1">
              <Users className="w-4 h-4" />
              Equipes Participantes
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                <span className="font-bold text-blue-400 block uppercase">Equipe A</span>
                <div>
                  <label className="block text-neutral-400 mb-1">Nome:</label>
                  <input
                    type="text"
                    value={teamAName}
                    onChange={e => setTeamAName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Sigla (3 letras):</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={teamAShort}
                    onChange={e => setTeamAShort(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                <span className="font-bold text-red-400 block uppercase">Equipe B</span>
                <div>
                  <label className="block text-neutral-400 mb-1">Nome:</label>
                  <input
                    type="text"
                    value={teamBName}
                    onChange={e => setTeamBName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Sigla (3 letras):</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={teamBShort}
                    onChange={e => setTeamBShort(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-mono focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20 transition-all active:scale-95"
            >
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
