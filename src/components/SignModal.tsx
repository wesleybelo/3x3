import React, { useState } from 'react';
import { GameState } from '../types';
import { CommandDispatcher } from '../engine/CommandDispatcher';
import { X, PenTool, CheckCircle, Shield, RotateCcw } from 'lucide-react';

interface SignModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  dispatcher: CommandDispatcher;
  onResetGame?: () => void;
}

export const SignModal: React.FC<SignModalProps> = ({
  isOpen,
  onClose,
  state,
  dispatcher,
  onResetGame,
}) => {
  const [referee1Name, setReferee1Name] = useState(
    state.signatures.refereeName || state.matchInfo.referee1Name || 'Roberto N. Santos'
  );
  const [referee1Sig, setReferee1Sig] = useState(
    state.signatures.refereeSignature || 'Roberto N. Santos'
  );

  const [referee2Name, setReferee2Name] = useState(
    state.signatures.referee2Name || state.matchInfo.referee2Name || 'Fernanda P. Lima'
  );
  const [referee2Sig, setReferee2Sig] = useState(
    state.signatures.referee2Signature || 'Fernanda P. Lima'
  );

  const [supervisorName, setSupervisorName] = useState(
    state.matchInfo.supervisorName || state.signatures.supervisorName || 'Marcos A. Faria'
  );

  const defaultCaptainName =
    state.signatures.captainName ||
    (state.protest.hasProtest
      ? `Capitão #${state.protest.protestCaptainNumber || 'C'}`
      : '');
  const [captainName, setCaptainName] = useState(defaultCaptainName);
  const [captainSig, setCaptainSig] = useState(
    state.signatures.captainSignature || defaultCaptainName
  );

  if (!isOpen) return null;

  const handleSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referee1Name.trim() || !referee1Sig.trim() || !referee2Name.trim() || !referee2Sig.trim()) {
      return;
    }

    dispatcher.signScoresheet('REFEREE', referee1Sig.trim(), referee1Name.trim());
    dispatcher.signScoresheet('REFEREE_2', referee2Sig.trim(), referee2Name.trim());
    if (state.protest.hasProtest && captainSig.trim()) {
      dispatcher.signScoresheet('CAPTAIN', captainSig.trim(), captainName.trim() || defaultCaptainName);
    }
    if (supervisorName.trim()) {
      dispatcher.updateMatchInfo({ supervisorName: supervisorName.trim() });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="sign-modal"
        className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Partida Concluída - Coleta de Assinaturas e Selagem
              </h3>
              <p className="text-xs text-neutral-400">
                Chancela oficial FIBA 3x3 de encerramento e validação da súmula
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

        <form onSubmit={handleSign} className="p-5 space-y-4">
          <div className="space-y-4">
            {/* ÁRBITRO 1 (REFEREE 1) */}
            <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-white">
                  [ ÁRBITRO 1 (REFEREE 1) ]
                </span>
                <span className="text-[10px] text-blue-400 font-mono font-bold">Obrigatório</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Nome do Árbitro 1:</label>
                  <input
                    type="text"
                    value={referee1Name}
                    onChange={e => setReferee1Name(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Nome completo do Árbitro 1"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Rubrica / Assinatura Digital:</label>
                  <input
                    type="text"
                    value={referee1Sig}
                    onChange={e => setReferee1Sig(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-mono font-bold text-[#60A5FA] italic focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Rubrica digital do Árbitro 1"
                  />
                </div>
              </div>
            </div>

            {/* ÁRBITRO 2 (REFEREE 2) */}
            <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-white">
                  [ ÁRBITRO 2 (REFEREE 2) ]
                </span>
                <span className="text-[10px] text-blue-400 font-mono font-bold">Obrigatório</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Nome do Árbitro 2:</label>
                  <input
                    type="text"
                    value={referee2Name}
                    onChange={e => setReferee2Name(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Nome completo do Árbitro 2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Rubrica / Assinatura Digital:</label>
                  <input
                    type="text"
                    value={referee2Sig}
                    onChange={e => setReferee2Sig(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-mono font-bold text-[#60A5FA] italic focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Rubrica digital do Árbitro 2"
                  />
                </div>
              </div>
            </div>

            {/* SUPERVISOR ESPORTIVO (SPORTS SUPERVISOR) */}
            <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-white">
                  [ SUPERVISOR ESPORTIVO (SPORTS SUPERVISOR) ]
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">Nome Oficial</span>
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Nome do Supervisor:</label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={e => setSupervisorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Nome do Supervisor (ex: Marcos A. Faria)"
                />
              </div>
            </div>

            {/* ASSINATURA DO CAPITÃO (OBRIGATÓRIO EXCLUSIVAMENTE SE HOUVER PROTESTO ART. 14) */}
            {state.protest.hasProtest && (
              <div className="p-3.5 bg-amber-950/40 rounded-xl border border-amber-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-amber-300">
                    [ CAPITÃO DA EQUIPE - PROTESTO ART. 14 ]
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">Obrigatório p/ Protesto</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">Nome do Capitão:</label>
                    <input
                      type="text"
                      value={captainName}
                      onChange={e => setCaptainName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                      placeholder="Nome completo do Capitão"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1">Rubrica / Assinatura do Capitão:</label>
                    <input
                      type="text"
                      value={captainSig}
                      onChange={e => setCaptainSig(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-mono font-bold text-amber-400 italic focus:outline-none focus:border-amber-500 transition-colors"
                      placeholder="Rubrica digital do Capitão"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-2.5 text-xs text-neutral-400">
            <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              Ao assinar, os árbitros declaram conformidade com o regulamento oficial FIBA 3x3 e validação das ocorrências registradas em súmula.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const confirmed = window.confirm(
                  'Deseja realmente iniciar uma Nova Partida e zerar o placar e cronômetro (10:00)?'
                );
                if (!confirmed) return;
                if (onResetGame) {
                  onResetGame();
                } else {
                  dispatcher.resetMatch();
                }
                onClose();
              }}
              id="btn-sign-modal-reset-game"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Iniciar Nova Partida (Reset)</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-sign-modal-submit"
                className="px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Registrar Assinaturas Oficiais
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
