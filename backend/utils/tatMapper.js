const SLA = {
  Surface: {
    "Local NCR": 48,
    "North Zone": 96,
    Metro: 120,
    "Rest of India": 144,
    "North East": 168,
  },

  Air: {
    "Local NCR": 24,
    "North Zone": 72,
    Metro: 96,
    "Rest of India": 96,
    "North East": 120,
  },

  Prime: {
    "Local NCR": 24,
    "North Zone": 48,
    Metro: 48,
    "Rest of India": 72,
    "North East": 96,
  },
};

const getExpectedHours = (
  zone,
  serviceType = "Surface"
) => {
  return (
    SLA[serviceType]?.[zone] ??
    SLA.Surface["Rest of India"]
  );
};

module.exports = getExpectedHours;