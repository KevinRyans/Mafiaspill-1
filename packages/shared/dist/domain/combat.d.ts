import type { Combatant, CombatTurnResult } from "../types";
export type Rng = () => number;
export declare function resolveCombatTurn(attacker: Combatant, defender: Combatant, rng?: Rng): CombatTurnResult;
export declare function isCombatOver(a: Combatant, b: Combatant): boolean;
