import { apiUrl, getApiBase } from "./apiBase.js";

export const submitContactForm =
  async (data) => {

    const res = await fetch(
      apiUrl(`/api/contact`),
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