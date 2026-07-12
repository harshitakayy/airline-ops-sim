import type { Disruption, Flight, SimulationEvent} from "./types";

function applyWeather(flights: Flight[],disruption: Disruption,events: SimulationEvent[])
{
    events.push({
        time:0,
        type:"weather",
        message: `Weather disruption at ${disruption.airport} (+${disruption.delayHours}h)`
    });
    for(const flight of flights){   
        if(flight.from===disruption.airport)
            flight.delayHours+=disruption.delayHours;

    }
}

function applyCrew(flights: Flight[],disruption: Disruption,events: SimulationEvent[])
{
    events.push({
        time:0,
        type:"crew",
        message: `Crew delay on ${disruption.aircraftId} (+${disruption.delayHours}h)`
    });
    for(const flight of flights){   
        if(flight.aircraftId===disruption.aircraftId)
            flight.delayHours+=disruption.delayHours;
    }
}

function applyTechnical(flights: Flight[],disruption: Disruption,events: SimulationEvent[])
{
    events.push({
        time:0,
        type:"technical",
        message: `Technical disruption on ${disruption.aircraftId} (+${disruption.delayHours}h)`
    });
    for(const flight of flights){   
        if(flight.aircraftId===disruption.aircraftId)
            flight.delayHours+=disruption.delayHours;
    }
}

export function applyDisruptions(flights: Flight[],disruptions: Disruption[], events: SimulationEvent[]) {
    for (const disruption of disruptions) {
        switch(disruption.type)
        {
            case "weather":
                applyWeather(flights,disruption,events);
                break;

            case "crew":
                applyCrew(flights,disruption,events);
                break;

            case "technical":
                applyTechnical(flights,disruption,events);
                break;
        }
    }

}
