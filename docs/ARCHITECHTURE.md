# Project Architecture

## 1. System Overview

The Airline Operations Simulator combines a deterministic airline-operations simulation with external flight-data ingestion, database storage, machine-learning prediction, and experimental decision support.

The architecture separates operational simulation from data collection and prediction. This allows the simulator to be tested independently of external services and allows flight observations to be stored without changing the simulator's internal schedule.

## 2. High-Level Architecture

```text
                         User
                          |
                          v
                  React / Vite UI
                          |
                       HTTP/JSON
                          |
                          v
                   Express Server
                          |
          +---------------+----------------+
          |               |                |
          v               v                v
   Simulation API    Decision API     Flight-Data API
          |               |                |
          v               v                v
   Simulation Engine  Decision Engine  Aviationstack Client
          |               |                |
          v               v                v
   Flight / Aircraft  Cost Assumptions   PostgreSQL
   State / Events     + ML Risk              |
   Operational Metrics     |                 v
                           v           Flight Observations
                      Python Bridge     Sync Run History
                           |
                           v
                     ML Model Files
```

This is a logical component diagram, not a deployment diagram. Components may run in the same development environment.

## 3. Frontend

**Technologies:** React, TypeScript, Vite.

Responsibilities:

- Display operational information.
- Provide user interaction.
- Submit requests to the backend.
- Render responses returned by the REST API.

The frontend does not directly access PostgreSQL or the Python model. It communicates with the Express backend over HTTP.

## 4. Express Backend

**Entry point:** `server/server.ts`

Responsibilities:

- Initialize the Express application and middleware.
- Handle HTTP requests and JSON bodies.
- Expose simulation, decision-support, and flight-data endpoints.
- Invoke the appropriate engine or route handler.
- Return JSON responses and handle errors.

The backend is the integration layer between the frontend, simulation engine, data pipeline, and ML prediction bridge.

### Core API

| Method | Endpoint | Responsibility |
|---|---|---|
| GET | `/flights` | Retrieve simulated flights |
| GET | `/flights/:id` | Retrieve a specific flight |
| GET | `/aircraft` | Retrieve aircraft |
| GET | `/events` | Retrieve simulation events |
| GET | `/metrics` | Retrieve operational metrics |
| GET | `/simulation` | Retrieve simulation state |
| POST | `/simulation/run` | Run the simulation |
| POST | `/decision/recommend` | Evaluate operational actions |
| POST | `/decision/recommend-with-ml` | Incorporate an ML risk prediction into decision support |

The exact request and response schemas should be documented from the current route implementations.

## 5. Simulation Engine

**Main module:** `src/engine/clock.ts`

The engine advances a simulated schedule through discrete time steps.

Conceptual execution:

```text
Initialize Simulation State
          |
          v
Apply Configured Disruptions
          |
          v
Advance Simulation Clock
          |
          v
Evaluate Scheduled Flights
          |
          v
Validate Aircraft Availability
          |
          v
Process Departures and Arrivals
          |
          v
Update Aircraft and Flight State
          |
          v
Record Operational Events
          |
          v
Calculate Summary Metrics
          |
          v
Return Simulation Result
```

### Aircraft rotations

Flights operated by the same aircraft are linked through operational dependencies. The aircraft must be available at the correct airport before its next flight can depart.

### Turnaround and delay propagation

The simulator considers the previous flight's completion and turnaround requirements when determining whether the next departure can occur. Schedule buffers can absorb some delays; insufficient buffer can cause delays to propagate through subsequent flights.

### Disruptions

The disruption subsystem supports weather, crew, and technical disruption types. It is separated from the simulation clock so disruption logic can evolve independently.

### Cancellation and aircraft availability

Flights can be cancelled when configured delay thresholds are exceeded. If a flight is cancelled or an aircraft fails to reach the next required airport, downstream operations may become infeasible.

### Events and metrics

The engine records structured events rather than relying exclusively on console output. Metrics are calculated from the resulting simulation state and events.

## 6. Decision-Support Engine

**Main module:** `src/engine/decision.ts`

The decision layer evaluates alternative operational actions using simulation outcomes and configured cost assumptions.

The current design includes recommendations such as:

- Continue without intervention.
- Cancel a flight.
- Reassign resources where the constraints permit it.

The engine evaluates candidate actions and compares their expected operational or financial consequences.

### Important limitation

The ML model estimates the probability that a flight's arrival delay will be at least 30 minutes. This is not the same as the number of additional delay minutes caused by a new disruption.

A baseline simulation may already contain deterministic delay from aircraft rotations. The decision layer must avoid treating total arrival-delay probability as an independent probability of additional disruption. This relationship requires careful validation before recommendations can be interpreted as reliable operational decisions.

## 7. Flight-Data Ingestion

**Route module:** `server/routes/indianFlightData.ts`

The flight-data API integrates with Aviationstack.

The synchronization workflow is:

```text
POST /api/flight-data/sync
              |
              v
     Create Sync-Run Record
              |
              v
     Request Provider Data
              |
              v
     Store Raw Observations
              |
              v
    Update Sync-Run Statistics
              |
              v
       Return JSON Summary
```

Each synchronization run tracks its provider, status, timestamps, record counts, and any recorded error.

Provider responses are stored as observations rather than being treated as immutable truth. Repeated observations of the same flight can capture changes in status or estimated times.

### Codeshare and operating-flight identity

A single operating flight can appear under multiple marketed flight numbers. The pipeline preserves the original observations and derives operating-flight identity where provider fields permit it.

Grouping aliases is useful for analysis, but it does not guarantee that every provider record has a complete or unambiguous operating-flight identity.

## 8. PostgreSQL Storage

**Connection module:** `db.ts`

The project uses PostgreSQL for application data and external flight observations.

### Simulation data

The existing application tables include:

- `aircrafts`
- `airports`
- `flights`

These support the simulator's operational data model.

### Observation data

The ingestion pipeline uses:

- `flight_data_sync_runs` — records synchronization attempts and outcomes.
- `flight_observations` — stores timestamped provider observations and the raw JSON payload.

Observation metadata includes provider identifiers, flight numbers, airline and airport information, scheduled/estimated/actual times, status, observation time, and synchronization-run linkage.

Additional fields support operating-flight identity and reported departure delay when available.

### Data integrity

- Synchronization records are linked to observations through a foreign key.
- Indexes support flight/date lookups and observation-time queries.
- Raw provider JSON is retained for traceability.
- Confirmed actual arrival times, rather than estimated arrivals, are used to derive supervised arrival-delay labels.

The data-ingestion subsystem is separate from the simulator's operational schedule. Live observations should not silently overwrite simulation data.

## 9. Machine-Learning Pipeline

The project has an existing Python prediction pipeline and a separate BTS dataset experiment.

### Existing prediction pipeline

```text
Historical US Flight Dataset
             |
             v
       Feature Preparation
             |
             v
       Model Training
             |
             v
     Probability Calibration
             |
             v
       Model Evaluation
             |
             v
       Saved Model Files
             |
             v
     Python Prediction Bridge
             |
             v
      TypeScript Decision API
```

The original model was developed using US domestic 2015 flight data. Its target is whether arrival delay is at least 30 minutes.

### BTS experiment

The separate BTS workflow prepares January 2026 US flight data and provides a training script for a distinct model. Data preparation is not equivalent to successful model training or evaluation.

### Prediction contract

The model returns a probability of a defined classification outcome. It does not directly estimate exact arrival delay duration.

Live Indian flight observations are not automatically compatible with the historical model's features. Missing historical route and aircraft features must not be fabricated to make a prediction appear complete.

## 10. Testing

The simulation engine uses Vitest to test isolated scenarios, including:

- Delay propagation.
- Buffer absorption.
- Flight cancellation.
- Aircraft availability and location.
- Event generation.
- Operational metrics.

The Python pipeline and database routes should be verified separately. External API tests should account for network failures, provider limits, and incomplete data.

## 11. Configuration and Security

Configuration is provided through environment variables.

Sensitive values such as database passwords and external API keys must remain outside source control. A local `.env` file should be excluded by `.gitignore`, and a sanitized `.env.example` may document required variable names without real values.

## 12. Current Boundaries and Future Work

The project is a development-stage simulator and decision-support prototype. It is not a certified airline dispatch or operations-control system.

Potential extensions include:

- Stronger integration tests.
- More robust observation deduplication and identity resolution.
- Multi-day simulation.
- Improved cost and recovery models.
- Model evaluation on suitable Indian operational data.
- Better calibration between simulation outcomes and ML predictions.
- Containerization and deployment.

