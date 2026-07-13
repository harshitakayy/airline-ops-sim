import { describe, it, expect } from "vitest";
import { applyDisruptions } from "./disruptions";
import type { Flight,Disruption,SimulationEvent } from "./types";

describe("Weather Disruptions",()=> {
    it("should delay only flights departing from the affected airport",()=> {
        const flights: Flight[]= [
            {
                id: "AI101",
                aircraftId: "VT-XYZ",
                from: "BLR",
                to: "BOM",
                departureTime: 8,
                arrivalTime: 10,
                delayHours: 0,
                status: "scheduled"
            },
            {
                id: "AI201",
                aircraftId: "VT-ABC",
                from: "BOM",
                to: "HYD",
                departureTime: 8,
                arrivalTime: 10,
                delayHours: 0,
                status: "scheduled"
            }
        ];

        const disruptions: Disruption[] = [
        {
            type: "weather",
            airport: "BLR",
            delayHours: 3,
            description: "Thunderstorm"
        }
        ];

        const events: SimulationEvent[] = [];
        applyDisruptions(flights, disruptions, events);

        expect(flights[0].delayHours).toBe(3);
        expect(flights[1].delayHours).toBe(0);
        expect(events.length).toBe(1);
        expect(events[0].time).toBe(0);
        expect(events[0].type).toBe("weather");
        expect(events[0].message).toBe("Weather disruption at BLR (+3h)");
    })

})

describe("Technical Disruptions",()=> {
    it("should delay only flights operated by the affected aircraft",()=> {
        const flights: Flight[]= [
            {
                id: "AI101",
                aircraftId: "VT-XYZ",
                from: "BLR",
                to: "BOM",
                departureTime: 8,
                arrivalTime: 10,
                delayHours: 0,
                status: "scheduled"
            },
            {
                id: "AI201",
                aircraftId: "VT-ABC",
                from: "BOM",
                to: "HYD",
                departureTime: 8,
                arrivalTime: 10,
                delayHours: 0,
                status: "scheduled"
            }
        ];

        const disruptions: Disruption[] = [
        {
            type: "technical",
            aircraftId: "VT-XYZ",
            delayHours: 3,
            description: "Engine failure"
        }
        ];

        const events: SimulationEvent[] = [];
        applyDisruptions(flights, disruptions, events);

        expect(flights[0].delayHours).toBe(3);
        expect(flights[1].delayHours).toBe(0);
        expect(events.length).toBe(1);
        expect(events[0].time).toBe(0);
        expect(events[0].type).toBe("technical");
        expect(events[0].message).toBe("Technical disruption on VT-XYZ (+3h)");
    })

})

describe("Crew Disruptions",()=> {
    it("should delay only flights operated by the affected crew",()=> {
        const flights: Flight[]= [
            {
                id: "AI101",
                aircraftId: "VT-XYZ",
                from: "BLR",
                to: "BOM",
                departureTime: 8,
                arrivalTime: 10,
                delayHours: 0,
                status: "scheduled"
            },
            {
                id: "AI201",
                aircraftId: "VT-ABC",
                from: "BOM",
                to: "HYD",
                departureTime: 8,
                arrivalTime: 10,
                delayHours: 0,
                status: "scheduled"
            }
        ];

        const disruptions: Disruption[] = [
        {
            type: "crew",
            aircraftId: "VT-XYZ",
            delayHours: 3,
            description: "Crew issues"
        }
        ];

        const events: SimulationEvent[] = [];
        applyDisruptions(flights, disruptions, events);

        expect(flights[0].delayHours).toBe(3);
        expect(flights[1].delayHours).toBe(0);
        expect(events.length).toBe(1);
        expect(events[0].time).toBe(0);
        expect(events[0].type).toBe("crew");
        expect(events[0].message).toBe("Crew delay on VT-XYZ (+3h)");
    })

})

describe("No Disruptions",()=> {
    it("should not delay flights when no disruptions",()=> {
        const flights: Flight[]= [
            {
                id: "AI101",
                aircraftId: "VT-XYZ",
                from: "BLR",
                to: "BOM",
                departureTime: 8,
                arrivalTime: 10,
                delayHours: 0,
                status: "scheduled"
            },
            {
                id: "AI201",
                aircraftId: "VT-ABC",
                from: "BOM",
                to: "HYD",
                departureTime: 8,
                arrivalTime: 10,
                delayHours: 0,
                status: "scheduled"
            }
        ];

        const disruptions: Disruption[] = [];

        const events: SimulationEvent[] = [];
        applyDisruptions(flights, disruptions, events);

        expect(flights[0].delayHours).toBe(0);
        expect(flights[1].delayHours).toBe(0);
        expect(events.length).toBe(0);
    })

})

describe("Multiple Disruptions",()=> {
    it("should apply multiple disruptions cumulatively",()=> {
        const flights: Flight[]= [
            {
                id: "AI101",
                aircraftId: "VT-XYZ",
                from: "BLR",
                to: "BOM",
                departureTime: 8,
                arrivalTime: 10,
                delayHours: 0,
                status: "scheduled"
            },
            {
                id: "AI201",
                aircraftId: "VT-ABC",
                from: "BOM",
                to: "HYD",
                departureTime: 8,
                arrivalTime: 10,
                delayHours: 0,
                status: "scheduled"
            }
        ];

        const disruptions: Disruption[] = [
        {
            type: "technical",
            aircraftId: "VT-XYZ",
            delayHours: 3,
            description: "Engine failure"
        },

        {
            type: "weather",
            airport: "BLR",
            delayHours: 2,
            description: "Thunderstorm"
        }
        ];

        const events: SimulationEvent[] = [];
        applyDisruptions(flights, disruptions, events);

        expect(flights[0].delayHours).toBe(5);
        expect(flights[1].delayHours).toBe(0);
        expect(events.length).toBe(2);
        expect(events[0].time).toBe(0);
        expect(events[0].type).toBe("technical");
        expect(events[0].message).toBe("Technical disruption on VT-XYZ (+3h)");
        expect(events[1].type).toBe("weather");
        expect(events[1].message).toBe("Weather disruption at BLR (+2h)");
    })

})