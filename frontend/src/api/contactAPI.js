const BASE = import.meta.env.VITE_API_URL;

export const submitContactForm =
  async (data) => {

    const res = await fetch(
      `${BASE}/api/contact`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify(data)
      }
    );

    return res.json();
};