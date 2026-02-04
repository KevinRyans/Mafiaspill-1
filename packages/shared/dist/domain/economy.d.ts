import type { MarketPriceInput, MarketPriceOutput } from "../types";
export declare function calculateMarketPrice(input: MarketPriceInput): MarketPriceOutput;
export declare function calculateMissionPayout(baseReward: number, riskScore: number, successBonus?: number): number;
