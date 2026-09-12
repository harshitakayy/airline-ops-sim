import type { Disruption, Flight, SimulationEvent } from "./types";

function applyWeather(
    flights: Flight[],
    disruption: Disruption,
    events: SimulationEvent[]
) {
    events.push({
        time: new Date().toISOString(),
        type: "weather",
        message: `Weather disruption at ${disruption.airport} (+${disruption.delayMinutes} min)`
    });

    for (const flight of flights) {
        if (flight.from === disruption.airport) {
            flight.delayMinutes += disruption.delayMinutes;
        }
    }
}

function applyCrew(
    flights: Flight[],
    disruption: Disruption,
    events: SimulationEvent[]
) {
    events.push({
        time: new Date().toISOString(),
        type: "crew",
        message: `Crew delay on ${disruption.aircraftId} (+${disruption.delayMinutes} min)`
    });

    for (const flight of flights) {
        if (flight.aircraftId === disruption.aircraftId) {
            flight.delayMinutes += disruption.delayMinutes;
        }
    }
}

function applyTechnical(
    flights: Flight[],
    disruption: Disruption,
    events: SimulationEvent[]
) {
    events.push({
        time: new Date().toISOString(),
        type: "technical",
        message: `Technical disruption on ${disruption.aircraftId} (+${disruption.delayMinutes} min)`
    });

    for (const flight of flights) {
        if (flight.aircraftId === disruption.aircraftId) {
            flight.delayMinutes += disruption.delayMinutes;
        }
    }
}

export function applyDisruptions(
    flights: Flight[],
    disruptions: Disruption[],
    events: SimulationEvent[]
) {
    for (const disruption of disruptions) {
        switch (disruption.type) {
            case "weather":
                applyWeather(flights, disruption, events);
                break;

            case "crew":
                applyCrew(flights, disruption, events);
                break;

            case "technical":
                applyTechnical(flights, disruption, events);
                break;
        }
    }
}