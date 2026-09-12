import { describe, expect, it } from "vitest";
import { calculateFinancialImpact } from "./financial";
import type { Flight } from "./types";

const assumptions = {
    delayCostPerMinute: 5000,
    cancellationCost: 200000
};

function createFlight(
    delayMinutes: number,
    status: Flight["status"] = "landed"
): Flight {
    return {
        id: "TEST",
        aircraftId: "VT-TEST",
        from: "BLR",
        to: "BOM",
        scheduledDeparture: "2026-09-12T08:00:00+05:30",
        scheduledArrival: "2026-09-12T10:00:00+05:30",
        delayMinutes,
        status
    };
}

describe("Financial Impact", () => {

    it("returns zero cost when there are no delays or cancellations", () => {
        const flights = [
            createFlight(0)
        ];

        const result = calculateFinancialImpact(
            flights,
            assumptions
        );

        expect(result.delayCost).toBe(0);
        expect(result.cancellationCost).toBe(0);
        expect(result.totalEstimatedLoss).toBe(0);
    });

    it("calculates delay cost correctly", () => {
        const flights = [
            createFlight(60)
        ];

        const result = calculateFinancialImpact(
            flights,
            assumptions
        );

        expect(result.delayCost).toBe(300000);
        expect(result.cancellationCost).toBe(0);
        expect(result.totalEstimatedLoss).toBe(300000);
    });

    it("calculates cancellation cost correctly", () => {
        const flights = [
            createFlight(360, "cancelled")
        ];

        const result = calculateFinancialImpact(
            flights,
            assumptions
        );

        expect(result.delayCost).toBe(1800000);
        expect(result.cancellationCost).toBe(200000);
        expect(result.totalEstimatedLoss).toBe(2000000);
    });

    it("calculates combined delay and cancellation costs", () => {
        const flights = [
            createFlight(120),
            createFlight(60),
            createFlight(360, "cancelled")
        ];

        const result = calculateFinancialImpact(
            flights,
            assumptions
        );

        expect(result.delayCost).toBe(2700000);
        expect(result.cancellationCost).toBe(200000);
        expect(result.totalEstimatedLoss).toBe(2900000);
    });
});