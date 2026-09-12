import { describe, it, expect } from "vitest";
import { applyDisruptions } from "./disruptions";
import type {
    Flight,
    Disruption,
    SimulationEvent
} from "./types";

function createFlight(
    id: string,
    aircraftId: string,
    from: string,
    to: string
): Flight {
    return {
        id,
        aircraftId,
        from,
        to,
        scheduledDeparture: "2026-09-12T08:00:00+05:30",
        scheduledArrival: "2026-09-12T10:00:00+05:30",
        delayMinutes: 0,
        status: "scheduled"
    };
}


describe("Weather Disruptions", () => {

    it("should delay only flights departing from the affected airport", () => {

        const flights: Flight[] = [
            createFlight(
                "AI101",
                "VT-XYZ",
                "BLR",
                "BOM"
            ),
            createFlight(
                "AI201",
                "VT-ABC",
                "BOM",
                "HYD"
            )
        ];

        const disruptions: Disruption[] = [
            {
                type: "weather",
                airport: "BLR",
                delayMinutes: 180,
                description: "Thunderstorm"
            }
        ];

        const events: SimulationEvent[] = [];

        applyDisruptions(
            flights,
            disruptions,
            events
        );

        expect(flights[0].delayMinutes).toBe(180);
        expect(flights[1].delayMinutes).toBe(0);

        expect(events.length).toBe(1);
        expect(events[0].type).toBe("weather");

        expect(events[0].message).toBe(
            "Weather disruption at BLR (+180 min)"
        );
    });
});


describe("Technical Disruptions", () => {

    it("should delay only flights operated by the affected aircraft", () => {

        const flights: Flight[] = [
            createFlight(
                "AI101",
                "VT-XYZ",
                "BLR",
                "BOM"
            ),
            createFlight(
                "AI201",
                "VT-ABC",
                "BOM",
                "HYD"
            )
        ];

        const disruptions: Disruption[] = [
            {
                type: "technical",
                aircraftId: "VT-XYZ",
                delayMinutes: 180,
                description: "Engine failure"
            }
        ];

        const events: SimulationEvent[] = [];

        applyDisruptions(
            flights,
            disruptions,
            events
        );

        expect(flights[0].delayMinutes).toBe(180);
        expect(flights[1].delayMinutes).toBe(0);

        expect(events.length).toBe(1);
        expect(events[0].type).toBe("technical");

        expect(events[0].message).toBe(
            "Technical disruption on VT-XYZ (+180 min)"
        );
    });
});


describe("Crew Disruptions", () => {

    it("should delay only flights operated by the affected aircraft", () => {

        const flights: Flight[] = [
            createFlight(
                "AI101",
                "VT-XYZ",
                "BLR",
                "BOM"
            ),
            createFlight(
                "AI201",
                "VT-ABC",
                "BOM",
                "HYD"
            )
        ];

        const disruptions: Disruption[] = [
            {
                type: "crew",
                aircraftId: "VT-XYZ",
                delayMinutes: 180,
                description: "Crew issues"
            }
        ];

        const events: SimulationEvent[] = [];

        applyDisruptions(
            flights,
            disruptions,
            events
        );

        expect(flights[0].delayMinutes).toBe(180);
        expect(flights[1].delayMinutes).toBe(0);

        expect(events.length).toBe(1);
        expect(events[0].type).toBe("crew");

        expect(events[0].message).toBe(
            "Crew delay on VT-XYZ (+180 min)"
        );
    });
});


describe("No Disruptions", () => {

    it("should not delay flights when no disruptions", () => {

        const flights: Flight[] = [
            createFlight(
                "AI101",
                "VT-XYZ",
                "BLR",
                "BOM"
            ),
            createFlight(
                "AI201",
                "VT-ABC",
                "BOM",
                "HYD"
            )
        ];

        const disruptions: Disruption[] = [];

        const events: SimulationEvent[] = [];

        applyDisruptions(
            flights,
            disruptions,
            events
        );

        expect(flights[0].delayMinutes).toBe(0);
        expect(flights[1].delayMinutes).toBe(0);

        expect(events.length).toBe(0);
    });
});


describe("Multiple Disruptions", () => {

    it("should apply multiple disruptions cumulatively", () => {

        const flights: Flight[] = [
            createFlight(
                "AI101",
                "VT-XYZ",
                "BLR",
                "BOM"
            ),
            createFlight(
                "AI201",
                "VT-ABC",
                "BOM",
                "HYD"
            )
        ];

        const disruptions: Disruption[] = [
            {
                type: "technical",
                aircraftId: "VT-XYZ",
                delayMinutes: 180,
                description: "Engine failure"
            },
            {
                type: "weather",
                airport: "BLR",
                delayMinutes: 120,
                description: "Thunderstorm"
            }
        ];

        const events: SimulationEvent[] = [];

        applyDisruptions(
            flights,
            disruptions,
            events
        );

        expect(flights[0].delayMinutes).toBe(300);
        expect(flights[1].delayMinutes).toBe(0);

        expect(events.length).toBe(2);

        expect(events[0].type).toBe("technical");

        expect(events[0].message).toBe(
            "Technical disruption on VT-XYZ (+180 min)"
        );

        expect(events[1].type).toBe("weather");

        expect(events[1].message).toBe(
            "Weather disruption at BLR (+120 min)"
        );
    });
});