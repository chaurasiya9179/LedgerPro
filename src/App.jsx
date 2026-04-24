import React, { useState, useEffect, useRef, useContext } from 'react';
import { supabaseUrl, supabaseKey, isValidUUID, calculateAccruedInterest, callGeminiAI } from './utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  Home, CreditCard, FileText, Grid, LogOut, PieChart, Plus, Shield, AlertCircle, Check, Clock, Database, Mail, Lock, Trash, Users, MessageSquare, X, Key, Copy, User, UserPlus, Edit, Phone, MapPin, DollarSign, Activity, Download, Upload, Star, HelpCircle, Zap, ChevronRight, Menu, MessageCircle, Search, File, Hash, Bell, Send, Bot, Sparkles, BarChart, Headset, Calculator
} from 'lucide-react';

import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';

// 🔥 IMPORTS UPDATED: SuperAdminDashboardView & AdminProfilesView added here safely
import AdminDashboardView, { StatCard, AdminVisualAnalytics, LoanHistoryModal, AIInsightsModal, SuperAdminDashboardView, AdminProfilesView } from './components/AdminDashboard';
import { DashboardView, UserVisualAnalytics, OriginationView, MyLoansView, UserMyProfileView } from './components/UserViews';

// --- System Refresh ---
console.log("LeaderPro System Version 11.5 (Super Admin Integrated & No Functions Deleted)");

// --- Language Context ---
export const LanguageContext = React.createContext({ lang: 'hi', setLang: () => { }, t: (en, hi) => hi });

// --- Main Application Component ---
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [lang, setLang] = useState(() => localStorage.getItem('leaderpro_lang') || 'hi');
  useEffect(() => { localStorage.setItem('leaderpro_lang', lang); }, [lang]);
  const t = (en, hi) => lang === 'en' ? en : hi;

  const [route, setRoute] = useState('landing');
  const [activeTab, setActiveTab] = useState('dashboard');

  const [loans, setLoans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [supportChats, setSupportChats] = useState([]);

  const [dbSetupRequired, setDbSetupRequired] = useState(false);
  const [dbAlterRequired, setDbAlterRequired] = useState(false);
  const [dbRecoveredAlterRequired, setDbRecoveredAlterRequired] = useState(false);
  const [dbProfileSetupRequired, setDbProfileSetupRequired] = useState(false);
  const [dbProfileAlterRequired, setDbProfileAlterRequired] = useState(false);
  const [dbDeletePolicyRequired, setDbDeletePolicyRequired] = useState(false);
  const [dbRpcRequired, setDbRpcRequired] = useState(false);
  const [dbTransactionsAlterRequired, setDbTransactionsAlterRequired] = useState(false);
  const [dbNotificationsAlterRequired, setDbNotificationsAlterRequired] = useState(false);
  const [dbInquiriesSetupRequired, setDbInquiriesSetupRequired] = useState(false);
  const [dbChatsSetupRequired, setDbChatsSetupRequired] = useState(false);

  const [modal, setModal] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const showAlert = (title, message) => setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null });
  const showConfirm = (title, message, onConfirm) => setModal({ isOpen: true, type: 'confirm', title, message, onConfirm });
  const closeModal = () => setModal({ ...modal, isOpen: false });

  // 🔥 ROLE LOGIC UPDATED FOR SUPER ADMIN 🔥
  const userRole = session?.user?.user_metadata?.role;
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin || session?.user?.email === 'admin@leaderpro.com';

  const handleLogout = async () => {
    if (session && !isAdmin) {
      try { await fetch(`${supabaseUrl}/rest/v1/support_chats?user_id=eq.${session.user.id}`, { method: 'DELETE', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } }); } catch (e) {}
    }
    localStorage.removeItem('leaderpro_session');
    setSession(null); 
    setLoans([]); 
    setProfiles([]); 
    setSupportChats([]); 
    setActiveTab('dashboard'); 
    setRoute('landing');
  };

  const fetchData = async (currentSession) => {
    if (!currentSession) return;

    try {
      let loanQuery = `${supabaseUrl}/rest/v1/loans?user_id=eq.${currentSession.user.id}&order=createdAt.desc`;
      if (isSuperAdmin) loanQuery = `${supabaseUrl}/rest/v1/loans?order=createdAt.desc`;
      else if (isAdmin) loanQuery = `${supabaseUrl}/rest/v1/loans?admin_id=eq.${currentSession.user.id}&order=createdAt.desc`;

      const loanRes = await fetch(loanQuery, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${currentSession.access_token}`, 'Content-Type': 'application/json' } });
      
      // 🔥 SECURITY FIX: Expired Token / Deleted User Auto-Logout 🔥
      if (loanRes.status === 401 || loanRes.status === 403) { handleLogout(); return; }
      
      if (loanRes.status === 404) setDbSetupRequired(true);
      else if (loanRes.status === 400) setDbAlterRequired(true);
      else if (loanRes.ok) {
        const data = await loanRes.json();
        setLoans(data || []); setDbSetupRequired(false); setDbAlterRequired(false);
      }
    } catch (error) { console.error(error); }

    try {
      let profileQuery = `${supabaseUrl}/rest/v1/profiles?user_id=eq.${currentSession.user.id}&order=createdAt.desc`;
      if (isSuperAdmin) profileQuery = `${supabaseUrl}/rest/v1/profiles?order=createdAt.desc`;
      else if (isAdmin) profileQuery = `${supabaseUrl}/rest/v1/profiles?or=(admin_id.eq.${currentSession.user.id},user_id.eq.${currentSession.user.id})&order=createdAt.desc`;

      const profileRes = await fetch(profileQuery, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${currentSession.access_token}`, 'Content-Type': 'application/json' } });
      
      if (profileRes.status === 401 || profileRes.status === 403) { handleLogout(); return; }

      if (profileRes.status === 404) setDbProfileSetupRequired(true);
      else if (profileRes.ok) {
        const data = await profileRes.json();
        setProfiles(data || []); setDbProfileSetupRequired(false);
      }
    } catch (error) { console.error(error); }

    if (isAdmin) {
      try {
        const inqRes = await fetch(`${supabaseUrl}/rest/v1/contact_messages?order=createdAt.desc`, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${currentSession.access_token}`, 'Content-Type': 'application/json' } });
        if (inqRes.status === 404) setDbInquiriesSetupRequired(true);
        else if (inqRes.ok) { const data = await inqRes.json(); setInquiries(data || []); setDbInquiriesSetupRequired(false); }
      } catch (error) { console.error(error); }
    }

    try {
      let chatQuery = `${supabaseUrl}/rest/v1/support_chats?user_id=eq.${currentSession.user.id}&order=createdAt.asc`;
      if (isSuperAdmin) chatQuery = `${supabaseUrl}/rest/v1/support_chats?order=createdAt.asc`;
      else if (isAdmin) chatQuery = `${supabaseUrl}/rest/v1/support_chats?admin_id=eq.${currentSession.user.id}&order=createdAt.asc`;

      const chatRes = await fetch(chatQuery, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${currentSession.access_token}`, 'Content-Type': 'application/json' } });
      if (chatRes.status === 404) setDbChatsSetupRequired(true);
      else if (chatRes.ok) { const data = await chatRes.json(); setSupportChats(data || []); setDbChatsSetupRequired(false); }
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    let chatInterval;
    if (session && activeTab === 'chat') {
      chatInterval = setInterval(async () => {
        try {
          let chatQuery = `${supabaseUrl}/rest/v1/support_chats?user_id=eq.${session.user.id}&order=createdAt.asc`;
          if (isSuperAdmin) chatQuery = `${supabaseUrl}/rest/v1/support_chats?order=createdAt.asc`;
          else if (isAdmin) chatQuery = `${supabaseUrl}/rest/v1/support_chats?admin_id=eq.${session.user.id}&order=createdAt.asc`;

          const chatRes = await fetch(chatQuery, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } });
          if (chatRes.ok) { const data = await chatRes.json(); setSupportChats(data || []); }
        } catch (error) { console.error(error); }
      }, 3000);
    }
    return () => clearInterval(chatInterval);
  }, [session, activeTab, isAdmin, isSuperAdmin]);

  useEffect(() => {
    const initAuth = () => {
      const storedSession = localStorage.getItem('leaderpro_session');
      if (storedSession) { 
         const parsed = JSON.parse(storedSession);
         setSession(parsed); 
         setRoute('app'); 
      }
      setAuthLoading(false);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (session) {
      fetchData(session);
      if (isAdmin && (activeTab === 'dashboard' || activeTab === 'apply' || activeTab === 'loans' || activeTab === 'my_profile' || activeTab === 'support')) {
        setActiveTab('admin_dashboard');
      }
    }
  }, [session, isAdmin]);

  const deleteLoan = async (loanId) => {
    showConfirm("Loan Delete Karein", "Kya aap is application ko hamesha ke liye delete karna chahte hain?", async () => {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/loans?id=eq.${loanId}`, { method: 'DELETE', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' } });
        if (!response.ok) throw new Error("Delete fail");
        setLoans(prev => prev.filter(l => l.id !== loanId));
        showAlert("Success", "Loan application delete ho gayi.");
      } catch (err) { showAlert("Error", "Loan delete nahi ho paya. Kripya Supabase Policies check karein."); }
    });
  };

  const updateLoanData = async (loanId, updateData, showSuccessAlert = true) => {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/loans?id=eq.${loanId}`, { method: 'PATCH', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(updateData) });
      if (!response.ok) throw new Error("Update fail");
      setLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updateData } : l));
      if (showSuccessAlert) showAlert("Success", `Loan data update ho gaya!`);
    } catch (err) { showAlert("Error", "Update nahi ho paya. Database structure check karein."); }
  };

  const createAdminLoan = async (loanData) => {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/loans`, { method: 'POST', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(loanData) });
      if (!response.ok) throw new Error("Loan create fail");
      showAlert("Success", "Naya Loan safaltapurvak user ke khate mein add ho gaya!");
      fetchData(session);
    } catch (err) { showAlert("Error", "Loan add nahi ho paya. Database check karein."); }
  };

  const saveProfile = async (profileData, isEdit = false) => {
    try {
      const method = isEdit ? 'PATCH' : 'POST';
      const url = isEdit ? `${supabaseUrl}/rest/v1/profiles?id=eq.${profileData.id}` : `${supabaseUrl}/rest/v1/profiles`;
      const response = await fetch(url, { method: method, headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(profileData) });
      if (!response.ok) throw new Error("Profile save failed");
      showAlert("Success", isEdit ? "Profile Update ho gayi!" : "Nayi Profile Ban Gayi!");
      fetchData(session);
    } catch (err) { showAlert("Error", "Profile save nahi ho payi. Database setup check karein."); }
  };

  const deleteProfile = async (profile) => {
    showConfirm("User Ka Pura Account Delete Karein", "WARNING: Kya aap is user ki profile, loans aur LOGIN ACCOUNT permanently delete karna chahte hain? Ye wapas nahi aa sakta.", async () => {
      try {
        showAlert("Info", "Data delete ho raha hai, kripya pratiksha karein...");
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_user_account`, { method: 'POST', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id_to_delete: profile.user_id }) });
        if (!response.ok) throw new Error("RPC Call failed");
        setProfiles(prev => prev.filter(p => p.id !== profile.id));
        setLoans(prev => prev.filter(l => l.user_id !== profile.user_id));
        showAlert("Success", "User ka account aur saara data hamesha ke liye delete ho gaya hai.");
      } catch (err) { showAlert("Error", "Account delete nahi ho paya. Permissions check karein."); }
    });
  };

  const sendUserNotification = async (userId, messageText) => {
    try {
      const profile = profiles.find(p => p.user_id === userId);
      if (!profile) return;
      const currentNotifs = Array.isArray(profile.notifications) ? profile.notifications : [];
      const updatedNotifs = [{ id: Date.now(), text: messageText, date: Date.now(), read: false }, ...currentNotifs];
      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, { method: 'PATCH', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify({ notifications: updatedNotifs }) });
      if (!response.ok) throw new Error("Message send failed");
      setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, notifications: updatedNotifs } : p));
      showAlert("Success", "Notification user ko bhej diya gaya hai!");
    } catch (err) { showAlert("Error", "Notification nahi ja saka."); }
  };

  const markNotificationsRead = async () => {
    if (!profiles[0]) return;
    const currentNotifs = Array.isArray(profiles[0].notifications) ? profiles[0].notifications : [];
    if (currentNotifs.every(n => n.read)) return;
    const updatedNotifs = currentNotifs.map(n => ({ ...n, read: true }));
    try {
      await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${session.user.id}`, { method: 'PATCH', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ notifications: updatedNotifs }) });
      setProfiles(prev => prev.map(p => p.user_id === session.user.id ? { ...p, notifications: updatedNotifs } : p));
    } catch (err) {}
  };

  const submitContactMessage = async (name, email, message) => {
    const response = await fetch(`${supabaseUrl}/rest/v1/contact_messages`, { method: 'POST', headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ name, email, message, status: 'unread', createdAt: Date.now() }) });
    if (!response.ok) throw new Error("Message submission failed");
  };

  const updateInquiryStatus = async (id, newStatus) => {
    try {
      await fetch(`${supabaseUrl}/rest/v1/contact_messages?id=eq.${id}`, { method: 'PATCH', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq));
    } catch (e) { showAlert("Error", "Status update failed."); }
  };

  const deleteInquiry = async (id) => {
    showConfirm("Delete Message", "Kya aap is message ko delete karna chahte hain?", async () => {
      try {
        await fetch(`${supabaseUrl}/rest/v1/contact_messages?id=eq.${id}`, { method: 'DELETE', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } });
        setInquiries(prev => prev.filter(inq => inq.id !== id));
        showAlert("Success", "Message delete ho gaya.");
      } catch (e) { showAlert("Error", "Delete failed."); }
    });
  };

  const handleSendLiveChat = async (userId, adminId, senderRole, text) => {
    const newChat = { user_id: userId, admin_id: adminId, sender_role: senderRole, message: text, createdAt: Date.now() };
    const tempId = Math.random().toString();
    setSupportChats(prev => [...prev, { ...newChat, id: tempId }]);
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/support_chats`, { method: 'POST', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(newChat) });
      if (!response.ok) throw new Error("Chat fail");
      const savedData = await response.json();
      if (savedData && savedData.length > 0) setSupportChats(prev => prev.map(c => c.id === tempId ? savedData[0] : c));
    } catch (e) { setSupportChats(prev => prev.filter(c => c.id !== tempId)); showAlert("Error", t("Failed to send message.", "Message send fail ho gaya.")); }
  };

  const [showUserNotifs, setShowUserNotifs] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderContent = () => {
    if (authLoading) return <div className="flex items-center justify-center min-h-screen bg-[#050505]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div></div>;
    if (route === 'landing') return <LandingPage onNavigate={(path) => setRoute(path)} session={session} onSubmitContact={submitContactMessage} />;
    
    // 🔥 STRICT SECURITY LOCK: If route is 'app' but NO session exists, kick to auth 🔥
    if (route === 'app' && !session) {
      return <AuthScreen setSession={(s) => { setSession(s); setRoute('app'); }} showAlert={showAlert} onBack={() => setRoute('landing')} />;
    }
    
    if (route === 'auth') return <AuthScreen setSession={(s) => { setSession(s); setRoute('app'); }} showAlert={showAlert} onBack={() => setRoute('landing')} />;

    return (
      <div className="flex h-screen bg-[#050505] text-slate-300 font-sans relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none"></div>

        {isMobileMenuOpen && <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />}

        <aside className={`fixed md:relative top-0 left-0 z-50 w-72 md:w-64 h-full bg-[#0a0c10] md:bg-white/5 backdrop-blur-2xl border-r border-white/5 text-white flex flex-col shrink-0 transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : '-translate-x-full'} md:translate-x-0`}>
          <div className="p-6 flex items-center justify-between border-b border-white/5 md:border-none">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setRoute('landing')}>
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)]"><Home className="h-6 w-6 text-white" /></div>
              <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">LeaderPro</span>
            </div>
            <button className="md:hidden text-slate-400 hover:text-white bg-white/5 p-2 rounded-lg" onClick={() => setIsMobileMenuOpen(false)}><X className="h-5 w-5" /></button>
            {!isAdmin && profiles[0] && (
              <div className="relative cursor-pointer hidden md:block" onClick={() => { setShowUserNotifs(true); markNotificationsRead(); }}>
                <Bell className="h-6 w-6 text-slate-300 hover:text-cyan-400 transition-colors" />
                {Array.isArray(profiles[0].notifications) && profiles[0].notifications.filter(n => !n.read).length > 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-[#050505]"></span></span>}
              </div>
            )}
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
            {isAdmin ? (
              <>
                <NavItem icon={<Users />} label={userRole === 'super_admin' ? t("Super Admin Panel", "सुपर एडमिन पैनल") : t("Admin Panel (Loans)", "Admin Panel (Loans)")} active={activeTab === 'admin_dashboard'} onClick={() => { setActiveTab('admin_dashboard'); setIsMobileMenuOpen(false); }} />
                {userRole !== 'super_admin' && <NavItem icon={<User />} label={t("User Profiles", "User Profiles")} active={activeTab === 'profiles'} onClick={() => { setActiveTab('profiles'); setIsMobileMenuOpen(false); }} />}
                {userRole !== 'super_admin' && <NavItem icon={<MessageCircle />} label={t("Live Chat", "Live Chat / सहायता")} active={activeTab === 'chat'} onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }} />}
              </>
            ) : (
              <>
                <NavItem icon={<Grid />} label={t("Dashboard", "डैशबोर्ड")} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} />
                <NavItem icon={<User />} label={t("My Profile", "मेरी प्रोफाइल")} active={activeTab === 'my_profile'} onClick={() => { setActiveTab('my_profile'); setIsMobileMenuOpen(false); }} />
                <NavItem icon={<Plus />} label={t("New Loan", "नया लोन")} active={activeTab === 'apply'} onClick={() => { setActiveTab('apply'); setIsMobileMenuOpen(false); }} />
                <NavItem icon={<CreditCard />} label={t("My Loans", "मेरे लोन")} active={activeTab === 'loans'} onClick={() => { setActiveTab('loans'); setIsMobileMenuOpen(false); }} />
                <NavItem icon={<Headset />} label={t("Support", "सहायता")} active={activeTab === 'chat'} onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }} />
              </>
            )}
          </nav>

          <div className="p-4 border-t border-white/5 space-y-4 shrink-0">
            <div className="bg-black/30 p-1 rounded-xl flex space-x-1 border border-white/10">
              <button onClick={() => setLang('en')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'en' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'}`}>English</button>
              <button onClick={() => setLang('hi')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'hi' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'}`}>हिंदी</button>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">{t("Your Role", "Aapka Role")}</span>
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${userRole === 'super_admin' ? 'bg-amber-500/20 text-amber-400' : isAdmin ? 'bg-indigo-500/20 text-indigo-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                {userRole === 'super_admin' ? 'SUPER ADMIN' : isAdmin ? 'ADMIN' : 'USER'}
              </span>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2.5 rounded-xl transition-all duration-300 font-medium">
              <LogOut className="h-4 w-4" /><span>{t("Secure Logout", "Surakshit Logout")}</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 z-10 flex flex-col relative custom-scrollbar">
          <div className="md:hidden flex items-center justify-between mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg"><Home className="h-5 w-5 text-white" /></div>
              <span className="text-xl font-bold text-white tracking-tight">LeaderPro</span>
            </div>
            <div className="flex items-center space-x-4">
              {!isAdmin && profiles[0] && (
                <div className="relative cursor-pointer" onClick={() => { setShowUserNotifs(true); markNotificationsRead(); }}>
                  <Bell className="h-6 w-6 text-slate-300" />
                  {Array.isArray(profiles[0].notifications) && profiles[0].notifications.filter(n => !n.read).length > 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-[#050505]"></span></span>}
                </div>
              )}
              <button onClick={() => setIsMobileMenuOpen(true)} className="text-cyan-400 bg-black/40 p-2 rounded-xl border border-white/10 shadow-sm"><Menu className="h-6 w-6" /></button>
            </div>
          </div>

          <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col relative">
            {dbSetupRequired && <DbWarning title="Loans Table Missing" query={`CREATE TABLE loans (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, admin_id uuid, amount numeric, "recoveredAmount" numeric DEFAULT 0, tenure numeric, "interestRate" numeric, emi numeric, status text, type text, "createdAt" int8, "adminNote" text);`} />}
            
            {/* 🔥 TABS ROUTING LOGIC 🔥 */}
            {activeTab === 'admin_dashboard' && userRole === 'super_admin' && <SuperAdminDashboardView profiles={profiles} session={session} showAlert={showAlert} />}
            {activeTab === 'admin_dashboard' && userRole !== 'super_admin' && isAdmin && <AdminDashboardView loans={loans} profiles={profiles} onDelete={deleteLoan} onUpdate={updateLoanData} onCreate={createAdminLoan} adminId={session.user.id} showAlert={showAlert} session={session} />}
            {activeTab === 'profiles' && isAdmin && userRole !== 'super_admin' && <AdminProfilesView profiles={profiles} loans={loans} adminId={session.user.id} onSave={saveProfile} onDelete={deleteProfile} onSendMessage={sendUserNotification} showAlert={showAlert} />}
            {activeTab === 'inquiries' && isAdmin && userRole !== 'super_admin' && <AdminInquiriesView inquiries={inquiries} onUpdateStatus={updateInquiryStatus} onDelete={deleteInquiry} t={t} />}
            {activeTab === 'chat' && isAdmin && userRole !== 'super_admin' && <AdminLiveChatView profiles={profiles} chats={supportChats} onSend={handleSendLiveChat} adminId={session.user.id} onClose={() => setActiveTab('admin_dashboard')} t={t} />}

            {activeTab === 'dashboard' && !isAdmin && <DashboardView loans={loans.filter(l => l.user_id === session.user.id)} profile={profiles[0]} onNavigate={setActiveTab} session={session} showAlert={showAlert} onSuccess={() => fetchData(session)} />}
            {activeTab === 'my_profile' && !isAdmin && <UserMyProfileView profile={profiles[0]} session={session} onSave={saveProfile} showAlert={showAlert} />}
            {activeTab === 'apply' && !isAdmin && <OriginationView session={session} onNavigate={setActiveTab} onSuccess={() => fetchData(session)} isAdmin={isAdmin} showAlert={showAlert} loans={loans} profile={profiles[0]} />}
            {activeTab === 'loans' && !isAdmin && <MyLoansView loans={loans.filter(l => l.user_id === session.user.id)} profile={profiles[0]} session={session} onNavigate={setActiveTab} />}
            {activeTab === 'chat' && !isAdmin && <UserLiveChatView session={session} profile={profiles[0]} chats={supportChats.filter(c => c.user_id === session.user.id)} onSend={handleSendLiveChat} onClose={() => setActiveTab('dashboard')} onNavigate={setActiveTab} t={t} />}
          </div>
        </main>
        {session && <FloatingCalculator t={t} />}
      </div>
    );
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <div style={{ scrollBehavior: 'smooth' }}>
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.5); }
        `}</style>
        {renderContent()}
        {modal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111318] border border-white/10 p-6 rounded-3xl shadow-2xl max-w-sm w-full">
              <div className="flex items-center space-x-3 mb-4">
                {modal.type === 'confirm' ? <AlertCircle className="h-6 w-6 text-amber-500" /> : <Shield className="h-6 w-6 text-cyan-500" />}
                <h3 className="text-xl font-bold text-white">{modal.title}</h3>
              </div>
              <p className="text-slate-400 mb-8 text-sm leading-relaxed whitespace-pre-wrap">{modal.message}</p>
              <div className="flex justify-end gap-3">
                {modal.type === 'confirm' && <button onClick={closeModal} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-colors">{t("No, Cancel", "Nahi, Cancel")}</button>}
                <button onClick={() => { if (modal.type === 'confirm' && modal.onConfirm) modal.onConfirm(); closeModal(); }} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg ${modal.type === 'confirm' ? 'bg-red-500 hover:bg-red-400 text-black shadow-red-500/20' : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20'}`}>
                  {modal.type === 'confirm' ? t("Yes, Confirm", "Haan, Pakka") : t("Okay", "Theek Hai (OK)")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LanguageContext.Provider>
  );
}


function DbWarning({ title, query, isAlter }) {
  return (
    <div className={`${isAlter ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'} backdrop-blur-md border p-4 mb-6 rounded-2xl flex items-start space-x-4 shadow-lg`}>
      <Database className={`h-6 w-6 mt-1 ${isAlter ? 'text-amber-400' : 'text-red-400'}`} />
      <div className="w-full overflow-hidden">
        <h3 className={`${isAlter ? 'text-amber-400' : 'text-red-400'} font-semibold text-lg`}>{title}</h3>
        <p className="text-slate-300 mt-1 text-sm">Naye features ke liye Supabase SQL Editor mein ye run karein:</p>
        <pre className="overflow-x-auto p-3 bg-black/80 text-cyan-300 rounded-lg mt-2 border border-white/5 text-xs font-mono w-full whitespace-pre-wrap">
          {query}
        </pre>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${active
        ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/10 border-l-2 border-cyan-400 text-white shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-2 border-transparent'
        }`}
    >
      {React.cloneElement(icon, { className: `h-5 w-5 ${active ? 'text-cyan-400' : ''}` })}
      <span className="font-medium tracking-wide">{label}</span>
    </button>
  );
}

function FloatingCalculator({ t }) {
  const [isOpen, setIsOpen] = useState(false);
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(24);
  const [months, setMonths] = useState(12);

  const calculate = () => {
    const p = Number(principal);
    const r = Number(rate) / 12 / 100;
    const n = Number(months);
    if (!p || !r || !n) return { emi: 0, totalInterest: 0, totalAmount: 0 };
    
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalAmount = emi * n;
    const totalInterest = totalAmount - p;
    
    return { emi: Math.round(emi), totalInterest: Math.round(totalInterest), totalAmount: Math.round(totalAmount) };
  };

  const results = calculate();

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end">
      {isOpen && (
        <div className="bg-[#111318]/95 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.2)] rounded-3xl p-6 mb-4 w-[320px] animate-in slide-in-from-bottom-6 duration-300">
          <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-4">
            <h3 className="text-white font-bold flex items-center text-lg">
              <Calculator className="w-5 h-5 mr-2 text-cyan-400"/> 
              {t("EMI Calculator", "EMI Calculator")}
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white bg-white/5 p-1.5 rounded-full transition-colors"><X className="w-4 h-4"/></button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Principal Rashi (₹)</label>
              <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none" />
            </div>
            <div className="flex gap-3">
               <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Byaj Dar (%)</label>
                  <input type="number" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none" />
               </div>
               <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block">Samay (Mahine)</label>
                  <input type="number" value={months} onChange={(e) => setMonths(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none" />
               </div>
            </div>
            
            <div className="bg-gradient-to-br from-cyan-950/30 to-indigo-950/30 border border-cyan-500/20 p-4 rounded-xl mt-4 space-y-3">
               <div className="flex justify-between text-sm items-center"><span className="text-slate-400 text-xs uppercase tracking-wider">Mahine ki EMI:</span> <span className="text-cyan-400 font-bold text-base">₹{results.emi.toLocaleString('en-IN')}</span></div>
               <div className="flex justify-between text-sm items-center"><span className="text-slate-400 text-xs uppercase tracking-wider">Kul Byaj:</span> <span className="text-amber-400 font-bold">₹{results.totalInterest.toLocaleString('en-IN')}</span></div>
               <div className="flex justify-between text-sm items-center border-t border-white/10 pt-3"><span className="text-white font-bold text-xs uppercase tracking-wider">Kul Wapsi:</span> <span className="text-white font-black text-lg">₹{results.totalAmount.toLocaleString('en-IN')}</span></div>
            </div>
          </div>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`p-4 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all duration-300 flex items-center justify-center border border-white/10 ${isOpen ? 'bg-slate-800 text-white rotate-90 scale-90' : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white hover:scale-110'}`}
      >
         {isOpen ? <X className="w-6 h-6" /> : <Calculator className="w-6 h-6" />}
      </button>
    </div>
  );
}

function AdminLiveChatView({ profiles, chats, onSend, adminId, onClose, t }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [msgInput, setMsgInput] = useState('');

  const chatContainerRef = useRef(null);

  const activeProfile = profiles.find(p => p.user_id === selectedUser);
  const activeChats = chats.filter(c => c.user_id === selectedUser);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [activeChats, selectedUser]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!msgInput.trim() || !selectedUser) return;
    onSend(selectedUser, adminId, 'admin', msgInput);
    setMsgInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px] animate-in fade-in duration-700">
      <header className="mb-6 shrink-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">{t("Live Support", "Live Chat /")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">{t("Chat", "सहायता")}</span></h1>
          <p className="text-slate-400 mt-2 text-lg">{t("Real-time communication with your users.", "Apne users se real-time mein baat karein.")}</p>
        </div>
        <button onClick={onClose} className="flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl transition-all text-sm font-bold w-full sm:w-auto">
          <X className="h-4 w-4" /> <span>{t("Close Chat", "Chat Band Karein")}</span>
        </button>
      </header>

      <div className="flex flex-col md:flex-row flex-1 bg-[#111318] rounded-3xl border border-white/[0.04] shadow-xl overflow-hidden min-h-0">
        <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-white/10 flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-white/10 shrink-0">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t("Your Users", "Aapke Users")}</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {profiles.length === 0 ? (
              <p className="text-center text-slate-500 text-sm mt-10">No users found.</p>
            ) : (
              profiles.map(p => {
                const userMsgs = chats.filter(c => c.user_id === p.user_id);
                const lastMsg = userMsgs[userMsgs.length - 1];
                const isUnread = lastMsg && lastMsg.sender_role === 'user';

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedUser(p.user_id)}
                    className={`w-full text-left flex items-center p-3 rounded-xl transition-colors ${selectedUser === p.user_id ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/5 border border-transparent'}`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      {isUnread && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#111318]"></span>}
                    </div>
                    <div className="ml-3 flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-white truncate">{p.full_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500 truncate">{lastMsg ? lastMsg.message : 'No messages yet'}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className={`w-full flex-col flex-1 bg-black/20 ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
              <p>{t("Select a user to start chatting.", "Chat shuru karne ke liye user chunein.")}</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-white/10 bg-[#111318] flex items-center space-x-3 shrink-0">
                <button className="md:hidden p-2 text-slate-400 hover:text-white" onClick={() => setSelectedUser(null)}><ChevronRight className="h-6 w-6 rotate-180" /></button>
                <div className="w-10 h-10 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/30 shrink-0">
                  <User className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-white truncate">{activeProfile?.full_name || 'Unknown User'}</h3>
                  <p className="text-[10px] font-mono text-slate-500 truncate">{selectedUser}</p>
                </div>
              </div>

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 min-h-0 scroll-smooth">
                {activeChats.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm mt-10">{t("No messages yet. Send a greeting!", "Abhi tak koi message nahi hai.")}</div>
                ) : (
                  activeChats.map(c => (
                    <div key={c.id} className={`flex ${c.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] p-3 rounded-2xl ${c.sender_role === 'admin' ? 'bg-cyan-600 text-white rounded-br-sm shadow-md' : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-white/5'}`}>
                        <p className="text-sm leading-relaxed">{c.message}</p>
                        <p className={`text-[9px] mt-1 text-right ${c.sender_role === 'admin' ? 'text-cyan-200/70' : 'text-slate-500'}`}>
                          {new Date(Number(c.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 bg-[#111318] border-t border-white/10 shrink-0">
                <form onSubmit={handleSend} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    placeholder={t("Type your message here...", "Apna message yahan likhein...")}
                    className="flex-1 bg-black/40 border border-white/10 rounded-full px-5 py-3 text-sm text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                  />
                  <button type="submit" disabled={!msgInput.trim()} className="w-12 h-12 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                    <Send className="h-5 w-5 ml-1" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UserLiveChatView({ session, profile, chats, onSend, onClose, t }) {
  const [msgInput, setMsgInput] = useState('');

  const chatContainerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [chats]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    const linkedAdminId = session.user.user_metadata?.linked_admin_id;
    onSend(session.user.id, linkedAdminId, 'user', msgInput);
    setMsgInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px] animate-in fade-in duration-700">
      <header className="mb-6 shrink-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">{t("Live Support", "Live Chat /")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">{t("Chat", "सहायता")}</span></h1>
          <p className="text-slate-400 mt-2 text-lg">{t("Send a direct message to your Admin.", "Apne Admin ko direct message bhejein.")}</p>
        </div>
        <button onClick={onClose} className="flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl transition-all text-sm font-bold w-full sm:w-auto">
          <X className="h-4 w-4" /> <span>{t("Close Chat", "Chat Band Karein")}</span>
        </button>
      </header>

      <div className="flex-1 bg-[#111318] rounded-3xl border border-white/[0.04] shadow-xl overflow-hidden flex flex-col min-h-0 max-w-3xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex items-center space-x-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center border border-indigo-500/30">
            <Headset className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">{t("Admin Support", "Admin Support")}</h3>
            <p className="text-[10px] text-emerald-400 flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span> Active</p>
          </div>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 min-h-0 bg-black/10 scroll-smooth">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
              <MessageCircle className="h-16 w-16 opacity-20" />
              <p>{t("No messages yet. Say hello to your admin!", "Abhi tak koi message nahi hai. Admin ko message bhejein!")}</p>
            </div>
          ) : (
            chats.map(c => (
              <div key={c.id} className={`flex ${c.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl ${c.sender_role === 'user' ? 'bg-cyan-600 text-white rounded-br-sm shadow-md' : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-white/5'}`}>
                  <p className="text-sm leading-relaxed">{c.message}</p>
                  <p className={`text-[9px] mt-1 text-right ${c.sender_role === 'user' ? 'text-cyan-200/70' : 'text-slate-500'}`}>
                    {new Date(Number(c.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-[#111318] border-t border-white/10 shrink-0">
          <form onSubmit={handleSend} className="flex items-center space-x-3">
            <input
              type="text"
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              placeholder={t("Type your message here...", "Apna message yahan likhein...")}
              className="flex-1 bg-black/40 border border-white/10 rounded-full px-5 py-4 text-sm text-white focus:ring-1 focus:ring-cyan-500 outline-none transition-colors"
            />
            <button type="submit" disabled={!msgInput.trim()} className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
              <Send className="h-5 w-5 ml-1" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AdminInquiriesView({ inquiries, onUpdateStatus, onDelete, t }) {
  if (inquiries.length === 0) {
    return (
      <div className="text-center py-20 animate-in fade-in duration-500">
        <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-600 opacity-50" />
        <h2 className="text-2xl font-bold text-white">{t("No Messages Yet", "Abhi Koi Message Nahi Hai")}</h2>
        <p className="text-slate-500 mt-2">{t("Inquiries from the website will appear here.", "Website se aane wale messages yahan dikhai denge.")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">{t("Web", "Web")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">{t("Inquiries", "Inquiries")}</span></h1>
        <p className="text-slate-400 mt-2 text-lg">{t("Manage messages from your public website visitors.", "Website visitors ke bheje gaye messages manage karein.")}</p>
      </header>

      <div className="grid gap-6 overflow-y-auto custom-scrollbar max-h-[600px] pr-2">
        {inquiries.map(inq => (
          <div key={inq.id} className={`bg-[#111318] rounded-3xl border ${inq.status === 'unread' ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'border-white/[0.04]'} p-6 flex flex-col md:flex-row md:items-start justify-between gap-6 transition-all shrink-0`}>
            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center">
                    {inq.name}
                    {inq.status === 'unread' && <span className="ml-3 bg-blue-500 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded-full">{t("New", "Naya")}</span>}
                  </h3>
                  <p className="text-sm text-cyan-400 mt-1 flex items-center"><Mail className="h-3 w-3 mr-1" /> {inq.email}</p>
                </div>
                <span className="text-xs text-slate-500 font-mono">{new Date(inq.createdAt).toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{inq.message}</p>
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-3 justify-center shrink-0 md:w-32 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
              {inq.status === 'unread' ? (
                <button onClick={() => onUpdateStatus(inq.id, 'read')} className="flex-1 md:flex-none flex items-center justify-center bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl transition-all text-sm font-bold">
                  <Check className="h-4 w-4 mr-2" /> Read
                </button>
              ) : (
                <button onClick={() => onUpdateStatus(inq.id, 'unread')} className="flex-1 md:flex-none flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 px-4 py-2 rounded-xl transition-all text-sm font-bold">
                  <MessageSquare className="h-4 w-4 mr-2" /> Unread
                </button>
              )}
              <button onClick={() => onDelete(inq.id)} className="flex-1 md:flex-none flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl transition-all text-sm font-bold">
                <Trash className="h-4 w-4 mr-2" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIChatbotWidget({ session, loans, profiles, isAdmin, t, lang }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'ai', text: t("Hello! I am your LeaderPro AI. How can I help you today?", "Namaste! Main aapka LeaderPro AI hoon. Aaj main aapki kya madad kar sakta hoon?") }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { if (isOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault(); if (!input.trim() || isLoading) return;
    const userText = input.trim(); const newMessages = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages); setInput(''); setIsLoading(true);
    try {
      let contextInfo = isAdmin ? `[Admin Context: Total active loans: ${loans.filter(l=>l.status==='active').length}, Total Users: ${profiles.length}.]` : `[User Context: Talking to a Borrower.]`;
      const historyString = newMessages.map(m => `${m.role === 'ai' ? 'AI' : 'User'}: ${m.text}`).join('\n');
      const sysInst = `You are LeaderPro AI, a financial assistant. Respond in ${lang === 'en' ? 'English' : 'Hinglish (Hindi in English script)'}. Keep answers short. Use emojis. ${contextInfo}`;
      const promptText = `Chat History:\n${historyString}\n\nRespond directly to the latest User message.`;
      const response = await callGeminiAI(promptText, sysInst);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) { setMessages(prev => [...prev, { role: 'ai', text: t("Sorry, network issue.", "Maaf karna, network issue hai.") }]); } 
    finally { setIsLoading(false); }
  };

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className={`fixed bottom-6 right-24 z-[100] w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300 ${isOpen ? 'bg-red-500 hover:bg-red-400 rotate-90' : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 hover:scale-110'}`}>
        {isOpen ? <X className="h-6 w-6 text-white" /> : <Bot className="h-7 w-7 text-white" />}
      </button>
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[100] w-[350px] max-w-[calc(100vw-3rem)] h-[500px] bg-[#111318]/95 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-gradient-to-r from-purple-900/50 to-cyan-900/50 p-4 border-b border-white/10 flex items-center space-x-3 shrink-0"><div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center p-2 shadow-lg"><Bot className="h-full w-full text-white" /></div><div><h3 className="font-bold text-white text-sm">LeaderPro AI</h3><p className="text-[10px] text-emerald-400 flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span> Online</p></div></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-sm' : 'bg-black/50 border border-white/5 text-slate-200 rounded-bl-sm'}`}>{msg.text}</div></div>
            ))}
            {isLoading && (<div className="flex justify-start"><div className="bg-black/50 border border-white/5 p-3 rounded-2xl rounded-bl-sm flex space-x-2 items-center"><div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div><div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div></div></div>)}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-white/10 shrink-0 flex items-center space-x-2"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("Ask anything...", "Kuch bhi poochiye...")} className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" /><button type="submit" disabled={!input.trim() || isLoading} className="w-10 h-10 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors"><Send className="h-4 w-4 ml-1" /></button></form>
        </div>
      )}
    </>
  );
}

function UserNotificationsModal({ notifications, onClose }) {
  const notifs = Array.isArray(notifications) ? notifications : [];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111318] border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full relative max-h-[80vh] flex flex-col">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"><X className="h-6 w-6" /></button>

        <div className="flex items-center space-x-3 mb-6 shrink-0">
          <div className="p-2 bg-blue-500/20 rounded-xl">
            <Bell className="h-6 w-6 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Aapke Messages</h3>
        </div>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
          {notifs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Abhi koi naya message nahi hai.</p>
            </div>
          ) : (
            notifs.map((n, i) => (
              <div key={n.id || i} className="bg-black/40 p-4 rounded-2xl border border-white/[0.04]">
                <p className="text-[10px] text-slate-500 font-mono mb-2">{new Date(n.date).toLocaleString('en-IN')}</p>
                <p className="text-sm text-slate-200 leading-relaxed">{n.text}</p>
              </div>
            ))
          )}
        </div>

        <button onClick={onClose} className="w-full mt-6 shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white py-3.5 rounded-2xl font-bold transition-all duration-300">
          Band Karein
        </button>
      </div>
    </div>
  );
}