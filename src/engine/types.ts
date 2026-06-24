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
    lastAvailableTime: number;
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