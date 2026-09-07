import React, { useState } from 'react';
import { FoulType, GameState, Player, TeamId } from '../types';
import { CommandDispatcher } from '../engine/CommandDispatcher';
import { X, User, AlertCircle, Check } from 'lucide-react';

export type ActionModalType =
  | 'SCORE_1P'
  | 'SCORE_2P'
  | 'FREE_THROW_MADE'
  | 'FREE_THROW_MISSED'
  | 'FOUL_P'
  | 'FOUL_U'
  | 'FOUL_D'
  | 'SUBSTITUTION'
  | 'TIMEOUT';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: TeamId;
  actionType: ActionModalType;
  state: GameState;
  dispatcher: CommandDispatcher;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  teamId,
  actionType,
  state,
  dispatcher,
}) => {
  const team = teamId === 'A' ? state.teamA : state.teamB;
  const otherTeam = teamId === 'A' ? state.teamB : state.teamA;

  const [selectedPlayerNumber, setSelectedPlayerNumber] = useState<number | null>(
    team.players.find(p => !p.disqualified)?.number ?? null
  );

  // Para substituição
  const starters = team.players.filter(p => p.isStarter);
  const subs = team.players.filter(p => !p.isStarter && !p.disqualified);
  const [subOutNumber, setSubOutNumber] = useState<number | null>(starters[0]?.number ?? null);
  const [subInNumber, setSubInNumber] = useState<number | null>(subs[0]?.number ?? null);

  if (!isOpen) return null;

  const getTitle = () => {
    switch (actionType) {
      case 'SCORE_1P':
        return `Cesta de 1 Ponto (+1) — ${team.name}`;
      case 'SCORE_2P':
        return `Cesta de 2 Pontos (+2) — ${team.name}`;
      case 'FREE_THROW_MADE':
        return `Lance Livre Convertido (+1) — ${team.name}`;
      case 'FREE_THROW_MISSED':
        return `Lance Livre Desperdiçado — ${team.name}`;
      case 'FOUL_P':
        return `Falta Pessoal (P) — ${team.name}`;
      case 'FOUL_U':
        return `Falta Antidesportiva (U - 2 Coletivas) — ${team.name}`;
      case 'FOUL_D':
        return `Falta Desqualificante (D - 2 Coletivas) — ${team.name}`;
      case 'SUBSTITUTION':
        return `Substituição de Jogador — ${team.name}`;
      case 'TIMEOUT':
        return `Tempo Debitado (Timeout) — ${team.name}`;
    }
  };

  const handleConfirm = () => {
    if (actionType === 'SUBSTITUTION') {
      if (subOutNumber && subInNumber) {
        dispatcher.substitute(teamId, subOutNumber, subInNumber);
      }
      onClose();
      return;
    }

    if (actionType === 'TIMEOUT') {
      dispatcher.timeout(teamId);
      onClose();
      return;
    }

    if (!selectedPlayerNumber) return;

    switch (actionType) {
      case 'SCORE_1P':
        dispatcher.score1Pt(teamId, selectedPlayerNumber);
        break;
      case 'SCORE_2P':
        dispatcher.score2Pt(teamId, selectedPlayerNumber);
        break;
      case 'FREE_THROW_MADE':
        dispatcher.freeThrow(teamId, selectedPlayerNumber, true);
        break;
      case 'FREE_THROW_MISSED':
        dispatcher.freeThrow(teamId, selectedPlayerNumber, false);
        break;
      case 'FOUL_P':
        dispatcher.foul(teamId, selectedPlayerNumber, 'P');
        break;
      case 'FOUL_U':
        dispatcher.foul(teamId, selectedPlayerNumber, 'U');
        break;
      case 'FOUL_D':
        dispatcher.foul(teamId, selectedPlayerNumber, 'D');
        break;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="action-modal"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: team.color }}
            />
            <h3 className="font-bold text-base sm:text-lg text-white truncate">
              {getTitle()}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 space-y-4">
          {actionType === 'SUBSTITUTION' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Jogador que SAI de quadra:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {starters.map(p => (
                    <button
                      key={`sub-out-${p.number}`}
                      onClick={() => setSubOutNumber(p.number)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        subOutNumber === p.number
                          ? 'border-red-500 bg-red-950/40 text-white shadow-md'
                          : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <div>
                        <span className="font-mono text-lg font-black mr-2">#{p.number}</span>
                        <span className="text-sm font-medium">{p.name}</span>
                      </div>
                      {subOutNumber === p.number && <Check className="w-4 h-4 text-red-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Jogador que ENTRA em quadra (Banco):
                </label>
                {subs.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic">Sem reservas disponíveis.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {subs.map(p => (
                      <button
                        key={`sub-in-${p.number}`}
                        onClick={() => setSubInNumber(p.number)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          subInNumber === p.number
                            ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-md'
                            : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 text-neutral-300'
                        }`}
                      >
                        <div>
                          <span className="font-mono text-lg font-black mr-2">#{p.number}</span>
                          <span className="text-sm font-medium">{p.name}</span>
                        </div>
                        {subInNumber === p.number && <Check className="w-4 h-4 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : actionType === 'TIMEOUT' ? (
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-2">
              <p className="text-sm font-medium text-neutral-300">
                Confirmar solicitação de tempo debitado (Timeout de 30 segundos) para a{' '}
                <strong className="text-white">{team.name}</strong>?
              </p>
              <p className="text-xs text-neutral-400">
                No FIBA 3x3, cada equipe tem direito a apenas 1 timeout por partida.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Selecione o Jogador:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {team.players.map(player => {
                  const isDisqualified = player.disqualified;
                  const isSelected = selectedPlayerNumber === player.number;

                  return (
                    <button
                      key={`select-player-${player.number}`}
                      disabled={isDisqualified}
                      onClick={() => setSelectedPlayerNumber(player.number)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isDisqualified
                          ? 'opacity-40 border-neutral-800 bg-neutral-950 cursor-not-allowed'
                          : isSelected
                          ? 'border-amber-500 bg-amber-500/10 text-white shadow-lg ring-1 ring-amber-500/50'
                          : 'border-neutral-800 bg-neutral-950/80 hover:border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-lg ${
                            isSelected ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-white'
                          }`}
                        >
                          #{player.number}
                        </div>
                        <div>
                          <div className="font-semibold text-sm leading-tight text-white">
                            {player.name}
                            {player.isStarter && (
                              <span className="ml-1 text-[10px] text-blue-400 font-mono">(Quadra)</span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                            Pts: <strong className="text-white">{player.points}</strong> | Faltas:{' '}
                            <span className="text-amber-400">
                              {player.fouls.length > 0 ? player.fouls.join('-') : '0'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isDisqualified ? (
                        <span className="text-[10px] uppercase font-bold text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800">
                          Desqualif.
                        </span>
                      ) : isSelected ? (
                        <Check className="w-5 h-5 text-amber-500" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {actionType === 'FOUL_U' && (
                <div className="mt-3 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Regra FIBA 3x3:</strong> A falta antidesportiva (U) ocupa 2 posições consecutivas no contador coletivo (1ª SKIPPED, 2ª U) e é anotada no jogador.
                  </span>
                </div>
              )}

              {actionType === 'FOUL_D' && (
                <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Regra FIBA 3x3:</strong> A falta desqualificante (D) ocupa 2 posições coletivas (1ª SKIPPED, 2ª D) e desqualifica o jogador imediatamente da partida.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-neutral-800 bg-neutral-950">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20 transition-all active:scale-95"
          >
            Confirmar Registro
          </button>
        </div>
      </div>
    </div>
  );
};
