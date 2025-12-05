/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, createContext, useContext } from "react";
import { API_ENDPOINTS, api } from "../config/api";

const emailRe  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }){
  // Store only logged-in user in localStorage (for session persistence)
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fg.authUser") || "null"); } catch (e) { void e; return null; }
  });

  // Store all users (loaded from server for admin)
  const [users, setUsers] = useState([]);

  // Save current user to localStorage (session persistence only)
  useEffect(() => { 
    try { 
      if (user) {
        localStorage.setItem("fg.authUser", JSON.stringify(user)); 
      } else {
        localStorage.removeItem("fg.authUser");
      }
    } catch (e) { void e; } 
  }, [user]);

  // Register new user via API
  async function register({ name, email, password }){
    const e = String(email || "").trim().toLowerCase();
    if (!emailRe.test(e)) throw new Error("Invalid email");
    if (!password || String(password).length < 4) throw new Error("Password too short");
    
    try {
      const newUser = await api.post(API_ENDPOINTS.register, {
        email: e,
        password: String(password),
        name: String(name || ""),
        role: "Teacher"
      });
      console.log('✅ User registered:', newUser.email);
      return true;
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }

  // Login via API
  async function login(email, password){
    const e = String(email || "").toLowerCase();
    
    try {
      const userData = await api.post(API_ENDPOINTS.login, {
        email: e,
        password: String(password)
      });
      
      if (!userData) {
        throw new Error("No user data returned");
      }
      
      console.log('✅ Login successful:', userData.email || userData);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw new Error("Invalid credentials");
    }
  }

  function logout(){ 
    setUser(null); 
    localStorage.removeItem("fg.authUser");
  }

  // Update user profile via API
  async function updateProfile(patch){
    if (!user) return;
    
    try {
      const updated = await api.put(API_ENDPOINTS.userByEmail(user.email), patch);
      console.log('✅ Profile updated');
      setUser(curr => ({ ...curr, ...updated }));
      return updated;
    } catch (error) {
      console.error('❌ Profile update failed:', error);
      throw error;
    }
  }

  // Email verification (stored locally for demo purposes)
  const [verifyTokens, setVerifyTokens] = useState({});
  const [resetTokens, setResetTokens] = useState({});

  function requestEmailVerification(email){
    const e = String(email || "").trim().toLowerCase();
    if (!emailRe.test(e)) throw new Error("Invalid email");
    const code = String(Math.floor(100000 + Math.random()*900000));
    const exp = Date.now() + 10*60*1000;
    setVerifyTokens(prev => ({ ...prev, [e]: { code, exp } }));
    console.log(`📧 Verification code for ${e}: ${code}`);
    return code;
  }
  function confirmEmailVerification(email, code){
    const e = String(email || "").trim().toLowerCase();
    const entry = verifyTokens[e];
    if (!entry) throw new Error("No verification request");
    if (Date.now() > entry.exp) throw new Error("Code expired");
    if (String(code) !== String(entry.code)) throw new Error("Invalid code");
    setVerifyTokens(prev => { const cp = { ...prev }; delete cp[e]; return cp; });
    return true;
  }

  function requestPasswordReset(email){
    const e = String(email || "").trim().toLowerCase();
    if (!emailRe.test(e)) throw new Error("Invalid email");
    const code = String(Math.floor(100000 + Math.random()*900000));
    const exp = Date.now() + 10*60*1000;
    setResetTokens(prev => ({ ...prev, [e]: { code, exp } }));
    console.log(`📧 Password reset code for ${e}: ${code}`);
    return code;
  }

  async function confirmPasswordReset(email, code, newPassword){
    const e = String(email || "").trim().toLowerCase();
    const token = resetTokens[e];
    if (!token) throw new Error("No reset request found");
    if (Date.now() > token.exp) throw new Error("Reset code expired");
    if (String(code).trim() !== String(token.code)) throw new Error("Invalid reset code");
    if (!newPassword || String(newPassword).length < 4) throw new Error("Password too short");
    
    try {
      await api.post(API_ENDPOINTS.userByEmail(e) + '/password', { password: String(newPassword) });
      setResetTokens(prev => { const cp = { ...prev }; delete cp[e]; return cp; });
      console.log('✅ Password reset successful');
      return true;
    } catch (error) {
      console.error('❌ Password reset failed:', error);
      throw new Error("Failed to reset password");
    }
  }

  // Fetch all users (admin only)
  async function fetchAllUsers() {
    try {
      const allUsers = await api.get(API_ENDPOINTS.users);
      setUsers(allUsers);
      return allUsers;
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      throw error;
    }
  }

  async function adminUpdateUser(email, patch){
    const e = String(email||"").toLowerCase();
    try {
      const updated = await api.put(API_ENDPOINTS.userByEmail(e), patch);
      setUsers(prev => prev.map(u => (u.email||"").toLowerCase()===e ? updated : u));
      setUser(curr => (curr && (curr.email||"").toLowerCase()===e) ? { ...curr, ...updated } : curr);
      console.log('✅ Admin updated user');
      return updated;
    } catch (error) {
      console.error('❌ Admin update failed:', error);
      throw error;
    }
  }

  async function adminResetPassword(email){
    const e = String(email||"").toLowerCase();
    const temp = "moe1234";
    try {
      await api.post(API_ENDPOINTS.userByEmail(e) + '/password', { password: temp });
      setUsers(prev => prev.map(u => (u.email || "").toLowerCase() === e ? { ...u, password: temp } : u));
      console.log('✅ Admin reset password');
      return temp;
    } catch (error) {
      console.error('❌ Admin password reset failed:', error);
      throw error;
    }
  }

  async function adminCreateUser({ name, email, role = "Teacher", password }) {
    const e = String(email || "").trim().toLowerCase();
    if (!emailRe.test(e)) throw new Error("Invalid email");
    const temp = password && String(password).trim().length >= 4 ? String(password).trim() : Math.random().toString(36).slice(2, 10);
    
    try {
      const newUser = await api.post(API_ENDPOINTS.register, {
        email: e,
        password: temp,
        role: String(role || "Teacher"),
        name: String(name || "")
      });
      setUsers(prev => [newUser, ...prev]);
      console.log('✅ Admin created user');
      return { email: e, tempPassword: temp };
    } catch (error) {
      console.error('❌ Admin create user failed:', error);
      throw error;
    }
  }

  async function adminDeleteUser(email){
    const e = String(email||"").toLowerCase();
    try {
      await api.delete(API_ENDPOINTS.userByEmail(e));
      setUsers(prev => prev.filter(u => (u.email||"").toLowerCase()!==e));
      setUser(curr => (curr && (curr.email||"").toLowerCase()===e) ? null : curr);
      console.log('✅ Admin deleted user');
    } catch (error) {
      console.error('❌ Admin delete failed:', error);
      throw error;
    }
  }

  // Alias for consistency
  const adminAddUser = adminCreateUser;

  // Load all users on mount (for admin users)
  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchAllUsers().catch(err => console.error('Failed to load users:', err));
    }
  }, [user?.role]);

  return (
    <AuthContext.Provider
      value={{ user, users, fetchAllUsers, register, login, logout, updateProfile, adminUpdateUser, requestPasswordReset, confirmPasswordReset, requestEmailVerification, confirmEmailVerification, adminResetPassword, adminDeleteUser, adminCreateUser, adminAddUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
