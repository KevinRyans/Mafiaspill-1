import type { MissionOption } from "../types";
export declare function pickMissionOutcome(baseRisk: number, option: MissionOption, rng?: () => number): {
    success: boolean;
    riskDelta: number;
    complianceImpact: number;
};
