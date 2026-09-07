import React from 'react';
import { GameState } from '../types';
import { CommandDispatcher } from '../engine/CommandDispatcher';
import { InGameOperatorLayout } from './InGameOperatorLayout';

interface ScoreboardOperatorProps {
  state: GameState;
  dispatcher: CommandDispatcher;
  onSwitchView?: (mode: 'SETUP' | 'SPLIT' | 'OPERATOR' | 'SCORESHEET') => void;
}

export const ScoreboardOperator: React.FC<ScoreboardOperatorProps> = ({
  state,
  dispatcher,
  onSwitchView,
}) => {
  return (
    <InGameOperatorLayout
      state={state}
      dispatcher={dispatcher}
      onSwitchView={onSwitchView}
    />
  );
};
