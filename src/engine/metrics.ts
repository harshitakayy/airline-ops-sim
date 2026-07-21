import type { Flight, Aircraft, SimulationMetrics } from "./types";

export function calculateMetrics(flights: Flight[], aircrafts: Aircraft[]): SimulationMetrics {
    const cancelledFlights = flights.filter(flight => flight.status === "cancelled").length;
    const onTimeFlights = flights.filter(flight => flight.delayHours === 0 && flight.status !== "cancelled").length;
    const delayedFlights = flights.filter(flight => flight.delayHours > 0 && flight.status !== "cancelled").length;

    const totalDelay = flights.reduce((sum, flight) => sum + flight.delayHours, 0);
    const averageDelay = totalDelay / flights.length;

    let totalFlyingHours = 0;
    for (const flight of flights) {
        if (flight.status !== "cancelled") {
            totalFlyingHours += (flight.arrivalTime - flight.departureTime);
        }
    }
    const aircraftUtilization =(totalFlyingHours / (24 * aircrafts.length)) * 100;

    return {
    averageDelay,
    onTimeFlights,
    delayedFlights,
    cancelledFlights,
    aircraftUtilization
    };
}