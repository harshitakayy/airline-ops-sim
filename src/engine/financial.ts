import type {Flight, CostAssumptions, FinancialImpact} from "./types";

export const DEFAULT_COST_ASSUMPTIONS: CostAssumptions = {
    delayCostPerMinute: 5000,
    cancellationCost: 200000
};

export function calculateFinancialImpact(
    flights: Flight[],
    assumptions: CostAssumptions = DEFAULT_COST_ASSUMPTIONS
): FinancialImpact {

    const totalDelayMinutes = flights.reduce(
        (sum, flight) => sum + flight.delayMinutes,
        0
    );

    const cancelledFlights = flights.filter(
        flight => flight.status === "cancelled"
    ).length;

    const delayCost =
        totalDelayMinutes * assumptions.delayCostPerMinute;

    const cancellationCost =
        cancelledFlights * assumptions.cancellationCost;

    const totalEstimatedLoss =
        delayCost + cancellationCost;

    return {
        delayCost,
        cancellationCost,
        totalEstimatedLoss
    };
}