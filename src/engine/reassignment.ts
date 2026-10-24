
import type { Flight, Aircraft } from "./types";

function sortFlightsByDeparture(flights: Flight[]): Flight[] {
    return flights.sort(
        (a, b) =>
            new Date(a.scheduledDeparture).getTime() -
            new Date(b.scheduledDeparture).getTime()
    );
}

export function reassignFlight(
    flight: Flight,
    oldAircraft: Aircraft,
    newAircraft: Aircraft
): void {
    if (oldAircraft.id === newAircraft.id) {
        return;
    }

    oldAircraft.flights = oldAircraft.flights.filter(
        (assignedFlight) => assignedFlight.id !== flight.id
    );

    newAircraft.flights = newAircraft.flights.filter(
        (assignedFlight) => assignedFlight.id !== flight.id
    );

    flight.aircraftId = newAircraft.id;

    newAircraft.flights.push(flight);

    sortFlightsByDeparture(oldAircraft.flights);
    sortFlightsByDeparture(newAircraft.flights);
}
