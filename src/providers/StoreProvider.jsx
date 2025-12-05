/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, createContext, useContext } from "react";
import * as XLSX from "xlsx";
import { API_ENDPOINTS, api } from "../config/api";

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

export function StoreProvider({ children }) {
  // State for data loaded from server
  const [candidates, setCandidates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [audit, setAudit] = useState([]);
  const [publicNews, setPublicNews] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState({
    candidates: true,
    courses: true,
    mentors: true,
    notifications: false,
    corrections: false,
    audit: false
  });

  // Simple userName for UI display (can stay in localStorage)
  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem("fg.userName") || "";
    } catch (e) {
      return "";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("fg.userName", userName);
    } catch (e) {
      void e;
    }
  }, [userName]);

  // ========== CANDIDATES API ==========
  async function fetchCandidates() {
    try {
      setLoading(prev => ({ ...prev, candidates: true }));
      const data = await api.get(API_ENDPOINTS.candidates);
      setCandidates(data || []);
      console.log('✅ Loaded candidates from server');
    } catch (error) {
      console.error('❌ Failed to load candidates:', error);
      setCandidates([]);
    } finally {
      setLoading(prev => ({ ...prev, candidates: false }));
    }
  }

  async function addCandidate(candidate) {
    try {
      const newCandidate = await api.post(API_ENDPOINTS.candidates, candidate);
      setCandidates(prev => [newCandidate, ...prev]);
      console.log('✅ Added candidate');
      return newCandidate;
    } catch (error) {
      console.error('❌ Failed to add candidate:', error);
      throw error;
    }
  }

  async function updateCandidate(id, patch) {
    try {
      const updated = await api.put(API_ENDPOINTS.candidateById(id), patch);
      setCandidates(prev => prev.map(c => c.id === id ? updated : c));
      console.log('✅ Updated candidate');
      return updated;
    } catch (error) {
      console.error('❌ Failed to update candidate:', error);
      throw error;
    }
  }

  async function deleteCandidate(id) {
    try {
      await api.delete(API_ENDPOINTS.candidateById(id));
      setCandidates(prev => prev.filter(c => c.id !== id));
      console.log('✅ Deleted candidate');
    } catch (error) {
      console.error('❌ Failed to delete candidate:', error);
      throw error;
    }
  }

  // ========== COURSES API ==========
  async function fetchCourses() {
    try {
      setLoading(prev => ({ ...prev, courses: true }));
      const data = await api.get(API_ENDPOINTS.courses);
      setCourses(data || []);
      console.log('✅ Loaded courses from server');
    } catch (error) {
      console.error('❌ Failed to load courses:', error);
      setCourses([]);
    } finally {
      setLoading(prev => ({ ...prev, courses: false }));
    }
  }

  async function addCourse(course) {
    try {
      const newCourse = await api.post(API_ENDPOINTS.courses, course);
      setCourses(prev => [newCourse, ...prev]);
      console.log('✅ Added course');
      return newCourse;
    } catch (error) {
      console.error('❌ Failed to add course:', error);
      throw error;
    }
  }

  async function updateCourse(id, patch) {
    try {
      const updated = await api.put(API_ENDPOINTS.courseById(id), patch);
      setCourses(prev => prev.map(c => c.id === id ? updated : c));
      console.log('✅ Updated course');
      return updated;
    } catch (error) {
      console.error('❌ Failed to update course:', error);
      throw error;
    }
  }

  async function deleteCourse(id) {
    try {
      await api.delete(API_ENDPOINTS.courseById(id));
      setCourses(prev => prev.filter(c => c.id !== id));
      console.log('✅ Deleted course');
    } catch (error) {
      console.error('❌ Failed to delete course:', error);
      throw error;
    }
  }

  // ========== MENTORS API ==========
  async function fetchMentors() {
    try {
      setLoading(prev => ({ ...prev, mentors: true }));
      const data = await api.get(API_ENDPOINTS.mentors);
      setMentors(data || []);
      console.log('✅ Loaded mentors from server');
    } catch (error) {
      console.error('❌ Failed to load mentors:', error);
      setMentors([]);
    } finally {
      setLoading(prev => ({ ...prev, mentors: false }));
    }
  }

  async function addMentor(mentor) {
    try {
      const newMentor = await api.post(API_ENDPOINTS.mentors, mentor);
      setMentors(prev => [newMentor, ...prev]);
      console.log('✅ Added mentor');
      return newMentor;
    } catch (error) {
      console.error('❌ Failed to add mentor:', error);
      throw error;
    }
  }

  async function updateMentor(id, patch) {
    try {
      const updated = await api.put(API_ENDPOINTS.mentorById(id), patch);
      setMentors(prev => prev.map(m => m.id === id ? updated : m));
      console.log('✅ Updated mentor');
      return updated;
    } catch (error) {
      console.error('❌ Failed to update mentor:', error);
      throw error;
    }
  }

  async function deleteMentor(id) {
    try {
      await api.delete(API_ENDPOINTS.mentorById(id));
      setMentors(prev => prev.filter(m => m.id !== id));
      console.log('✅ Deleted mentor');
    } catch (error) {
      console.error('❌ Failed to delete mentor:', error);
      throw error;
    }
  }

  // ========== NOTIFICATIONS (Local for now) ==========
  function notify(target, { type, title, body, targetRef = {} }){
    const item = { 
      id: `NTF-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, 
      ts: new Date().toISOString(), 
      to: target, 
      type, 
      title, 
      body, 
      target: targetRef, 
      read: false 
    };
    setNotifications(prev => [item, ...prev]);
  }

  function notificationsFor(user){
    return (notifications || []).filter(n => 
      (n.to?.email && user?.email && n.to.email.toLowerCase() === user.email.toLowerCase()) || 
      (n.to?.role && user?.role && n.to.role === user.role)
    );
  }

  function markRead(id){ 
    setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n)); 
  }

  function markAllReadFor(user){ 
    setNotifications(prev => prev.map(n => 
      ((n.to?.email?.toLowerCase() === user?.email?.toLowerCase()) || (n.to?.role === user?.role)) 
        ? {...n, read: true} 
        : n
    )); 
  }

  // ========== AUDIT LOG (Local for now) ==========
  function logEvent(type, payload) { 
    const evt = { 
      id: `E-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, 
      type, 
      payload, 
      ts: new Date().toISOString() 
    }; 
    setAudit(a => [evt, ...a]); 
  }

  // ========== HELPER: Sync single candidate to server ==========
  async function syncCandidate(candidate) {
    try {
      await api.put(API_ENDPOINTS.candidateById(candidate.id), candidate);
      console.log('✅ Synced candidate to server');
    } catch (error) {
      console.error('❌ Failed to sync candidate:', error);
    }
  }

  async function syncCourse(course) {
    try {
      await api.put(API_ENDPOINTS.courseById(course.id), course);
      console.log('✅ Synced course to server');
    } catch (error) {
      console.error('❌ Failed to sync course:', error);
    }
  }

  async function syncMentor(mentor) {
    try {
      await api.put(API_ENDPOINTS.mentorById(mentor.id), mentor);
      console.log('✅ Synced mentor to server');
    } catch (error) {
      console.error('❌ Failed to sync mentor:', error);
    }
  }

  // ========== LOAD DATA ON MOUNT ==========
  useEffect(() => {
    fetchCandidates();
    fetchCourses();
    fetchMentors();
  }, []);

  return (
    <StoreContext.Provider value={{ 
      // Data
      candidates, 
      courses, 
      mentors, 
      notifications, 
      corrections, 
      audit, 
      publicNews, 
      userName,
      loading,
      
      // Candidates
      fetchCandidates,
      addCandidate,
      updateCandidate,
      deleteCandidate,
      setCandidates, // For direct state updates (use updateCandidate for persistence)
      syncCandidate, // Sync single candidate to server
      
      // Courses
      fetchCourses,
      addCourse,
      updateCourse,
      deleteCourse,
      setCourses, // For direct state updates (use updateCourse for persistence)
      syncCourse, // Sync single course to server
      
      // Mentors
      fetchMentors,
      addMentor,
      updateMentor,
      deleteMentor,
      setMentors, // For direct state updates (use updateMentor for persistence)
      syncMentor, // Sync single mentor to server
      
      // Notifications
      notify, 
      notificationsFor, 
      markRead, 
      markAllReadFor,
      
      // Audit
      logEvent,
      
      // Other
      setCorrections, 
      setAudit, 
      setUserName, 
      setPublicNews
    }}>
      {children}
    </StoreContext.Provider>
  );
}
