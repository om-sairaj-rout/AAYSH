const Order = require("../models/upload/order.model");
const Company = require("../models/company.model");
const OrderIdCounter = require("../models/orderIdCounter.model");
const {
  ORDER_ID_SEQUENCES,
  isValidOrderIdSequence,
} = require("../constants/orderIdSequences");

const buildCounterId = (companyID) =>
  String(companyID).trim().toUpperCase();

const buildLegacyCounterId = (companyID, sequenceType) =>
  `${buildCounterId(companyID)}:${sequenceType}`;

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

const inferSequenceFromOrders = async (companyID) => {
  const normalizedCompanyID = buildCounterId(companyID);
  const orders = await Order.find({ companyID: normalizedCompanyID })
    .select("externalOrderId")
    .lean();

  let numericMax = 0;
  let alphaMax = 0;
  let numericCount = 0;
  let alphaCount = 0;

  for (const order of orders) {
    const numericSeq = ORDER_ID_SEQUENCES.numeric.parse(order.externalOrderId);
    const alphaSeq = ORDER_ID_SEQUENCES.alphanumeric.parse(
      order.externalOrderId
    );

    if (numericSeq >= ORDER_ID_SEQUENCES.numeric.startAt) {
      numericCount += 1;
      numericMax = Math.max(numericMax, numericSeq);
    }

    if (alphaSeq >= ORDER_ID_SEQUENCES.alphanumeric.startAt) {
      alphaCount += 1;
      alphaMax = Math.max(alphaMax, alphaSeq);
    }
  }

  if (numericCount > 0 && alphaCount === 0) {
    return "numeric";
  }

  if (alphaCount > 0 && numericCount === 0) {
    return "alphanumeric";
  }

  if (numericCount > 0 && alphaCount > 0) {
    return alphaMax >= numericMax ? "alphanumeric" : "numeric";
  }

  return null;
};

const lockCompanyOrderIdSequence = async (companyID, sequenceType) => {
  const normalizedCompanyID = buildCounterId(companyID);
  const normalizedSequence = String(sequenceType || "").trim().toLowerCase();

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
  const normalizedCompanyID = buildCounterId(companyID);
  if (!normalizedCompanyID) {
    throw new Error("Company ID is required to generate an order ID");
  }

  const company = await Company.findOne({ companyID: normalizedCompanyID }).lean();
  if (!company) {
    throw new Error("Company not found");
  }

  const requested = String(requestedSequence || "").trim().toLowerCase();
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

  const inferredSequence = await inferSequenceFromOrders(normalizedCompanyID);
  if (inferredSequence) {
    await lockCompanyOrderIdSequence(normalizedCompanyID, inferredSequence);

    if (requested && requested !== inferredSequence) {
      throw new Error(
        `This company already has orders using the ${ORDER_ID_SEQUENCES[inferredSequence].label} sequence.`
      );
    }

    return {
      companyID: normalizedCompanyID,
      sequenceType: inferredSequence,
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

const migrateLegacyCounter = async (companyID, sequenceType) => {
  const counterId = buildCounterId(companyID);
  const existing = await OrderIdCounter.findById(counterId).lean();
  if (existing) {
    return existing;
  }

  const legacyId = buildLegacyCounterId(companyID, sequenceType);
  const legacy = await OrderIdCounter.findById(legacyId).lean();
  if (!legacy) {
    return null;
  }

  await OrderIdCounter.findByIdAndUpdate(
    counterId,
    {
      companyID,
      sequenceType,
      seq: legacy.seq,
    },
    { upsert: true }
  );

  return OrderIdCounter.findById(counterId).lean();
};

const syncOrderIdCounter = async (companyID, sequenceType) => {
  const normalizedCompanyID = buildCounterId(companyID);
  if (!normalizedCompanyID) {
    return;
  }

  const config = getSequenceConfig(sequenceType);
  const orders = await Order.find({ companyID: normalizedCompanyID })
    .select("externalOrderId")
    .lean();

  const maxSeq = orders.reduce((max, order) => {
    const parsed = config.parse(order.externalOrderId);
    return Math.max(max, parsed);
  }, 0);

  if (maxSeq <= 0) {
    return;
  }

  const counterId = buildCounterId(normalizedCompanyID);
  let counter = await migrateLegacyCounter(normalizedCompanyID, sequenceType);
  if (!counter) {
    counter = await OrderIdCounter.findById(counterId).lean();
  }

  if (!counter || counter.seq < maxSeq) {
    await OrderIdCounter.findByIdAndUpdate(
      counterId,
      {
        companyID: normalizedCompanyID,
        sequenceType,
        seq: maxSeq,
      },
      { upsert: true }
    );
  }
};

const getNextOrderIdPreview = async (companyID, requestedSequence = "") => {
  const resolved = await resolveCompanyOrderIdSequence({
    companyID,
    requestedSequence,
  });
  const { sequenceType, sequenceLocked } = resolved;
  const normalizedCompanyID = resolved.companyID;

  const config = getSequenceConfig(sequenceType);
  await syncOrderIdCounter(normalizedCompanyID, sequenceType);

  const counterId = buildCounterId(normalizedCompanyID);
  const counter = await migrateLegacyCounter(normalizedCompanyID, sequenceType);
  const currentCounter =
    counter || (await OrderIdCounter.findById(counterId).lean());
  const nextSeq = Math.max((currentCounter?.seq || 0) + 1, config.startAt);

  return {
    companyID: normalizedCompanyID,
    sequenceType,
    sequenceLocked,
    nextSeq,
    orderId: formatOrderId(sequenceType, nextSeq),
  };
};

const allocateOrderExternalId = async (companyID, sequenceType) => {
  const normalizedCompanyID = buildCounterId(companyID);
  if (!normalizedCompanyID) {
    throw new Error("Company ID is required to generate an order ID");
  }

  const config = getSequenceConfig(sequenceType);
  await syncOrderIdCounter(normalizedCompanyID, sequenceType);

  const counterId = buildCounterId(normalizedCompanyID);
  await migrateLegacyCounter(normalizedCompanyID, sequenceType);

  const existingCounter = await OrderIdCounter.findById(counterId).lean();
  if (!existingCounter) {
    try {
      await OrderIdCounter.create({
        _id: counterId,
        companyID: normalizedCompanyID,
        sequenceType,
        seq: config.startAt - 1,
      });
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }
    }
  } else if (existingCounter.sequenceType !== sequenceType) {
    throw new Error(
      `Order ID counter is configured for ${ORDER_ID_SEQUENCES[existingCounter.sequenceType].label}, not ${ORDER_ID_SEQUENCES[sequenceType].label}.`
    );
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    let counter = await OrderIdCounter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true }
    );

    if (!counter) {
      throw new Error("Order ID counter is unavailable");
    }

    let allocatedSeq = counter.seq;
    if (allocatedSeq < config.startAt) {
      counter = await OrderIdCounter.findByIdAndUpdate(
        counterId,
        { $set: { seq: config.startAt } },
        { new: true }
      );
      allocatedSeq = config.startAt;
    }

    const orderId = formatOrderId(sequenceType, allocatedSeq);
    const exists = await Order.exists({
      companyID: normalizedCompanyID,
      externalOrderId: orderId,
    });

    if (!exists) {
      return orderId;
    }
  }

  throw new Error("Unable to generate a unique order ID. Please try again.");
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
  inferSequenceFromOrders,
  resolveCompanyOrderIdSequence,
  lockCompanyOrderIdSequence,
  syncOrderIdCounter,
  getNextOrderIdPreview,
  allocateOrderExternalId,
  resolveOrderExternalId,
  formatOrderId,
};
