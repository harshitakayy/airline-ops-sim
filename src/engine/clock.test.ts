import { describe, it, expect } from "vitest";
import { runSimulation } from "./clock";
import type { Flight, Aircraft } from "./types";

describe("Delay Propagation", () => {

    it("next flight receives the propagated delay", async () => {

        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            scheduledDeparture: "2026-09-12T08:00:00+05:30",
            scheduledArrival: "2026-09-12T10:00:00+05:30",
            delayMinutes: 120,
            status: "scheduled"
        };

        const secondFlight: Flight = {
            id: "TEST102",
            aircraftId: "VT-TEST",
            from: "BOM",
            to: "HYD",
            scheduledDeparture: "2026-09-12T12:00:00+05:30",
            scheduledArrival: "2026-09-12T14:00:00+05:30",
            delayMinutes: 0,
            status: "scheduled"
        };

        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight, secondFlight]
        };

        const scenario = {
            flights: [firstFlight, secondFlight],
            aircrafts: [plane]
        };

        const result = await runSimulation(scenario);

        const nextFlight = result.flights.find(
            flight => flight.id === "TEST102"
        );

        expect(nextFlight).toBeDefined();
        expect(nextFlight?.delayMinutes).toBe(60);
    });


    it("absorbs the delay when sufficient buffer exists", async () => {

        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            scheduledDeparture: "2026-09-12T08:00:00+05:30",
            scheduledArrival: "2026-09-12T10:00:00+05:30",
            delayMinutes: 120,
            status: "scheduled"
        };

        const secondFlight: Flight = {
            id: "TEST102",
            aircraftId: "VT-TEST",
            from: "BOM",
            to: "HYD",
            scheduledDeparture: "2026-09-12T14:00:00+05:30",
            scheduledArrival: "2026-09-12T15:00:00+05:30",
            delayMinutes: 0,
            status: "scheduled"
        };

        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight, secondFlight]
        };

        const scenario = {
            flights: [firstFlight, secondFlight],
            aircrafts: [plane]
        };

        const result = await runSimulation(scenario);

        const nextFlight = result.flights.find(
            flight => flight.id === "TEST102"
        );

        expect(nextFlight).toBeDefined();
        expect(nextFlight?.delayMinutes).toBe(0);
    });


    it("delay cascades through several connected flights and is eventually absorbed by schedule buffer", async () => {

        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            scheduledDeparture: "2026-09-12T08:00:00+05:30",
            scheduledArrival: "2026-09-12T10:00:00+05:30",
            delayMinutes: 120,
            status: "scheduled"
        };

        const secondFlight: Flight = {
            id: "TEST102",
            aircraftId: "VT-TEST",
            from: "BOM",
            to: "HYD",
            scheduledDeparture: "2026-09-12T12:00:00+05:30",
            scheduledArrival: "2026-09-12T14:00:00+05:30",
            delayMinutes: 0,
            status: "scheduled"
        };

        const thirdFlight: Flight = {
            id: "TEST103",
            aircraftId: "VT-TEST",
            from: "HYD",
            to: "BLR",
            scheduledDeparture: "2026-09-12T15:00:00+05:30",
            scheduledArrival: "2026-09-12T16:00:00+05:30",
            delayMinutes: 0,
            status: "scheduled"
        };

        const fourthFlight: Flight = {
            id: "TEST104",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "DEL",
            scheduledDeparture: "2026-09-12T17:00:00+05:30",
            scheduledArrival: "2026-09-12T18:00:00+05:30",
            delayMinutes: 0,
            status: "scheduled"
        };

        const fifthFlight: Flight = {
            id: "TEST105",
            aircraftId: "VT-TEST",
            from: "DEL",
            to: "HYD",
            scheduledDeparture: "2026-09-12T21:00:00+05:30",
            scheduledArrival: "2026-09-12T22:00:00+05:30",
            delayMinutes: 0,
            status: "scheduled"
        };

        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [
                firstFlight,
                secondFlight,
                thirdFlight,
                fourthFlight,
                fifthFlight
            ]
        };

        const scenario = {
            flights: [
                firstFlight,
                secondFlight,
                thirdFlight,
                fourthFlight,
                fifthFlight
            ],
            aircrafts: [plane]
        };

        const result = await runSimulation(scenario);

        const delays = result.flights.map(
            flight => flight.delayMinutes
        );

        expect(delays).toEqual([
            120,
            60,
            60,
            60,
            0
        ]);
    });


    it("independent aircraft rotations", async () => {

        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST1",
            from: "BLR",
            to: "BOM",
            scheduledDeparture: "2026-09-12T08:00:00+05:30",
            scheduledArrival: "2026-09-12T10:00:00+05:30",
            delayMinutes: 120,
            status: "scheduled"
        };

        const secondFlight: Flight = {
            id: "TEST102",
            aircraftId: "VT-TEST1",
            from: "BOM",
            to: "HYD",
            scheduledDeparture: "2026-09-12T12:00:00+05:30",
            scheduledArrival: "2026-09-12T14:00:00+05:30",
            delayMinutes: 0,
            status: "scheduled"
        };

        const thirdFlight: Flight = {
            id: "TEST103",
            aircraftId: "VT-TEST2",
            from: "HYD",
            to: "BLR",
            scheduledDeparture: "2026-09-12T15:00:00+05:30",
            scheduledArrival: "2026-09-12T16:00:00+05:30",
            delayMinutes: 0,
            status: "scheduled"
        };

        const plane1: Aircraft = {
            id: "VT-TEST1",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight, secondFlight]
        };

        const plane2: Aircraft = {
            id: "VT-TEST2",
            currentAirport: "HYD",
            status: "grounded",
            flights: [thirdFlight]
        };

        const scenario = {
            flights: [
                firstFlight,
                secondFlight,
                thirdFlight
            ],
            aircrafts: [plane1, plane2]
        };

        const result = await runSimulation(scenario);

        const nextFlight = result.flights.find(
            flight => flight.id === "TEST103"
        );

        expect(nextFlight).toBeDefined();
        expect(nextFlight?.delayMinutes).toBe(0);
        expect(nextFlight?.status).toBe("landed");
    });
});


describe("Aircraft location enforcement", () => {

    it("prevents departure when aircraft is at the wrong airport", async () => {

        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BOM",
            to: "HYD",
            scheduledDeparture: "2026-09-12T08:00:00+05:30",
            scheduledArrival: "2026-09-12T10:00:00+05:30",
            delayMinutes: 120,
            status: "scheduled"
        };

        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight]
        };

        const scenario = {
            flights: [firstFlight],
            aircrafts: [plane]
        };

        const result = await runSimulation(scenario);

        const nextFlight = result.flights.find(
            flight => flight.id === "TEST101"
        );

        const nextPlane = result.aircrafts.find(
            aircraft => aircraft.id === "VT-TEST"
        );

        expect(nextFlight?.status).toBe("scheduled");
        expect(nextPlane?.currentAirport).toBe("BLR");
    });
});


describe("Simulation events", () => {

    it("records departure and arrival events", async () => {

        const flight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            scheduledDeparture: "2026-09-12T08:00:00+05:30",
            scheduledArrival: "2026-09-12T10:00:00+05:30",
            delayMinutes: 0,
            status: "scheduled"
        };

        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [flight]
        };

        const scenario = {
            flights: [flight],
            aircrafts: [plane]
        };

        const result = await runSimulation(scenario);

        const departureEvent = result.events.find(
            event =>
                event.flightId === "TEST101" &&
                event.type === "departure"
        );

        const arrivalEvent = result.events.find(
            event =>
                event.flightId === "TEST101" &&
                event.type === "arrival"
        );

        expect(departureEvent).toBeDefined();
        expect(arrivalEvent).toBeDefined();

        expect(departureEvent?.message).toBe(
            "TEST101 departed BLR"
        );

        expect(arrivalEvent?.message).toBe(
            "TEST101 landed BOM"
        );
    });
});


describe("Flight cancellation", () => {

    it("should cancel a flight whose delay exceeds the threshold", async () => {

        const flight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            scheduledDeparture: "2026-09-12T08:00:00+05:30",
            scheduledArrival: "2026-09-12T10:00:00+05:30",
            delayMinutes: 360,
            status: "scheduled"
        };

        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [flight]
        };

        const scenario = {
            flights: [flight],
            aircrafts: [plane]
        };

        const result = await runSimulation(scenario);

        expect(
            result.events.some(
                event => event.type === "cancellation"
            )
        ).toBe(true);

        expect(
            result.events.some(
                event => event.type === "departure"
            )
        ).toBe(false);

        expect(result.flights[0].status).toBe("cancelled");

        expect(result.events[0].type).toBe("cancellation");
    });


    it("should keep the aircraft at the origin airport after cancellation", async () => {

        const flight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            scheduledDeparture: "2026-09-12T08:00:00+05:30",
            scheduledArrival: "2026-09-12T10:00:00+05:30",
            delayMinutes: 360,
            status: "scheduled"
        };

        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [flight]
        };

        const scenario = {
            flights: [flight],
            aircrafts: [plane]
        };

        const result = await runSimulation(scenario);

        expect(result.aircrafts[0].currentAirport).toBe("BLR");
        expect(result.aircrafts[0].status).toBe("grounded");
    });


    it("should block the next flight after cancellation", async () => {

        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            scheduledDeparture: "2026-09-12T08:00:00+05:30",
            scheduledArrival: "2026-09-12T10:00:00+05:30",
            delayMinutes: 360,
            status: "scheduled"
        };

        const secondFlight: Flight = {
            id: "TEST102",
            aircraftId: "VT-TEST",
            from: "BOM",
            to: "DEL",
            scheduledDeparture: "2026-09-12T11:00:00+05:30",
            scheduledArrival: "2026-09-12T14:00:00+05:30",
            delayMinutes: 0,
            status: "scheduled"
        };

        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight, secondFlight]
        };

        const scenario = {
            flights: [firstFlight, secondFlight],
            aircrafts: [plane]
        };

        const result = await runSimulation(scenario);

        expect(result.aircrafts[0].currentAirport).toBe("BLR");
        expect(result.aircrafts[0].status).toBe("grounded");

        expect(result.flights[0].status).toBe("cancelled");
        expect(result.flights[1].status).toBe("cancelled");

        expect(
            result.events.some(
                event =>
                    event.flightId === "TEST102" &&
                    event.type === "cancellation"
            )
        ).toBe(true);
    });


    it("should delay the next flight when the previous flight lands late", async () => {

        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            scheduledDeparture: "2026-09-12T08:00:00+05:30",
            scheduledArrival: "2026-09-12T10:00:00+05:30",
            delayMinutes: 120,
            status: "scheduled"
        };

        const secondFlight: Flight = {
            id: "TEST102",
            aircraftId: "VT-TEST",
            from: "BOM",
            to: "DEL",
            scheduledDeparture: "2026-09-12T11:00:00+05:30",
            scheduledArrival: "2026-09-12T14:00:00+05:30",
            delayMinutes: 0,
            status: "scheduled"
        };

        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight, secondFlight]
        };

        const scenario = {
            flights: [firstFlight, secondFlight],
            aircrafts: [plane]
        };

        const result = await runSimulation(scenario);

        expect(result.aircrafts[0].currentAirport).toBe("DEL");
        expect(result.aircrafts[0].status).toBe("grounded");

        expect(result.flights[1].status).toBe("landed");
        expect(result.flights[1].delayMinutes).toBe(120);

        expect(
            result.events.some(
                event =>
                    event.flightId === "TEST102" &&
                    event.type === "departure"
            )
        ).toBe(true);
    });
});