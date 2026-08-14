const BASE = import.meta.env.VITE_API_URL;

export const registerUser = async (userData) => {
  const res = await fetch(`${BASE}/api/user/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Registration failed");
  }

  return res.json(); 
};

export const loginUser = async (userCred) => {
  const res = await fetch(`${BASE}/api/user/login`,{
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userCred),
  });
  if(!res.ok){
     const errorData = await res.json();
    throw new Error(errorData.message || "login failed");
  }
  return res.json();
};

export const logoutUser = async () => {
  const res = await fetch(`${BASE}/api/user/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Logout failed");
  }
  
  return res.json();
};

// Forgot Password API
export const forgotPasswordAPI = async (email) => {

  const response = await fetch(
    `${BASE}/api/forgot-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
};


// Reset Password API
export const resetPasswordAPI = async (
  token,
  password
) => {

  const response = await fetch(
    `${BASE}/api/reset-password/${token}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
};

// ================= GET ALL USERS =================
export const getAllUsers = async () => {
  const res = await fetch(
    `${BASE}/api/users`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || "Failed to fetch users"
    );
  }

  return data;
};

export const getRegistrationStats = async () => {
  const res = await fetch(`${BASE}/api/users/registration-stats`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch registration stats");
  }

  return data;
};

export const migrateLegacyCompanies = async () => {
  const res = await fetch(`${BASE}/api/users/migrate-legacy-companies`, {
    method: "POST",
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Migration failed");
  }

  return data;
};

// ================= UPDATE USER =================
export const updateUserAccount = async (
  id,
  userData
) => {
  const res = await fetch(
    `${BASE}/api/update-user/${id}`,
    {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || "Update failed"
    );
  }

  return data;
};

// ================= DELETE USER =================
export const deleteUserAccount = async (
  id
) => {

  const res = await fetch(
    `${BASE}/api/delete-user/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  const data =
    await res.json();

  if (!res.ok) {
    throw new Error(
      data.message ||
      "Delete failed"
    );
  }

  return data;
};