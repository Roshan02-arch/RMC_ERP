export const DEFAULT_TRANSPORT_RATE = 13.75;
export const DEFAULT_GST_RATE = 18;

const toFiniteNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const calculateTransport = (distance: unknown, transportRate: unknown = DEFAULT_TRANSPORT_RATE) => {
  const safeDistance = toFiniteNumber(distance);
  const safeRate = toFiniteNumber(transportRate);
  if (safeDistance <= 0 || safeRate <= 0) {
    return 0;
  }
  return Math.round(safeDistance * safeRate);
};

export const extractQuotationDistance = (quotation: { distance?: unknown; distanceKm?: unknown } | null | undefined) => {
  if (!quotation) {
    return 0;
  }
  const distanceKm = toFiniteNumber(quotation.distanceKm);
  if (distanceKm > 0) {
    return distanceKm;
  }
  return toFiniteNumber(quotation.distance);
};

export const calculateQuotationTotals = ({
  subtotal,
  distance,
  transportRate = DEFAULT_TRANSPORT_RATE,
  gstRate = DEFAULT_GST_RATE,
  discount = 0,
}: {
  subtotal: unknown;
  distance: unknown;
  transportRate?: unknown;
  gstRate?: unknown;
  discount?: unknown;
}) => {
  const safeSubtotal = Math.max(0, toFiniteNumber(subtotal));
  const safeDiscount = Math.max(0, toFiniteNumber(discount));
  const safeGstRate = Math.max(0, toFiniteNumber(gstRate));
  const transport = calculateTransport(distance, transportRate);
  const taxableAmount = safeSubtotal + transport;
  const gst = (taxableAmount * safeGstRate) / 100;
  const total = Math.max(0, taxableAmount + gst - safeDiscount);
  return {
    subtotal: safeSubtotal,
    distance: toFiniteNumber(distance),
    transport,
    gst,
    discount: safeDiscount,
    total,
  };
};
