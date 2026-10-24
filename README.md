# ✈️ Airline Operations Simulator

A full-stack airline operations simulation and decision-support project built using TypeScript, React, Express, PostgreSQL, and Python. The system models aircraft rotations, cascading flight delays, operational disruptions, and recovery decisions while integrating external flight observations and machine-learning-based delay-risk prediction.

**Status:** Active Development

## Overview

Airline schedules are interconnected. When an aircraft arrives late, its next flight may be delayed, causing disruptions to propagate through subsequent flights. However, sufficient turnaround time and schedule buffers can absorb some delays.

This project simulates these operational dependencies and explores how alternative decisions can reduce disruption and financial impact.

The system combines two main components:

- **Operational simulator:** Models aircraft availability, flight dependencies, turnaround constraints, delay propagation, disruptions, cancellations, and operational metrics.
- **Data and decision-support pipeline:** Collects external flight observations, stores timestamped records, prepares flight-delay datasets, and connects ML predictions with operational decision logic.

## Features

### 1. Airline Operations Simulation

- Time-stepped simulation of scheduled flights.
- Aircraft rotations and airport-location validation.
- Aircraft turnaround constraints.
- Delay propagation across consecutive flights.
- Schedule-buffer absorption.
- Weather, crew, and technical disruptions.
- Flight cancellation and downstream aircraft-availability handling.
- Structured operational event history.
- Operational metrics for delays, cancellations, on-time flights, and aircraft utilization.

### 2. REST API

An Express API exposes simulation state and operational functionality.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/flights` | Retrieve simulated flights |
| GET | `/flights/:id` | Retrieve a specific flight |
| GET | `/aircraft` | Retrieve aircraft state |
| GET | `/events` | Retrieve operational events |
| GET | `/metrics` | Retrieve operational metrics |
| GET | `/simulation` | Retrieve simulation state |
| POST | `/simulation/run` | Execute a simulation |
| POST | `/decision/recommend` | Generate an operational recommendation |
| POST | `/decision/recommend-with-ml` | Evaluate a recommendation using an ML risk prediction |

The flight-data API also supports synchronization, observation history, operating-flight aggregation, data-quality checks, and ML dataset export.

### 3. External Flight-Data Integration

The project integrates with Aviationstack to retrieve available flight information.

The pipeline:

1. Requests flight observations from the provider.
2. Tracks synchronization runs and their outcomes.
3. Stores timestamped observations in PostgreSQL.
4. Preserves raw provider responses for traceability.
5. Derives operating-flight identities from codeshare information where possible.
6. Exposes endpoints for history, data quality, and confirmed-outcome dataset preparation.

**Limitation:** API coverage and historical access depend on the provider subscription. Stored observations are snapshots, not a complete historical archive. Confirmed arrival outcomes are required before observations can be used as supervised arrival-delay labels.

### 4. Machine Learning

The project includes a Python-based flight-delay prediction pipeline.

The existing model uses US domestic flight data from 2015 and predicts the probability that arrival delay will be at least 30 minutes.

The workflow includes:

- Feature engineering and preprocessing.
- Chronological training, calibration, validation, and testing.
- Random Forest classification.
- Probability calibration.
- Threshold-based evaluation.
- Integration with the TypeScript backend through a Python prediction bridge.

A separate experiment prepares US Bureau of Transportation Statistics (BTS) flight data from January 2026. The cleaned dataset contains 572,599 usable records from 602,953 source rows.

The BTS model is a separate experiment. It should only be described as trained once its training and evaluation scripts have completed successfully.

**Important:** The existing model was trained on US data and has not been validated for Indian airline operations. It predicts delay risk, not the exact number of minutes a flight will be delayed.

### 5. Decision Support

The decision layer evaluates operational alternatives such as continuing with the current plan, cancelling a flight, or reassigning resources where feasible.

The intended workflow combines simulation outcomes, delay-risk predictions, and configured cost assumptions.

Recommendations are experimental decision-support outputs. Their reliability depends on the input data, operational constraints, model assumptions, and cost parameters.

### 6. Frontend

The React and Vite frontend provides a web interface for interacting with the system and viewing operational information.

The frontend communicates with the backend through HTTP APIs rather than accessing the database directly.

## Architecture

```text
                    React Frontend
                          |
                      HTTP / JSON
                          |
                          v
                   Express REST API
                          |
          +---------------+----------------+
          |               |                |
          v               v                v
    Simulation API   Decision API     Flight Data API
          |               |                |
          v               v                v
    Simulation Engine  Decision Layer  Aviationstack
          |               |                |
          v               v                v
    Flight State     Cost / Risk       PostgreSQL
    Events           Evaluation            |
    Metrics               |                v
                          |          Flight Observations
                          v          Synchronization Runs
                    Python ML Bridge
                          |
                          v
                       ML Model
```

This diagram describes the logical components and does not imply that each component runs as a separately deployed service.

See [`ARCHITECHTURE.md`](ARCHITECHTURE.md) for details.

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, TypeScript, Express |
| Database | PostgreSQL |
| Machine Learning | Python, pandas, scikit-learn |
| Model Persistence | joblib |
| Testing | Vitest |
| External Data | Aviationstack API |
| Development Tools | Git, GitHub, VS Code, Thunder Client |

## Project Structure

```text
airline-ops-sim/
├── server/
│   ├── server.ts
│   └── routes/
│       └── indianFlightData.ts
├── src/
│   ├── engine/
│   │   ├── clock.ts
│   │   ├── decision.ts
│   │   └── mlPredictor.ts
│   └── db/
│       └── data.ts
├── ml/
│   ├── data/
│   ├── models/
│   ├── predict_delay.py
│   ├── prepare_bts_data.py
│   └── train_bts_model.py
├── docs/
│   ├── ARCHITECHTURE.md
│   ├── DECISIONS.md
│   └── LEARNINGS.md
├── db.ts
├── package.json
├── tsconfig.json
└── README.md
```

This is a representative structure. Individual files and directories should be checked against the current repository.

## Getting Started

### Prerequisites

- Node.js and npm.
- Python and pip.
- PostgreSQL.
- An Aviationstack API key for external flight-data synchronization.

### 1. Clone the Repository

```bash
git clone https://github.com/harshitakayy/airline-ops-sim.git
cd airline-ops-sim
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a local `.env` file using the environment-variable names expected by the application.

```dotenv
DB_USER=your_database_user
DB_HOST=localhost
DB_NAME=your_database_name
DB_PASSWORD=your_database_password
DB_PORT=5432

AVIATIONSTACK_API_KEY=your_api_key
```

Use your own credentials. Never commit `.env`, database passwords, or API keys to GitHub.

### 4. Configure PostgreSQL

Create the database and required tables using the project's database schema.

The flight-observation pipeline requires the synchronization-run and observation tables, including their required columns and indexes.

### 5. Start the Backend and Frontend

Check `package.json` for the scripts available in the current version.

If these scripts are defined, start the backend:

```bash
npm run server
```

In another terminal, start the frontend:

```bash
npm run dev
```

### 6. Run Tests and Type Checks

```bash
npm test
npx tsc --noEmit
```

### 7. Prepare the BTS Dataset

From the project root:

```bash
python ml/prepare_bts_data.py
```

To run the separate BTS training experiment:

```bash
python ml/train_bts_model.py
```

The prepared dataset must exist, and the training script must complete successfully before the resulting model can be described as trained.

## Testing

The simulation engine uses Vitest for scenario-based testing, including:

- Delay propagation and schedule-buffer absorption.
- Aircraft location and availability.
- Flight cancellation and downstream dependencies.
- Event generation and ordering.
- Operational metrics.

Database integration, external API requests, and ML predictions should be tested separately.

## Current Limitations

- The simulator is a simplified model, not a production airline operations control system.
- The original ML model uses US domestic 2015 data and has not been validated on Indian operations.
- The BTS January 2026 experiment requires separate training and evaluation.
- Live observations depend on provider access, polling frequency, and subscription limits.
- Confirmed arrival outcomes may not be available for recently observed flights.
- Decision recommendations depend on configured assumptions and simulation fidelity.
- Production deployment and real-world operational validation remain future work.

## Development Roadmap

### Implemented Foundations

- Aircraft and flight models.
- Aircraft rotations and turnaround dependencies.
- Delay propagation and schedule-buffer absorption.
- Disruption handlers and cancellation logic.
- Structured events and operational metrics.
- Express REST API and simulation tests.
- PostgreSQL-backed flight observations.
- External flight-data synchronization.
- Initial ML prediction and decision-support integration.

### Ongoing Improvements

- Improve data quality and coverage.
- Evaluate the BTS model on a chronological holdout.
- Align ML risk predictions with simulation outcomes.
- Strengthen decision feasibility and financial comparisons.
- Expand API, database, and ML integration tests.
- Improve reproducibility and documentation.

## Documentation

- [`ARCHITECHTURE.md`](ARCHITECHTURE.md) — system architecture and data flow.
- [`DECISIONS.md`](DECISIONS.md) — engineering decisions and rationale.
- [`LEARNINGS.md`](LEARNINGS.md) — concepts learned during development.

## Why This Project Matters

This project focuses on understanding the operational dependencies behind airline delays rather than simply displaying flight information.

Instead of only asking where an aircraft is, the simulator asks whether the aircraft can feasibly operate its next flight. It models why delays occur, how they propagate, and how operational decisions may affect the outcome.

The long-term objective is to develop an explainable airline operations simulation and decision-support platform.

**Author:** Harshita Kumawat

**Repository:** https://github.com/harshitakayy/airline-ops-sim
