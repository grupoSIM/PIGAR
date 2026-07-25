export type ApiContractVersion = "0.1.0";

export type HealthResponse = {
  status: "ok";
  service: "api";
  timestamp: string;
};

export * from "./order-state-machine.js";
export * from "./permission-matrix.js";
