const ORDER_ID_SEQUENCES = {
  numeric: {
    id: "numeric",
    label: "Numeric",
    description: "Example: 100001, 100002, 100003",
    startAt: 100001,
    format: (seq) => String(seq),
    parse: (value) => {
      const trimmed = String(value || "").trim();
      if (!/^\d+$/.test(trimmed)) return 0;
      const parsed = Number.parseInt(trimmed, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    },
  },
  alphanumeric: {
    id: "alphanumeric",
    label: "Alphanumeric",
    description: "Example: ORD100001, ORD100002, ORD100003",
    startAt: 100001,
    format: (seq) => `ORD${String(seq).padStart(6, "0")}`,
    parse: (value) => {
      const trimmed = String(value || "").trim();
      const match = trimmed.match(/^ORD(\d+)$/i);
      if (!match) return 0;
      const parsed = Number.parseInt(match[1], 10);
      return Number.isFinite(parsed) ? parsed : 0;
    },
  },
};

const ORDER_ID_SEQUENCE_IDS = Object.keys(ORDER_ID_SEQUENCES);

const isValidOrderIdSequence = (sequenceType) =>
  ORDER_ID_SEQUENCE_IDS.includes(sequenceType);

module.exports = {
  ORDER_ID_SEQUENCES,
  ORDER_ID_SEQUENCE_IDS,
  isValidOrderIdSequence,
};
