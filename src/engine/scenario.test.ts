import { describe, expect, it } from "vitest";
import { compareScenarios, runScenario } from "./scenario";
import type { SimulationScenario, SimulationData, Flight, Aircraft } from "./types";
import { runSimulation } from "./clock";
import { reassignFlight } from "./reassignment";
import { canAircraftOperateFlight } from "./feasibility";

describe("Scenario Engine", () => {
    it("runs a single scenario", async () => {
        const scenario: SimulationScenario = {
            id: "baseline",
            name: "Baseline",
            options: {
                costAssumptions: {
                    delayCostPerMinute: 5000,
                    cancellationCost: 200000
                }
            }
        };

        const result = await runScenario(scenario);

        expect(result.scenario.id).toBe("baseline");
        expect(result.financialImpact).toBeDefined();
        expect(result.financialImpact.totalEstimatedLoss).toBe(2100000);
    });

    it("identifies the scenario with the lowest financial loss", async () => {
        const scenarios: SimulationScenario[] = [
            {
                id: "high-cost",
                name: "High Delay Cost",
                options: {
                    costAssumptions: {
                        delayCostPerMinute: 10000,
                        cancellationCost: 200000
                    }
                }
            },
            {
                id: "low-cost",
                name: "Low Delay Cost",
                options: {
                    costAssumptions: {
                        delayCostPerMinute: 1000,
                        cancellationCost: 200000
                    }
                }
            }
        ];

        const result = await compareScenarios(scenarios);

        expect(result.results).toHaveLength(2);
        expect(result.bestScenarioId).toBe("low-cost");
    });

    it("cancels the requested flight", async () => {
    const scenario: SimulationScenario = {
        id: "cancel-ai103",
        name: "Cancel AI103",
        options: {
            cancelledFlights: ["AI103"],
            costAssumptions: {
                delayCostPerMinute: 5000,
                cancellationCost: 200000
            }
        }
    };

    const result = await runSimulation(
        undefined,
        scenario.options
    );

    const cancelledFlight = result.flights.find(
        flight => flight.id === "AI103"
    );

    expect(cancelledFlight?.status).toBe("cancelled");
    });

    it("compares baseline and cancellation scenarios", async () => {
    const scenarios: SimulationScenario[] = [
        {
            id: "baseline",
            name: "Do Nothing",
            options: {
                costAssumptions: {
                    delayCostPerMinute: 5000,
                    cancellationCost: 200000
                }
            }
        },
        {
            id: "cancel-ai103",
            name: "Cancel AI103",
            options: {
                cancelledFlights: ["AI103"],
                costAssumptions: {
                    delayCostPerMinute: 5000,
                    cancellationCost: 200000
                }
            }
        }
    ];

    const result = await compareScenarios(scenarios);

    console.log(
        result.results.map(scenario => ({
            id: scenario.scenario.id,
            loss: scenario.financialImpact.totalEstimatedLoss,
            delay: scenario.metrics.averageDelay,
            cancelled: scenario.metrics.cancelledFlights
        }))
    );

    console.log("Best scenario:", result.bestScenarioId);

    expect(result.results).toHaveLength(2);
    expect(result.bestScenarioId).toBe("cancel-ai103");
    });

    it("rejects reassignment when the aircraft is at the wrong airport", async () => {
    const scenario: SimulationScenario = {
        id: "invalid-reassignment",
        name: "Invalid Reassignment",
        options: {
            aircraftReassignments: [
                {
                    flightId: "AI103",
                    aircraftId: "VT-ABC"
                }
            ]
        }
    };

    const result = await runScenario(scenario);

    const flight = result.flights.find(
        flight => flight.id === "AI103"
    );

    expect(flight?.aircraftId).toBe("VT-XYZ");
    });

    it("successfully reassigns a flight when the new aircraft is at the departure airport", () => {

    const flight: Flight = {
        id: "TEST102",
        aircraftId: "VT-XYZ",
        from: "DEL",
        to: "HYD",
        scheduledDeparture: "2026-09-12T12:00:00+05:30",
        scheduledArrival: "2026-09-12T14:00:00+05:30",
        delayMinutes: 0,
        status: "scheduled"
    };

    const oldAircraft: Aircraft = {
        id: "VT-XYZ",
        currentAirport: "BLR",
        status: "grounded",
        flights: [flight]
    };

    const newAircraft: Aircraft = {
        id: "VT-ABC",
        currentAirport: "DEL",
        status: "grounded",
        flights: []
    };

    const isFeasible = canAircraftOperateFlight(
        newAircraft,
        flight
    );

    expect(isFeasible).toBe(true);

    reassignFlight(
        flight,
        oldAircraft,
        newAircraft
    );

    expect(flight.aircraftId).toBe("VT-ABC");
    expect(oldAircraft.flights).not.toContain(flight);
    expect(newAircraft.flights).toContain(flight);
    });

    it("reassigns a flight through the simulation when feasible", async () => {

    const flight: Flight = {
        id: "TEST301",
        aircraftId: "VT-XYZ",
        from: "DEL",
        to: "HYD",
        scheduledDeparture: "2026-09-12T12:00:00+05:30",
        scheduledArrival: "2026-09-12T14:00:00+05:30",
        delayMinutes: 0,
        status: "scheduled"
    };

    const oldAircraft: Aircraft = {
        id: "VT-XYZ",
        currentAirport: "BLR",
        status: "grounded",
        flights: [flight]
    };

    const newAircraft: Aircraft = {
        id: "VT-ABC",
        currentAirport: "DEL",
        status: "grounded",
        flights: []
    };

    const data: SimulationData = {
        flights: [flight],
        aircrafts: [
            oldAircraft,
            newAircraft
        ]
    };

    const result = await runSimulation(
        data,
        {
            aircraftReassignments: [
                {
                    flightId: "TEST301",
                    aircraftId: "VT-ABC"
                }
            ]
        }
    );

    const reassignedFlight = result.flights.find(
        flight => flight.id === "TEST301"
    );

    expect(reassignedFlight?.aircraftId)
        .toBe("VT-ABC");

    expect(reassignedFlight?.status)
        .toBe("landed");

    expect(
        result.events.some(
            event =>
                event.type === "reassignment" &&
                event.flightId === "TEST301"
        )
    ).toBe(true);
    });

});