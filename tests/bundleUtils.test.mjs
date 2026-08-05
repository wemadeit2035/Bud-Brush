import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePrice,
  applyCartBundles,
} from "../src/services/bundleUtils.js";

test("calculatePrice applies greenhouse pre-roll bundle pricing", () => {
  const product = {
    id: "p1",
    category: "Greenhouse",
    type: "Pre-roll",
    price: 70,
    bundles: [{ qty: 3, price: 150 }],
  };

  assert.equal(calculatePrice(product, 3), 150);
  assert.equal(calculatePrice(product, 4), 220);
});

test("applyCartBundles returns bundle-aware totals", () => {
  const products = [
    {
      id: "p1",
      category: "Greenhouse",
      type: "Pre-roll",
      price: 70,
      bundles: [{ qty: 3, price: 150 }],
    },
  ];

  const result = applyCartBundles([{ productId: "p1", quantity: 3 }], products);

  assert.equal(result.total, 150);
  assert.equal(result.discount, 60);
  assert.equal(result.items[0].isBundle, true);
});

test("applyCartBundles honors a manual line-total override", () => {
  const products = [
    {
      id: "p1",
      category: "Greenhouse",
      type: "Pre-roll",
      price: 70,
      bundles: [{ qty: 3, price: 150 }],
    },
  ];

  const result = applyCartBundles(
    [{ productId: "p1", quantity: 3, customPrice: 123 }],
    products,
  );

  assert.equal(result.total, 123);
  assert.equal(result.items[0].lineTotal, 123);
  assert.equal(result.items[0].customPrice, 123);
});
