import { test } from "node:test";
import assert from "node:assert/strict";
import { OramaClient } from "@oramacloud/client";
import { create, insertMultiple } from "@orama/orama";
import { CollectionManager } from "@orama/core";
import { Switch } from "../src/index.js";

test("local client", async () => {
  const db = create({
    schema: {
      name: "string",
      age: "number",
    } as const,
  });

  await insertMultiple(db, [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 40 },
    { name: "Charlie", age: 50 },
  ]);

  const client = new Switch(db);

  const r1 = await client.search({ term: "Alice" });
  const r2 = await client.search({ term: "Bob", where: { age: { eq: 40 } } });
  const r3 = await client.search({
    term: "Charlie",
    where: { age: { lte: 10 } },
  });

  assert.deepStrictEqual(r1?.hits[0].document, { name: "Alice", age: 30 });
  assert.deepStrictEqual(r2?.hits[0].document, { name: "Bob", age: 40 });
  assert.strictEqual(r3?.count, 0);
});

test("orama cloud client", async (t) => {
  const CLOUD_URL = process.env.ORAMA_CLOUD_E2E_URL;
  const CLOUD_API_KEY = process.env.ORAMA_CLOUD_E2E_API_KEY;

  if (!CLOUD_URL || !CLOUD_API_KEY) {
    console.log(
      "Skipping Orama Switch remote client test since ORAMA_CLOUD_E2E_URL and ORAMA_CLOUD_E2E_API_KEY are not set",
    );
    t.skip("Environment variables not set");
    return;
  }

  const orama = new OramaClient({
    api_key: CLOUD_API_KEY,
    endpoint: CLOUD_URL,
  });

  const client = new Switch(orama);

  const r1 = await client.search({ term: "Orama Cloud" });

  assert.ok(r1!.count > 0);
});

test("OramaCore client", async (t) => {
  const ORAMACORE_URL = process.env.ORAMACORE_E2E_URL;
  const ORAMACORE_COLLECTION_ID = process.env.ORAMACORE_E2E_COLLECTION_ID;
  const ORAMACORE_READ_API_KEY = process.env.ORAMACORE_E2E_READ_API_KEY;

  if (
    !ORAMACORE_URL ||
    !ORAMACORE_COLLECTION_ID ||
    !ORAMACORE_READ_API_KEY
  ) {
    console.log(
      "Skipping Orama Switch remote client test since ORAMACORE_E2E_URL, ORAMACORE_E2E_COLLECTION_ID and ORAMACORE_E2E_READ_API_KEY are not set",
    );
    t.skip("Environment variables not set");
    return;
  }

  const collectionManager = new CollectionManager({
    url: ORAMACORE_URL,
    collectionID: ORAMACORE_COLLECTION_ID,
    readAPIKey: ORAMACORE_READ_API_KEY,
  });

  const client = new Switch(collectionManager);

  const r1 = await client.search({ term: "Start" });

  assert.ok(r1!.count > 0);
});
