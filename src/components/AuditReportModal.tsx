import React from 'react';
import { GameState } from '../types';
import { auditScoresheet } from '../scoresheet/ScoresheetAudit';
import { X, ShieldCheck, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  if (!isOpen) return null;

  const report = auditScoresheet(state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="audit-report-modal"
        className="w-full max-w-2xl max-h-[90vh] bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col text-neutral-100 overflow-hidden"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Auditoria Oficial da Súmula FIBA 3x3
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                Validação de integridade entre Eventos, Estado Central e Representação
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

        {/* Resumo de Conformidade */}
        <div className="px-5 py-3 bg-neutral-950/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {report.valid ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
                SÚMULA 100% VÁLIDA E CONFORME
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-500/20 text-red-400 border border-red-500/30">
                <AlertCircle className="w-4 h-4" />
                DIVERGÊNCIAS DETECTADAS ({report.errors.length})
              </span>
            )}
            <span className="text-xs text-neutral-400">
              {report.checks.length} regras verificadas
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
            <span>Pontuação: {report.scoreValid ? '✓' : '✗'}</span>
            <span>Faltas: {report.foulsValid ? '✓' : '✗'}</span>
            <span>Fechamento: {report.closureValid ? '✓' : '✗'}</span>
          </div>
        </div>

        {/* Lista de Verificações */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 divide-y divide-neutral-800/80">
          {report.checks.map(check => {
            const isPass = check.status === 'PASS';
            const isFail = check.status === 'FAIL';
            const isWarn = check.status === 'WARNING';

            return (
              <div key={check.id} className="pt-3 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      {isPass ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isFail ? (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{check.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                          {check.category}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">{check.description}</p>
                      {check.details && (
                        <p className="text-[11px] font-mono text-neutral-300 mt-1 bg-neutral-950 p-1.5 rounded border border-neutral-800">
                          {check.details}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded font-mono shrink-0 ${
                      isPass
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : isFail
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : isWarn
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-950 text-xs">
          <span className="text-neutral-500">
            Regulamento oficial FIBA 3x3 Official Rules of the Game
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
          >
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
};
