import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";

describe("server listener configuration", () => {
  it("defaults to a loopback-only listener", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      LOG_LEVEL: "silent"
    });

    expect(config.HOST).toBe("127.0.0.1");
    expect(config.PORT).toBe(3000);
  });

  it("allows an explicit trusted-LAN listener and custom port", () => {
    const config = loadConfig({
      NODE_ENV: "demo",
      HOST: "0.0.0.0",
      PORT: "4310",
      HUSH_DEMO_MODE: "true",
      HUSH_DEMO_TOKEN: "local-demo-token",
      LOG_LEVEL: "silent"
    });

    expect(config.HOST).toBe("0.0.0.0");
    expect(config.PORT).toBe(4310);
  });
});
