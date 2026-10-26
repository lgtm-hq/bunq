import dns from "node:dns";
import dgram from "node:dgram";
import http from "node:http";
import https from "node:https";
import http2 from "node:http2";
import net from "node:net";
import tls from "node:tls";
import { syncBuiltinESMExports } from "node:module";
import { vi } from "vitest";

/** Block real sockets even when code catches the immediate error. */
export function installNetworkPolicy(): { assertNoAttempts: () => void } {
  const attempts: string[] = [];
  function deny(api: string): never {
    attempts.push(api);
    throw new Error(`Unexpected network access: ${api}. Inject a fake transport.`);
  }
  vi.spyOn(globalThis, "fetch").mockImplementation(() => deny("fetch"));
  vi.spyOn(http, "request").mockImplementation(() => deny("http.request"));
  vi.spyOn(http, "get").mockImplementation(() => deny("http.get"));
  vi.spyOn(https, "request").mockImplementation(() => deny("https.request"));
  vi.spyOn(https, "get").mockImplementation(() => deny("https.get"));
  vi.spyOn(http2, "connect").mockImplementation(() => deny("http2.connect"));
  vi.spyOn(net.Socket.prototype, "connect").mockImplementation(() => deny("socket.connect"));
  vi.spyOn(tls, "connect").mockImplementation(() => deny("tls.connect"));
  vi.spyOn(dgram.Socket.prototype, "send").mockImplementation(() => deny("dgram.send"));
  vi.spyOn(dgram.Socket.prototype, "connect").mockImplementation(() => deny("dgram.connect"));
  vi.spyOn(dns, "lookup").mockImplementation(() => deny("dns.lookup"));
  vi.spyOn(dns, "lookupService").mockImplementation(() => deny("dns.lookupService"));
  vi.spyOn(dns.promises, "lookup").mockImplementation(() => deny("dns.promises.lookup"));
  vi.spyOn(dns.promises, "lookupService").mockImplementation(() =>
    deny("dns.promises.lookupService"),
  );
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
    vi.spyOn(dns, method).mockImplementation(() => deny(`dns.${method}`));
    vi.spyOn(dns.promises, method).mockImplementation(() => deny(`dns.promises.${method}`));
    vi.spyOn(dns.Resolver.prototype, method).mockImplementation(() => deny(`Resolver.${method}`));
    vi.spyOn(dns.promises.Resolver.prototype, method).mockImplementation(() =>
      deny(`PromiseResolver.${method}`),
    );
  }
  syncBuiltinESMExports();
  return {
    assertNoAttempts() {
      const unexpected = attempts.splice(0);
      if (unexpected.length > 0) {
        throw new Error(`Unexpected network attempts: ${unexpected.join(", ")}`);
      }
    },
  };
}
