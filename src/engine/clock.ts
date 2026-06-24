import { aircrafts, flights } from "./data";
import type { Flight, Aircraft } from "./types";

function getAircraft(flight: Flight): Aircraft | undefined {
    return aircrafts.find(
        aircraft => aircraft.id === flight.aircraftId
    );
}

function handleDeparture(
    flight: Flight,
    aircraft: Aircraft,
    currentTime: number
) {
    const actualDepartureTime =
        flight.departureTime + flight.delayHours;

    if (flight.status !== "scheduled")
        return;

    if (actualDepartureTime !== currentTime)
        return;

    flight.status = "departed";
    aircraft.status = "airborne";

    console.log(`TIME: ${currentTime}`);
    console.log(`${flight.id} departed ${flight.from}`);
}

function handleArrival(
    flight: Flight,
    aircraft: Aircraft,
    currentTime: number
) {
    const actualArrivalTime =
        flight.arrivalTime + flight.delayHours;

    if (flight.status !== "departed")
        return;

    if (actualArrivalTime !== currentTime)
        return;

    flight.status = "landed";

    aircraft.status = "grounded";
    aircraft.currentAirport = flight.to;
    aircraft.lastAvailableTime = actualArrivalTime + 1;

    console.log(`TIME: ${currentTime}`);
    console.log(`${flight.id} landed ${flight.to}`);
}

function tick(currentTime: number) {
    for (const flight of flights) {
        const aircraft = getAircraft(flight);

        if (!aircraft)
            continue;

        handleDeparture(
            flight,
            aircraft,
            currentTime
        );

        handleArrival(
            flight,
            aircraft,
            currentTime
        );
    }
}

for (let currentTime = 0; currentTime <= 24; currentTime++) {
    tick(currentTime);
}

console.log("FINAL AIRCRAFT STATE");
console.log(aircrafts);