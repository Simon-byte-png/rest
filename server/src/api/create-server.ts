import { randomUUID, timingSafeEqual } from "node:crypto";
import Fastify, {
  LogController,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest
} from "fastify";
import { ZodError } from "zod";
import type { AppConfig } from "../config.js";
import {
  CONTRACT_VERSION,
  fatigueCheckInSchema,
  handoffStartRequestSchema,
  restFeedbackSchema,
  restRecommendationRequestSchema,
  usageSummarySchema
} from "../domain/contracts.js";
import {
  AppError,
  toErrorResponse,
  unknownToAppError
} from "../domain/errors.js";
import type { ProviderHealth } from "../domain/ports.js";
import type { HandoffService } from "../application/handoff/handoff-service.js";
import type { RestService } from "../application/rest/rest-service.js";

type DataOrigin = "real" | "mock" | "cached";

export interface ServerDependencies {
  config: AppConfig;
  rest: RestService;
  handoff: HandoffService;
  demoRest: RestService;
  demoHandoff: HandoffService;
  providerHealth(): Promise<Record<string, ProviderHealth>>;
}

interface RequestContext {
  requestId: string;
  origin: DataOrigin;
  rest: RestService;
  handoff: HandoffService;
}

export function createServer(
  dependencies: ServerDependencies
): FastifyInstance {
  const server = Fastify({
    requestIdHeader: "x-request-id",
    genReqId: () => `req_server_${randomUUID()}`,
    logger: {
      level: dependencies.config.LOG_LEVEL,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.x-hush-demo-token",
          "req.headers.cookie",
          "res.headers.set-cookie"
        ],
        censor: "[REDACTED]"
      }
    },
    logController: new LogController({
      disableRequestLogging: true
    })
  });

  server.setErrorHandler((error, request, reply) => {
    const requestId = header(request, "x-request-id") ?? request.id;
    const appError =
      error instanceof ZodError
        ? new AppError({
            code: "INVALID_REQUEST",
            message: "请求格式不符合契约。",
            statusCode: 400,
            retryable: false,
            details: {
              issues: error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message
              }))
            }
          })
        : unknownToAppError(error);
    request.log.error(
      {
        requestId,
        code: appError.code,
        statusCode: appError.statusCode
      },
      "request failed"
    );
    const suppliedDemoToken = header(request, "x-hush-demo-token");
    const origin: DataOrigin =
      dependencies.config.HUSH_DEMO_MODE &&
      suppliedDemoToken !== null &&
      dependencies.config.HUSH_DEMO_TOKEN !== undefined &&
      safeTokenEqual(
        suppliedDemoToken,
        dependencies.config.HUSH_DEMO_TOKEN
      )
        ? "mock"
        : "real";
    setResponseHeaders(reply, requestId, origin);
    void reply
      .status(appError.statusCode)
      .send(toErrorResponse(appError, requestId));
  });

  server.get("/v1/health", async (_request, reply) => {
    reply.header("X-Contract-Version", CONTRACT_VERSION);
    return {
      status: "ok",
      contract_version: CONTRACT_VERSION,
      providers: await dependencies.providerHealth()
    };
  });

  server.post("/v1/rest/evaluate", async (request, reply) => {
    const context = requestContext(request, reply, dependencies, true);
    const input = usageSummarySchema.parse(request.body);
    assertBodyRequestId(input.request_id, context.requestId);
    return context.rest.evaluate(input);
  });

  server.post("/v1/rest/check-in", async (request, reply) => {
    const context = requestContext(request, reply, dependencies, true);
    const input = fatigueCheckInSchema.parse(request.body);
    assertBodyRequestId(input.request_id, context.requestId);
    return context.rest.checkIn(input);
  });

  server.post("/v1/rest/recommend", async (request, reply) => {
    const context = requestContext(request, reply, dependencies, true);
    const input = restRecommendationRequestSchema.parse(request.body);
    assertBodyRequestId(input.request_id, context.requestId);
    return context.rest.recommend(input);
  });

  server.post("/v1/rest/feedback", async (request, reply) => {
    const context = requestContext(request, reply, dependencies, true);
    const idempotencyKey = requiredHeader(request, "idempotency-key");
    const input = restFeedbackSchema.parse(request.body);
    assertBodyRequestId(input.request_id, context.requestId);
    await context.rest.recordFeedback(input, idempotencyKey);
    return reply.status(202).send();
  });

  server.post("/v1/handoff/start", async (request, reply) => {
    const context = requestContext(request, reply, dependencies, true);
    const idempotencyKey = requiredHeader(request, "idempotency-key");
    const input = handoffStartRequestSchema.parse(request.body);
    assertBodyRequestId(input.request_id, context.requestId);
    const job = await context.handoff.start(input, idempotencyKey);
    return reply.status(202).send(job);
  });

  server.get<{
    Params: { jobId: string };
  }>("/v1/handoff/:jobId", async (request, reply) => {
    const context = requestContext(request, reply, dependencies, false);
    return context.handoff.get(request.params.jobId, context.requestId);
  });

  server.post<{
    Params: { jobId: string };
  }>("/v1/handoff/:jobId/cancel", async (request, reply) => {
    const context = requestContext(request, reply, dependencies, false);
    await context.handoff.cancel(request.params.jobId);
    return reply.status(202).send();
  });

  return server;
}

function requestContext(
  request: FastifyRequest,
  reply: FastifyReply,
  dependencies: ServerDependencies,
  hasBody: boolean
): RequestContext {
  const requestId = requiredHeader(request, "x-request-id");
  requiredHeader(request, "x-client-version");
  const contractVersion = requiredHeader(request, "x-contract-version");
  if (contractVersion !== CONTRACT_VERSION) {
    throw new AppError({
      code: "CONTRACT_VERSION_UNSUPPORTED",
      message: "客户端契约版本不受支持。",
      statusCode: 409,
      retryable: false,
      details: {
        requested: contractVersion,
        supported: CONTRACT_VERSION
      }
    });
  }

  const demoToken = header(request, "x-hush-demo-token");
  let demo = false;
  if (demoToken) {
    if (
      !dependencies.config.HUSH_DEMO_MODE ||
      dependencies.config.HUSH_DEMO_TOKEN === undefined ||
      !safeTokenEqual(
        demoToken,
        dependencies.config.HUSH_DEMO_TOKEN
      )
    ) {
      throw new AppError({
        code: "DEMO_MODE_DISABLED",
        message: "样例模式未启用或凭证无效。",
        statusCode: 403,
        retryable: false
      });
    }
    demo = true;
  }
  if (hasBody && request.body === null) {
    throw new AppError({
      code: "INVALID_REQUEST",
      message: "请求正文不能为空。",
      statusCode: 400,
      retryable: false
    });
  }

  const origin: DataOrigin = demo ? "mock" : "real";
  setResponseHeaders(reply, requestId, origin);
  return {
    requestId,
    origin,
    rest: demo ? dependencies.demoRest : dependencies.rest,
    handoff: demo ? dependencies.demoHandoff : dependencies.handoff
  };
}

function assertBodyRequestId(
  bodyRequestId: string,
  headerRequestId: string
): void {
  if (bodyRequestId !== headerRequestId) {
    throw new AppError({
      code: "INVALID_REQUEST",
      message: "正文 request_id 必须与 X-Request-ID 相同。",
      statusCode: 400,
      retryable: false
    });
  }
}

function requiredHeader(
  request: FastifyRequest,
  name: string
): string {
  const value = header(request, name);
  if (!value) {
    throw new AppError({
      code: "INVALID_REQUEST",
      message: `缺少请求头 ${name}。`,
      statusCode: 400,
      retryable: false
    });
  }
  return value;
}

function header(request: FastifyRequest, name: string): string | null {
  const value = request.headers[name];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return typeof value === "string" && value.length > 0 ? value : null;
}

function setResponseHeaders(
  reply: FastifyReply,
  requestId: string,
  origin: DataOrigin
): void {
  reply.header("X-Request-ID", requestId);
  reply.header("X-Contract-Version", CONTRACT_VERSION);
  reply.header("X-Hush-Data-Origin", origin);
}

function safeTokenEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
