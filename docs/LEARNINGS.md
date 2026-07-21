# Learnings

This document contains concepts I learned while building this project.

---

## Simulation State

### Problem

Initially, `runSimulation()` always created its own flight and aircraft data.

This made testing difficult because every test had to use the same schedule.

### Solution

`runSimulation()` was updated so it can also accept a custom simulation scenario.

```ts
runSimulation();
runSimulation(customScenario);
```

### What I learned

Separating the simulation engine from its input data makes the code much easier to test.

---

## Configurable Simulation Options

The simulation can now receive configuration through a `SimulationOptions` object.

Example:

```ts
runSimulation(data, {
    disruptions: [...]
});
```

### What I learned

Optional configuration objects make software much more flexible.

Instead of modifying source code for every new scenario, the simulation can be configured by external clients through a REST API.

---

## Delay Propagation

A flight cannot always depart at its scheduled departure time.

The actual departure depends on:

- Previous flight arrival
- Delay on the previous flight
- Aircraft turnaround time

The engine calculates:

```text
actual departure =
max(
    scheduled departure,
    previous actual arrival + turnaround time
)
```

This allows delays to naturally propagate through an aircraft rotation.

---

## Buffer Absorption

Not every delay affects later flights.

If there is enough scheduled ground time between two flights, the aircraft can recover before the next departure.

Example:

```
Flight A
Delayed by 1 hour

↓

Aircraft still becomes available before Flight B's scheduled departure.

↓

Flight B leaves on time.
```
---

## Flight Cancellation

Real airline operations cannot always recover from large delays.

The simulator now supports flight cancellation when a flight's accumulated delay exceeds a predefined threshold.

Example:

```text
Delay = 6 hours

↓

Flight cancelled

↓

Aircraft remains at origin
```
## Aircraft Availability

A flight cannot depart simply because its scheduled departure time has arrived.

The assigned aircraft must also be physically available at the departure airport.

Example:

```text
Flight A

↓

Cancelled

↓

Aircraft never reaches Airport B

↓

Flight B cannot operate
```

### What I learned

Aircraft rotations create dependencies between flights.

A disruption affecting one flight can prevent later flights from operating even if those later flights have no direct disruption.

---

## Flight Dependencies

Each flight depends on the previous flight within the aircraft's rotation.

The simulator checks the previous flight before calculating departures.

Possible states include:

```text
Previous Flight

↓

Landed
    → Continue normally

Cancelled
    → Cancel downstream flight

Scheduled / Departed
    → Wait until aircraft becomes available
```

### What I learned

Aircraft movement is state-driven rather than purely time-driven.

The status of previous flights determines whether later flights are able to operate.

---

## Operational Metrics

After the simulation completes, the engine calculates summary statistics describing the overall operational performance.

Current metrics include:

- Average delay
- On-time flights
- Delayed flights
- Cancelled flights
- Aircraft utilization

### What I learned

Raw simulation events are useful for debugging, but operational metrics provide a concise summary of system performance.

This separation mirrors real airline operations software, where detailed event logs and high-level KPIs serve different purposes.

---

### What I learned

Cancellation is a business rule rather than a scheduling rule.

Instead of endlessly delaying a flight, the simulator can terminate it and prevent unrealistic operations.

---

### What I learned

A schedule can absorb small disruptions without propagating delays through the rest of an aircraft's rotation.

---

## Structured Events

Initially I used `console.log()` to observe departures and arrivals.

Later I replaced console output with structured events.

Example:

```ts
{
    time: 8,
    type: "departure",
    flightId: "AI101"
}
```

### Why?

- Easier testing
- Easier to expose through an API
- Easier to display in a frontend

---

## Operational Event Timeline

The simulation now records operational events such as disruptions before flight events occur.

Example:

```text
Weather disruption

↓

Flight delays

↓

Departures

↓

Arrivals
```

### What I learned

Recording both the cause and the resulting operational events creates a complete history of the simulation.

This makes debugging and visualization much easier.

---

## Modular Simulation Design

The disruption system was separated from the simulation clock.

```text
runSimulation()

↓

applyDisruptions()

↓

Weather
Crew
Technical
```

### What I learned

Splitting responsibilities across modules keeps each component focused on one task.

The simulation clock advances time.

The disruption system modifies flight schedules.

---

## Specialized Handlers

Different disruption types are handled by different functions.

Example:

```text
applyWeather()

applyCrew()

applyTechnical()
```

### What I learned

Even when implementations are initially similar, separating them makes future extensions much easier.

Each disruption type can evolve independently.

---

## Type Aliases

Besides interfaces, TypeScript also supports custom types.

Example:

```ts
export type EventType =
    | "departure"
    | "arrival"
    | "delay"
    | "weather"
    | "technical"
    | "crew"
    | "cancellation";
```

### What I learned

Interfaces describe object structures.

Type aliases can describe many kinds of types, including unions of string literals.

---

## Optional Properties

TypeScript allows object properties to be optional.

Example:

```ts
flightId?: string;
```

### What I learned

Not every event belongs to a specific flight.

Weather events affect airports, so `flightId` should not always be required.

---

## Automated Testing

The simulation engine is tested using Vitest.

Instead of manually changing `data.ts`, every test creates its own simulation scenario.

This allows the engine to be tested independently for many different situations.

### What I learned

Good tests should be isolated from one another and should not depend on shared application state.

---

# Backend Development

---

## What is an API?

An API (Application Programming Interface) allows different software applications to communicate with one another.

In this project, the Express API acts as the communication layer between the frontend and the simulation engine.

```
Frontend

↓

HTTP Request

↓

Express API

↓

Simulation Engine

↓

JSON Response

↓

Frontend
```

### What I learned

The frontend should not directly call the simulation engine.

Instead, it communicates with the backend through HTTP requests.

---

## Express

Express is a Node.js framework used to build web servers and APIs.

It provides functions such as:

```ts
app.get(...)
app.post(...)
app.listen(...)
```

### What I learned

Express is a tool for creating web servers.

It is not the same thing as a REST API.

---

## REST APIs

A REST API organizes endpoints around resources.

Examples:

```
GET  /flights
GET  /flights/:id
GET  /aircraft
GET  /events
POST /simulation/run
```

### What I learned

REST is a design style, not a library.

Express can be used to build REST APIs, but Express itself does not enforce REST principles.

---

## HTTP Methods

Different HTTP methods have different purposes.

```
GET    → Retrieve data

POST   → Perform an action or create data

PUT    → Update existing data

DELETE → Remove data
```

### What I learned

Choosing the correct HTTP method makes an API more predictable and easier to understand.

---

## Route Parameters

Express allows part of a URL to be treated as a variable.

Example:

```ts
app.get("/flights/:id")
```

If the request is:

```
GET /flights/AI102
```

then

```ts
req.params.id
```

contains

```
AI102
```

### What I learned

Route parameters allow a single endpoint to serve many resources.

---

## Request Body

Clients can send JSON data to the server using a POST request.

Example request:

```json
{
    "disruptions": [
        {
            "type": "weather",
            "airport": "BLR",
            "delayHours": 3
        }
    ]
}
```

Express converts this JSON into a JavaScript object through:

```ts
app.use(express.json());
```

The data becomes available as:

```ts
req.body
```

### What I learned

The request body allows clients to configure how the simulation should run without modifying backend code.

---

## JSON

The backend returns JavaScript objects as JSON.

Example:

```ts
res.json(simulation);
```

### What I learned

JSON is the standard format for exchanging structured data over HTTP because it is lightweight, readable, and supported by many programming languages.

---

## HTTP Status Codes

An API should return meaningful status codes.

Example:

```
200 OK

404 Not Found

500 Internal Server Error
```

### What I learned

Returning proper status codes makes APIs easier for other applications to understand and debug.

---

## Frontend vs Backend

Frontend:

- Displays information
- Handles user interaction

Backend:

- Executes business logic
- Runs simulations
- Communicates with databases
- Exposes APIs

### What I learned

The frontend and backend are separate applications that communicate through HTTP.

---

## Backend and Databases

The frontend should never communicate directly with a database.

Instead:

```
Frontend

↓

Backend

↓

Database
```

### What I learned

The backend protects database credentials, validates requests, and controls access to stored data.

---

## Thunder Client

Thunder Client allows HTTP requests to be sent directly from VS Code.

It was used to test:

- GET requests
- POST requests
- JSON request bodies
- API responses

### What I learned

API development can be tested independently of the frontend.