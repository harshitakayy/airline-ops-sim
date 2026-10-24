import { runSimulation } from "./clock";
import type {
    SimulationScenario,
    ScenarioResult,
    ScenarioComparison
} from "./types";

export async function runScenario(
    scenario: SimulationScenario
): Promise<ScenarioResult> {

    const simulation = await runSimulation(
        undefined,
        scenario.options
    );

    return {
    scenario,
    flights: simulation.flights,
    aircrafts: simulation.aircrafts,
    metrics: simulation.metrics,
    financialImpact: simulation.financialImpact
    };
}

export async function compareScenarios(
    scenarios: SimulationScenario[]
): Promise<ScenarioComparison> {

    const results: ScenarioResult[] = [];

    for (const scenario of scenarios) {
        const result = await runScenario(scenario);
        results.push(result);
    }

    const bestScenario = results.reduce(
        (best, current) =>
            current.financialImpact.totalEstimatedLoss <
            best.financialImpact.totalEstimatedLoss
                ? current
                : best
    );

    return {
        results,
        bestScenarioId: bestScenario.scenario.id
    };
}