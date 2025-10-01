import { createTRPCProxyClient, httpBatchLink, httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { inferProcedureOutput } from "@trpc/server";
import { api } from './config';
import type { AppRouter } from '../../../../dusa/backend/api/src/trpc';

// TRPC client configuration - using the same backend as Dusa interface
const getEnvVar = (key: string, defaultValue?: string) => {
  const val = import.meta.env[key];
  if (val === undefined && !defaultValue)
    throw new Error(`Missing env variable: ${key}`);
  return val ?? defaultValue;
};

export const trpc = createTRPCReact<AppRouter>();
export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: api,
    }),
  ],
});

// Type exports matching Dusa interface
export type Order = NonNullable<
  inferProcedureOutput<AppRouter["getOrders"]>
>[number];

export type OrderExecution = Order;

export type Token = inferProcedureOutput<AppRouter["getToken"]>;
