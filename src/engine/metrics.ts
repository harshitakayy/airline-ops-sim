import type { Flight, Aircraft, SimulationMetrics } from "./types";

export function calculateMetrics(flights: Flight[], aircrafts: Aircraft[]): SimulationMetrics {
    const cancelledFlights = flights.filter(flight => flight.status === "cancelled").length;
    const onTimeFlights = flights.filter(flight => flight.delayMinutes === 0 && flight.status !== "cancelled").length;
    const delayedFlights = flights.filter(flight => flight.delayMinutes > 0 && flight.status !== "cancelled").length;

    const totalDelay = flights.reduce((sum, flight) => sum + flight.delayMinutes, 0);
    const averageDelay = flights.length > 0 ? totalDelay / flights.length: 0;

    let totalFlyingMinutes = 0;
    for (const flight of flights) {
        if (flight.status !== "landed")
            continue;

        const departure = new Date(flight.scheduledDeparture);

        const arrival = new Date(flight.scheduledArrival);

        const flyingMinutes =(arrival.getTime() - departure.getTime())/ (60 * 1000);

        totalFlyingMinutes += flyingMinutes;
    }

    const totalSimulationMinutes =flights.length > 0? Math.max(...flights.map(flight =>new Date(flight.scheduledArrival).getTime())) -
            Math.min(...flights.map(flight =>new Date(flight.scheduledDeparture).getTime())
            ): 0;

    const aircraftUtilization =totalSimulationMinutes > 0 && aircrafts.length > 0
            ? (totalFlyingMinutes /(totalSimulationMinutes * aircrafts.length)) * 100: 0;

    return {
        averageDelay,
        onTimeFlights,
        delayedFlights,
        cancelledFlights,
        aircraftUtilization
    };
}