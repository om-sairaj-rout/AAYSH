const BASE = import.meta.env.VITE_API_URL;

export const generateLabelAPI = async (payload) => {

  const res = await fetch(
    `${BASE}/api/generate-labels`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(payload)
    }
  );

  if (!res.ok) {
    throw new Error(
      "Failed to generate labels"
    );
  }

  return await res.blob();
};

export const generateInvoiceAPI = async (payload) => {

  const res = await fetch(
    `${BASE}/api/generate-invoice`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(payload)
    }
  );

  if (!res.ok) {
    throw new Error(
      "Failed to generate invoice"
    );
  }

  return await res.blob();
};

export const generateManifestAPI = async (payload) => {

  const res = await fetch(
    `${BASE}/api/generate-manifest`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(payload)
    }
  );

  if (!res.ok) {
    throw new Error(
      "Failed to generate manifest"
    );
  }

  return await res.blob();
};