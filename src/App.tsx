import { useEffect, useState } from "react";
import "./App.css";

import FlightTable from "./components/FlightTable";
import MetricCard from "./components/MetricCard";
import EventList from "./components/EventList";
import AircraftPanel from "./components/AircraftPanel";

import type { Flight, Aircraft } from "./engine/types";

interface Event {
  time: number;
  type: string;
  flightId?: string;
  message: string;
}

interface SimulationMetrics {
  onTimeFlights: number;
  delayedFlights: number;
  cancelledFlights: number;
  averageDelay: number;
  aircraftUtilization: number;
}

export default function App() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);

  const [metrics, setMetrics] = useState<SimulationMetrics>({
    onTimeFlights: 0,
    delayedFlights: 0,
    cancelledFlights: 0,
    averageDelay: 0,
    aircraftUtilization: 0,
  });

  useEffect(() => {
    fetch("http://localhost:3000/simulation")
      .then((res) => res.json())
      .then((data) => {
        setFlights(data.flights);
        setEvents(data.events);
        setAircrafts(data.aircrafts);
        setMetrics(data.metrics);
      })
      .catch((err) => {
        console.error("Failed to fetch simulation:", err);
      });
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <h1>Airline Operations Dashboard</h1>
          <p>Flight Rotation & Delay Simulation</p>
        </div>
      </header>

      <section className="metrics-section">
        <MetricCard metrics={metrics} />
      </section>

      <section className="dashboard-grid">
        <div className="main-column">
          <FlightTable flights={flights} />

          <EventList events={events} />
        </div>

        <aside className="side-column">
          <AircraftPanel aircrafts={aircrafts} />
        </aside>
      </section>
    </main>
  );
}