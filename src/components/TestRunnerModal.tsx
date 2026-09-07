import React, { useState, useEffect } from 'react';
import { runAllAppTests, FullTestSummary } from '../tests/index';
import { X, Play, CheckCircle2, XCircle, Clock, RefreshCw, Layers } from 'lucide-react';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [summary, setSummary] = useState<FullTestSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const executeTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runAllAppTests();
      setSummary(res);
      setIsRunning(false);
    }, 150);
  };

  useEffect(() => {
    if (isOpen) {
      executeTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        id="test-runner-modal"
        className="w-full max-w-3xl max-h-[90vh] bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col text-neutral-100 overflow-hidden"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Suíte de Testes da Súmula FIBA 3x3
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                Validação formal de Regras, Motores de Pontuação, Faltas, Undo e Auditoria
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

        {/* Resumo do Executador */}
        <div className="px-6 py-4 bg-neutral-950/80 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Status Geral:</span>
              {summary && summary.failed === 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                  TODOS OS TESTES APROVADOS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-500/20 text-red-400 border border-red-500/30">
                  <XCircle className="w-4 h-4" />
                  {summary?.failed} FALHAS
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-emerald-400 font-bold">PASSOU: {summary?.passed ?? 0}</span>
              <span className="text-red-400 font-bold">FALHOU: {summary?.failed ?? 0}</span>
              <span className="text-neutral-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {summary ? `${summary.durationMs.toFixed(1)}ms` : '-'}
              </span>
            </div>
          </div>

          <button
            onClick={executeTests}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            Reexecutar Testes
          </button>
        </div>

        {/* Lista de Testes Agrupados */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {summary?.suites.map(suite => (
            <div key={suite.name} className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                <h4 className="font-bold text-sm text-neutral-200">{suite.name}</h4>
                <span className="text-xs font-mono text-neutral-400">
                  {suite.passed}/{suite.total} passaram
                </span>
              </div>

              <div className="space-y-2">
                {suite.results.map((r, idx) => (
                  <div
                    key={`${suite.name}-${idx}`}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                      r.passed
                        ? 'bg-neutral-950/60 border-neutral-800/80 text-neutral-300'
                        : 'bg-red-950/30 border-red-800/60 text-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {r.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium text-white">{r.name}</div>
                        {r.error && (
                          <div className="text-[11px] font-mono text-red-400 mt-1 bg-red-950/80 p-2 rounded border border-red-800">
                            {r.error}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                      {r.durationMs.toFixed(1)}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-neutral-800 bg-neutral-950 text-xs text-neutral-400">
          <span>
            Cobertura rigorosa: Setup, Clock, 1P, 2P, Free Throw, P, U, D, Skipped Slots, Fechamento, Protesto, Selamento, Undo e Auditoria.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
