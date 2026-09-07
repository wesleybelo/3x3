import { runFoundationTests, TestResult } from './foundationTests';
import { runScoringEngineTests } from './scoringEngineTests';
import { runFoulEngineTests } from './foulEngineTests';
import { runScoresheetAndTournamentTests } from './scoresheetAndTournamentTests';

export interface FullTestSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  suites: {
    name: string;
    total: number;
    passed: number;
    failed: number;
    results: TestResult[];
  }[];
  allResults: TestResult[];
}

export function runAllAppTests(): FullTestSummary {
  const start = performance.now();

  const foundation = runFoundationTests();
  const scoring = runScoringEngineTests();
  const fouls = runFoulEngineTests();
  const tournament = runScoresheetAndTournamentTests();

  const allResults = [...foundation, ...scoring, ...fouls, ...tournament];
  const total = allResults.length;
  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;

  const buildSuite = (name: string, results: TestResult[]) => ({
    name,
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results,
  });

  return {
    total,
    passed,
    failed,
    durationMs: performance.now() - start,
    suites: [
      buildSuite('Foundation Tests', foundation),
      buildSuite('Scoring Engine Tests', scoring),
      buildSuite('Foul Engine Tests', fouls),
      buildSuite('Scoresheet & Tournament Tests', tournament),
    ],
    allResults,
  };
}
