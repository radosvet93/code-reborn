import { describe, expect, it } from 'vitest'
import request from "supertest";
import { app } from './app.ts'

describe("GET /health", () => {
  it("should return status ok", async () => {
    const res = await request(app)
      .get("/health")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toStrictEqual({ status: 'ok' });
  });
});

describe("POST /health", () => {
  it("should return status ok", async () => {
    const res = await request(app)
      .post("/health")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body).toStrictEqual({ message: 'Error' });
  });
});

describe("GET /any-route", () => {
  it("should return message Error and a 404", async () => {
    const res = await request(app)
      .get("/any-route")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(res.body).toStrictEqual({ message: 'Error' });
  });
});