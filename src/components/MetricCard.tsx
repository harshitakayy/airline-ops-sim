import "./MetricCard.css";
import { Plane, Clock3, CircleX, Activity } from "lucide-react";

interface SimulationMetrics {
  onTimeFlights: number;
  delayedFlights: number;
  cancelledFlights: number;
  averageDelay: number;
  aircraftUtilization: number;
}

interface MetricCardProps {
  metrics: SimulationMetrics;
}

export default function MetricCard({ metrics }: MetricCardProps) {
  const totalFlights =
    metrics.onTimeFlights +
    metrics.delayedFlights +
    metrics.cancelledFlights;

  const cards = [
    {
      title: "Flights",
      value: totalFlights,
      icon: <Plane size={20} />,
    },
    {
      title: "Avg Delay",
      value: `${metrics.averageDelay.toFixed(1)} hr`,
      icon: <Clock3 size={20} />,
    },
    {
      title: "Cancelled",
      value: metrics.cancelledFlights,
      icon: <CircleX size={20} />,
    },
    {
      title: "Utilization",
      value: `${metrics.aircraftUtilization.toFixed(0)}%`,
      icon: <Activity size={20} />,
    },
  ];

  return (
    <div className="metric-grid">
      {cards.map((card) => (
        <div className="metric-card" key={card.title}>
          <div className="metric-top">
            <span className="metric-title">{card.title}</span>

            <div className="metric-icon">
              {card.icon}
            </div>
          </div>

          <h2 className="metric-value">
            {card.value}
          </h2>
        </div>
      ))}
    </div>
  );
}