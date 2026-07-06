import { aircrafts, flights } from "./data";
import type { Flight, Aircraft } from "./types";

function getAircraft(flight: Flight): Aircraft | undefined 
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

function handleDeparture(flight: Flight, aircraft: Aircraft, currentTime: number) 
{
    const turnAroundTime=1;
    const previousFlight= getPreviousFlight(aircraft, flight);

    let actualDepartureTime= flight.departureTime + flight.delayHours;
    if(previousFlight !== undefined)
    {
        const earliestAvailableTime= previousFlight.arrivalTime + previousFlight.delayHours + turnAroundTime;
        actualDepartureTime= Math.max(earliestAvailableTime, actualDepartureTime);
    }
    
    const propagatedDelay= actualDepartureTime- flight.departureTime;
    if(propagatedDelay> flight.delayHours)
    {
        flight.delayHours= propagatedDelay;
        console.log(`${flight.id} delayed by ${flight.delayHours} hour(s)`);
    }
    if (flight.status !== "scheduled")
        return;
    if (actualDepartureTime !== currentTime)
        return;
    if(aircraft.currentAirport !== flight.from)
        return;
    if(aircraft.status !=="grounded")
        return;

    flight.status= "departed";
    aircraft.status= "airborne";

    console.log(`TIME: ${currentTime}`);
    console.log(`${flight.id} departed ${flight.from}`);
}

function handleArrival(flight: Flight, aircraft: Aircraft, currentTime: number) 
{
    const actualArrivalTime= flight.arrivalTime + flight.delayHours;
    if (flight.status !== "departed")
        return;
    if (actualArrivalTime !== currentTime)
        return;
    flight.status = "landed";

    aircraft.status = "grounded";
    aircraft.currentAirport = flight.to;

    console.log(`TIME: ${currentTime}`);
    console.log(`${flight.id} landed ${flight.to}`);
}

function tick(currentTime: number) 
{
    for (const flight of flights) 
    {
        const aircraft = getAircraft(flight);
        if (!aircraft)
            continue;

        handleDeparture(flight, aircraft, currentTime);
        handleArrival(flight, aircraft, currentTime);
    }
}

for (let currentTime = 0; currentTime <= 24; currentTime++) 
{
    tick(currentTime);
}

console.log("FINAL AIRCRAFT STATE");
console.log(aircrafts);