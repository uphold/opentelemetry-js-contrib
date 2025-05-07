import { ConnectError } from '@connectrpc/connect';
import { RpcKind } from './internal-types';
import { SpanKind } from '@opentelemetry/api';
import { describe, expect, it } from 'vitest';
import { errorCodeToString, isConnectError, resolveRpcSystem, rpcKindToSpanKind } from './utils';

describe('isConnectError()', () => {
  it('should return true for a connect error', () => {
    expect(isConnectError(new ConnectError('foo'))).toBe(true);
  });

  it('should return false for anything else', () => {
    expect(isConnectError(undefined)).toBe(false);
    expect(isConnectError(null)).toBe(false);
    expect(isConnectError('foo')).toBe(false);
    expect(isConnectError(new Error('foo'))).toBe(false);
  });
});

describe('resolveRpcSystem()', () => {
  it('should return `grpc` if `Content-Type` header starts with `application/grpc`', () => {
    expect(resolveRpcSystem(new Headers({ 'Content-Type': 'application/grpc' }))).toBe('grpc');
    expect(resolveRpcSystem(new Headers({ 'Content-Type': 'application/grpc-foo' }))).toBe('grpc');
  });

  it('should return `connect_rpc` if `Connect-Protocol-Version` header is present', () => {
    expect(resolveRpcSystem(new Headers({ 'Connect-Protocol-Version': 'foo' }))).toBe('connect_rpc');
  });

  it('should return `undefined` for everything else', () => {
    expect(resolveRpcSystem(new Headers({}))).toBe(undefined);
  });
});

describe('errorCodeToString()', () => {
  const knownErrorCodes = {
    0: 'ok',
    1: 'canceled',
    2: 'unknown',
    3: 'invalid_argument',
    4: 'deadline_exceeded',
    5: 'not_found',
    6: 'already_exists',
    7: 'permission_denied',
    8: 'resource_exhausted',
    9: 'failed_precondition',
    10: 'aborted',
    11: 'out_of_range',
    12: 'unimplemented',
    13: 'internal',
    14: 'unavailable',
    15: 'data_loss',
    16: 'unauthenticated'
  };

  it('should return the correct string for known error codes', () => {
    Object.entries(knownErrorCodes).forEach(([code, expected]) => {
      expect(errorCodeToString(Number(code))).toBe(expected);
    });
  });

  it('should return `unknown` for undefined or unknown error codes', () => {
    expect(errorCodeToString(undefined)).toBe('unknown');
    expect(errorCodeToString(-1)).toBe('unknown');
    expect(errorCodeToString(17)).toBe('unknown');
  });
});

describe('rpcKindToSpanKind()', () => {
  it('should return `SpanKind.CLIENT` for `client`', () => {
    expect(rpcKindToSpanKind('client')).toBe(SpanKind.CLIENT);
  });

  it('should return `SpanKind.SERVER` for `server`', () => {
    expect(rpcKindToSpanKind('server')).toBe(SpanKind.SERVER);
  });

  it('should return `SpanKind.INTERNAL` for unknown kinds', () => {
    expect(rpcKindToSpanKind('unknown' as RpcKind)).toBe(SpanKind.INTERNAL);
    expect(rpcKindToSpanKind(undefined as unknown as RpcKind)).toBe(SpanKind.INTERNAL);
  });
});
