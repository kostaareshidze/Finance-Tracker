// api.js — centralised fetch wrapper

const API_BASE = "http://localhost:3001/api"; // FIXED (no more /api confusion)

// helper: logout safely
function logout() {
  localStorage.removeItem("ft_token");
  window.location.href = "/";
}

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("ft_token"); // FIXED: consistent key

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  console.log("TOKEN BEFORE REQUEST:", token);
  // attach token if exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(API_BASE + path, {
    ...options,
    headers,
  });

  // auto logout on auth errors
  if (res.status === 401 || res.status === 403) {
    console.warn("Auth failed:", res.status);
    return null;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

// CRUD helpers
async function apiGet(path) {
  return apiFetch(path);
}

async function apiPost(path, body) {
  return apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function apiPut(path, body) {
  return apiFetch(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

async function apiDelete(path) {
  return apiFetch(path, {
    method: "DELETE",
  });
}

// CSV download (fixed + safe)
async function apiDownload(path) {
  const token = localStorage.getItem("ft_token");

  if (!token) {
    alert("Not logged in");
    return;
  }

  const res = await fetch(API_BASE + path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Download failed");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
