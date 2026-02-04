export type EnergyState = {
    energy: number;
    maxEnergy: number;
    lastEnergyAt: Date;
    regenPerHour: number;
};
export type EnergyResult = EnergyState & {
    regenerated: number;
};
export declare function computeEnergy(now: Date, state: EnergyState): EnergyResult;
export declare function spendEnergy(now: Date, state: EnergyState, cost: number): EnergyResult;
