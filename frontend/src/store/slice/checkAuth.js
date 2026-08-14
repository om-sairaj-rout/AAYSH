import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
const BASE = import.meta.env.VITE_API_URL;

// Thunk to verify authentication
export const authVerify = createAsyncThunk('checkAuth/authVerify', async () => {
    const res = await fetch(`${BASE}/api/auth/check`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Authentication verification failed");
    }

    return await res.json();
});

const checkAuthSlice = createSlice({
  name: 'checkAuth',
  initialState: {
    isAuthenticated: null,
    user: null,
    loading: true,
    initialized: false,
    error: null,
    isAdmin: false,
  },
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.isAdmin = false;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(authVerify.pending, (state) => {
        if (!state.initialized) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(authVerify.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.userDets;
        state.isAdmin = action.payload.userDets.role === "admin";
        state.loading = false;
        state.initialized = true;
      })
      .addCase(authVerify.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.loading = false;
        state.initialized = true;
        state.user = null;
        state.isAdmin = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const { logout , updateUser} = checkAuthSlice.actions;
export default checkAuthSlice.reducer;
