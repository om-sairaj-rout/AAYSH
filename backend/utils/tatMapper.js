const SLA = {
  surface: {
    "Local NCR": 48,
    "North Zone": 96,
    Metro: 120,
    "Rest of India": 144,
    "North East": 168,
  },

  air: {
    "Local NCR": 24,
    "North Zone": 72,
    Metro: 96,
    "Rest of India": 96,
    "North East": 120,
  },

  prime: {
    "Local NCR": 24,
    "North Zone": 48,
    Metro: 48,
    "Rest of India": 72,
    "North East": 96,
  },
};

const getExpectedHours = (
  zone,
  serviceType = "surface"
) => {
  return (
    SLA[serviceType]?.[zone] ??
    SLA.surface["Rest of India"]
  );
};

module.exports = getExpectedHours;