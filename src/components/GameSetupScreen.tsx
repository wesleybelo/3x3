import React, { useState, useRef } from 'react';
import { GameState, MatchInfo, Team, TeamId, CoinToss, Player } from '../types';
import { GameEngine } from '../engine/GameEngine';
import { CommandDispatcher } from '../engine/CommandDispatcher';
import { createDefaultTeam } from '../engine/EventReducer';
import { TeamColorPicker } from './TeamColorPicker';
import { getContrastTextColor, hexToRgba } from '../utils/colors';
import { FpbLogo, Fiba3x3Logo } from './ScoresheetIcons';
import {
  Trophy,
  Users,
  Clock,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Shield,
  Coins,
  Play,
  Plus,
  Upload,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

interface GameSetupScreenProps {
  state: GameState;
  engine: GameEngine;
  dispatcher: CommandDispatcher;
  onStartMatch: () => void;
  onSwitchView?: (view: 'SPLIT' | 'OPERATOR' | 'SCORESHEET') => void;
}

export const GameSetupScreen: React.FC<GameSetupScreenProps> = ({
  state,
  engine,
  dispatcher,
  onStartMatch,
  onSwitchView,
}) => {
  // Estado das Informações da Partida
  const [matchInfo, setMatchInfo] = useState<MatchInfo>({ ...state.matchInfo });

  // Refs e estado de drag-and-drop para os logos
  const leftLogoInputRef = useRef<HTMLInputElement | null>(null);
  const rightLogoInputRef = useRef<HTMLInputElement | null>(null);
  const [leftDragOver, setLeftDragOver] = useState(false);
  const [rightDragOver, setRightDragOver] = useState(false);

  // Upload e manipulação de imagem de logo
  const handleLogoUpload = (side: 'left' | 'right', file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (side === 'left') {
        setMatchInfo((prev) => {
          const next = { ...prev, logoLeft: dataUrl };
          engine.updateMatchInfo({ logoLeft: dataUrl });
          return next;
        });
      } else {
        setMatchInfo((prev) => {
          const next = { ...prev, logoRight: dataUrl };
          engine.updateMatchInfo({ logoRight: dataUrl });
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = (side: 'left' | 'right') => {
    if (side === 'left') {
      setMatchInfo((prev) => {
        const next = { ...prev, logoLeft: undefined };
        engine.updateMatchInfo({ logoLeft: undefined });
        return next;
      });
      if (leftLogoInputRef.current) leftLogoInputRef.current.value = '';
    } else {
      setMatchInfo((prev) => {
        const next = { ...prev, logoRight: undefined };
        engine.updateMatchInfo({ logoRight: undefined });
        return next;
      });
      if (rightLogoInputRef.current) rightLogoInputRef.current.value = '';
    }
  };

  // Estado das Equipes
  const [teamAName, setTeamAName] = useState(state.teamA.name);
  const [teamAShort, setTeamAShort] = useState(state.teamA.shortName);
  const [teamAColor, setTeamAColor] = useState(state.teamA.color || '#2563eb');
  const [playersA, setPlayersA] = useState<Player[]>([...state.teamA.players]);

  const [teamBName, setTeamBName] = useState(state.teamB.name);
  const [teamBShort, setTeamBShort] = useState(state.teamB.shortName);
  const [teamBColor, setTeamBColor] = useState(state.teamB.color || '#dc2626');
  const [playersB, setPlayersB] = useState<Player[]>([...state.teamB.players]);

  // Estado do Lançamento da Moeda (Coin Toss - FIBA 3x3 Art. 8)
  // Simplificação: Seleção direta da equipe vencedora que sai com a 1ª posse no tempo regular (10:00)
  const [coinWinner, setCoinWinner] = useState<TeamId>(
    state.matchInfo.coinToss?.firstPossessionTeamId || state.matchInfo.coinToss?.winnerTeamId || 'A'
  );
  const coinChoice: 'START_GAME' | 'START_OVERTIME' = 'START_GAME';

  // Definição automática direta:
  // Vencedor = 1ª Posse de Bola no tempo regular (10:00)
  // Adversário = Posse em eventual Prorrogação (Overtime)
  const firstPossessionTeamId: TeamId = coinWinner;
  const overtimePossessionTeamId: TeamId = coinWinner === 'A' ? 'B' : 'A';

  // Preencher dados rápidos com Preset Oficial FIBA 3x3 Masters
  const handleLoadPreset = (presetType: 'MASTERS' | 'CHALLENGER') => {
    if (presetType === 'MASTERS') {
      setMatchInfo((prev) => ({
        ...prev,
        competition: 'FIBA 3x3 World Tour Masters - Vienna Final',
        court: 'Main Court (Center Court)',
        matchNumber: 'M-12',
        category: 'Masculino Open Elite',
        city: 'Vienna, AUT',
      }));
      setTeamAName('Ub Huishan NE');
      setTeamAShort('UBB');
      setTeamAColor('#1e40af');
      setPlayersA([
        { id: 'p-A-1', number: 4, name: 'Strahinja Stojacic', isStarter: true, isSubstitute: false, played: true, fouls: [], points: 0, disqualified: false },
        { id: 'p-A-2', number: 7, name: 'Dejan Majstorovic', isStarter: true, isSubstitute: false, played: true, fouls: [], points: 0, disqualified: false },
        { id: 'p-A-3', number: 11, name: 'Marko Brankovic', isStarter: true, isSubstitute: false, played: true, fouls: [], points: 0, disqualified: false },
        { id: 'p-A-4', number: 21, name: 'Nemanja Barac', isStarter: false, isSubstitute: true, played: false, fouls: [], points: 0, disqualified: false },
      ]);
      setTeamBName('Miami 3x3');
      setTeamBShort('MIA');
      setTeamBColor('#b91c1c');
      setPlayersB([
        { id: 'p-B-1', number: 5, name: 'Jimmer Fredette', isStarter: true, isSubstitute: false, played: true, fouls: [], points: 0, disqualified: false },
        { id: 'p-B-2', number: 8, name: 'Canyon Barry', isStarter: true, isSubstitute: false, played: true, fouls: [], points: 0, disqualified: false },
        { id: 'p-B-3', number: 13, name: 'Kareem Maddox', isStarter: true, isSubstitute: false, played: true, fouls: [], points: 0, disqualified: false },
        { id: 'p-B-4', number: 24, name: 'Dylan Travis', isStarter: false, isSubstitute: true, played: false, fouls: [], points: 0, disqualified: false },
      ]);
    } else {
      setMatchInfo((prev) => ({
        ...prev,
        competition: 'Campeonato Brasileiro 3x3 CBB',
        court: 'Quadra 1 (Principal)',
        matchNumber: 'M-01',
        category: 'Masculino Adulto',
        city: 'São Paulo, BRA',
      }));
      setTeamAName('Equipe Alpha');
      setTeamAShort('ALP');
      setTeamAColor('#2563eb');
      setTeamBName('Equipe Bravo');
      setTeamBShort('BRV');
      setTeamBColor('#dc2626');
    }
  };

  // Alteração de jogador da Equipe A
  const handlePlayerChangeA = (idx: number, field: keyof Player, value: any) => {
    const updated = [...playersA];
    updated[idx] = { ...updated[idx], [field]: value };
    setPlayersA(updated);
  };

  // Alteração de jogador da Equipe B
  const handlePlayerChangeB = (idx: number, field: keyof Player, value: any) => {
    const updated = [...playersB];
    updated[idx] = { ...updated[idx], [field]: value };
    setPlayersB(updated);
  };

  // Limpar todos os dados e abrir nova súmula do zero (Reset)
  const handleResetNewMatch = () => {
    const confirmed = window.confirm(
      'Deseja realmente limpar todos os dados preenchidos e reiniciar o setup para uma nova partida?'
    );
    if (!confirmed) return;

    const freshMatchInfo: MatchInfo = {
      id: `FIBA3X3-${Date.now()}`,
      competition: '',
      court: '',
      matchNumber: '',
      category: 'Masculino Adulto',
      date: new Date().toISOString().split('T')[0],
      time: '18:00',
      city: '',
      scorerName: '',
      timerName: '',
      operator12Name: '',
      referee1Name: '',
      referee2Name: '',
      supervisorName: 'Marcos A. Faria',
      logoLeft: undefined,
      logoRight: undefined,
      coinToss: {
        winnerTeamId: 'A',
        choice: 'START_GAME',
        firstPossessionTeamId: 'A',
        overtimePossessionTeamId: 'B',
      },
    };

    const freshTeamA = createDefaultTeam('A', 'Equipe A', 'E-A', '#2563eb', [1, 2, 3, 4]);
    const freshTeamB = createDefaultTeam('B', 'Equipe B', 'E-B', '#dc2626', [5, 6, 7, 8]);

    setMatchInfo(freshMatchInfo);
    setTeamAName(freshTeamA.name);
    setTeamAShort(freshTeamA.shortName);
    setTeamAColor(freshTeamA.color);
    setPlayersA(freshTeamA.players);

    setTeamBName(freshTeamB.name);
    setTeamBShort(freshTeamB.shortName);
    setTeamBColor(freshTeamB.color);
    setPlayersB(freshTeamB.players);

    setCoinWinner('A');

    engine.resetMatch(freshMatchInfo, freshTeamA, freshTeamB);
  };

  // Submissão do Setup e Entrada na Partida
  const handleSubmitAndStart = (e: React.FormEvent) => {
    e.preventDefault();

    const coinTossData: CoinToss = {
      winnerTeamId: coinWinner,
      choice: coinChoice,
      firstPossessionTeamId,
      overtimePossessionTeamId,
      tossedAt: Date.now(),
    };

    const finalMatchInfo: MatchInfo = {
      ...matchInfo,
      coinToss: coinTossData,
    };

    const updatedTeamA: Team = {
      ...state.teamA,
      name: teamAName.trim() || 'Equipe Alpha',
      shortName: teamAShort.trim().toUpperCase() || 'ALP',
      color: teamAColor,
      players: playersA,
    };

    const updatedTeamB: Team = {
      ...state.teamB,
      name: teamBName.trim() || 'Equipe Bravo',
      shortName: teamBShort.trim().toUpperCase() || 'BRV',
      color: teamBColor,
      players: playersB,
    };

    // Se o jogo já tiver eventos ou pontos, podemos apenas atualizar matchInfo e teams se não quiser resetar tudo,
    // ou se o status for SETUP/READY redefinimos o jogo com os novos parâmetros limpos:
    if (state.events.length === 0 || state.status === 'SETUP') {
      engine.resetMatch(finalMatchInfo, updatedTeamA, updatedTeamB);
    } else {
      engine.updateMatchInfo(finalMatchInfo);
      engine.updateTeams(updatedTeamA, updatedTeamB);
    }

    // Passa para tela de jogo (Visão Integrada por padrão)
    onStartMatch();
  };

  const isGameRunning = state.status === 'RUNNING' || state.status === 'PAUSED';

  return (
    <div
      id="fiba-game-setup-screen"
      className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200 select-none pb-12 sm:pb-16"
    >
      {/* 1. CABEÇALHO CLEAN */}
      <div className="bg-[#181C26] border border-white/10 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
          Configuração da Partida
        </h2>

        {/* Botões de Presets Rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleLoadPreset('MASTERS')}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#F27D26] hover:text-black text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
            title="Preencher com Equipes do FIBA World Tour Masters (Ub vs Miami)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Preset World Tour
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset('CHALLENGER')}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmitAndStart} className="space-y-6 pb-36 sm:pb-40">
        {/* =========================================================================
            2. SORTEIO DA MOEDA
           ========================================================================= */}
        <div
          id="fiba-coin-toss-panel"
          className="bg-[#181C26] border border-amber-500/30 rounded-2xl p-5 text-white shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
                <Coins className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black uppercase tracking-wide text-white">
                Sorteio da Moeda
              </h3>
            </div>

            {/* Tag Indicando 1ª Posse */}
            <div className="flex items-center gap-2 bg-black/50 px-3.5 py-1.5 rounded-xl border border-white/15 text-xs">
              <span className="text-neutral-400 font-semibold">1ª Posse:</span>
              <span
                className={`font-black px-2.5 py-0.5 rounded text-white ${
                  firstPossessionTeamId === 'A' ? 'bg-blue-600' : 'bg-red-600'
                }`}
              >
                {firstPossessionTeamId === 'A' ? teamAName : teamBName}
              </span>
            </div>
          </div>

          {/* Cards das duas equipes para clique rápido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card EQUIPE A */}
            <button
              type="button"
              id="btn-coin-toss-team-a"
              onClick={() => setCoinWinner('A')}
              style={{
                backgroundColor: coinWinner === 'A' ? hexToRgba(teamAColor, 0.25) : undefined,
                borderColor: coinWinner === 'A' ? teamAColor : undefined,
                boxShadow: coinWinner === 'A' ? `0 0 15px ${hexToRgba(teamAColor, 0.4)}` : undefined,
              }}
              className={`p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                coinWinner === 'A'
                  ? 'text-white shadow-lg'
                  : 'bg-neutral-900/70 border-neutral-700 text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    backgroundColor: teamAColor,
                    color: getContrastTextColor(teamAColor),
                  }}
                  className="w-9 h-9 rounded-lg font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md transition-colors"
                >
                  A
                </div>
                <div>
                  <div className="font-black text-base text-white">{teamAName}</div>
                  <div className="text-[11px] font-mono text-neutral-400 uppercase">
                    Sigla: {teamAShort}
                  </div>
                </div>
              </div>
              {coinWinner === 'A' ? (
                <span
                  style={{
                    backgroundColor: teamAColor,
                    color: getContrastTextColor(teamAColor),
                  }}
                  className="px-3 py-1 rounded-full text-[11px] font-black uppercase flex items-center gap-1 shadow-md transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Vencedor
                </span>
              ) : (
                <span className="text-[11px] text-neutral-400 font-bold uppercase hover:text-white">
                  Selecionar
                </span>
              )}
            </button>

            {/* Card EQUIPE B */}
            <button
              type="button"
              id="btn-coin-toss-team-b"
              onClick={() => setCoinWinner('B')}
              style={{
                backgroundColor: coinWinner === 'B' ? hexToRgba(teamBColor, 0.25) : undefined,
                borderColor: coinWinner === 'B' ? teamBColor : undefined,
                boxShadow: coinWinner === 'B' ? `0 0 15px ${hexToRgba(teamBColor, 0.4)}` : undefined,
              }}
              className={`p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                coinWinner === 'B'
                  ? 'text-white shadow-lg'
                  : 'bg-neutral-900/70 border-neutral-700 text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    backgroundColor: teamBColor,
                    color: getContrastTextColor(teamBColor),
                  }}
                  className="w-9 h-9 rounded-lg font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md transition-colors"
                >
                  B
                </div>
                <div>
                  <div className="font-black text-base text-white">{teamBName}</div>
                  <div className="text-[11px] font-mono text-neutral-400 uppercase">
                    Sigla: {teamBShort}
                  </div>
                </div>
              </div>
              {coinWinner === 'B' ? (
                <span
                  style={{
                    backgroundColor: teamBColor,
                    color: getContrastTextColor(teamBColor),
                  }}
                  className="px-3 py-1 rounded-full text-[11px] font-black uppercase flex items-center gap-1 shadow-md transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Vencedor
                </span>
              ) : (
                <span className="text-[11px] text-neutral-400 font-bold uppercase hover:text-white">
                  Selecionar
                </span>
              )}
            </button>
          </div>
        </div>

        {/* =========================================================================
            3. DADOS DA PARTIDA
           ========================================================================= */}
        <div className="bg-[#181C26] border border-white/10 rounded-2xl p-5 sm:p-6 text-white shadow-md space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10 text-xs font-black uppercase tracking-wider text-[#F27D26]">
            <Trophy className="w-4 h-4" />
            Dados da Partida
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Competição / Torneio:</label>
              <input
                type="text"
                value={matchInfo.competition}
                onChange={(e) => setMatchInfo({ ...matchInfo, competition: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-medium focus:border-[#F27D26] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Categoria:</label>
              <input
                type="text"
                value={matchInfo.category}
                onChange={(e) => setMatchInfo({ ...matchInfo, category: e.target.value })}
                placeholder="Ex: Masculino Open Elite"
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-medium focus:border-[#F27D26] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Quadra / Court:</label>
              <input
                type="text"
                value={matchInfo.court}
                onChange={(e) => setMatchInfo({ ...matchInfo, court: e.target.value })}
                placeholder="Quadra Central"
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-medium focus:border-[#F27D26] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Jogo Nº (Match #):</label>
              <input
                type="text"
                value={matchInfo.matchNumber}
                onChange={(e) => setMatchInfo({ ...matchInfo, matchNumber: e.target.value })}
                placeholder="M-01"
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-mono focus:border-[#F27D26] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-semibold mb-1">Cidade / Local:</label>
              <input
                type="text"
                value={matchInfo.city || ''}
                onChange={(e) => setMatchInfo({ ...matchInfo, city: e.target.value })}
                placeholder="São Paulo, BRA"
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-medium focus:border-[#F27D26] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Data:</label>
                <input
                  type="date"
                  value={matchInfo.date}
                  onChange={(e) => setMatchInfo({ ...matchInfo, date: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-mono focus:border-[#F27D26] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Hora:</label>
                <input
                  type="time"
                  value={matchInfo.time}
                  onChange={(e) => setMatchInfo({ ...matchInfo, time: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-mono focus:border-[#F27D26] focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. EMBLEMAS E LOGOTIPOS DO CABEÇALHO DA SÚMULA OFICIAL A4
           ========================================================================= */}
        <div className="bg-[#1F1F1F] border border-white/10 rounded-2xl p-5 text-white shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#F27D26] flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Emblemas do Cabeçalho (Súmula A4)
              </span>
            </div>
            <div className="text-[10px] font-mono bg-white/5 border border-white/10 text-neutral-300 px-2.5 py-1 rounded-lg self-start sm:self-auto">
              Formatos: PNG, JPG, SVG ou WebP
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* LOGO ESQUERDO: Federação / Organização */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F27D26]" />
                    Logo Esquerdo (Federação)
                  </span>
                  {matchInfo.logoLeft ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Personalizado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                      Padrão (FPB)
                    </span>
                  )}
                </div>

                {/* Área de Visualização e Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setLeftDragOver(true);
                  }}
                  onDragLeave={() => setLeftDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setLeftDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleLogoUpload('left', e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => leftLogoInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[120px] ${
                    leftDragOver
                      ? 'border-[#F27D26] bg-[#F27D26]/10'
                      : 'border-neutral-700 bg-neutral-950/60 hover:border-neutral-500 hover:bg-neutral-950'
                  }`}
                >
                  <input
                    type="file"
                    ref={leftLogoInputRef}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleLogoUpload('left', e.target.files[0]);
                      }
                    }}
                  />

                  {/* Thumbnail Preview */}
                  <div className="w-24 h-16 bg-white rounded-lg p-2 flex items-center justify-center shadow-inner border border-black/20 mb-2">
                    {matchInfo.logoLeft ? (
                      <img
                        src={matchInfo.logoLeft}
                        alt="Logo Esquerdo"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <FpbLogo className="w-10 h-10 text-black" />
                    )}
                  </div>

                  <div className="text-center">
                    <span className="text-xs font-semibold text-neutral-300 flex items-center justify-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-[#F27D26]" />
                      Clique ou arraste a imagem
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => leftLogoInputRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#F27D26]" />
                  Enviar Imagem
                </button>
                {matchInfo.logoLeft && (
                  <button
                    type="button"
                    onClick={() => handleResetLogo('left')}
                    className="py-2 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 rounded-lg text-xs font-bold text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Remover e voltar ao padrão"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar Padrão
                  </button>
                )}
              </div>
            </div>

            {/* LOGO DIREITO: Torneio / Campeonato (FIBA 3x3) */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F27D26]" />
                    Logo Direito (Torneio)
                  </span>
                  {matchInfo.logoRight ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Personalizado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                      Padrão (FIBA 3x3)
                    </span>
                  )}
                </div>

                {/* Área de Visualização e Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setRightDragOver(true);
                  }}
                  onDragLeave={() => setRightDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setRightDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleLogoUpload('right', e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => rightLogoInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[120px] ${
                    rightDragOver
                      ? 'border-[#F27D26] bg-[#F27D26]/10'
                      : 'border-neutral-700 bg-neutral-950/60 hover:border-neutral-500 hover:bg-neutral-950'
                  }`}
                >
                  <input
                    type="file"
                    ref={rightLogoInputRef}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleLogoUpload('right', e.target.files[0]);
                      }
                    }}
                  />

                  {/* Thumbnail Preview */}
                  <div className="w-24 h-16 bg-white rounded-lg p-2 flex items-center justify-center shadow-inner border border-black/20 mb-2">
                    {matchInfo.logoRight ? (
                      <img
                        src={matchInfo.logoRight}
                        alt="Logo Direito"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <Fiba3x3Logo className="h-8 text-black" />
                    )}
                  </div>

                  <div className="text-center">
                    <span className="text-xs font-semibold text-neutral-300 flex items-center justify-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-[#F27D26]" />
                      Clique ou arraste a imagem
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => rightLogoInputRef.current?.click()}
                  className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#F27D26]" />
                  Enviar Imagem
                </button>
                {matchInfo.logoRight && (
                  <button
                    type="button"
                    onClick={() => handleResetLogo('right')}
                    className="py-2 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 rounded-lg text-xs font-bold text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Remover e voltar ao padrão"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar Padrão
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            5. ESCALAÇÃO E DETALHES DAS EQUIPES (EQUIPE A & EQUIPE B)
           ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PAINEL EQUIPE A */}
          <div className="bg-[#181C26] border border-blue-500/30 rounded-2xl p-5 text-white shadow-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Equipe A
              </span>
            </div>

            {/* Campos de Nome e Sigla alinhados */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex-1">
                <label className="block text-neutral-400 font-medium mb-1">Nome:</label>
                <input
                  type="text"
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  placeholder="Nome da Equipe A"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-bold focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div className="w-24 shrink-0">
                <label className="block text-neutral-400 font-medium mb-1">Sigla:</label>
                <input
                  type="text"
                  maxLength={4}
                  value={teamAShort}
                  onChange={(e) => setTeamAShort(e.target.value.toUpperCase())}
                  placeholder="ALP"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-mono font-bold text-center focus:border-blue-500 focus:outline-none uppercase"
                  required
                />
              </div>
            </div>

            {/* Seletor de Cor do Uniforme da Equipe A */}
            <TeamColorPicker
              label="Cor do Uniforme da Equipe A:"
              selectedColor={teamAColor}
              onChange={setTeamAColor}
              teamLetter="A"
              teamName={teamAName}
            />

            {/* Atletas da Equipe A */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase">
                <span>Atletas (Nº & Nome)</span>
              </div>
              {playersA.map((player, idx) => (
                <div key={player.id || idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={player.number}
                      onChange={(e) => handlePlayerChangeA(idx, 'number', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-mono font-black text-center text-xs focus:border-blue-500"
                      title="Número do Uniforme"
                      required
                    />
                  </div>
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => handlePlayerChangeA(idx, 'name', e.target.value)}
                      placeholder={`Jogador ${idx + 1}`}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-xs font-medium focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="col-span-3 text-right">
                    <span
                      className={`text-[9px] font-mono px-2 py-1 rounded font-bold uppercase ${
                        idx < 3 ? 'bg-blue-500/20 text-blue-300' : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {idx < 3 ? 'Titular' : 'Reserva'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PAINEL EQUIPE B */}
          <div className="bg-[#181C26] border border-red-500/30 rounded-2xl p-5 text-white shadow-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Equipe B
              </span>
            </div>

            {/* Campos de Nome e Sigla alinhados */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex-1">
                <label className="block text-neutral-400 font-medium mb-1">Nome:</label>
                <input
                  type="text"
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  placeholder="Nome da Equipe B"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-bold focus:border-red-500 focus:outline-none"
                  required
                />
              </div>
              <div className="w-24 shrink-0">
                <label className="block text-neutral-400 font-medium mb-1">Sigla:</label>
                <input
                  type="text"
                  maxLength={4}
                  value={teamBShort}
                  onChange={(e) => setTeamBShort(e.target.value.toUpperCase())}
                  placeholder="BRV"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-mono font-bold text-center focus:border-red-500 focus:outline-none uppercase"
                  required
                />
              </div>
            </div>

            {/* Seletor de Cor do Uniforme da Equipe B */}
            <TeamColorPicker
              label="Cor do Uniforme da Equipe B:"
              selectedColor={teamBColor}
              onChange={setTeamBColor}
              teamLetter="B"
              teamName={teamBName}
            />

            {/* Atletas da Equipe B */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 uppercase">
                <span>Atletas (Nº & Nome)</span>
              </div>
              {playersB.map((player, idx) => (
                <div key={player.id || idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={player.number}
                      onChange={(e) => handlePlayerChangeB(idx, 'number', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-mono font-black text-center text-xs focus:border-red-500"
                      title="Número do Uniforme"
                      required
                    />
                  </div>
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => handlePlayerChangeB(idx, 'name', e.target.value)}
                      placeholder={`Jogador ${idx + 1}`}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-xs font-medium focus:border-red-500"
                      required
                    />
                  </div>
                  <div className="col-span-3 text-right">
                    <span
                      className={`text-[9px] font-mono px-2 py-1 rounded font-bold uppercase ${
                        idx < 3 ? 'bg-red-500/20 text-red-300' : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {idx < 3 ? 'Titular' : 'Reserva'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            6. OFICIAIS DE MESA E ÁRBITROS
           ========================================================================= */}
        <div className="bg-[#181C26] border border-white/10 rounded-2xl p-5 text-white shadow-md space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10 text-xs font-black uppercase tracking-wider text-neutral-300">
            <Shield className="w-4 h-4 text-amber-400" />
            Oficiais de Mesa & Arbitragem
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Apontador (Scorer):</label>
              <input
                type="text"
                value={matchInfo.scorerName || ''}
                onChange={(e) => setMatchInfo({ ...matchInfo, scorerName: e.target.value })}
                placeholder="Carlos M. Silva"
                className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Cronometrista (Timer):</label>
              <input
                type="text"
                value={matchInfo.timerName || ''}
                onChange={(e) => setMatchInfo({ ...matchInfo, timerName: e.target.value })}
                placeholder="Mariana R. Costa"
                className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Operador 12" (Shot Clock):</label>
              <input
                type="text"
                value={matchInfo.operator12Name || ''}
                onChange={(e) => setMatchInfo({ ...matchInfo, operator12Name: e.target.value })}
                placeholder="Lucas B. Andrade"
                className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Árbitro 1 (Referee 1):</label>
              <input
                type="text"
                value={matchInfo.referee1Name || ''}
                onChange={(e) => setMatchInfo({ ...matchInfo, referee1Name: e.target.value })}
                placeholder="Roberto N. Santos"
                className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Árbitro 2 (Referee 2):</label>
              <input
                type="text"
                value={matchInfo.referee2Name || ''}
                onChange={(e) => setMatchInfo({ ...matchInfo, referee2Name: e.target.value })}
                placeholder="Fernanda P. Lima"
                className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Supervisor Esportivo (Sports Supervisor):</label>
              <input
                type="text"
                value={matchInfo.supervisorName || ''}
                onChange={(e) => setMatchInfo({ ...matchInfo, supervisorName: e.target.value })}
                placeholder="Marcos A. Faria"
                className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            7. CONFIRMAÇÃO FINAL
           ========================================================================= */}
        <div
          id="fiba-setup-confirmation-card"
          className="bg-[#181C26] border border-white/10 rounded-2xl p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6"
        >
          <div className="flex items-center gap-4 flex-wrap">
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase">
              Confirmação
            </h3>
            {/* Indicador da 1ª Posse */}
            <div className="flex items-center gap-2 bg-black/50 px-3.5 py-1.5 rounded-xl border border-white/15 text-xs">
              <span className="text-neutral-400 font-semibold">1ª Posse:</span>
              <span
                className={`font-black px-2.5 py-0.5 rounded text-white ${
                  firstPossessionTeamId === 'A' ? 'bg-blue-600' : 'bg-red-600'
                }`}
              >
                {firstPossessionTeamId === 'A' ? teamAName : teamBName}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Botão Secundário: NOVA PARTIDA / RESET */}
            <button
              type="button"
              onClick={handleResetNewMatch}
              id="btn-reset-new-scoresheet"
              className="px-4 py-2.5 rounded-xl border border-white/20 hover:border-amber-400/60 bg-white/5 hover:bg-white/10 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Limpar todos os campos preenchidos e reiniciar configuração"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>NOVA PARTIDA / RESET</span>
            </button>

            {/* Se jogo em andamento, opção de voltar */}
            {isGameRunning && (
              <button
                type="button"
                onClick={onStartMatch}
                className="px-4 py-2.5 rounded-xl border border-blue-500/40 bg-blue-950/40 text-blue-300 hover:bg-blue-900/40 text-xs sm:text-sm font-bold uppercase transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                Voltar ao Jogo
              </button>
            )}

            {/* Botão Principal: CONFIRMAR & IR PARA MESA */}
            <button
              type="submit"
              id="btn-confirm-setup-enter-match"
              className="px-6 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#ff8f3d] active:scale-95 text-black font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#F27D26]/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>CONFIRMAR & IR PARA MESA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
