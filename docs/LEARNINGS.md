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

Flight A
Delayed by 1 hour

↓

Aircraft still becomes available before Flight B's scheduled departure.

↓

Flight B leaves on time.

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

Why?

- Easier to test
- Easier to expose through an API
- Easier to display in a frontend

---

## Automated Testing

The simulation engine is tested using Vitest.

Instead of manually changing `data.ts`, every test creates its own simulation scenario.

This allows the engine to be tested independently for many different situations.