import { pool } from "../../db";
import type { Flight } from "../engine/types";

export async function getFlights(): Promise<Flight[]>
{
    const result=await pool.query("SELECT * FROM flights");

    return result.rows.map(row=>({
        id:row.id,
        aircraftId:row.aircraft_id,
        from:row.from_airport,
        to:row.to_airport,
        departureTime:row.departure_time,
        arrivalTime:row.arrival_time,
        delayHours:row.delay_hours,
        status:row.status
    }));
}