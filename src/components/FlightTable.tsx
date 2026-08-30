import type { Flight } from "../engine/types";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface FlightTableProps {
  flights: Flight[];
}

function getStatusClass(status: string) {
  switch (status) {
    case "landed":
      return "status-badge status-landed";

    case "departed":
      return "status-badge status-departed";

    case "cancelled":
      return "status-badge status-cancelled";

    default:
      return "status-badge status-scheduled";
  }
}

function FlightTable({ flights }: FlightTableProps) {
  return (
    <Card className="dashboard-card">
      <CardHeader className="dashboard-card-header">
        <CardTitle className="dashboard-card-title">
          Flights
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flight-table-wrapper">
          <Table className="flight-table">
            <TableHeader>
              <TableRow>
                <TableHead>Flight</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Aircraft</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delay</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {flights.map((flight) => (
                <TableRow key={flight.id}>
                  <TableCell className="flight-id">
                    {flight.id}
                  </TableCell>

                  <TableCell className="route">
                    {flight.from} → {flight.to}
                  </TableCell>

                  <TableCell className="aircraft-id">
                    {flight.aircraftId}
                  </TableCell>

                  <TableCell>
                    <span className={getStatusClass(flight.status)}>
                      {flight.status}
                    </span>
                  </TableCell>

                  <TableCell>
                    {flight.delayHours === 0 ? (
                      <span className="delay-none">—</span>
                    ) : (
                      <span className="delay-value">
                        {flight.delayHours} hr
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default FlightTable;