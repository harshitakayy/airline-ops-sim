export interface Airport {
    id: string;
    name: string;
    lat: number;
    lng: number;
}

export interface Aircraft {
    id: string;
    currentAirport: string;
    status: "grounded"|"airborne"|"delayed";
}

export interface Flight {
    id: string;
    aircraftId: string;
    from: string;
    to: string;
    departureTime: number;
    arrivalTime: number;
    
}