
import { describe, expect, it } from "vitest";
import { recommendAction, DecisionInputError } from "./decision";
import type {
    Aircraft,
    Flight,
    SimulationData
} from "./types";

function createFlight(
    id: string,
    aircraftId: string,
    from: string,
    to: string,
    departure: string,
    arrival: string
): Flight {
    return {
        id,
        aircraftId,
        from,
        to,
        scheduledDeparture: departure,
        scheduledArrival: arrival,
        delayMinutes: 0,
        status: "scheduled"
    };
}

function createData(): SimulationData {
    const target = createFlight(
        "TEST101",
        "VT-ONE",
        "BLR",
        "BOM",
        "2026-09-12T08:00:00+05:30",
        "2026-09-12T10:00:00+05:30"
    );

    const firstAircraft: Aircraft = {
        id: "VT-ONE",
        currentAirport: "BLR",
        status: "grounded",
        flights: [target]
    };

    const availableAircraft: Aircraft = {
        id: "VT-TWO",
        currentAirport: "BLR",
        status: "grounded",
        flights: []
    };

    return {
        flights: [target],
        aircrafts: [
            firstAircraft,
            availableAircraft
        ]
    };
}

const testCosts = {
    delayCostPerMinute: 5000,
    cancellationCost: 200000
};

describe("decision recommendation", () => {
    it("compares do-nothing, cancellation and feasible reassignment", async () => {
        const result = await recommendAction(createData(), {
            flightId: "TEST101",
            delayProbability: 1,
            expectedDelayMinutes: 60,
            costAssumptions: testCosts
        });

        expect(
            result.actions.map(action => action.id)
        ).toEqual([
            "do-nothing",
            "cancel",
            "reassign-VT-TWO"
        ]);

        const doNothing = result.actions.find(
            action => action.id === "do-nothing"
        )!;

        const cancellation = result.actions.find(
            action => action.id === "cancel"
        )!;

        const reassignment = result.actions.find(
            action => action.id === "reassign-VT-TWO"
        )!;

        expect(
            doNothing.financial.expectedLoss
        ).toBe(300000);

        expect(
            doNothing.financial.probabilityApplied
        ).toBe(true);

        expect(
            doNothing.financial.probabilityUsed
        ).toBe(1);

        expect(
            cancellation.financial.expectedLoss
        ).toBe(200000);

        expect(
            cancellation.financial.probabilityApplied
        ).toBe(false);

        expect(
            reassignment.feasible
        ).toBe(true);

        expect(
            reassignment.financial.expectedLoss
        ).toBe(300000);

        expect(result.recommendedActionId).toBe("cancel");
        expect(result.expectedSavingsVsDoNothing).toBe(100000);

        expect(
            cancellation.financial.outcomes.noDelay.status
        ).toBe("cancelled");

        expect(
            cancellation.financial.outcomes.delayed.status
        ).toBe("cancelled");

        expect(
            cancellation.financial.outcomes.delayScenariosDiffer
        ).toBe(false);

        expect(
            cancellation.financial.outcomes.financialLossesDiffer
        ).toBe(false);

        expect(
            result.baselineOperationalOutcome.status
        ).toBe("landed");
    });

    it("weights baseline and delayed losses when baseline delay is below 30 minutes", async () => {
        const data = createData();

        data.flights[0].delayMinutes = 20;
        data.aircrafts[0].flights[0].delayMinutes = 20;

        const result = await recommendAction(data, {
            flightId: "TEST101",
            delayProbability: 0.25,
            expectedDelayMinutes: 60,
            costAssumptions: testCosts
        });

        const doNothing = result.actions.find(
            action => action.id === "do-nothing"
        )!;

        expect(
            doNothing.financial.noDelayLoss
        ).toBe(100000);

        expect(
            doNothing.financial.delayedLoss
        ).toBe(300000);

        expect(
            doNothing.financial.expectedLoss
        ).toBe(150000);

        expect(
            doNothing.financial.probabilityApplied
        ).toBe(true);

        expect(
            doNothing.financial.probabilityUsed
        ).toBe(0.25);

        expect(
            doNothing.financial.outcomes.noDelay.delayMinutes
        ).toBe(20);

        expect(
            doNothing.financial.outcomes.delayed.delayMinutes
        ).toBe(60);

        expect(
            doNothing.financial.outcomes.financialLossesDiffer
        ).toBe(true);

        expect(
            result.riskDiagnostics.baselineAlreadyAtLeast30MinutesLate
        ).toBe(false);

        expect(
            result.riskDiagnostics.probabilityAffectsAnyAction
        ).toBe(true);

        expect(result.recommendedActionId).toBe("do-nothing");
    });

    it("does not apply ML probability when baseline already reaches 30 minutes", async () => {
        const previous = createFlight(
            "PREV100",
            "VT-ONE",
            "DEL",
            "BLR",
            "2026-09-12T06:00:00+05:30",
            "2026-09-12T08:00:00+05:30"
        );

        const target = createFlight(
            "TEST101",
            "VT-ONE",
            "BLR",
            "BOM",
            "2026-09-12T08:00:00+05:30",
            "2026-09-12T10:00:00+05:30"
        );

        const data: SimulationData = {
            flights: [previous, target],
            aircrafts: [
                {
                    id: "VT-ONE",
                    currentAirport: "DEL",
                    status: "grounded",
                    flights: [previous, target]
                }
            ]
        };

        const result = await recommendAction(data, {
            flightId: "TEST101",
            delayProbability: 0.62,
            expectedDelayMinutes: 60,
            costAssumptions: testCosts
        });

        expect(
            result.baselineOperationalOutcome.status
        ).toBe("landed");

        expect(
            result.baselineOperationalOutcome.delayMinutes
        ).toBe(60);

        const doNothing = result.actions.find(
            action => action.id === "do-nothing"
        )!;

        expect(
            doNothing.financial.outcomes.noDelay.delayMinutes
        ).toBe(60);

        expect(
            doNothing.financial.outcomes.delayed.delayMinutes
        ).toBe(60);

        expect(
            doNothing.financial.probabilityApplied
        ).toBe(false);

        expect(
            doNothing.financial.probabilityUsed
        ).toBe(0);

        expect(
            doNothing.financial.outcomes.financialLossesDiffer
        ).toBe(false);

        expect(
            result.riskDiagnostics.baselineAlreadyAtLeast30MinutesLate
        ).toBe(true);

        expect(
            result.riskDiagnostics.probabilityAffectsAnyAction
        ).toBe(false);

        expect(
            result.riskDiagnostics.interpretation
        ).toContain(
            "does not independently increase their estimated losses"
        );
    });

    it("does not apply ML probability to cancellation", async () => {
        const result = await recommendAction(createData(), {
            flightId: "TEST101",
            delayProbability: 0.75,
            expectedDelayMinutes: 60,
            costAssumptions: testCosts
        });

        const cancellation = result.actions.find(
            action => action.id === "cancel"
        )!;

        expect(
            cancellation.financial.probabilityApplied
        ).toBe(false);

        expect(
            cancellation.financial.probabilityUsed
        ).toBe(0);

        expect(
            cancellation.financial.expectedLoss
        ).toBe(200000);
    });

    it("rejects a probability outside zero to one", async () => {
        await expect(
            recommendAction(createData(), {
                flightId: "TEST101",
                delayProbability: 1.2,
                expectedDelayMinutes: 60
            })
        ).rejects.toBeInstanceOf(DecisionInputError);
    });

    it("rejects a delay-duration assumption below the model target threshold", async () => {
        await expect(
            recommendAction(createData(), {
                flightId: "TEST101",
                delayProbability: 0.5,
                expectedDelayMinutes: 15
            })
        ).rejects.toBeInstanceOf(DecisionInputError);
    });

    it("does not mutate input simulation data while comparing actions", async () => {
        const data = createData();

        const originalFlight = {
            ...data.flights[0]
        };

        const originalAircraftIds =
            data.aircrafts.map(aircraft => ({
                id: aircraft.id,
                flightIds: aircraft.flights.map(
                    flight => flight.id
                )
            }));

        await recommendAction(data, {
            flightId: "TEST101",
            delayProbability: 0.5,
            expectedDelayMinutes: 60
        });

        expect(data.flights[0]).toEqual(originalFlight);

        expect(
            data.aircrafts.map(aircraft => ({
                id: aircraft.id,
                flightIds: aircraft.flights.map(
                    flight => flight.id
                )
            }))
        ).toEqual(originalAircraftIds);
    });
});
