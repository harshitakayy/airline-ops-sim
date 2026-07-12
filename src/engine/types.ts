export interface Airport {
    id: string;
    name: string;
    lat: number;
    lng: number;
}

export interface Aircraft {
    id: string;
    currentAirport: string;
    status: "grounded"|"airborne";
    flights: Flight[];
}

export interface Flight {
    id: string;
    aircraftId: string;
    from: string;
    to: string;

    departureTime: number;
    arrivalTime: number;

    delayHours: number;

    status: "scheduled"|"departed"|"landed";
}

export type EventType=
    | "departure"
    | "arrival"
    | "delay"
    | "weather"
    | "crew"
    | "technical";
export interface SimulationEvent {
    time: number;
    type: EventType;
    flightId?: string;
    message: string;
}

export interface SimulationOptions {
    disruptions?: Disruption[];
}

export interface Disruption{
    type: "weather"|"technical"|"crew";
    airport?: string;
    aircraftId?:string;
    delayHours: number;
    description: string;
}