import type { Airport, Aircraft, Flight } from "./types";
const BOM: Airport = {
    id: "BOM",
    name: "Mumbai",
    lat: 19.0896,
    lng: 72.8656
}

const DEL: Airport = {
    id: "DEL",
    name: "Delhi",
    lat: 28.5810,
    lng: 77.0950
}

const BLR: Airport = {
    id: "BLR",
    name: "Bengaluru",
    lat: 13.0514,
    lng: 77.5935
}

const HYD: Airport = {
    id: "HYD",
    name: "Hyderabad",
    lat: 17.2403,
    lng: 78.4294
}

function createFlights(): Flight[]
{
    const AI101: Flight = {
    id: "AI101",
    aircraftId: "VT-XYZ",
    from: "BLR",
    to: "BOM",
    departureTime: 9,
    arrivalTime: 11,
    delayHours: 2,
    status: "scheduled"
    }

    const AI102: Flight = {
    id: "AI102",
    aircraftId: "VT-ABC",
    from: "BOM",
    to: "BLR",
    departureTime: 12,
    arrivalTime: 14,
    delayHours: 0,
    status: "scheduled"
    }

    const AI103: Flight = {
    id: "AI103",
    aircraftId: "VT-XYZ",
    from: "BOM",
    to: "DEL",
    departureTime: 12,
    arrivalTime: 14,
    delayHours: 0,
    status: "scheduled"
    }

    const AI104: Flight = {
    id: "AI104",
    aircraftId: "VT-XYZ",
    from: "DEL",
    to: "HYD",
    departureTime: 15,
    arrivalTime: 17,
    delayHours: 0,
    status: "scheduled"
    }

    return [AI101,AI102,AI103,AI104];
}

export const flights = createFlights();

function createAircrafts(flights: Flight[]): Aircraft[]
{
    const A320: Aircraft = {
    id: "VT-ABC",
    currentAirport: "BOM",
    status: "grounded",
    lastAvailableTime: 0,
    flights: flights.filter(flight=> flight.aircraftId=="VT-ABC")
    }

    const B737: Aircraft = {
    id: "VT-XYZ",
    currentAirport: "BLR",
    status: "grounded",
    lastAvailableTime: 0,
    flights: flights.filter(flight=> flight.aircraftId=="VT-XYZ")
    }

    return [A320, B737];
}

export const aircrafts= createAircrafts(flights);
export const airports: Airport[]= [BOM, DEL, BLR, HYD];

export function createSimulationData()
{
    const flights = createFlights();
    const aircrafts= createAircrafts(flights);

    return {flights,aircrafts};
}

