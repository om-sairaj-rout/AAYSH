const Order = require("../models/upload/order.model");
const Company = require("../models/company.model");
const OrderIdCounter = require("../models/orderIdCounter.model");
const {
  ORDER_ID_SEQUENCES,
  ORDER_ID_SEQUENCE_IDS,
  isValidOrderIdSequence,
} = require("../constants/orderIdSequences");

const getSequenceConfig = (sequenceType) => {
  if (!isValidOrderIdSequence(sequenceType)) {
    throw new Error(`Unsupported order ID sequence: ${sequenceType}`);
  }
  return ORDER_ID_SEQUENCES[sequenceType];
};

const formatOrderId = (sequenceType, seq) => {
  const config = getSequenceConfig(sequenceType);
  return config.format(seq);
};

const buildCounterId = (sequenceType) =>
  String(sequenceType || "").trim().toLowerCase();

const ensureGlobalCounter = async (sequenceType) => {
  const counterId = buildCounterId(sequenceType);
  const config = getSequenceConfig(sequenceType);

  const existing = await OrderIdCounter.findById(counterId).lean();
  if (existing) {
    return existing;
  }

  try {
    await OrderIdCounter.create({
      _id: counterId,
      sequenceType: counterId,
      seq: config.startAt - 1,
    });
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }
  }

  return OrderIdCounter.findById(counterId).lean();
};

const readGlobalCounter = async (sequenceType) => {
  const counterId = buildCounterId(sequenceType);
  return OrderIdCounter.findById(counterId).lean();
};

const orderIdExists = async (orderId) =>
  Boolean(await Order.exists({ externalOrderId: String(orderId || "").trim() }));

const findNextAvailableOrderId = async (sequenceType, startSeq, maxScan = 1000) => {
  const config = getSequenceConfig(sequenceType);
  let seq = Math.max(startSeq, config.startAt);

  for (let scanned = 0; scanned < maxScan; scanned += 1) {
    const orderId = formatOrderId(sequenceType, seq);
    if (!(await orderIdExists(orderId))) {
      return { orderId, seq };
    }
    seq += 1;
  }

  throw new Error("Unable to find an available order ID preview");
};

const lockCompanyOrderIdSequence = async (companyID, sequenceType) => {
  const normalizedCompanyID = String(companyID || "").trim().toUpperCase();
  const normalizedSequence = buildCounterId(sequenceType);

  if (!isValidOrderIdSequence(normalizedSequence)) {
    throw new Error(`Unsupported order ID sequence: ${sequenceType}`);
  }

  await Company.findOneAndUpdate(
    { companyID: normalizedCompanyID },
    {
      defaultOrderIdSequence: normalizedSequence,
      orderIdSequenceLocked: true,
    },
    { new: false }
  );

  return normalizedSequence;
};

const resolveCompanyOrderIdSequence = async ({
  companyID,
  requestedSequence = "",
}) => {
  const normalizedCompanyID = String(companyID || "").trim().toUpperCase();
  if (!normalizedCompanyID) {
    throw new Error("Company ID is required to generate an order ID");
  }

  const company = await Company.findOne({ companyID: normalizedCompanyID }).lean();
  if (!company) {
    throw new Error("Company not found");
  }

  const requested = buildCounterId(requestedSequence);
  const lockedSequence = company.defaultOrderIdSequence || "alphanumeric";

  if (company.orderIdSequenceLocked) {
    if (requested && requested !== lockedSequence) {
      throw new Error(
        `This company uses the ${ORDER_ID_SEQUENCES[lockedSequence].label} order ID sequence and it cannot be changed.`
      );
    }
    return {
      companyID: normalizedCompanyID,
      sequenceType: lockedSequence,
      sequenceLocked: true,
    };
  }

  const sequenceType = isValidOrderIdSequence(requested)
    ? requested
    : lockedSequence;

  return {
    companyID: normalizedCompanyID,
    sequenceType,
    sequenceLocked: false,
  };
};

const getNextOrderIdPreview = async (companyID, requestedSequence = "") => {
  const resolved = await resolveCompanyOrderIdSequence({
    companyID,
    requestedSequence,
  });
  const { sequenceType, sequenceLocked } = resolved;
  const config = getSequenceConfig(sequenceType);
  const counter = await readGlobalCounter(sequenceType);
  const startSeq = Math.max((counter?.seq || 0) + 1, config.startAt);
  const next = await findNextAvailableOrderId(sequenceType, startSeq);

  return {
    companyID: resolved.companyID,
    sequenceType,
    sequenceLocked,
    nextSeq: next.seq,
    orderId: next.orderId,
  };
};

const allocateOrderExternalId = async (_companyID, sequenceType) => {
  const normalizedSequence = buildCounterId(sequenceType);
  const config = getSequenceConfig(normalizedSequence);
  await ensureGlobalCounter(normalizedSequence);

  const counterId = buildCounterId(normalizedSequence);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    let counter = await OrderIdCounter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true }
    );

    if (!counter) {
      throw new Error("Order ID counter is unavailable");
    }

    let allocatedSeq = Math.max(counter.seq, config.startAt);
    if (counter.seq < config.startAt) {
      counter = await OrderIdCounter.findByIdAndUpdate(
        counterId,
        { $set: { seq: config.startAt } },
        { new: true }
      );
      allocatedSeq = config.startAt;
    }

    const orderId = formatOrderId(normalizedSequence, allocatedSeq);
    if (!(await orderIdExists(orderId))) {
      return orderId;
    }
  }

  throw new Error("Unable to generate a unique order ID. Please try again.");
};

const syncOrderIdCounterFromExternalIds = async (externalOrderIds = []) => {
  const ids = [
    ...new Set(
      (externalOrderIds || [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    ),
  ];

  if (ids.length === 0) return;

  await Promise.all(
    ORDER_ID_SEQUENCE_IDS.map(async (sequenceType) => {
      const config = getSequenceConfig(sequenceType);
      let maxSeq = 0;

      for (const externalOrderId of ids) {
        const parsed = config.parse(externalOrderId);
        if (parsed > maxSeq) {
          maxSeq = parsed;
        }
      }

      if (maxSeq <= 0) return;

      await ensureGlobalCounter(sequenceType);
      const counter = await readGlobalCounter(sequenceType);
      const currentSeq = Number(counter?.seq || 0);

      if (maxSeq > currentSeq) {
        await OrderIdCounter.findByIdAndUpdate(buildCounterId(sequenceType), {
          $set: { seq: maxSeq },
        });
      }
    })
  );
};

const resolveOrderExternalId = async ({ body = {}, companyID }) => {
  const mode = String(body.order_id_mode || "").trim().toLowerCase();
  const manualOrderId = String(body.order_id || "").trim();

  if (mode === "manual" || (!mode && manualOrderId)) {
    if (!manualOrderId) {
      throw new Error("Order ID is required for manual entry");
    }
    return manualOrderId;
  }

  const resolved = await resolveCompanyOrderIdSequence({
    companyID,
    requestedSequence: body.order_id_sequence,
  });

  const orderId = await allocateOrderExternalId(
    resolved.companyID,
    resolved.sequenceType
  );

  if (!resolved.sequenceLocked) {
    await lockCompanyOrderIdSequence(resolved.companyID, resolved.sequenceType);
  }

  return orderId;
};

module.exports = {
  resolveCompanyOrderIdSequence,
  lockCompanyOrderIdSequence,
  getNextOrderIdPreview,
  allocateOrderExternalId,
  syncOrderIdCounterFromExternalIds,
  resolveOrderExternalId,
  formatOrderId,
  orderIdExists,
};
