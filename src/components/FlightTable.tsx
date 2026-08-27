import type { Flight } from "../engine/types";
import "./FlightTable.css";

interface FlightTableProps {
  flights: Flight[];
}

function getStatusClass(status: string) {
  switch (status) {
    case "landed":
      return "status landed";
    case "departed":
      return "status departed";
    case "cancelled":
      return "status cancelled";
    default:
      return "status scheduled";
  }
}

function FlightTable({ flights }: FlightTableProps) {
  return (
    <div className="card">
      <h2 className="section-title">Flights</h2>

      <table className="flight-table">
        <thead>
          <tr>
            <th>Flight</th>
            <th>Route</th>
            <th>Aircraft</th>
            <th>Status</th>
            <th>Delay</th>
          </tr>
        </thead>

        <tbody>
          {flights.map((flight) => (
            <tr key={flight.id}>
              <td>{flight.id}</td>

              <td>
                {flight.from} → {flight.to}
              </td>

              <td>{flight.aircraftId}</td>

              <td>
                <span className={getStatusClass(flight.status)}>
                  {flight.status}
                </span>
              </td>

              <td>
                {flight.delayHours === 0
                  ? "-"
                  : `${flight.delayHours} hr`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FlightTable;