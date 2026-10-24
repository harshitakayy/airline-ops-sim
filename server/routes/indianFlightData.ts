import { Router } from "express";
import { pool } from "../../db";

const router = Router();

const PROVIDER = "aviationstack";
const API_URL = "https://api.aviationstack.com/v1/flights";
const MAX_RECORDS_PER_REQUEST = 100;

function optionalString(value: unknown): string | null {
    if (typeof value === "string" && value.trim() !== "") {
        return value;
    }

    return null;
}

function optionalDate(value: unknown): string | null {
    if (typeof value !== "string" || value.trim() === "") {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function optionalFlightDate(value: unknown): string | null {
    if (typeof value !== "string" || value.trim() === "") {
        return null;
    }

    const match = /^(\d{4}-\d{2}-\d{2})$/.exec(value.trim());

    return match ? match[1] : null;
}

function optionalDelay(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (
        typeof value === "string" &&
        value.trim() !== "" &&
        Number.isFinite(Number(value))
    ) {
        return Number(value);
    }

    return null;
}

router.post("/sync", async (req, res) => {
    const apiKey = process.env.AVIATIONSTACK_API_KEY;

    if (!apiKey) {
        res.status(500).json({
            error: "AVIATIONSTACK_API_KEY is missing from the environment."
        });
        return;
    }

    const airport = String(req.body?.departureAirport ?? "BLR")
        .trim()
        .toUpperCase();

    if (!/^[A-Z]{3}$/.test(airport)) {
        res.status(400).json({
            error: "departureAirport must be a three-letter IATA airport code."
        });
        return;
    }

    const requestedLimit = Number(req.body?.limit ?? 25);

    if (
        !Number.isInteger(requestedLimit) ||
        requestedLimit < 1 ||
        requestedLimit > MAX_RECORDS_PER_REQUEST
    ) {
        res.status(400).json({
            error: `limit must be an integer between 1 and ${MAX_RECORDS_PER_REQUEST}.`
        });
        return;
    }

    let syncRunId: string | number | undefined;

    try {
        const runResult = await pool.query(
            `INSERT INTO flight_data_sync_runs
                (provider, status)
             VALUES ($1, $2)
             RETURNING id`,
            [PROVIDER, "running"]
        );

        syncRunId = runResult.rows[0].id;

        const params = new URLSearchParams({
            access_key: apiKey,
            dep_iata: airport,
            limit: String(requestedLimit)
        });

        const response = await fetch(`${API_URL}?${params}`);

        const result = await response.json() as {
            data?: any[];
            error?: {
                code?: string;
                message?: string;
                type?: string;
            };
            pagination?: {
                total?: number;
            };
        };

        if (!response.ok || result.error) {
            const providerMessage =
                result.error?.message ?? `HTTP ${response.status}`;

            throw new Error(
                `Aviationstack request failed: ${providerMessage}`
            );
        }

        const records = Array.isArray(result.data) ? result.data : [];
        let saved = 0;

        for (const flight of records) {
            const flightNumber = optionalString(flight.flight?.iata);
            const flightDate = optionalFlightDate(flight.flight_date);
            const codeshare = flight.flight?.codeshared;

            const operatingFlightNumber =
                optionalString(codeshare?.flight_number) ??
                optionalString(flight.flight?.number);

            const operatingAirline =
                optionalString(codeshare?.airline_name) ??
                optionalString(flight.airline?.name);

            const reportedDepartureDelayMinutes =
                optionalDelay(flight.departure?.delay);

            const scheduledDeparture = optionalDate(
                flight.departure?.scheduled
            );

            const estimatedDeparture = optionalDate(
                flight.departure?.estimated
            );

            const actualDeparture = optionalDate(
                flight.departure?.actual
            );

            const scheduledArrival = optionalDate(
                flight.arrival?.scheduled
            );

            const estimatedArrival = optionalDate(
                flight.arrival?.estimated
            );

            const actualArrival = optionalDate(
                flight.arrival?.actual
            );

            await pool.query(
                `INSERT INTO flight_observations (
                    provider,
                    provider_flight_id,
                    flight_number,
                    airline_name,
                    departure_airport,
                    departure_airport_name,
                    arrival_airport,
                    arrival_airport_name,
                    scheduled_departure,
                    estimated_departure,
                    actual_departure,
                    scheduled_arrival,
                    estimated_arrival,
                    actual_arrival,
                    flight_status,
                    flight_date,
                    raw_data,
                    sync_run_id,
                    operating_flight_number,
                    operating_airline,
                    reported_departure_delay_minutes
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8,
                    $9, $10, $11, $12, $13, $14, $15, $16,
                    $17::jsonb, $18, $19, $20, $21
                )`,
                [
                    PROVIDER,
                    optionalString(flight.flight?.number) ??
                        optionalString(flight.flight?.iata),
                    flightNumber,
                    optionalString(flight.airline?.name),
                    optionalString(flight.departure?.iata),
                    optionalString(flight.departure?.airport),
                    optionalString(flight.arrival?.iata),
                    optionalString(flight.arrival?.airport),
                    scheduledDeparture,
                    estimatedDeparture,
                    actualDeparture,
                    scheduledArrival,
                    estimatedArrival,
                    actualArrival,
                    optionalString(flight.flight_status),
                    flightDate,
                    JSON.stringify(flight),
                    syncRunId,
                    operatingFlightNumber,
                    operatingAirline,
                    reportedDepartureDelayMinutes
                ]
            );

            saved++;
        }

        await pool.query(
            `UPDATE flight_data_sync_runs
             SET status = $1,
                 completed_at = NOW(),
                 records_received = $2,
                 records_saved = $3
             WHERE id = $4`,
            ["success", records.length, saved, syncRunId]
        );

        res.json({
            message: "Flight data synchronization completed.",
            provider: PROVIDER,
            departureAirport: airport,
            recordsReceived: records.length,
            recordsSaved: saved,
            providerReportedTotal: result.pagination?.total ?? null,
            syncRunId
        });
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Unknown synchronization error.";

        if (syncRunId !== undefined) {
            try {
                await pool.query(
                    `UPDATE flight_data_sync_runs
                     SET status = $1,
                         completed_at = NOW(),
                         error_message = $2
                     WHERE id = $3`,
                    ["failed", message, syncRunId]
                );
            } catch (databaseError) {
                console.error(
                    "Could not update sync status:",
                    databaseError
                );
            }
        }

        console.error("Flight data sync failed:", message);

        res.status(502).json({
            error: "Flight data synchronization failed.",
            details: message
        });
    }
});

router.get("/history/:flightNumber", async (req, res) => {
    const flightNumber = req.params.flightNumber
        .trim()
        .toUpperCase();

    if (!/^[A-Z0-9-]{1,50}$/.test(flightNumber)) {
        res.status(400).json({
            error: "Invalid flight number."
        });
        return;
    }

    try {
        const result = await pool.query(
            `SELECT
                id,
                provider,
                flight_number,
                operating_flight_number,
                operating_airline,
                reported_departure_delay_minutes,
                airline_name,
                departure_airport,
                arrival_airport,
                scheduled_departure,
                estimated_departure,
                actual_departure,
                scheduled_arrival,
                estimated_arrival,
                actual_arrival,
                flight_status,
                flight_date,
                observed_at
             FROM flight_observations
             WHERE UPPER(flight_number) = $1
             ORDER BY observed_at ASC
             LIMIT 500`,
            [flightNumber]
        );

        res.json({
            flightNumber,
            count: result.rows.length,
            observations: result.rows
        });
    } catch (error) {
        console.error(
            "Could not retrieve flight history:",
            error
        );

        res.status(500).json({
            error: "Could not retrieve flight history."
        });
    }
});

router.get("/operating-flights", async (_req, res) => {
    try {
        const result = await pool.query(
            `WITH latest_per_marketed_flight AS (
                SELECT DISTINCT ON (
                    flight_number,
                    flight_date,
                    departure_airport,
                    arrival_airport,
                    scheduled_departure
                )
                    flight_number,
                    COALESCE(
                        NULLIF(operating_flight_number, ''),
                        flight_number
                    ) AS operating_flight_number,
                    operating_airline,
                    departure_airport,
                    arrival_airport,
                    scheduled_departure,
                    estimated_departure,
                    actual_departure,
                    scheduled_arrival,
                    estimated_arrival,
                    actual_arrival,
                    flight_status,
                    flight_date,
                    reported_departure_delay_minutes,
                    observed_at
                FROM flight_observations
                WHERE flight_number IS NOT NULL
                ORDER BY
                    flight_number,
                    flight_date,
                    departure_airport,
                    arrival_airport,
                    scheduled_departure,
                    observed_at DESC
            ),
            marketed_numbers AS (
                SELECT
                    operating_flight_number,
                    departure_airport,
                    arrival_airport,
                    flight_date,
                    scheduled_departure,
                    ARRAY_AGG(
                        DISTINCT flight_number ORDER BY flight_number
                    ) AS marketed_flight_numbers
                FROM latest_per_marketed_flight
                GROUP BY
                    operating_flight_number,
                    departure_airport,
                    arrival_airport,
                    flight_date,
                    scheduled_departure
            ),
            latest_operating_observations AS (
                SELECT DISTINCT ON (
                    operating_flight_number,
                    flight_date,
                    departure_airport,
                    arrival_airport,
                    scheduled_departure
                )
                    operating_flight_number,
                    operating_airline,
                    departure_airport,
                    arrival_airport,
                    flight_date,
                    scheduled_departure,
                    estimated_departure,
                    actual_departure,
                    scheduled_arrival,
                    estimated_arrival,
                    actual_arrival,
                    flight_status,
                    reported_departure_delay_minutes,
                    observed_at
                FROM latest_per_marketed_flight
                ORDER BY
                    operating_flight_number,
                    flight_date,
                    departure_airport,
                    arrival_airport,
                    scheduled_departure,
                    observed_at DESC
            )
            SELECT
                latest.operating_flight_number
                    AS "operatingFlightNumber",
                latest.operating_airline AS "operatingAirline",
                marketed.marketed_flight_numbers
                    AS "marketedFlightNumbers",
                latest.departure_airport AS "departureAirport",
                latest.arrival_airport AS "arrivalAirport",
                TO_CHAR(latest.flight_date, 'YYYY-MM-DD')
                    AS "flightDate",
                latest.flight_status AS "status",
                latest.scheduled_departure AS "scheduledDeparture",
                latest.estimated_departure AS "estimatedDeparture",
                latest.actual_departure AS "actualDeparture",
                latest.scheduled_arrival AS "scheduledArrival",
                latest.estimated_arrival AS "estimatedArrival",
                latest.actual_arrival AS "actualArrival",
                latest.reported_departure_delay_minutes
                    AS "reportedDepartureDelayMinutes",
                latest.observed_at AS "observedAt"
            FROM latest_operating_observations latest
            JOIN marketed_numbers marketed
              ON marketed.operating_flight_number =
                    latest.operating_flight_number
             AND marketed.departure_airport
                    IS NOT DISTINCT FROM latest.departure_airport
             AND marketed.arrival_airport
                    IS NOT DISTINCT FROM latest.arrival_airport
             AND marketed.flight_date
                    IS NOT DISTINCT FROM latest.flight_date
             AND marketed.scheduled_departure
                    IS NOT DISTINCT FROM latest.scheduled_departure
            ORDER BY latest.observed_at DESC
            LIMIT 100`
        );

        res.json({
            count: result.rows.length,
            flights: result.rows,
            note: "Codeshare records are grouped by operating flight number, date, route, and scheduled departure. Marketed flight numbers are collected from stored observations. This endpoint does not make a provider API request."
        });
    } catch (error) {
        console.error(
            "Could not retrieve operating flights:",
            error
        );

        res.status(500).json({
            error: "Could not retrieve operating flights."
        });
    }
});

router.get("/delay-summary", async (_req, res) => {
    try {
        const result = await pool.query(
            `WITH latest_observations AS (
                SELECT DISTINCT ON (
                    COALESCE(provider_flight_id, flight_number),
                    flight_date
                )
                    flight_number,
                    operating_flight_number,
                    operating_airline,
                    airline_name,
                    departure_airport,
                    arrival_airport,
                    scheduled_arrival,
                    estimated_arrival,
                    actual_arrival,
                    flight_status,
                    reported_departure_delay_minutes,
                    observed_at
                FROM flight_observations
                WHERE flight_number IS NOT NULL
                ORDER BY
                    COALESCE(provider_flight_id, flight_number),
                    flight_date,
                    observed_at DESC
            )
            SELECT
                flight_number AS "flightNumber",
                operating_flight_number AS "operatingFlightNumber",
                operating_airline AS "operatingAirline",
                airline_name AS "marketedAirline",
                departure_airport AS "departureAirport",
                arrival_airport AS "arrivalAirport",
                flight_status AS "status",
                scheduled_arrival AS "scheduledArrival",
                estimated_arrival AS "estimatedArrival",
                actual_arrival AS "actualArrival",
                reported_departure_delay_minutes
                    AS "reportedDepartureDelayMinutes",
                observed_at AS "observedAt",
                CASE
                    WHEN scheduled_arrival IS NULL THEN NULL
                    WHEN actual_arrival IS NOT NULL THEN
                        ROUND(
                            EXTRACT(EPOCH FROM (
                                actual_arrival - scheduled_arrival
                            )) / 60
                        )
                    WHEN estimated_arrival IS NOT NULL THEN
                        ROUND(
                            EXTRACT(EPOCH FROM (
                                estimated_arrival - scheduled_arrival
                            )) / 60
                        )
                    ELSE NULL
                END AS "arrivalDelayMinutes"
            FROM latest_observations
            ORDER BY observed_at DESC
            LIMIT 100`
        );

        res.json({
            count: result.rows.length,
            flights: result.rows,
            note: "Reported departure delay comes from the provider. Arrival delay is calculated from scheduled versus actual arrival, or estimated arrival when actual arrival is unavailable. Estimated delay is not a confirmed outcome. Codeshare records may refer to the same operating flight."
        });
    } catch (error) {
        console.error(
            "Could not calculate delay summary:",
            error
        );

        res.status(500).json({
            error: "Could not retrieve delay summary."
        });
    }
});

router.get("/ml-dataset", async (_req, res) => {
    try {
        const result = await pool.query(
            `WITH latest_per_marketed_flight AS (
                SELECT DISTINCT ON (
                    observations.flight_number,
                    observations.flight_date,
                    observations.departure_airport,
                    observations.arrival_airport,
                    observations.scheduled_departure
                )
                    observations.flight_number,
                    COALESCE(
                        NULLIF(observations.operating_flight_number, ''),
                        observations.flight_number
                    ) AS operating_flight_number,
                    observations.operating_airline,
                    observations.departure_airport,
                    observations.arrival_airport,
                    observations.flight_date,
                    observations.scheduled_departure,
                    COALESCE(
                        (
                            SELECT confirmed.scheduled_arrival
                            FROM flight_observations AS confirmed
                            WHERE confirmed.flight_number =
                                observations.flight_number
                              AND confirmed.flight_date
                                IS NOT DISTINCT FROM observations.flight_date
                              AND confirmed.departure_airport
                                IS NOT DISTINCT FROM observations.departure_airport
                              AND confirmed.arrival_airport
                                IS NOT DISTINCT FROM observations.arrival_airport
                              AND confirmed.scheduled_departure
                                IS NOT DISTINCT FROM observations.scheduled_departure
                              AND confirmed.scheduled_arrival IS NOT NULL
                              AND confirmed.actual_arrival IS NOT NULL
                            ORDER BY confirmed.observed_at DESC
                            LIMIT 1
                        ),
                        observations.scheduled_arrival
                    ) AS scheduled_arrival,
                    (
                        SELECT confirmed.actual_arrival
                        FROM flight_observations AS confirmed
                        WHERE confirmed.flight_number =
                            observations.flight_number
                          AND confirmed.flight_date
                            IS NOT DISTINCT FROM observations.flight_date
                          AND confirmed.departure_airport
                            IS NOT DISTINCT FROM observations.departure_airport
                          AND confirmed.arrival_airport
                            IS NOT DISTINCT FROM observations.arrival_airport
                          AND confirmed.scheduled_departure
                            IS NOT DISTINCT FROM observations.scheduled_departure
                          AND confirmed.scheduled_arrival IS NOT NULL
                          AND confirmed.actual_arrival IS NOT NULL
                        ORDER BY confirmed.observed_at DESC
                        LIMIT 1
                    ) AS actual_arrival,
                    observations.observed_at
                FROM flight_observations AS observations
                WHERE observations.flight_number IS NOT NULL
                ORDER BY
                    observations.flight_number,
                    observations.flight_date,
                    observations.departure_airport,
                    observations.arrival_airport,
                    observations.scheduled_departure,
                    observations.observed_at DESC
            ),
            operating_flights AS (
                SELECT
                    operating_flight_number,
                    MAX(operating_airline) AS operating_airline,
                    ARRAY_AGG(
                        DISTINCT flight_number ORDER BY flight_number
                    ) AS marketed_flight_numbers,
                    departure_airport,
                    arrival_airport,
                    flight_date,
                    scheduled_departure,
                    MAX(scheduled_arrival) AS scheduled_arrival,
                    MAX(actual_arrival) AS actual_arrival,
                    MAX(observed_at) AS observed_at
                FROM latest_per_marketed_flight
                GROUP BY
                    operating_flight_number,
                    departure_airport,
                    arrival_airport,
                    flight_date,
                    scheduled_departure
            ),
            labelled_flights AS (
                SELECT
                    *,
                    ROUND(
                        EXTRACT(
                            EPOCH FROM (
                                actual_arrival - scheduled_arrival
                            )
                        ) / 60
                    )::INTEGER AS arrival_delay_minutes
                FROM operating_flights
                WHERE scheduled_arrival IS NOT NULL
                  AND actual_arrival IS NOT NULL
            )
            SELECT
                operating_flight_number AS "operatingFlightNumber",
                operating_airline AS "operatingAirline",
                marketed_flight_numbers AS "marketedFlightNumbers",
                departure_airport AS "departureAirport",
                arrival_airport AS "arrivalAirport",
                TO_CHAR(flight_date, 'YYYY-MM-DD') AS "flightDate",
                scheduled_departure AS "scheduledDeparture",
                scheduled_arrival AS "scheduledArrival",
                actual_arrival AS "actualArrival",
                arrival_delay_minutes AS "arrivalDelayMinutes",
                CASE
                    WHEN arrival_delay_minutes >= 30 THEN 1
                    ELSE 0
                END AS "delayed30Min",
                observed_at AS "observedAt"
            FROM labelled_flights
            ORDER BY scheduled_departure DESC
            LIMIT 1000`
        );

        const countsResult = await pool.query(
            `WITH latest_per_marketed_flight AS (
                SELECT DISTINCT ON (
                    observations.flight_number,
                    observations.flight_date,
                    observations.departure_airport,
                    observations.arrival_airport,
                    observations.scheduled_departure
                )
                    observations.flight_number,
                    COALESCE(
                        NULLIF(observations.operating_flight_number, ''),
                        observations.flight_number
                    ) AS operating_flight_number,
                    observations.departure_airport,
                    observations.arrival_airport,
                    observations.flight_date,
                    observations.scheduled_departure,
                    COALESCE(
                        (
                            SELECT confirmed.scheduled_arrival
                            FROM flight_observations AS confirmed
                            WHERE confirmed.flight_number =
                                observations.flight_number
                              AND confirmed.flight_date
                                IS NOT DISTINCT FROM observations.flight_date
                              AND confirmed.departure_airport
                                IS NOT DISTINCT FROM observations.departure_airport
                              AND confirmed.arrival_airport
                                IS NOT DISTINCT FROM observations.arrival_airport
                              AND confirmed.scheduled_departure
                                IS NOT DISTINCT FROM observations.scheduled_departure
                              AND confirmed.scheduled_arrival IS NOT NULL
                              AND confirmed.actual_arrival IS NOT NULL
                            ORDER BY confirmed.observed_at DESC
                            LIMIT 1
                        ),
                        observations.scheduled_arrival
                    ) AS scheduled_arrival,
                    (
                        SELECT confirmed.actual_arrival
                        FROM flight_observations AS confirmed
                        WHERE confirmed.flight_number =
                            observations.flight_number
                          AND confirmed.flight_date
                            IS NOT DISTINCT FROM observations.flight_date
                          AND confirmed.departure_airport
                            IS NOT DISTINCT FROM observations.departure_airport
                          AND confirmed.arrival_airport
                            IS NOT DISTINCT FROM observations.arrival_airport
                          AND confirmed.scheduled_departure
                            IS NOT DISTINCT FROM observations.scheduled_departure
                          AND confirmed.scheduled_arrival IS NOT NULL
                          AND confirmed.actual_arrival IS NOT NULL
                        ORDER BY confirmed.observed_at DESC
                        LIMIT 1
                    ) AS actual_arrival
                FROM flight_observations AS observations
                WHERE observations.flight_number IS NOT NULL
                ORDER BY
                    observations.flight_number,
                    observations.flight_date,
                    observations.departure_airport,
                    observations.arrival_airport,
                    observations.scheduled_departure,
                    observations.observed_at DESC
            ),
            operating_flights AS (
                SELECT
                    operating_flight_number,
                    departure_airport,
                    arrival_airport,
                    flight_date,
                    scheduled_departure,
                    MAX(scheduled_arrival) AS scheduled_arrival,
                    MAX(actual_arrival) AS actual_arrival
                FROM latest_per_marketed_flight
                GROUP BY
                    operating_flight_number,
                    departure_airport,
                    arrival_airport,
                    flight_date,
                    scheduled_departure
            )
            SELECT
                COUNT(*)::INTEGER AS "totalOperatingFlights",
                COUNT(*) FILTER (
                    WHERE scheduled_arrival IS NOT NULL
                      AND actual_arrival IS NOT NULL
                )::INTEGER AS "eligibleFlights"
            FROM operating_flights`
        );

        const counts = countsResult.rows[0];
        const eligibleFlights = Number(counts.eligibleFlights);
        const totalOperatingFlights = Number(
            counts.totalOperatingFlights
        );

        res.json({
            dataset: "confirmed_arrival_delay",
            labelDefinition: {
                delayed30Min: "1 if actual arrival delay is at least 30 minutes; otherwise 0.",
                arrivalDelayMinutes: "Actual arrival minus scheduled arrival, in minutes."
            },
            summary: {
                totalOperatingFlights,
                eligibleFlights,
                excludedFlights: totalOperatingFlights - eligibleFlights,
                exportedRows: result.rows.length
            },
            features: [
                "operatingFlightNumber",
                "operatingAirline",
                "departureAirport",
                "arrivalAirport",
                "flightDate",
                "scheduledDeparture"
            ],
            records: result.rows,
            note: "Only confirmed arrival outcomes are exported. Estimated arrivals are not used as training labels. Codeshare records are grouped into operating flights. This endpoint reads stored observations and does not make a provider API request."
        });
    } catch (error) {
        console.error("Could not generate ML dataset:", error);

        res.status(500).json({
            error: "Could not generate the ML dataset."
        });
    }
});

router.get("/data-quality", async (_req, res) => {
    try {
        const result = await pool.query(
            `WITH per_marketed_flight AS (
                SELECT
                    flight_number,
                    COALESCE(
                        NULLIF(operating_flight_number, ''),
                        flight_number
                    ) AS operating_flight_number,
                    departure_airport,
                    arrival_airport,
                    flight_date,
                    scheduled_departure,
                    COUNT(*) AS observation_count,
                    BOOL_OR(actual_departure IS NOT NULL)
                        AS has_actual_departure,
                    BOOL_OR(actual_arrival IS NOT NULL)
                        AS has_actual_arrival,
                    BOOL_OR(
                        scheduled_arrival IS NOT NULL
                        AND actual_arrival IS NOT NULL
                    ) AS has_confirmed_arrival_outcome,
                    MIN(observed_at) AS first_observed_at,
                    MAX(observed_at) AS last_observed_at
                FROM flight_observations
                WHERE flight_number IS NOT NULL
                GROUP BY
                    flight_number,
                    COALESCE(
                        NULLIF(operating_flight_number, ''),
                        flight_number
                    ),
                    departure_airport,
                    arrival_airport,
                    flight_date,
                    scheduled_departure
            ),
            per_operating_flight AS (
                SELECT
                    operating_flight_number,
                    departure_airport,
                    arrival_airport,
                    flight_date,
                    scheduled_departure,
                    MAX(observation_count) AS max_marketed_observations,
                    BOOL_OR(has_actual_departure) AS has_actual_departure,
                    BOOL_OR(has_actual_arrival) AS has_actual_arrival,
                    BOOL_OR(has_confirmed_arrival_outcome)
                        AS has_confirmed_arrival_outcome,
                    MIN(first_observed_at) AS first_observed_at,
                    MAX(last_observed_at) AS last_observed_at
                FROM per_marketed_flight
                GROUP BY
                    operating_flight_number,
                    departure_airport,
                    arrival_airport,
                    flight_date,
                    scheduled_departure
            )
            SELECT
                (SELECT COUNT(*) FROM flight_observations)::INTEGER
                    AS total_observations,
                (SELECT COUNT(*) FROM per_marketed_flight)::INTEGER
                    AS distinct_marketed_flights,
                (SELECT COUNT(*) FROM per_operating_flight)::INTEGER
                    AS distinct_operating_flights,
                (
                    SELECT COUNT(*)
                    FROM per_operating_flight
                    WHERE has_actual_departure
                )::INTEGER AS flights_with_actual_departure,
                (
                    SELECT COUNT(*)
                    FROM per_operating_flight
                    WHERE has_actual_arrival
                )::INTEGER AS flights_with_actual_arrival,
                (
                    SELECT COUNT(*)
                    FROM per_operating_flight
                    WHERE has_confirmed_arrival_outcome
                )::INTEGER AS flights_with_confirmed_arrival_outcome,
                (
                    SELECT COUNT(*)
                    FROM per_operating_flight
                    WHERE max_marketed_observations > 1
                )::INTEGER AS flights_with_repeated_observations,
                (
                    SELECT MIN(first_observed_at)
                    FROM per_operating_flight
                ) AS earliest_observation,
                (
                    SELECT MAX(last_observed_at)
                    FROM per_operating_flight
                ) AS latest_observation`
        );

        res.json({
            dataQuality: result.rows[0],
            note: "Counts are based on stored provider observations. Operating-flight grouping uses flight number, route, date, and scheduled departure. Repeated observations indicate stored snapshots, not necessarily independent flights."
        });
    } catch (error) {
        console.error("Could not calculate data quality:", error);

        res.status(500).json({
            error: "Could not retrieve data quality."
        });
    }
});

router.get("/latest", async (_req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM flight_observations
             ORDER BY observed_at DESC
             LIMIT 100`
        );

        res.json({
            count: result.rows.length,
            flights: result.rows
        });
    } catch (error) {
        console.error(
            "Could not read flight observations:",
            error
        );

        res.status(500).json({
            error: "Could not retrieve flight observations."
        });
    }
});

router.get("/sync-runs", async (_req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM flight_data_sync_runs
             ORDER BY started_at DESC
             LIMIT 50`
        );

        res.json({
            count: result.rows.length,
            runs: result.rows
        });
    } catch (error) {
        console.error(
            "Could not read sync history:",
            error
        );

        res.status(500).json({
            error: "Could not retrieve synchronization history."
        });
    }
});

router.get("/current-flights", async (_req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM current_operating_flights
             ORDER BY scheduled_departure ASC`
        );

        res.json({
            count: result.rows.length,
            flights: result.rows
        });
    } catch (error) {
        console.error(
            "Could not retrieve current operating flights:",
            error
        );

        res.status(500).json({
            error: "Could not retrieve current operating flights."
        });
    }
});

export default router;