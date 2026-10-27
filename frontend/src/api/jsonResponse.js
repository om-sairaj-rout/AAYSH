/**
 * Parse fetch Response as JSON; surface HTML/non-JSON bodies clearly.
 */
export async function parseJsonResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!text) {
    return { data: {}, isJson: contentType.includes("application/json") };
  }

  const trimmed = text.trim();
  if (
    trimmed.startsWith("<!") ||
    trimmed.startsWith("<html") ||
    (!contentType.includes("application/json") && trimmed.startsWith("<"))
  ) {
    const err = new Error(
      "Server returned an HTML page instead of JSON. Check API URL, proxy, and login session."
    );
    err.status = res.status;
    err.isHtmlResponse = true;
    throw err;
  }

  try {
    return { data: JSON.parse(text), isJson: true };
  } catch {
    const err = new Error(
      `Invalid JSON response (${res.status}): ${trimmed.slice(0, 120)}`
    );
    err.status = res.status;
    throw err;
  }
}
