import { createSimulationData } from "./data";
import type { Flight, Aircraft, SimulationEvent, SimulationOptions, Disruption } from "./types";
import { applyDisruptions } from "./disruptions";

function getAircraft(flight: Flight, aircrafts: Aircraft[]): Aircraft | undefined 
{
    return aircrafts.find(aircraft => aircraft.id === flight.aircraftId);
}

function getPreviousFlight(aircraft: Aircraft, currentFlight: Flight): Flight | undefined
{
    const currentIndex = aircraft.flights.findIndex(rotationFlight => rotationFlight.id === currentFlight.id);
    if(currentIndex <=0)
        return undefined;

    return aircraft.flights[currentIndex-1];
}

const CANCELLATION_THRESHOLD = 6;

function handleCancellation(flight: Flight, currentTime: number, events: SimulationEvent[])
{
    if(flight.status!=="scheduled")
        return;
    if(currentTime!==flight.departureTime)
        return;
    if(flight.delayHours<CANCELLATION_THRESHOLD)
        return;
    flight.status="cancelled";
    events.push({
        time: currentTime,
        type:"cancellation",
        flightId:flight.id,
        message: `${flight.id} cancelled: delay exceeded threshold`
    });
}

function handleDeparture(flight: Flight, aircraft: Aircraft, currentTime: number, events: SimulationEvent[]) 
{
    if (flight.status !== "scheduled")
        return;
    const turnAroundTime=1;
    const previousFlight= getPreviousFlight(aircraft, flight);

    let actualDepartureTime= flight.departureTime + flight.delayHours;
    if(previousFlight !== undefined)
    {
        if (previousFlight.status === "cancelled") {
        flight.status = "cancelled";
        events.push({
            time: currentTime,
            type: "cancellation",
            flightId: flight.id,
            message: `${flight.id} cancelled: aircraft unavailable`
        });
        return;
    }

    if (previousFlight.status !== "landed") 
        return;
    const earliestAvailableTime= previousFlight.arrivalTime + previousFlight.delayHours + turnAroundTime;
    actualDepartureTime= Math.max(earliestAvailableTime, actualDepartureTime);
    }
    
    const propagatedDelay= actualDepartureTime- flight.departureTime;
    if(propagatedDelay> flight.delayHours)
    {
        flight.delayHours= propagatedDelay;
        events.push({
            time: currentTime,
            type: "delay",
            flightId: flight.id,
            message: `${flight.id} delayed by ${flight.delayHours} hour(s)`
        });
        /*console.log(`${flight.id} delayed by ${flight.delayHours} hour(s)`);*/
    }
    if (actualDepartureTime !== currentTime)
        return;
    if (aircraft.currentAirport !== flight.from)
        return;
    if(aircraft.status !=="grounded")
        return;

    flight.status= "departed";
    aircraft.status= "airborne";

    events.push({
        time: currentTime,
        type: "departure",
        flightId: flight.id,
        message: `${flight.id} departed ${flight.from}`
    });

    /*console.log(`TIME: ${currentTime}`);
    console.log(`${flight.id} departed ${flight.from}`);*/
}

function handleArrival(flight: Flight, aircraft: Aircraft, currentTime: number, events: SimulationEvent[]) 
{
    const actualArrivalTime= flight.arrivalTime + flight.delayHours;
    if (flight.status !== "departed")
        return;
    if (actualArrivalTime !== currentTime)
        return;
    flight.status = "landed";

    aircraft.status = "grounded";
    aircraft.currentAirport = flight.to;

    events.push({
        time: currentTime,
        type: "arrival",
        flightId: flight.id,
        message: `${flight.id} landed ${flight.to}`
    });


    /*console.log(`TIME: ${currentTime}`);
    console.log(`${flight.id} landed ${flight.to}`);*/
}

function tick(currentTime: number, flights: Flight[], aircrafts: Aircraft[], events: SimulationEvent[]) 
{
    for (const flight of flights) 
    {
        const aircraft = getAircraft(flight,aircrafts);
        if (!aircraft)
            continue;
        handleCancellation(flight, currentTime, events);
        handleDeparture(flight, aircraft, currentTime, events);
        handleArrival(flight, aircraft, currentTime, events);
    }
}

export function runSimulation(data= createSimulationData(), options?: SimulationOptions): {flights: Flight[]; aircrafts: Aircraft[]; events: SimulationEvent[]}
{
    let disruptions: Disruption[]= [];
    if (options?.disruptions) 
        disruptions = options.disruptions;
    const events: SimulationEvent[] = [];
    applyDisruptions(data.flights, disruptions, events);
    for (let currentTime = 0; currentTime <= 24; currentTime++) 
    {
        tick(currentTime, data.flights, data.aircrafts, events);
    }

    return {flights: data.flights, aircrafts: data.aircrafts ,events};
}

/*const result= runSimulation();

console.log("FINAL AIRCRAFT STATE");
console.log(result.aircrafts);

console.log("EVENTS");
console.table(result.events);*/
