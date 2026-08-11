import assert from "node:assert/strict";
import test from "node:test";

import { containsProfanity } from "../lib/profanity.ts";

test("allows ordinary player names", () => {
  assert.equal(containsProfanity("Jordan Smith"), false);
  assert.equal(containsProfanity("Scunthorpe United"), false);
});

test("blocks profanity as a name token", () => {
  assert.equal(containsProfanity("John Fuck Smith"), true);
  assert.equal(containsProfanity("B!TCH"), true);
  assert.equal(containsProfanity("sh1t"), true);
});
