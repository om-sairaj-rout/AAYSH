const getExpectedHours = (category) => {

  switch (category) {

    case "Local NCR":
      return 48;

    case "Metro State Capital":
      return 96;

    default:
      return 144;
  }
};

module.exports = getExpectedHours;