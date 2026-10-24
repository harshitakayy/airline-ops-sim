import { createSimulationData } from "./data";
import type {
    Flight,
    Aircraft,
    SimulationEvent,
    SimulationOptions,
    Disruption,
    SimulationData
} from "./types";
import { applyDisruptions } from "./disruptions";
import { calculateMetrics } from "./metrics";
import { calculateFinancialImpact } from "./financial";
import { reassignFlight } from "./reassignment";
import { canAircraftOperateFlight } from "./feasibility";

function getAircraft(
    flight: Flight,
    aircrafts: Aircraft[]
): Aircraft | undefined {
    return aircrafts.find(aircraft => aircraft.id === flight.aircraftId);
}

function getPreviousFlight(
    aircraft: Aircraft,
    currentFlight: Flight
): Flight | undefined {
    const currentIndex = aircraft.flights.findIndex(
        rotationFlight => rotationFlight.id === currentFlight.id
    );

    if (currentIndex <= 0) {
        return undefined;
    }

    return aircraft.flights[currentIndex - 1];
}

const CANCELLATION_THRESHOLD = 360;
const TURNAROUND_TIME = 60;

function addMinutes(dateString: string, minutes: number): Date {
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() + minutes);
    return date;
}

function getActualDepartureTime(flight: Flight): Date {
    return addMinutes(flight.scheduledDeparture, flight.delayMinutes);
}

function getActualArrivalTime(flight: Flight): Date {
    return addMinutes(flight.scheduledArrival, flight.delayMinutes);
}

function handleCancellation(
    flight: Flight,
    currentTime: Date,
    events: SimulationEvent[]
) {
    if (flight.status !== "scheduled") {
        return;
    }

    const scheduledDeparture = new Date(flight.scheduledDeparture);

    if (currentTime.getTime() < scheduledDeparture.getTime()) {
        return;
    }

    if (flight.delayMinutes < CANCELLATION_THRESHOLD) {
        return;
    }

    flight.status = "cancelled";

    events.push({
        time: currentTime.toISOString(),
        type: "cancellation",
        flightId: flight.id,
        message: `${flight.id} cancelled: delay exceeded threshold`
    });
}

function handleDeparture(
    flight: Flight,
    aircraft: Aircraft,
    currentTime: Date,
    events: SimulationEvent[]
) {
    if (flight.status !== "scheduled") {
        return;
    }

    const previousFlight = getPreviousFlight(aircraft, flight);
    let actualDepartureTime = getActualDepartureTime(flight);

    if (previousFlight !== undefined) {
        if (previousFlight.status === "cancelled") {
            flight.status = "cancelled";

            events.push({
                time: currentTime.toISOString(),
                type: "cancellation",
                flightId: flight.id,
                message: `${flight.id} cancelled: aircraft unavailable`
            });

            return;
        }

        if (previousFlight.status !== "landed") {
            return;
        }

        const previousArrivalTime = getActualArrivalTime(previousFlight);
        const earliestAvailableTime = new Date(
            previousArrivalTime.getTime() + TURNAROUND_TIME * 60 * 1000
        );

        if (earliestAvailableTime.getTime() > actualDepartureTime.getTime()) {
            actualDepartureTime = earliestAvailableTime;
        }
    }

    const scheduledDeparture = new Date(flight.scheduledDeparture);
    const propagatedDelay = Math.round(
        (actualDepartureTime.getTime() - scheduledDeparture.getTime()) / 60000
    );

    if (propagatedDelay > flight.delayMinutes) {
        flight.delayMinutes = propagatedDelay;

        events.push({
            time: currentTime.toISOString(),
            type: "delay",
            flightId: flight.id,
            message: `${flight.id} delayed by ${flight.delayMinutes} minute(s)`
        });
    }

    if (actualDepartureTime.getTime() !== currentTime.getTime()) {
        return;
    }

    if (aircraft.currentAirport !== flight.from) {
        return;
    }

    if (aircraft.status !== "grounded") {
        return;
    }

    flight.status = "departed";
    aircraft.status = "airborne";

    events.push({
        time: currentTime.toISOString(),
        type: "departure",
        flightId: flight.id,
        message: `${flight.id} departed ${flight.from}`
    });
}

function handleArrival(
    flight: Flight,
    aircraft: Aircraft,
    currentTime: Date,
    events: SimulationEvent[]
) {
    if (flight.status !== "departed") {
        return;
    }

    const actualArrivalTime = getActualArrivalTime(flight);

    if (actualArrivalTime.getTime() !== currentTime.getTime()) {
        return;
    }

    flight.status = "landed";
    aircraft.status = "grounded";
    aircraft.currentAirport = flight.to;

    events.push({
        time: currentTime.toISOString(),
        type: "arrival",
        flightId: flight.id,
        message: `${flight.id} landed ${flight.to}`
    });
}

function tick(
    currentTime: Date,
    flights: Flight[],
    aircrafts: Aircraft[],
    events: SimulationEvent[]
) {
    for (const flight of flights) {
        const aircraft = getAircraft(flight, aircrafts);

        if (!aircraft) {
            continue;
        }

        handleCancellation(flight, currentTime, events);
        handleDeparture(flight, aircraft, currentTime, events);
        handleArrival(flight, aircraft, currentTime, events);
    }
}

function applyDelayOverrides(
    flights: Flight[],
    overrides: NonNullable<SimulationOptions["flightDelayOverrides"]>
) {
    for (const override of overrides) {
        if (!Number.isFinite(override.delayMinutes) || override.delayMinutes < 0) {
            throw new Error(`Invalid delay override for flight ${override.flightId}`);
        }

        const flight = flights.find(item => item.id === override.flightId);

        if (!flight) {
            throw new Error(`Flight not found for delay override: ${override.flightId}`);
        }

        flight.delayMinutes = override.delayMinutes;
    }
}

export async function runSimulation(
    data?: SimulationData,
    options: SimulationOptions = {}
) {
    const simulationData = data ?? await createSimulationData();

    const events: SimulationEvent[] = [];

    if (options.flightDelayOverrides) {
        applyDelayOverrides(simulationData.flights, options.flightDelayOverrides);
    }

    if (options.cancelledFlights) {
        for (const flightId of options.cancelledFlights) {
            const flight = simulationData.flights.find(item => item.id === flightId);

            if (!flight) {
                throw new Error(`Flight not found for cancellation: ${flightId}`);
            }

            if (flight.status !== "cancelled") {
                flight.status = "cancelled";
                events.push({
                    time: new Date().toISOString(),
                    type: "cancellation",
                    flightId,
                    message: `${flightId} cancelled by scenario`
                });
            }
        }
    }

    if (options.aircraftReassignments) {
        for (const reassignment of options.aircraftReassignments) {
            const flight = simulationData.flights.find(
                item => item.id === reassignment.flightId
            );
            const newAircraft = simulationData.aircrafts.find(
                aircraft => aircraft.id === reassignment.aircraftId
            );

            if (!flight || !newAircraft || flight.status !== "scheduled") {
                continue;
            }

            const oldAircraft = simulationData.aircrafts.find(
                aircraft => aircraft.id === flight.aircraftId
            );

            if (!oldAircraft || oldAircraft.id === newAircraft.id) {
                continue;
            }

            if (!canAircraftOperateFlight(newAircraft, flight)) {
                continue;
            }

            const oldAircraftId = flight.aircraftId;

            reassignFlight(flight, oldAircraft, newAircraft);

            events.push({
                time: new Date().toISOString(),
                type: "reassignment",
                flightId: flight.id,
                message: `${flight.id} reassigned from ${oldAircraftId} to ${newAircraft.id}`
            });
        }
    }

    const disruptions: Disruption[] = options.disruptions ?? [];
    applyDisruptions(simulationData.flights, disruptions, events);

    const startTimes = simulationData.flights.map(
        flight => new Date(flight.scheduledDeparture).getTime()
    );
    const endTimes = simulationData.flights.map(
        flight => new Date(flight.scheduledArrival).getTime()
    );

    if (simulationData.flights.length > 0) {
        const startTime = new Date(Math.min(...startTimes));
        const endTime = new Date(Math.max(...endTimes) + 24 * 60 * 60 * 1000);
        const currentTime = new Date(startTime);

        while (currentTime <= endTime) {
            tick(currentTime, simulationData.flights, simulationData.aircrafts, events);
            currentTime.setMinutes(currentTime.getMinutes() + 1);
        }
    }

    const metrics = calculateMetrics(simulationData.flights, simulationData.aircrafts);
    const financialImpact = calculateFinancialImpact(
        simulationData.flights,
        options.costAssumptions
    );

    return {
        flights: simulationData.flights,
        aircrafts: simulationData.aircrafts,
        events,
        metrics,
        financialImpact
    };
}
