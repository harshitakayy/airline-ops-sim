import { describe, expect, it } from "vitest";
import { reassignFlight } from "./reassignment";
import type { Aircraft, Flight } from "./types";

describe("aircraft reassignment", () => {

    it("moves a flight from one aircraft to another", () => {

        const flight: Flight = {
            id: "TEST101",
            aircraftId: "VT-XYZ",
            from: "BLR",
            to: "BOM",
            scheduledDeparture: "2026-09-12T08:00:00+05:30",
            scheduledArrival: "2026-09-12T10:00:00+05:30",
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
            currentAirport: "BOM",
            status: "grounded",
            flights: []
        };

        reassignFlight(
            flight,
            oldAircraft,
            newAircraft
        );

        expect(flight.aircraftId).toBe("VT-ABC");

        expect(oldAircraft.flights).not.toContain(flight);

        expect(newAircraft.flights).toContain(flight);
    });
});