import dns from "node:dns";
import dgram from "node:dgram";
import http from "node:http";
import https from "node:https";
import http2 from "node:http2";
import net from "node:net";
import tls from "node:tls";
import { syncBuiltinESMExports } from "node:module";

interface InstalledGuard {
  target: object;
  key: string;
  api: string;
  handler: () => never;
}

/** Block real sockets even when code catches the immediate error. */
export function installNetworkPolicy(): { assertNoAttempts: () => void } {
  const attempts: string[] = [];
  const guards: InstalledGuard[] = [];
  function deny(api: string): never {
    attempts.push(api);
    throw new Error(`Unexpected network access: ${api}. Inject a fake transport.`);
  }
  function block(target: object, key: string, api: string): void {
    const handler = () => deny(api);
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    // Direct guards belong to this worker, not Vitest's restorable spy registry.
    Object.defineProperty(target, key, {
      value: handler,
      configurable: true,
      writable: true,
      enumerable: descriptor?.enumerable ?? true,
    });
    guards.push({ target, key, api, handler });
  }
  block(globalThis, "fetch", "fetch");
  block(http, "request", "http.request");
  block(http, "get", "http.get");
  block(https, "request", "https.request");
  block(https, "get", "https.get");
  block(http2, "connect", "http2.connect");
  block(net.Socket.prototype, "connect", "socket.connect");
  block(tls, "connect", "tls.connect");
  block(dgram.Socket.prototype, "send", "dgram.send");
  block(dgram.Socket.prototype, "connect", "dgram.connect");
  block(dns, "lookup", "dns.lookup");
  block(dns, "lookupService", "dns.lookupService");
  block(dns.promises, "lookup", "dns.promises.lookup");
  block(dns.promises, "lookupService", "dns.promises.lookupService");
  const resolverMethods = [
    "resolve",
    "resolve4",
    "resolve6",
    "resolveAny",
    "resolveCaa",
    "resolveCname",
    "resolveMx",
    "resolveNaptr",
    "resolveNs",
    "resolvePtr",
    "resolveSoa",
    "resolveSrv",
    "resolveTxt",
    "reverse",
  ] as const;
  for (const method of resolverMethods) {
    block(dns, method, `dns.${method}`);
    block(dns.promises, method, `dns.promises.${method}`);
    block(dns.Resolver.prototype, method, `Resolver.${method}`);
    block(dns.promises.Resolver.prototype, method, `PromiseResolver.${method}`);
  }
  syncBuiltinESMExports();
  return {
    assertNoAttempts() {
      const replaced = guards.find(
        ({ target, key, handler }) =>
          Object.getOwnPropertyDescriptor(target, key)?.value !== handler,
      );
      if (replaced) throw new Error(`Network guard was replaced: ${replaced.api}`);
      const unexpected = attempts.splice(0);
      if (unexpected.length > 0) {
        throw new Error(`Unexpected network attempts: ${unexpected.join(", ")}`);
      }
    },
  };
}
