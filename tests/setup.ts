import { afterAll, afterEach } from "vitest";
import { installNetworkPolicy } from "./helpers/network-policy.js";

// Install before test modules are imported, so import-time calls are blocked too.
const network = installNetworkPolicy();
afterEach(() => network.assertNoAttempts());
// With stack-ordered hooks this is registered first and runs after suite cleanup.
afterAll(() => network.assertNoAttempts());
