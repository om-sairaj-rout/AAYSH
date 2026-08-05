// ==========================
// LOCAL / NCR CITIES
// ==========================
const localCities = [
  "delhi",
  "new delhi",
  "noida",
  "greater noida",
  "ghaziabad",
  "gurugram",
  "gurgaon",
  "faridabad",
];

// ==========================
// METRO CITIES
// ==========================
const metroCities = [
  "mumbai",
  "navi mumbai",
  "thane",
  "pune",
  "bengaluru",
  "bangalore",
  "chennai",
  "hyderabad",
  "kolkata",
  "ahmedabad",
];

// ==========================
// NORTH ZONE STATES
// ==========================
const northStates = [
  "uttar pradesh",
  "haryana",
  "punjab",
  "himachal pradesh",
  "uttarakhand",
  "jammu & kashmir",
  "jammu and kashmir",
  "ladakh",
  "chandigarh",
];

// ==========================
// NORTH EAST STATES
// ==========================
const northEastStates = [
  "assam",
  "arunachal pradesh",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "sikkim",
  "tripura",
];

// ==========================
// GET CATEGORY
// ==========================
const getCategory = (city, state) => {
  const normalizedCity = city?.trim().toLowerCase();
  const normalizedState = state?.trim().toLowerCase();

  // 1. Local NCR has highest priority
  if (normalizedCity && localCities.includes(normalizedCity)) {
    return "Local NCR";
  }

  // 2. Metro Cities
  if (normalizedCity && metroCities.includes(normalizedCity)) {
    return "Metro";
  }

  // 3. North Zone
  if (
    normalizedState &&
    northStates.includes(normalizedState)
  ) {
    return "North Zone";
  }

  // 4. North East
  if (
    normalizedState &&
    northEastStates.includes(normalizedState)
  ) {
    return "North East";
  }

  // 5. Everything else
  return "Rest of India";
};

module.exports = getCategory;