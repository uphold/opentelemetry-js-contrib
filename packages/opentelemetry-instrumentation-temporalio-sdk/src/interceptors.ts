import * as otel from '@opentelemetry/api';
import type { Context as ActivityContext } from '@temporalio/activity';
import {
  ActivityExecuteInput,
  ActivityInboundCallsInterceptor,
  ActivityOutboundCallsInterceptor,
  GetLogAttributesInput
} from '@temporalio/worker';
import type { Next, WorkflowClientInterceptor, WorkflowSignalInput, WorkflowStartInput } from '@temporalio/client';
import { extractContextFromHeaders, headersWithContext, instrument } from './helpers';

const RUN_ID_ATTR_KEY = 'run_id';

enum SpanName {
  WORKFLOW_START = 'StartWorkflow',
  WORKFLOW_SIGNAL = 'SignalWorkflow',
  ACTIVITY_START = 'StartActivity',
  ACTIVITY_EXECUTE = 'RunActivity'
}

export class OpenTelemetryWorkflowClientInterceptor implements WorkflowClientInterceptor {
  private tracer: otel.Tracer;

  constructor(tracer: otel.Tracer) {
    this.tracer = tracer;
  }

  async start(input: WorkflowStartInput, next: Next<WorkflowClientInterceptor, 'start'>): Promise<string> {
    return await instrument({
      fn: async span => {
        const headers = headersWithContext(input.headers);
        const runId = await next({ ...input, headers });

        span.setAttribute(RUN_ID_ATTR_KEY, runId);

        return runId;
      },
      spanName: `${SpanName.WORKFLOW_START}:${input.workflowType}`,
      tracer: this.tracer
    });
  }

  async signal(input: WorkflowSignalInput, next: Next<WorkflowClientInterceptor, 'signal'>): Promise<void> {
    return await instrument({
      fn: async () => {
        const headers = headersWithContext(input.headers);

        await next({ ...input, headers });
      },
      spanName: `${SpanName.WORKFLOW_SIGNAL}:${input.signalName}`,
      tracer: this.tracer
    });
  }
}

export class OpenTelemetryWorkerActivityInboundInterceptor implements ActivityInboundCallsInterceptor {
  private ctx: ActivityContext;
  private tracer: otel.Tracer;

  constructor(ctx: ActivityContext, tracer: otel.Tracer) {
    this.ctx = ctx;
    this.tracer = tracer;
  }

  async execute(input: ActivityExecuteInput, next: Next<ActivityInboundCallsInterceptor, 'execute'>): Promise<unknown> {
    const context = extractContextFromHeaders(input.headers);
    const spanName = `${SpanName.ACTIVITY_EXECUTE}:${this.ctx.info.activityType}`;

    return await instrument({ context, fn: () => next(input), spanName, tracer: this.tracer });
  }
}

export class OpenTelemetryWorkerActivityOutboundInterceptor implements ActivityOutboundCallsInterceptor {
  public getLogAttributes(
    input: GetLogAttributesInput,
    next: Next<ActivityOutboundCallsInterceptor, 'getLogAttributes'>
  ): Record<string, unknown> {
    const span = otel.trace.getSpan(otel.context.active());
    const spanContext = span?.spanContext();

    if (spanContext && otel.isSpanContextValid(spanContext)) {
      return next({
        ...input,
        span_id: spanContext.spanId,
        trace_flags: `0${spanContext.traceFlags.toString(16)}`,
        trace_id: spanContext.traceId
      });
    }

    return next(input);
  }
}
