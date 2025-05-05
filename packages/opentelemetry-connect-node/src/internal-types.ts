import type { StreamRequest, StreamResponse, UnaryRequest, UnaryResponse } from '@connectrpc/connect';

export type InterceptorAnyFn = (req: UnaryRequest | StreamRequest) => Promise<UnaryResponse | StreamResponse>;

export type RpcSystem = 'connect_rpc' | 'grpc' | undefined;

export type RpcKind = 'server' | 'client';

export type RpcPhase = 'request' | 'response';
