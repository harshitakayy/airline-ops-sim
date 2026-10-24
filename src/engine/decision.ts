
import { runSimulation } from "./clock";
import { DEFAULT_COST_ASSUMPTIONS } from "./financial";
import { canAircraftOperateFlight } from "./feasibility";

import type {
    Aircraft,
    CostAssumptions,
    Flight,
    FlightStatus,
    SimulationData,
    SimulationOptions
} from "./types";

const ML_DELAY_THRESHOLD_MINUTES = 30;

export class DecisionInputError extends Error {
    readonly statusCode = 400;

    constructor(message: string) {
        super(message);
        this.name = "DecisionInputError";
    }
}

export interface DecisionRecommendationRequest {
    flightId: string;
    delayProbability: number;
    expectedDelayMinutes: number;
    costAssumptions?: CostAssumptions;
}

export interface SimulatedFlightOutcome {
    status: FlightStatus;
    delayMinutes: number;
}

export interface DecisionOutcomeLoss {
    noDelayLoss: number;
    delayedLoss: number;
    expectedLoss: number;
    probabilityApplied: boolean;
    probabilityUsed: number;
    outcomes: {
        noDelay: SimulatedFlightOutcome;
        delayed: SimulatedFlightOutcome;
        delayScenariosDiffer: boolean;
        financialLossesDiffer: boolean;
    };
}

export interface DecisionActionResult {
    id: string;
    name: string;
    aircraftId?: string;
    feasible: boolean;
    reason?: string;
    financial: DecisionOutcomeLoss;
}

export interface DecisionRiskDiagnostics {
    probabilityUsed: number;
    baselineAlreadyAtLeast30MinutesLate: boolean;
    probabilityAffectsAnyAction: boolean;
    interpretation: string;
}

export interface DecisionRecommendation {
    flightId: string;
    probabilityOfDelayAtLeast30Minutes: number;
    assumedDelayMinutesIfDelayed: number;
    baselineOperationalOutcome: SimulatedFlightOutcome;
    riskDiagnostics: DecisionRiskDiagnostics;
    recommendedActionId: string;
    recommendedActionName: string;
    expectedSavingsVsDoNothing: number;
    actions: DecisionActionResult[];
    caveats: string[];
}

function cloneSimulationData(
    data: SimulationData
): SimulationData {
    const flights = data.flights.map(flight => ({
        ...flight
    }));

    const aircrafts: Aircraft[] = data.aircrafts.map(
        aircraft => ({
            ...aircraft,
            flights: flights
                .filter(
                    flight =>
                        flight.aircraftId === aircraft.id
                )
                .sort(
                    (a, b) =>
                        new Date(
                            a.scheduledDeparture
                        ).getTime() -
                        new Date(
                            b.scheduledDeparture
                        ).getTime()
                )
        })
    );

    return {
        flights,
        aircrafts
    };
}

function validateRequest(
    data: SimulationData,
    request: DecisionRecommendationRequest
): Flight {
    if (
        !request ||
        typeof request.flightId !== "string" ||
        !request.flightId.trim()
    ) {
        throw new DecisionInputError(
            "flightId is required."
        );
    }

    if (
        !Number.isFinite(request.delayProbability) ||
        request.delayProbability < 0 ||
        request.delayProbability > 1
    ) {
        throw new DecisionInputError(
            "delayProbability must be a number between 0 and 1."
        );
    }

    if (
        !Number.isFinite(request.expectedDelayMinutes) ||
        request.expectedDelayMinutes <
            ML_DELAY_THRESHOLD_MINUTES
    ) {
        throw new DecisionInputError(
            "expectedDelayMinutes must be at least 30 because the model predicts 30+ minute delays."
        );
    }

    const flight = data.flights.find(
        item => item.id === request.flightId
    );

    if (!flight) {
        throw new DecisionInputError(
            `Flight not found: ${request.flightId}`
        );
    }

    if (flight.status !== "scheduled") {
        throw new DecisionInputError(
            `Flight ${request.flightId} must be scheduled to evaluate a new action.`
        );
    }

    const assumptions =
        request.costAssumptions ??
        DEFAULT_COST_ASSUMPTIONS;

    if (
        !Number.isFinite(
            assumptions.delayCostPerMinute
        ) ||
        assumptions.delayCostPerMinute < 0 ||
        !Number.isFinite(
            assumptions.cancellationCost
        ) ||
        assumptions.cancellationCost < 0
    ) {
        throw new DecisionInputError(
            "Cost assumptions must be finite, non-negative numbers."
        );
    }

    return flight;
}

async function simulateOutcome(
    data: SimulationData,
    options: SimulationOptions,
    flightId: string
): Promise<{
    loss: number;
    targetFlight: SimulatedFlightOutcome;
}> {
    const result = await runSimulation(
        cloneSimulationData(data),
        options
    );

    const targetFlight = result.flights.find(
        flight => flight.id === flightId
    );

    if (!targetFlight) {
        throw new Error(
            `Target flight ${flightId} was missing from simulation results.`
        );
    }

    return {
        loss: result.financialImpact.totalEstimatedLoss,
        targetFlight: {
            status: targetFlight.status,
            delayMinutes:
                targetFlight.status === "cancelled"
                    ? 0
                    : targetFlight.delayMinutes
        }
    };
}

function outcomesDiffer(
    first: SimulatedFlightOutcome,
    second: SimulatedFlightOutcome
): boolean {
    return (
        first.status !== second.status ||
        first.delayMinutes !== second.delayMinutes
    );
}

function isAlreadyAtRiskThreshold(
    outcome: SimulatedFlightOutcome
): boolean {
    return (
        outcome.status !== "cancelled" &&
        outcome.delayMinutes >=
            ML_DELAY_THRESHOLD_MINUTES
    );
}

async function evaluateAction(
    data: SimulationData,
    request: DecisionRecommendationRequest,
    actionOptions: SimulationOptions
): Promise<DecisionOutcomeLoss> {
    const assumptions =
        request.costAssumptions ??
        DEFAULT_COST_ASSUMPTIONS;

    const sharedOptions: SimulationOptions = {
        ...actionOptions,
        costAssumptions: assumptions
    };

    const existingOverrides = (
        actionOptions.flightDelayOverrides ?? []
    ).filter(
        override =>
            override.flightId !== request.flightId
    );

    const noRiskOutcome = await simulateOutcome(
        data,
        {
            ...sharedOptions,
            flightDelayOverrides: existingOverrides
        },
        request.flightId
    );

    /*
     * The classifier predicts whether total arrival delay
     * reaches 30 minutes. It does not predict an additional
     * delay on top of a delay already imposed by operations.
     *
     * If this action's baseline already reaches the threshold,
     * or the action cancels the flight, do not apply the ML
     * probability a second time.
     */
    const baselineAlreadyAtRisk =
        isAlreadyAtRiskThreshold(
            noRiskOutcome.targetFlight
        );

    const probabilityApplied =
        !baselineAlreadyAtRisk &&
        noRiskOutcome.targetFlight.status !== "cancelled";

    let riskOutcome = noRiskOutcome;

    if (probabilityApplied) {
        const targetFlight = data.flights.find(
            flight => flight.id === request.flightId
        );

        if (!targetFlight) {
            throw new DecisionInputError(
                `Flight not found: ${request.flightId}`
            );
        }

        const riskScenarioDelay = Math.max(
            targetFlight.delayMinutes,
            request.expectedDelayMinutes
        );

        riskOutcome = await simulateOutcome(
            data,
            {
                ...sharedOptions,
                flightDelayOverrides: [
                    ...existingOverrides,
                    {
                        flightId: request.flightId,
                        delayMinutes: riskScenarioDelay
                    }
                ]
            },
            request.flightId
        );
    }

    const probability = probabilityApplied
        ? request.delayProbability
        : 0;

    const expectedLoss =
        (1 - probability) * noRiskOutcome.loss +
        probability * riskOutcome.loss;

    return {
        noDelayLoss: noRiskOutcome.loss,
        delayedLoss: riskOutcome.loss,
        expectedLoss,
        probabilityApplied,
        probabilityUsed: probability,
        outcomes: {
            noDelay: noRiskOutcome.targetFlight,
            delayed: riskOutcome.targetFlight,
            delayScenariosDiffer: outcomesDiffer(
                noRiskOutcome.targetFlight,
                riskOutcome.targetFlight
            ),
            financialLossesDiffer:
                noRiskOutcome.loss !== riskOutcome.loss
        }
    };
}

export async function recommendAction(
    data: SimulationData,
    request: DecisionRecommendationRequest
): Promise<DecisionRecommendation> {
    const targetFlight = validateRequest(
        data,
        request
    );

    const assumptions =
        request.costAssumptions ??
        DEFAULT_COST_ASSUMPTIONS;

    const baseline = await simulateOutcome(
        data,
        {
            costAssumptions: assumptions
        },
        targetFlight.id
    );

    const actions: DecisionActionResult[] = [];

    const doNothingFinancial = await evaluateAction(
        data,
        request,
        {}
    );

    actions.push({
        id: "do-nothing",
        name: "Do nothing",
        feasible: true,
        financial: doNothingFinancial
    });

    const cancelFinancial = await evaluateAction(
        data,
        request,
        {
            cancelledFlights: [targetFlight.id]
        }
    );

    actions.push({
        id: "cancel",
        name: "Cancel flight",
        feasible: true,
        financial: cancelFinancial
    });

    /*
     * Only consider alternative aircraft that pass the
     * operational feasibility check.
     */
    const candidateAircraft = data.aircrafts.filter(
        aircraft =>
            aircraft.id !== targetFlight.aircraftId &&
            canAircraftOperateFlight(
                aircraft,
                targetFlight
            )
    );

    for (const aircraft of candidateAircraft) {
        const reassignmentFinancial =
            await evaluateAction(
                data,
                request,
                {
                    aircraftReassignments: [
                        {
                            flightId: targetFlight.id,
                            aircraftId: aircraft.id
                        }
                    ]
                }
            );

        actions.push({
            id: `reassign-${aircraft.id}`,
            name: `Reassign to ${aircraft.id}`,
            aircraftId: aircraft.id,
            feasible: true,
            financial: reassignmentFinancial
        });
    }

    /*
     * Select the action with the lowest expected network loss.
     */
    const bestAction = actions.reduce(
        (best, current) =>
            current.financial.expectedLoss <
            best.financial.expectedLoss
                ? current
                : best
    );

    const doNothing = actions.find(
        action => action.id === "do-nothing"
    )!;

    const probabilityAffectsAnyAction = actions.some(
        action =>
            action.financial.probabilityApplied &&
            action.financial.outcomes.financialLossesDiffer
    );

    const baselineAlreadyAtLeast30MinutesLate =
        isAlreadyAtRiskThreshold(
            baseline.targetFlight
        );

    let riskInterpretation: string;

    if (probabilityAffectsAnyAction) {
        riskInterpretation =
            "The ML probability affects actions whose operational baseline is below 30 minutes late. Actions already at or above the threshold use their operational baseline without adding the same delay risk again.";
    } else if (
        baselineAlreadyAtLeast30MinutesLate
    ) {
        riskInterpretation =
            "The operational baseline already produces a delay of at least 30 minutes. The ML probability was not applied to scenarios whose baseline already reaches this threshold, so it does not independently increase their estimated losses.";
    } else {
        riskInterpretation =
            "The ML probability was evaluated, but it did not change the financial losses across the eligible scenarios. It therefore does not change the recommendation.";
    }

    return {
        flightId: targetFlight.id,
        probabilityOfDelayAtLeast30Minutes:
            request.delayProbability,
        assumedDelayMinutesIfDelayed:
            request.expectedDelayMinutes,
        baselineOperationalOutcome:
            baseline.targetFlight,
        riskDiagnostics: {
            probabilityUsed: request.delayProbability,
            baselineAlreadyAtLeast30MinutesLate,
            probabilityAffectsAnyAction,
            interpretation: riskInterpretation
        },
        recommendedActionId: bestAction.id,
        recommendedActionName: bestAction.name,
        expectedSavingsVsDoNothing: Math.max(
            0,
            doNothing.financial.expectedLoss -
                bestAction.financial.expectedLoss
        ),
        actions,
        caveats: [
            "The classifier predicts the probability of total arrival delay reaching at least 30 minutes; it does not predict delay duration.",
            "The assumed delay duration is a scenario input, not an ML prediction.",
            "The ML probability is applied only when an action's operational baseline is below 30 minutes late and the flight is not cancelled.",
            "When the operational baseline already reaches the 30-minute threshold, its known simulated delay is not treated as an independent additional ML-risk event.",
            `The baseline simulation produces ${baseline.targetFlight.status} status with ${baseline.targetFlight.delayMinutes} delay minute(s) for this flight.`,
            riskInterpretation,
            "Aircraft rotation and turnaround constraints can impose delays independently of the ML model.",
            "Reassignment must pass the aircraft location, rotation and turnaround feasibility checks.",
            "The same ML probability is not necessarily valid after reassignment because the aircraft and its historical features may change. Reassignment-specific predictions are not yet implemented.",
            `Financial results use configurable prototype assumptions: ₹${assumptions.delayCostPerMinute.toLocaleString("en-IN")} per delay minute and ₹${assumptions.cancellationCost.toLocaleString("en-IN")} per cancellation.`,
            "Financial loss is total simulated network loss under the current simplified model, not a complete airline profit calculation or a fully validated estimate of incremental loss.",
            "The ML model was trained on US domestic flight data from 2015 and has not been validated for Indian airline operations."
        ]
    };
}
