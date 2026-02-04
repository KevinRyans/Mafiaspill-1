"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickMissionOutcome = pickMissionOutcome;
function pickMissionOutcome(baseRisk, option, rng = Math.random) {
    const effectiveRisk = Math.min(0.95, Math.max(0.05, (baseRisk + option.riskDelta) / 100));
    const roll = rng();
    const success = roll > effectiveRisk;
    return {
        success,
        riskDelta: option.riskDelta,
        complianceImpact: option.complianceImpact
    };
}
