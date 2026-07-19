import { describe, it, expect} from "vitest";
import { runSimulation } from "./clock";
import type { Flight, Aircraft } from "./types";

describe("Delay Propagation", () =>{
    it("next flight recieves the propagated delay", () =>{
        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            departureTime: 8,
            arrivalTime: 10,
            delayHours: 2,
            status: "scheduled"
        };
        const secondFlight: Flight = {
            id: "TEST102",
            aircraftId: "VT-TEST",
            from: "BOM",
            to: "HYD",
            departureTime: 12,
            arrivalTime: 14,
            delayHours: 0,
            status: "scheduled"
        };
        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight, secondFlight]
        };

        const scenario = {
            flights: [firstFlight, secondFlight],
            aircrafts: [plane]
        };

        const result = runSimulation(scenario);
        const nextFlight=result.flights.find(flight => flight.id=="TEST102");
        expect(nextFlight).toBeDefined();
        expect(nextFlight?.delayHours).toBe(1);
    });

    it("absorbs the delay when sufficient buffer exists", () =>{
        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            departureTime: 8,
            arrivalTime: 10,
            delayHours: 2,
            status: "scheduled"
        };
        const secondFlight: Flight = {
            id: "TEST102",
            aircraftId: "VT-TEST",
            from: "BOM",
            to: "HYD",
            departureTime: 14,
            arrivalTime: 15,
            delayHours: 0,
            status: "scheduled"
        };
        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight, secondFlight]
        };

        const scenario = {
            flights: [firstFlight, secondFlight],
            aircrafts: [plane]
        };

        const result = runSimulation(scenario);
        const nextFlight=result.flights.find(flight => flight.id=="TEST102");
        expect(nextFlight).toBeDefined();
        expect(nextFlight?.delayHours).toBe(0);
    });

    it("delay cascades through several connected flights and is eventually absorbed by schedule buffer", () =>{
        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            departureTime: 8,
            arrivalTime: 10,
            delayHours: 2,
            status: "scheduled"
        };
        const secondFlight: Flight = {
            id: "TEST102",
            aircraftId: "VT-TEST",
            from: "BOM",
            to: "HYD",
            departureTime: 12,
            arrivalTime: 14,
            delayHours: 0,
            status: "scheduled"
        };
        const thirdFlight: Flight = {
            id: "TEST103",
            aircraftId: "VT-TEST",
            from: "HYD",
            to: "BLR",
            departureTime: 15,
            arrivalTime: 16,
            delayHours: 0,
            status: "scheduled"
        };
        const fourthFlight: Flight = {
            id: "TEST104",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "DEL",
            departureTime: 17,
            arrivalTime: 18,
            delayHours: 0,
            status: "scheduled"
        };
        const fifthFlight: Flight = {
            id: "TEST105",
            aircraftId: "VT-TEST",
            from: "DEL",
            to: "HYD",
            departureTime: 21,
            arrivalTime: 22,
            delayHours: 0,
            status: "scheduled"
        };
        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight, secondFlight, thirdFlight, fourthFlight, fifthFlight]
        };

        const scenario = {
            flights: [firstFlight, secondFlight, thirdFlight, fourthFlight, fifthFlight],
            aircrafts: [plane]
        };

        const result = runSimulation(scenario);
        const delays = result.flights.map(flight => flight.delayHours);
        expect(delays).toEqual([2, 1, 1, 1, 0]);
    });

    it("independent aircraft rotations", () =>{
        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST1",
            from: "BLR",
            to: "BOM",
            departureTime: 8,
            arrivalTime: 10,
            delayHours: 2,
            status: "scheduled"
        };
        const secondFlight: Flight = {
            id: "TEST102",
            aircraftId: "VT-TEST1",
            from: "BOM",
            to: "HYD",
            departureTime: 12,
            arrivalTime: 14,
            delayHours: 0,
            status: "scheduled"
        };
        const thirdFlight: Flight = {
            id: "TEST103",
            aircraftId: "VT-TEST2",
            from: "HYD",
            to: "BLR",
            departureTime: 15,
            arrivalTime: 16,
            delayHours: 0,
            status: "scheduled"
        };
        const plane1: Aircraft = {
            id: "VT-TEST1",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight, secondFlight]
        };

        const plane2: Aircraft = {
            id: "VT-TEST2",
            currentAirport: "HYD",
            status: "grounded",
            flights: [thirdFlight]
        };

        const scenario = {
            flights: [firstFlight, secondFlight, thirdFlight],
            aircrafts: [plane1, plane2]
        };

        const result = runSimulation(scenario);
        const nextFlight=result.flights.find(flight => flight.id=="TEST103");
        expect(nextFlight).toBeDefined();
        expect(nextFlight?.delayHours).toBe(0);
        expect(nextFlight?.status).toBe("landed");
    });
});

describe("Aircraft location enforcement", () =>{
    it("prevents departure when aircraft is at the wrong airport", () =>{
        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BOM",
            to: "HYD",
            departureTime: 8,
            arrivalTime: 10,
            delayHours: 2,
            status: "scheduled"
        };
        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight]
        };

        const scenario = {
            flights: [firstFlight],
            aircrafts: [plane]
        };

        
        const result = runSimulation(scenario);
        const nextFlight=result.flights.find(flight => flight.id=="TEST101");
        const nextPlane=result.aircrafts.find(aircraft => aircraft.id=="VT-TEST");
        expect(nextFlight?.status).toBe("scheduled");
        expect(nextPlane?.currentAirport).toBe("BLR");
    });
});

describe("Simulation events", () => {
    it("records departure and arrival events", () => {
        const flight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            departureTime: 8,
            arrivalTime: 10,
            delayHours: 0,
            status: "scheduled"
        };
        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [flight]
        };

        const scenario = {
            flights: [flight],
            aircrafts: [plane]
        };

        const result = runSimulation(scenario);
        expect(result.events).toEqual([
        {
            time: 8,
            type: "departure",
            flightId: "TEST101",
            message: "TEST101 departed BLR"
        },
        {
            time: 10,
            type: "arrival",
            flightId: "TEST101",
            message: "TEST101 landed BOM"
        }
    ]);
    });
});


describe("Flight cancellation", () => {
    it("should cancel a flight whose delay exceeds the threshold at departure times", () => {
        const flight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            departureTime: 8,
            arrivalTime: 10,
            delayHours: 6,
            status: "scheduled"
        };
        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [flight]
        };

        const scenario = {
            flights: [flight],
            aircrafts: [plane]
        };

        const result = runSimulation(scenario);
        expect(result.events.some(event=> event.type==="cancellation")).toBe(true);
        expect(result.events.some(event=> event.type==="departure")).toBe(false);
        expect(result.flights[0].status).toBe("cancelled");
        expect(result.events[0].type).toBe("cancellation");
    });

    it("should keep the aircraft at the origin airport after cancellation", () => {
        const flight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            departureTime: 8,
            arrivalTime: 10,
            delayHours: 6,
            status: "scheduled"
        };
        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [flight]
        };

        const scenario = {
            flights: [flight],
            aircrafts: [plane]
        };

        const result = runSimulation(scenario);
        expect(result.aircrafts[0].currentAirport).toBe("BLR");
        expect(result.aircrafts[0].status).toBe("grounded");
    });

    it("should block the next flight after cancellation", () => {
        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            departureTime: 8,
            arrivalTime: 10,
            delayHours: 6,
            status: "scheduled"
        };
        const secondFlight: Flight = {
            id: "TEST102",
            aircraftId: "VT-TEST",
            from: "BOM",
            to: "DEL",
            departureTime: 11,
            arrivalTime: 14,
            delayHours: 0,
            status: "scheduled"
        };
        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight, secondFlight]
        };

        const scenario = {
            flights: [firstFlight, secondFlight],
            aircrafts: [plane]
        };

        const result = runSimulation(scenario);

        expect(result.aircrafts[0].currentAirport).toBe("BLR");
        expect(result.aircrafts[0].status).toBe("grounded");
        expect(result.flights[1].status).toBe("cancelled");
        expect(result.events.some(event=>(event.flightId==="TEST102" && event.type==="cancellation"))).toBe(true);
    });

    it("should delay the next flight when the previous flight lands late", () => {
        const firstFlight: Flight = {
            id: "TEST101",
            aircraftId: "VT-TEST",
            from: "BLR",
            to: "BOM",
            departureTime: 8,
            arrivalTime: 10,
            delayHours: 2,
            status: "scheduled"
        };
        const secondFlight: Flight = {
            id: "TEST102",
            aircraftId: "VT-TEST",
            from: "BOM",
            to: "DEL",
            departureTime: 11,
            arrivalTime: 14,
            delayHours: 0,
            status: "scheduled"
        };
        const plane: Aircraft = {
            id: "VT-TEST",
            currentAirport: "BLR",
            status: "grounded",
            flights: [firstFlight, secondFlight]
        };

        const scenario = {
            flights: [firstFlight, secondFlight],
            aircrafts: [plane]
        };

        const result = runSimulation(scenario);

        expect(result.aircrafts[0].currentAirport).toBe("DEL");
        expect(result.aircrafts[0].status).toBe("grounded");
        expect(result.flights[1].status).toBe("landed");
        expect(result.flights[1].delayHours).toBe(2);
        expect(result.events.some(event=>(event.flightId==="TEST102" && event.type==="departure"))).toBe(true);
    });

});