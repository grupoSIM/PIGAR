import { ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import type { FastifyReply } from "fastify";

@Catch(HttpException)
export class ProblemDetailsFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const body = exception.getResponse();
    const detail = typeof body === "string" ? body : undefined;
    const response = typeof body === "object" && body !== null ? body : {};
    reply
      .code(exception.getStatus())
      .type("application/problem+json")
      .send({
        code: responseCode(response),
        status: exception.getStatus(),
        title: responseTitle(response),
        type: "https://pigar.local/problems/request-rejected",
        ...(detail ? { detail } : {}),
      });
  }
}

function responseCode(value: object) {
  const code = "code" in value ? value.code : undefined;
  return typeof code === "string" ? code : "REQUEST_REJECTED";
}

function responseTitle(value: object) {
  const message = "message" in value ? value.message : undefined;
  return typeof message === "string" ? message : "Solicitud rechazada";
}
