import type { ConnectError } from '@connectrpc/connect';
import { RpcKind, RpcSystem } from './internal-types';
import { SpanKind } from '@opentelemetry/api';

export const isConnectError = (err: unknown): err is ConnectError => {
  const connectErr = err as ConnectError;

  return (
    connectErr != null &&
    typeof connectErr.message === 'string' &&
    typeof connectErr.rawMessage === 'string' &&
    Number.isInteger(connectErr.code) &&
    connectErr.metadata instanceof Headers
  );
};

export const resolveRpcSystem = (header: Headers): RpcSystem => {
  if (header.get('Content-Type')?.startsWith('application/grpc')) {
    return 'grpc';
  }

  if (header.has('Connect-Protocol-Version')) {
    return 'connect_rpc';
  }

  return undefined;
};

export const errorCodeToString = (code?: number) => {
  switch (code) {
    case 0:
      return 'ok';
    case 1:
      return 'canceled';
    case 2:
      return 'unknown';
    case 3:
      return 'invalid_argument';
    case 4:
      return 'deadline_exceeded';
    case 5:
      return 'not_found';
    case 6:
      return 'already_exists';
    case 7:
      return 'permission_denied';
    case 8:
      return 'resource_exhausted';
    case 9:
      return 'failed_precondition';
    case 10:
      return 'aborted';
    case 11:
      return 'out_of_range';
    case 12:
      return 'unimplemented';
    case 13:
      return 'internal';
    case 14:
      return 'unavailable';
    case 15:
      return 'data_loss';
    case 16:
      return 'unauthenticated';
    default:
      return 'unknown';
  }
};

export const rpcKindToSpanKind = (kind: RpcKind) => {
  switch (kind) {
    case 'client':
      return SpanKind.CLIENT;
    case 'server':
      return SpanKind.SERVER;
    default:
      return SpanKind.INTERNAL;
  }
};
