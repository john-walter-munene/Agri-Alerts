const BASE_URL = "http://localhost:3000/api";

// keep stable phone for debugging
const phone = "0726674204";

// Pretty logger for test output
const log = (title, data) => {
  console.log("\n====================");
  console.log(title);
  console.log("====================");
  console.dir(data, { depth: null });
};

// Safe request wrapper
// handles HTTP errors
// handles non-JSON responses

async function request(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const contentType = res.headers.get("content-type");

    let data;

    // try parsing JSON safely
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    // attach HTTP status for debugging
    return {
      success: res.ok,
      status: res.status,
      data,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = {
  BASE_URL,
  phone,
  log,
  request,
};