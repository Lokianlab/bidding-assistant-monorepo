import type { DecisionType } from './types';
import { DECISION_LABELS } from './types';

export function getDecisionLabel(decision: DecisionType): string {
  return DECISION_LABELS[decision];
}

export function getDecisionEmoji(decision: DecisionType): string {
  switch (decision) {
    case 'bid': return '\u2705';
    case 'no_bid': return '\u274C';
    case 'conditional': return '\u26A0\uFE0F';
  }
}

export function formatDecisionSummary(decision: DecisionType, reason?: string | null): string {
  const label = getDecisionLabel(decision);
  return reason ? `${label}\uFF1A${reason}` : label;
}
