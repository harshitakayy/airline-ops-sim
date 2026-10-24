
require("dotenv").config();

async function testAviationstack() {
    const apiKey = process.env.AVIATIONSTACK_API_KEY;

    if (!apiKey) {
        console.error("API key missing. Check your .env file.");
        process.exitCode = 1;
        return;
    }

    const params = new URLSearchParams({
        access_key: apiKey,
        dep_iata: "BLR",
        limit: "1"
    });

    try {
        const response = await fetch(
            `https://api.aviationstack.com/v1/flights?${params}`
        );

        const result = await response.json();

        if (!response.ok || result.error) {
            console.error("API request failed:");
            console.error(JSON.stringify(result.error || result, null, 2));
            process.exitCode = 1;
            return;
        }

        console.log("API connection successful.");
        console.log("Records returned:", result.data?.length ?? 0);
        console.log("Total matching records:", result.pagination?.total ?? "unknown");

        if (result.data?.length > 0) {
            const flight = result.data[0];

            console.log("Sample flight:", {
                flightNumber: flight.flight?.iata ?? null,
                airline: flight.airline?.name ?? null,
                departure: flight.departure?.iata ?? null,
                arrival: flight.arrival?.iata ?? null,
                status: flight.flight_status ?? null
            });
        } else {
            console.log("No matching flights returned for this query.");
        }
    } catch (error) {
        console.error("Connection error:", error.message);
        process.exitCode = 1;
    }
}

testAviationstack();
