import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testClient } from "../setup";

describe("Contract: GET /api/messages/{messageId}/deliveries", () => {
  beforeAll(async () => {
    // Setup test environment if needed
  });

  afterAll(async () => {
    // Cleanup test environment if needed
  });

  it("should return delivery status for all channels", async () => {
    const messageId = "test-message-id-123";
    const response = await testClient.get(
      `/api/messages/${messageId}/deliveries`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        messageId,
        deliveries: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            channelId: expect.any(String),
            channelName: expect.any(String),
            status: expect.stringMatching(/^(pending|sent|failed)$/),
            sentAt: expect.any(String),
            error: expect.any(String),
            retryCount: expect.any(Number),
          }),
        ]),
        summary: expect.objectContaining({
          total: expect.any(Number),
          sent: expect.any(Number),
          failed: expect.any(Number),
          pending: expect.any(Number),
        }),
      }),
    );
  });

  it("should require authentication", async () => {
    const messageId = "test-message-id-123";
    const response = await testClient.get(
      `/api/messages/${messageId}/deliveries`,
    );

    expect([401, 403]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining("authentication"),
      }),
    );
  });

  it("should return 404 for non-existent message", async () => {
    const messageId = "non-existent-message-id";
    const response = await testClient.get(
      `/api/messages/${messageId}/deliveries`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining("Message not found"),
      }),
    );
  });

  it("should filter deliveries by status", async () => {
    const messageId = "filter-test-message-id";
    const response = await testClient.get(
      `/api/messages/${messageId}/deliveries?status=failed`,
    );

    if (response.status === 200) {
      const body = response.body as { deliveries: Array<{ status: string }> };
      const deliveries = body.deliveries;

      deliveries.forEach((delivery) => {
        expect(delivery.status).toBe("failed");
      });
    }
  });

  it("should support pagination for large channel lists", async () => {
    const messageId = "pagination-test-message-id";
    const response = await testClient.get(
      `/api/messages/${messageId}/deliveries?limit=10&offset=0`,
    );

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          deliveries: expect.any(Array),
          pagination: expect.objectContaining({
            total: expect.any(Number),
            limit: 10,
            offset: 0,
            hasMore: expect.any(Boolean),
          }),
        }),
      );

      const body = response.body as { deliveries: unknown[] };
      const deliveries = body.deliveries;
      expect(deliveries.length).toBeLessThanOrEqual(10);
    }
  });

  it("should include error details for failed deliveries", async () => {
    const messageId = "error-details-message-id";
    const response = await testClient.get(
      `/api/messages/${messageId}/deliveries?status=failed`,
    );

    if (response.status === 200) {
      const body = response.body as {
        deliveries: Array<{
          status: string;
          error?: string;
          retryCount: number;
        }>;
      };

      const failedDeliveries = body.deliveries.filter(
        (d) => d.status === "failed",
      );
      failedDeliveries.forEach((delivery) => {
        expect(delivery.error).toBeTruthy();
        expect(delivery.retryCount).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it("should provide real-time updates via polling", async () => {
    const messageId = "realtime-test-message-id";
    const response = await testClient.get(
      `/api/messages/${messageId}/deliveries`,
    );

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          lastUpdated: expect.any(String),
          isComplete: expect.any(Boolean),
        }),
      );
    }
  });
});
    const messageId = "realtime-test-message-id";
    const response = await testClient.get(
      `/api/messages/${messageId}/deliveries`,
    );

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          lastUpdated: expect.any(String),
          isComplete: expect.any(Boolean),
        }),
      );
    }
  });
});
