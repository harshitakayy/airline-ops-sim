import {aircrafts, flights} from "./data"

function tick(currentTime: number)
{
    for(const flight of flights)
    {
        if(flight.departureTime===currentTime)
        {
            const aircraft= aircrafts.find(aircraft=>aircraft.id===flight.aircraftId)
            console.log("TIME: "+currentTime);
            if(aircraft)
                aircraft.status="airborne";
            console.log(flight.id+" departed "+flight.from);
        }
        if(flight.arrivalTime===currentTime)
        {
            const aircraft= aircrafts.find(aircraft=>aircraft.id===flight.aircraftId)
            console.log("TIME: "+currentTime);
            if(aircraft)
            {
                aircraft.status="grounded";
                aircraft.currentAirport=flight.to;
            }
            console.log(flight.id+" departed "+flight.from);
        }
    }
}
for(let currentTime=0;currentTime<=24;currentTime++){
    tick(currentTime)
}

console.log(aircrafts);