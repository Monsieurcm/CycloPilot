import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  health(): { status: string; app: string; version: string } {
    return {
      status: "ok",
      app: "CycloPilot",
      version: "0.1-alpha",
    };
  }
}
