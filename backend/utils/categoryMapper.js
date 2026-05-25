const cityCategoryMap = {

  // Local NCR
  delhi: "Local NCR",
  "new delhi": "Local NCR",
  gurugram: "Local NCR",
  faridabad: "Local NCR",
  noida: "Local NCR",
  "greater noida": "Local NCR",
  ghaziabad: "Local NCR",

  // Metro
  mumbai: "Metro State Capital",
  kolkata: "Metro State Capital",
  chennai: "Metro State Capital",
  bengaluru: "Metro State Capital",
  hyderabad: "Metro State Capital",
  pune: "Metro State Capital",
};

const getCategory = (city) => {

  if (!city) {
    return "Rest of India";
  }

  const normalizedCity =
    city.toLowerCase().trim();

  return (
    cityCategoryMap[normalizedCity] ||
    "Rest of India"
  );
};

module.exports = getCategory;