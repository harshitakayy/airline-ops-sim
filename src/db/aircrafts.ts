import { pool } from "../../db";
import type { Aircraft } from "../engine/types";

export async function getAircrafts(): Promise<Aircraft[]>
{
    const result=await pool.query("SELECT * FROM aircrafts");

    return result.rows.map(row=>({
        id:row.id,
        currentAirport:row.current_airport,
        status:row.status,
        flights:[]
    }));
}