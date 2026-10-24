export interface Airport {
    id: string;
    name: string;
    lat: number;
    lng: number;
}

export interface Aircraft {
    id: string;
    currentAirport: string;
    status: "grounded" | "airborne";
    flights: Flight[];
}

export type FlightStatus =
    | "scheduled"
    | "departed"
    | "landed"
    | "cancelled";

export interface Flight {
    id: string;
    aircraftId: string;
    from: string;
    to: string;
    scheduledDeparture: string;
    scheduledArrival: string;
    delayMinutes: number;
    status: FlightStatus;
}

export type EventType =
    | "departure"
    | "arrival"
    | "delay"
    | "cancellation"
    | "reassignment"
    | "weather"
    | "crew"
    | "technical";

export interface SimulationEvent {
    time: string;
    type: EventType;
    flightId?: string;
    message: string;
}

export interface FlightDelayOverride {
    flightId: string;
    delayMinutes: number;
}

export interface SimulationOptions {
    disruptions?: Disruption[];
    costAssumptions?: CostAssumptions;
    cancelledFlights?: string[];
    aircraftReassignments?: AircraftReassignment[];
    flightDelayOverrides?: FlightDelayOverride[];
}

export interface AircraftReassignment {
    flightId: string;
    aircraftId: string;
}

export interface Disruption {
    type: "weather" | "technical" | "crew";
    airport?: string;
    aircraftId?: string;
    delayMinutes: number;
    description: string;
}

export interface SimulationMetrics {
    averageDelay: number;
    onTimeFlights: number;
    delayedFlights: number;
    cancelledFlights: number;
    aircraftUtilization: number;
}

export interface SimulationData {
    flights: Flight[];
    aircrafts: Aircraft[];
}

export interface CostAssumptions {
    delayCostPerMinute: number;
    cancellationCost: number;
}

export interface FinancialImpact {
    delayCost: number;
    cancellationCost: number;
    totalEstimatedLoss: number;
}

export interface SimulationScenario {
    id: string;
    name: string;
    options: SimulationOptions;
}

export interface ScenarioResult {
    scenario: SimulationScenario;
    flights: Flight[];
    aircrafts: Aircraft[];
    metrics: SimulationMetrics;
    financialImpact: FinancialImpact;
}

export interface ScenarioComparison {
    results: ScenarioResult[];
    bestScenarioId: string;
}
