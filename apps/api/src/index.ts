import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { loadApiConfiguration } from "@pigar/config";
import { AppModule } from "./app.module.js";
import { ProblemDetailsFilter } from "./problem-details.filter.js";

export async function bootstrap(): Promise<NestFastifyApplication> {
  const configuration = loadApiConfiguration(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, bodyLimit: 8 * 1024 }),
    { logger: ["error", "warn", "log"] },
  );

  app.setGlobalPrefix("api");
  app
    .getHttpAdapter()
    .getInstance()
    .addContentTypeParser(
      ["application/octet-stream", "image/jpeg", "image/png", "video/mp4"],
      (_request, payload, done) => done(null, payload),
    );
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen({
    host: configuration.host,
    port: configuration.port,
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  void bootstrap();
}
