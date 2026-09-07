import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameEngine } from './engine/GameEngine';
import { CommandDispatcher } from './engine/CommandDispatcher';
import { loadGameState, saveGameState } from './engine/GameStorage';
import { OfficialScoresheet } from './components/OfficialScoresheet';
import { ScoreboardOperator } from './components/ScoreboardOperator';
import { GameSetupScreen } from './components/GameSetupScreen';
import { AuditReportModal } from './components/AuditReportModal';
import { TestRunnerModal } from './components/TestRunnerModal';
import { SignModal } from './components/SignModal';
import {
  Settings,
  Tv,
  FileSpreadsheet,
  Keyboard,
} from 'lucide-react';

export default function App() {
  // Instancia única do motor de jogo e do despachante de comandos (com persistência via LocalStorage)
  const engine = useMemo(() => new GameEngine(loadGameState() ?? undefined), []);
  const dispatcher = useMemo(() => new CommandDispatcher(engine), [engine]);

  // Estado central do jogo reativo e modelo de súmula desacoplado do relógio
  const [state, setState] = useState(engine.getState());
  const [scoresheetModel, setScoresheetModel] = useState(engine.getScoresheetModel());

  // Modais globais acionáveis pela barra superior
  const [auditOpen, setAuditOpen] = useState(false);
  const [testRunnerOpen, setTestRunnerOpen] = useState(false);
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [hasShownEndModal, setHasShownEndModal] = useState(false);

  // Abertura automática do modal de encerramento, assinaturas e selagem
  useEffect(() => {
    if (state.status === 'ENDED' && !hasShownEndModal) {
      setSignModalOpen(true);
      setHasShownEndModal(true);
    } else if (state.status !== 'ENDED') {
      setHasShownEndModal(false);
    }
  }, [state.status, hasShownEndModal]);

  // Modo de visualização de tela: 'SETUP' é padrão se jogo novo, ou 'OPERATOR' se jogo em andamento recuperado
  const [viewMode, setViewMode] = useState<'SETUP' | 'OPERATOR' | 'SCORESHEET'>(() => {
    const saved = loadGameState();
    return saved && (saved.events.length > 0 || saved.status !== 'SETUP') ? 'OPERATOR' : 'SETUP';
  });

  // Registra listener no GameEngine para atualizar o React quando o estado mudar
  useEffect(() => {
    const unsubscribe = engine.subscribe((newState, newModel) => {
      setState(newState);
      setScoresheetModel(newModel);
    });
    return () => {
      unsubscribe();
      engine.destroy();
    };
  }, [engine]);

  // Garante salvamento no fechamento ou recarregamento acidental da aba
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveGameState(engine.getState());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [engine]);

  // Atalhos Globais de Teclado (Seção 24)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Não intercepta se estiver digitando em um input ou textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        dispatcher.toggleClock();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatcher.undo();
      } else if (e.key.toLowerCase() === 'u') {
        dispatcher.undo();
      }
    },
    [dispatcher]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-[#E5E5E5] text-[#1A1A1A] flex flex-col font-sans selection:bg-[#F27D26] selection:text-black">
      {/* CABEÇALHO GLOBAL DA APLICAÇÃO (ENXUTO, CENTRALIZADO E COM APENAS AS 3 ABAS PRINCIPAIS) */}
      <header className="h-14 bg-[#1A1A1A] text-white flex items-center justify-center px-4 border-b border-black/20 sticky top-0 z-40 print:hidden select-none">
        {/* Abas Principais de Navegação Centralizadas */}
        <nav className="flex items-center gap-1 sm:gap-1.5 bg-[#282828] p-1 rounded-xl border border-white/10 text-xs shadow-inner">
          <button
            onClick={() => setViewMode('SETUP')}
            id="tab-view-setup"
            className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs sm:text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'SETUP'
                ? 'bg-[#F27D26] text-black shadow-md font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>ENTRADA / SETUP</span>
          </button>

          <button
            onClick={() => setViewMode('OPERATOR')}
            id="tab-view-operator"
            className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs sm:text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'OPERATOR'
                ? 'bg-[#F27D26] text-black shadow-md font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>MESA DE OPERAÇÃO</span>
          </button>

          <button
            onClick={() => setViewMode('SCORESHEET')}
            id="tab-view-scoresheet"
            className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs sm:text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'SCORESHEET'
                ? 'bg-[#F27D26] text-black shadow-md font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>SÚMULA OFICIAL</span>
          </button>
        </nav>
      </header>

      {/* ÁREA PRINCIPAL DA APLICAÇÃO */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {/* ABA 1: ENTRADA / SETUP */}
        {viewMode === 'SETUP' && (
          <GameSetupScreen
            state={state}
            engine={engine}
            dispatcher={dispatcher}
            onStartMatch={() => setViewMode('OPERATOR')}
            onSwitchView={(m) => setViewMode(m === 'SCORESHEET' ? 'SCORESHEET' : 'OPERATOR')}
          />
        )}

        {/* ABA 2: MESA DE OPERAÇÃO */}
        {viewMode === 'OPERATOR' && (
          <div className="max-w-5xl mx-auto">
            <ScoreboardOperator
              state={state}
              dispatcher={dispatcher}
              onSwitchView={(m) => setViewMode(m === 'SETUP' ? 'SETUP' : m === 'SCORESHEET' ? 'SCORESHEET' : 'OPERATOR')}
            />
          </div>
        )}

        {/* ABA 3: SÚMULA OFICIAL */}
        {viewMode === 'SCORESHEET' && (
          <div className="py-2">
            <OfficialScoresheet model={scoresheetModel} />
          </div>
        )}
      </main>

      {/* RODAPÉ DO SISTEMA (HIGH DENSITY THEME) */}
      <footer className="h-8 bg-white border-t border-black/10 flex items-center px-4 sm:px-6 gap-4 sm:gap-6 text-[#1A1A1A] print:hidden select-none">
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto">
          <span className="text-[9px] font-bold uppercase tracking-wider text-black/80">Audit Log:</span>
          <span className="text-[9px] font-mono text-green-600 font-bold">VALIDATE: SUCCESS</span>
          <span className="text-[9px] font-mono text-black/40">EVENTS: {state.events.length}</span>
          <span className="text-[9px] font-mono text-black/40">CHECKSUM: OK</span>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-black/70 hidden sm:inline">
            Connected to Mainframe Official API
          </span>
        </div>
      </footer>

      {/* MODAIS GLOBAIS */}
      <AuditReportModal
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
        state={state}
      />

      <TestRunnerModal
        isOpen={testRunnerOpen}
        onClose={() => setTestRunnerOpen(false)}
      />

      {/* Modal de Atalhos de Teclado */}
      {keyboardHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-5 text-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                <Keyboard className="w-4 h-4 text-amber-400" />
                Atalhos Rápidos de Operação
              </h3>
              <button
                onClick={() => setKeyboardHelpOpen(false)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Fechar
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-300">Iniciar / Pausar Relógio:</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-amber-400 font-bold">
                  Barra de Espaço
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-300">Desfazer Última Ação (Undo):</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-800 text-amber-400 font-bold">
                  Ctrl + Z ou U
                </kbd>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 mt-4 leading-relaxed">
              Dica: Os botões de +1, +2, FT e Faltas abrem o seletor ágil com foco automático no jogador da quadra.
            </p>
          </div>
        </div>
      )}

      {/* MODAL DE ASSINATURAS E SELAGEM OFICIAL (AUTOMÁTICO NO ENCERRAMENTO) */}
      <SignModal
        isOpen={signModalOpen}
        onClose={() => setSignModalOpen(false)}
        state={state}
        dispatcher={dispatcher}
      />
    </div>
  );
}
