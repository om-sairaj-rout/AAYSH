const cityCategoryMap = {

// Local NCR
  delhi: "Local NCR",
  "new delhi": "Local NCR",
  noida: "Local NCR",
  "greater noida": "Local NCR",
  ghaziabad: "Local NCR",
  gurugram: "Local NCR",
  gurgaon: "Local NCR",
  faridabad: "Local NCR",

  // North Zone
  "uttar pradesh": "North Zone",
  haryana: "North Zone",
  punjab: "North Zone",
  "himachal pradesh": "North Zone",
  uttarakhand: "North Zone",
  "jammu & kashmir": "North Zone",
  "jammu and kashmir": "North Zone",
  ladakh: "North Zone",
  chandigarh: "North Zone",

  // Metro
  mumbai: "Metro",
  "navi mumbai": "Metro",
  thane: "Metro",
  pune: "Metro",
  bengaluru: "Metro",
  bangalore: "Metro",
  chennai: "Metro",
  hyderabad: "Metro",
  kolkata: "Metro",
  ahmedabad: "Metro",

  // Rest of India
  rajasthan: "Rest of India",
  gujarat: "Rest of India",
  "madhya pradesh": "Rest of India",
  chhattisgarh: "Rest of India",
  maharashtra: "Rest of India",
  goa: "Rest of India",
  bihar: "Rest of India",
  jharkhand: "Rest of India",
  odisha: "Rest of India",
  "west bengal": "Rest of India",
  "andhra pradesh": "Rest of India",
  telangana: "Rest of India",
  karnataka: "Rest of India",
  "tamil nadu": "Rest of India",
  kerala: "Rest of India",
  "andaman & nicobar islands": "Rest of India",
  "andaman and nicobar islands": "Rest of India",
  "dadra & nagar haveli and daman & diu": "Rest of India",
  "dadra and nagar haveli and daman and diu": "Rest of India",
  lakshadweep: "Rest of India",
  puducherry: "Rest of India",

  // North East
  assam: "North East",
  "arunachal pradesh": "North East",
  manipur: "North East",
  meghalaya: "North East",
  mizoram: "North East",
  nagaland: "North East",
  sikkim: "North East",
  tripura: "North East",
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