import { describe, expect, it } from "vitest";
import {
    canAircraftOperateFlight,
    getAircraftAvailableTime
} from "./feasibility";
import type { Aircraft, Flight } from "./types";

describe("aircraft feasibility", () => {

    it("returns true when aircraft is at the flight departure airport", () => {

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

        const aircraft: Aircraft = {
            id: "VT-XYZ",
            currentAirport: "BLR",
            status: "grounded",
            flights: []
        };

        expect(
            canAircraftOperateFlight(aircraft, flight)
        ).toBe(true);
    });


    it("returns false when aircraft is at a different airport", () => {

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

        const aircraft: Aircraft = {
            id: "VT-XYZ",
            currentAirport: "BLR",
            status: "grounded",
            flights: []
        };

        expect(
            canAircraftOperateFlight(aircraft, flight)
        ).toBe(false);
    });

    it("calculates aircraft availability after its last flight", () => {

    const previousFlight: Flight = {
        id: "TEST201",
        aircraftId: "VT-ABC",
        from: "BOM",
        to: "HYD",
        scheduledDeparture: "2026-09-12T10:00:00+05:30",
        scheduledArrival: "2026-09-12T12:00:00+05:30",
        delayMinutes: 30,
        status: "landed"
    };

    const aircraft: Aircraft = {
        id: "VT-ABC",
        currentAirport: "HYD",
        status: "grounded",
        flights: [previousFlight]
    };

    const availableTime =
        getAircraftAvailableTime(aircraft);

    expect(availableTime?.toISOString())
        .toBe("2026-09-12T08:00:00.000Z");
    });

    it("returns false when the aircraft becomes available after departure", () => {

    const previousFlight: Flight = {
        id: "TEST201",
        aircraftId: "VT-ABC",
        from: "BOM",
        to: "DEL",
        scheduledDeparture: "2026-09-12T10:00:00+05:30",
        scheduledArrival: "2026-09-12T12:00:00+05:30",
        delayMinutes: 0,
        status: "landed"
    };

    const flight: Flight = {
        id: "TEST202",
        aircraftId: "VT-XYZ",
        from: "DEL",
        to: "HYD",
        scheduledDeparture: "2026-09-12T12:30:00+05:30",
        scheduledArrival: "2026-09-12T14:30:00+05:30",
        delayMinutes: 0,
        status: "scheduled"
    };

    const aircraft: Aircraft = {
        id: "VT-ABC",
        currentAirport: "DEL",
        status: "grounded",
        flights: [previousFlight]
    };

    expect(
        canAircraftOperateFlight(aircraft, flight)
    ).toBe(false);
    });
});