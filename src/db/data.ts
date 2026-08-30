import { getFlights } from "./flights";
import { getAircrafts } from "./aircrafts";

export async function getData()
{
    const flights=await getFlights();
    const aircrafts=await getAircrafts();

    for(const aircraft of aircrafts)
    {
        aircraft.flights=flights.filter(flight=>flight.aircraftId===aircraft.id);
    }

    return {flights,aircrafts};
}