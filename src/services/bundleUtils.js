export function calculatePrice(product, quantity) {
  if (!product || quantity <= 0) return 0;

  const unitPrice = Number(product.price) || 0;
  let best = unitPrice * quantity;

  const rules = product.bundles || [];
  rules.forEach((rule) => {
    if (!rule || rule.qty <= 0) return;
    const count = Math.floor(quantity / rule.qty);
    const rem = quantity % rule.qty;
    const total = count * Number(rule.price) + rem * unitPrice;
    if (total < best) best = total;
  });

  if (product.category === "Greenhouse" && product.type === "Pre-roll") {
    if (quantity >= 3) {
      const bundleCount = Math.floor(quantity / 3);
      const rem = quantity % 3;
      const total = bundleCount * 150 + rem * unitPrice;
      if (total < best) best = total;
    }
  }

  if (product.category === "Indoor" && product.type === "Pre-roll") {
    if (quantity >= 3) {
      const bundleCount = Math.floor(quantity / 3);
      const rem = quantity % 3;
      const total = bundleCount * 300 + rem * unitPrice;
      if (total < best) best = total;
    }
  }

  return best;
}

export function getAvailableBundles(product, cartItems, products) {
  const bundles = [];
  const cartProductItems = cartItems.filter(
    (item) => item.productId === product.id,
  );
  const cartQuantity = cartProductItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const customBundles = Array.isArray(product?.bundles) ? product.bundles : [];
  customBundles.forEach((bundle, index) => {
    const qty = Number(bundle.qty) || 0;
    const price = Number(bundle.price) || 0;
    if (qty <= 0) return;

    bundles.push({
      id: bundle.id || `custom-${product.id}-${index}`,
      name:
        bundle.name && bundle.name.trim().length > 0
          ? bundle.name
          : `Custom Bundle (${qty} for R${price})`,
      price,
      qty,
      currentQty: cartQuantity,
      isActive: cartQuantity >= qty,
      type: "custom",
      category: product.category,
      productType: product.type,
    });
  });

  if (product.category === "Greenhouse" && product.type === "Pre-roll") {
    const currentQty = cartQuantity;
    bundles.push({
      id: "greenhouse-pr-3",
      name: `Greenhouse PR Special (3 for R150)`,
      price: 150,
      qty: 3,
      currentQty,
      isActive: currentQty >= 3,
      type: "greenhouse-pr",
      category: "Greenhouse",
      productType: "Pre-roll",
    });
  }

  if (product.category === "Greenhouse" && product.type === "Flower") {
    const currentQty = cartQuantity;
    bundles.push({
      id: "greenhouse-flower-5",
      name: `Greenhouse Bud Special (5g for R250)`,
      price: 250,
      qty: 5,
      currentQty,
      isActive: currentQty >= 5,
      type: "greenhouse-flower",
      category: "Greenhouse",
      productType: "Flower",
    });
  }

  if (
    (product.category === "Indoor" ||
      product.category === "Indoor Exotic" ||
      product.category === "Indoor Hydro") &&
    product.type === "Pre-roll"
  ) {
    const currentQty = cartQuantity;
    bundles.push({
      id: "indoor-pr-3",
      name: `Indoor PR Special (3 for R300)`,
      price: 300,
      qty: 3,
      currentQty,
      isActive: currentQty >= 3,
      type: "indoor-pr",
      category: "Indoor",
      productType: "Pre-roll",
    });
  }

  if (
    (product.category === "Indoor" ||
      product.category === "Indoor Exotic" ||
      product.category === "Indoor Hydro") &&
    product.type === "Flower"
  ) {
    const currentQty = cartQuantity;
    bundles.push({
      id: "indoor-flower-5",
      name: `Indoor Bud Special (5g for R400)`,
      price: 400,
      qty: 5,
      currentQty,
      isActive: currentQty >= 5,
      type: "indoor-flower",
      category: "Indoor",
      productType: "Flower",
    });
  }

  return bundles;
}

export function getBundlePrice(product, item) {
  if (!product || !item) return null;

  if (item.customPrice !== undefined && item.customPrice !== null) {
    return Number(item.customPrice);
  }

  if (!item.selectedBundle) return null;

  const bundle = getAvailableBundles(product, [item], []).find(
    (entry) => entry.id === item.selectedBundle,
  );

  return bundle ? Number(bundle.price) : null;
}

export function applyCartBundles(cartItems, products) {
  const itemsWithProducts = cartItems
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;

      const originalTotal = (product.price || 0) * item.quantity;
      const selectedBundlePrice = getBundlePrice(product, item);
      const lineTotalOverride =
        item.customPrice !== undefined && item.customPrice !== null
          ? Number(item.customPrice)
          : null;
      return {
        ...item,
        product,
        originalTotal,
        selectedBundlePrice,
        lineTotalOverride,
      };
    })
    .filter(Boolean);

  const groups = [
    {
      match: (product) =>
        product.category === "Greenhouse" && product.type === "Pre-roll",
      bundleQty: 3,
      bundlePrice: 150,
      name: "Greenhouse PR Special",
    },
    {
      match: (product) =>
        product.category === "Greenhouse" && product.type === "Flower",
      bundleQty: 5,
      bundlePrice: 250,
      name: "Greenhouse Bud Special",
    },
    {
      match: (product) =>
        (product.category === "Indoor" ||
          product.category === "Indoor Exotic" ||
          product.category === "Indoor Hydro") &&
        product.type === "Pre-roll",
      bundleQty: 3,
      bundlePrice: 300,
      name: "Indoor PR Special",
    },
    {
      match: (product) =>
        (product.category === "Indoor" ||
          product.category === "Indoor Exotic" ||
          product.category === "Indoor Hydro") &&
        product.type === "Flower",
      bundleQty: 5,
      bundlePrice: 400,
      name: "Indoor Bud Special",
    },
  ];

  const processed = [];

  const remaining = [...itemsWithProducts];

  groups.forEach((group) => {
    const groupItems = remaining.filter((item) => group.match(item.product));
    if (groupItems.length === 0) return;

    const totalUnits = groupItems.reduce((sum, item) => sum + item.quantity, 0);
    const bundleCount = Math.floor(totalUnits / group.bundleQty);
    const normalTotal = groupItems.reduce(
      (sum, item) => sum + item.originalTotal,
      0,
    );

    if (bundleCount > 0) {
      const bundledUnits = bundleCount * group.bundleQty;
      let remainingUnits = bundledUnits;
      let bundleOriginalPrice = 0;

      for (const item of groupItems) {
        if (remainingUnits <= 0) break;
        const unitsToTake = Math.min(item.quantity, remainingUnits);
        const proportion = unitsToTake / item.quantity;
        bundleOriginalPrice += item.originalTotal * proportion;
        remainingUnits -= unitsToTake;
      }

      const discount = bundleOriginalPrice - bundleCount * group.bundlePrice;
      const perItemDiscountRatio = normalTotal > 0 ? discount / normalTotal : 0;

      groupItems.forEach((item) => {
        const lineTotal =
          item.originalTotal - item.originalTotal * perItemDiscountRatio;
        processed.push({
          ...item,
          lineTotal: item.lineTotalOverride ?? lineTotal,
          isBundle: true,
          bundleDiscount: item.originalTotal * perItemDiscountRatio,
          bundleType: group.name,
          customPrice:
            item.lineTotalOverride ?? item.selectedBundlePrice ?? false,
        });
      });
    } else {
      groupItems.forEach((item) => {
        processed.push({
          ...item,
          lineTotal: item.lineTotalOverride ?? item.originalTotal,
          isBundle: false,
          bundleDiscount: 0,
          bundleType: null,
          customPrice:
            item.lineTotalOverride ?? item.selectedBundlePrice ?? false,
        });
      });
    }

    groupItems.forEach((item) => {
      const index = remaining.findIndex(
        (candidate) => candidate.productId === item.productId,
      );
      if (index >= 0) remaining.splice(index, 1);
    });
  });

  remaining.forEach((item) => {
    processed.push({
      ...item,
      lineTotal: item.lineTotalOverride ?? item.originalTotal,
      isBundle: false,
      bundleDiscount: 0,
      bundleType: null,
      customPrice: item.lineTotalOverride ?? item.selectedBundlePrice ?? false,
    });
  });

  const subtotal = processed.reduce((sum, item) => sum + item.originalTotal, 0);
  const total = processed.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = subtotal - total;

  return { items: processed, subtotal, total, discount };
}
