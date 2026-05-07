import { x402ResourceServer } from "@x402/core/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";

let _initPromise: Promise<x402ResourceServer> | null = null;

function buildServer(): Promise<x402ResourceServer> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const server = new x402ResourceServer();
    server.register("solana:*", new ExactSvmScheme());
    await server.initialize();
    return server;
  })();
  return _initPromise;
}

export async function getServer(): Promise<x402ResourceServer> {
  return buildServer();
}
