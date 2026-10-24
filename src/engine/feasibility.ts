
import type { Flight, Aircraft } from "./types";

const TURNAROUND_TIME = 60;

function getActualArrivalTime(flight: Flight): Date {
    const arrival = new Date(flight.scheduledArrival);

    arrival.setMinutes(
        arrival.getMinutes() + flight.delayMinutes
    );

    return arrival;
}

function getScheduledDepartureTime(flight: Flight): number {
    return new Date(flight.scheduledDeparture).getTime();
}

function isActiveFlight(flight: Flight): boolean {
    return flight.status !== "cancelled";
}

export function getAircraftAvailableTime(
    aircraft: Aircraft,
    beforeDeparture?: Date
): Date | null {
    const beforeTime = beforeDeparture?.getTime();

    const relevantFlights = aircraft.flights.filter((flight) => {
        if (!isActiveFlight(flight)) {
            return false;
        }

        if (beforeTime === undefined) {
            return true;
        }

        return getScheduledDepartureTime(flight) < beforeTime;
    });

    if (relevantFlights.length === 0) {
        return null;
    }

    const lastFlight = relevantFlights.reduce((latest, current) => {
        return getScheduledDepartureTime(current) >
            getScheduledDepartureTime(latest)
            ? current
            : latest;
    });

    const availableTime = getActualArrivalTime(lastFlight);

    availableTime.setMinutes(
        availableTime.getMinutes() + TURNAROUND_TIME
    );

    return availableTime;
}

export function canAircraftOperateFlight(
    aircraft: Aircraft,
    flight: Flight
): boolean {

    const targetDeparture = new Date(flight.scheduledDeparture);
    const targetArrival = getActualArrivalTime(flight);

    if (
        Number.isNaN(targetDeparture.getTime()) ||
        Number.isNaN(targetArrival.getTime()) ||
        !Number.isFinite(flight.delayMinutes) ||
        flight.delayMinutes < 0
    ) {
        return false;
    }

    const otherFlights = aircraft.flights.filter(
        (assignedFlight) =>
            assignedFlight.id !== flight.id &&
            isActiveFlight(assignedFlight)
    );

    const targetDepartureTime = targetDeparture.getTime();

    const previousFlights = otherFlights
        .filter(
            (assignedFlight) =>
                getScheduledDepartureTime(assignedFlight) <
                targetDepartureTime
        )
        .sort(
            (a, b) =>
                getScheduledDepartureTime(b) -
                getScheduledDepartureTime(a)
        );

    const nextFlights = otherFlights
        .filter(
            (assignedFlight) =>
                getScheduledDepartureTime(assignedFlight) >=
                targetDepartureTime
        )
        .sort(
            (a, b) =>
                getScheduledDepartureTime(a) -
                getScheduledDepartureTime(b)
        );

    const previousFlight = previousFlights[0];

    if (previousFlight) {
        if (previousFlight.to !== flight.from) {
            return false;
        }

        const availableTime = getAircraftAvailableTime(
            aircraft,
            targetDeparture
        );

        if (
            availableTime === null ||
            availableTime.getTime() > targetDepartureTime
        ) {
            return false;
        }
    } else if (aircraft.currentAirport !== flight.from) {
        return false;
    }

    const nextFlight = nextFlights[0];

    if (nextFlight) {
        if (flight.to !== nextFlight.from) {
            return false;
        }

        const nextDeparture = new Date(
            nextFlight.scheduledDeparture
        );

        const targetAvailableTime = new Date(targetArrival);

        targetAvailableTime.setMinutes(
            targetAvailableTime.getMinutes() + TURNAROUND_TIME
        );

        if (
            Number.isNaN(nextDeparture.getTime()) ||
            targetAvailableTime.getTime() > nextDeparture.getTime()
        ) {
            return false;
        }
    }

    return true;
}
