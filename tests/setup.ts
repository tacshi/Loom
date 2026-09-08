import { setTimeout as yieldToEventLoop } from "node:timers/promises";
import { afterEach } from "vitest";

// Synchronous circuit simulations can keep a whole file in the microtask queue
// for over a minute. Let Vitest receive worker-report acknowledgements between
// tests instead of timing out after all assertions have already passed.
afterEach(() => yieldToEventLoop(0));
