import { describe, expect, it } from 'vitest'
import request from "supertest";
import { app } from './index.ts'

describe("GET /health", () => {
  it("should return status ok", async () => {
    const res = await request(app)
      .get("/health")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toStrictEqual({ status: 'ok' });
  });
});