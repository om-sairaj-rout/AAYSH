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