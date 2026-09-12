import { pool } from "../../db";
import type { Flight } from "../engine/types";

export async function getFlights(): Promise<Flight[]> {
    const result = await pool.query("SELECT * FROM flights");

    return result.rows.map(row => ({
        id: row.id,
        aircraftId: row.aircraft_id,
        from: row.from_airport,
        to: row.to_airport,

        scheduledDeparture: row.departure_time,
        scheduledArrival: row.arrival_time,

        delayMinutes: row.delay_minutes ?? 0,

        status: row.status
    }));
}