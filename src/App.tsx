import { useEffect, useState } from "react";
import "./App.css";

import FlightTable from "./components/FlightTable";
import MetricCard from "./components/MetricCard";
import EventList from "./components/EventList";

interface Flight {
  flightNumber: string;
  origin: string;
  destination: string;
  aircraftId: string;
  status: string;
  delay: number;
}

interface Event {
  timestamp: number;
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
  const [metrics, setMetrics] = useState<SimulationMetrics>({
    onTimeFlights: 0,
    delayedFlights: 0,
    cancelledFlights: 0,
    averageDelay: 0,
    aircraftUtilization: 0,
  });

  useEffect(() => {
    fetch("http://localhost:3000/flights")
      .then((res) => res.json())
      .then(setFlights);

    fetch("http://localhost:3000/events")
      .then((res) => res.json())
      .then(setEvents);

    fetch("http://localhost:3000/metrics")
      .then((res) => res.json())
      .then(setMetrics);
  }, []);

  return (
    <div className="app">
      <div className="header">
        <h1>Airline Operations Dashboard</h1>
        <p>Flight Rotation & Delay Simulation</p>
      </div>

      <div className="metrics-section">
        <MetricCard metrics={metrics} />
      </div>

      <div className="dashboard">
        <div className="panel">
          <div className="panel-header">
            <h2>Flights</h2>
          </div>

          <div className="panel-body">
            <FlightTable flights={flights} />
          </div>
        </div>

        <EventList events={events} />
      </div>
    </div>
  );
}