import express from "express";
import cors from "cors";

import { runSimulation } from "../src/engine/clock";
import {
DecisionInputError,
recommendAction
} from "../src/engine/decision";
import {
ModelPredictionError,
predictDelayProbability,
type ModelFeatureRow
} from "../src/engine/mlPredictor";
import { getData } from "../src/db/data";
import indianFlightDataRouter from "./routes/indianFlightData";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/flight-data", indianFlightDataRouter);

async function start() {
let simulation = await runSimulation();

app.get("/flights", async (_req, res, next) => {
    try {
        const data = await getData();
        res.json(data.flights);
    } catch (error) {
        next(error);
    }
});

app.get("/flights/:id", async (req, res, next) => {
    try {
        const data = await getData();

        const flight = data.flights.find(
            item => item.id === req.params.id
        );

        if (!flight) {
            return res.status(404).json({
                error: "Flight not found"
            });
        }

        return res.json(flight);
    } catch (error) {
        return next(error);
    }
});

app.get("/aircraft", async (_req, res, next) => {
    try {
        const data = await getData();
        res.json(data.aircrafts);
    } catch (error) {
        next(error);
    }
});

app.get("/simulation", (_req, res) => {
    res.json(simulation);
});

app.get("/metrics", (_req, res) => {
    res.json(simulation.metrics);
});

app.get("/events", (_req, res) => {
    res.json(simulation.events);
});

app.post("/simulation/run", async (req, res, next) => {
    try {
        simulation = await runSimulation(
            undefined,
            req.body
        );

        res.json(simulation);
    } catch (error) {
        next(error);
    }
});

app.post(
    "/decision/recommend",
    async (req, res, next) => {
        try {
            const data = await getData();

            const recommendation = await recommendAction(
                data,
                req.body
            );

            res.json(recommendation);
        } catch (error) {
            if (error instanceof DecisionInputError) {
                return res.status(error.statusCode).json({
                    error: error.message
                });
            }

            return next(error);
        }
    }
);

app.post(
    "/decision/recommend-with-ml",
    async (req, res, next) => {
        try {
            const {
                flightId,
                features,
                expectedDelayMinutes,
                costAssumptions
            } = req.body ?? {};

            if (
                typeof flightId !== "string" ||
                !flightId.trim()
            ) {
                return res.status(400).json({
                    error: "flightId is required."
                });
            }

            if (
                !Number.isFinite(expectedDelayMinutes) ||
                expectedDelayMinutes < 30
            ) {
                return res.status(400).json({
                    error:
                        "expectedDelayMinutes must be at least 30."
                });
            }

            if (
                !features ||
                typeof features !== "object" ||
                Array.isArray(features)
            ) {
                return res.status(400).json({
                    error:
                        "features must be a JSON object containing all model features."
                });
            }

            const data = await getData();

            const flight = data.flights.find(
                item => item.id === flightId
            );

            if (!flight) {
                return res.status(404).json({
                    error: `Flight not found: ${flightId}`
                });
            }

            if (flight.status !== "scheduled") {
                return res.status(400).json({
                    error:
                        `Flight ${flightId} must be scheduled to evaluate a new action.`
                });
            }

            const prediction = await predictDelayProbability(
                features as ModelFeatureRow
            );

            const recommendation = await recommendAction(
                data,
                {
                    flightId,
                    delayProbability: prediction.probability,
                    expectedDelayMinutes,
                    costAssumptions
                }
            );

            return res.json({
                ...recommendation,
                mlPrediction: {
                    probability: prediction.probability,
                    target: prediction.target,
                    dataset: prediction.dataset,
                    featureSource: "request.features",
                    validatedForIndianOperations: false
                }
            });
        } catch (error) {
            if (
                error instanceof DecisionInputError ||
                error instanceof ModelPredictionError
            ) {
                return res.status(error.statusCode).json({
                    error: error.message
                });
            }

            return next(error);
        }
    }
);

app.use((
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
) => {
    console.error(error);

    res.status(500).json({
        error: "Internal server error"
    });
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

}

start().catch(error => {
console.error("Failed to start server:", error);
process.exitCode = 1;
});