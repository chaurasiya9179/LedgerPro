import React, { useState, useEffect, useRef } from 'react';
import { supabaseUrl, supabaseKey, isValidUUID, calculateAccruedInterest, callGeminiAI } from './utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  Home, 
  CreditCard, 
  FileText, 
  Grid, 
  LogOut, 
  PieChart, 
  Plus, 
  Shield,
  AlertCircle,
  Check,
  Clock,
  Database,
  Mail,
  Lock,
  Trash,
  Users,
  MessageSquare,
  X,
  Key,
  Copy,
  User,
  UserPlus,
  Edit,
  Phone,
  MapPin,
  DollarSign,
  Activity,
  Download,
  Upload,
  Star,
  HelpCircle,
  Zap,
  ChevronRight,
  Menu,
  MessageCircle,
  Search,
  File,
  Hash,
  Bell,
  Send,
  Bot,
  Sparkles,
  BarChart,
  Headset
} from 'lucide-react';

import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import AdminDashboardView, { StatCard, AdminVisualAnalytics, LoanHistoryModal, AIInsightsModal } from './components/AdminDashboard';
import { DashboardView, UserVisualAnalytics, OriginationView, MyLoansView, UserMyProfileView } from './components/UserViews';

// --- System Refresh ---
console.log("LeaderPro System Version 11.2 (Main Page Scroll & Table Heights Fixed)");

// --- Language Context (NAYA) ---
export const LanguageContext = React.createContext({ lang: 'hi', setLang: () => {}, t: (en, hi) => hi });

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

  const isAdmin = session?.user?.user_metadata?.role === 'admin' || session?.user?.email === 'admin@leaderpro.com';

  const fetchData = async (currentSession) => {
    if (!currentSession) return;
    
    try {
      const loanQuery = isAdmin 
        ? `${supabaseUrl}/rest/v1/loans?admin_id=eq.${currentSession.user.id}&order=createdAt.desc`
        : `${supabaseUrl}/rest/v1/loans?user_id=eq.${currentSession.user.id}&order=createdAt.desc`;

      const loanRes = await fetch(loanQuery, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${currentSession.access_token}`, 'Content-Type': 'application/json' }
      });
        
      if (loanRes.status === 404) setDbSetupRequired(true);
      else if (loanRes.status === 400) setDbAlterRequired(true);
      else if (loanRes.ok) {
        const data = await loanRes.json();
        setLoans(data || []);
        setDbSetupRequired(false);
        setDbAlterRequired(false);
        
        if (data.length > 0) {
           if (!('recoveredAmount' in data[0])) setDbRecoveredAlterRequired(true);
           else setDbRecoveredAlterRequired(false);

           if (!('transactions' in data[0])) setDbTransactionsAlterRequired(true);
           else setDbTransactionsAlterRequired(false);
        }
      }
    } catch (error) { console.error("Loan fetch error:", error); }

    try {
      const profileQuery = isAdmin 
        ? `${supabaseUrl}/rest/v1/profiles?admin_id=eq.${currentSession.user.id}&order=createdAt.desc`
        : `${supabaseUrl}/rest/v1/profiles?user_id=eq.${currentSession.user.id}&order=createdAt.desc`;

      const profileRes = await fetch(profileQuery, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${currentSession.access_token}`, 'Content-Type': 'application/json' }
      });
        
      if (profileRes.status === 404) {
        setDbProfileSetupRequired(true);
      } else if (profileRes.ok) {
        const data = await profileRes.json();
        setProfiles(data || []);
        setDbProfileSetupRequired(false);
        
        if (data.length > 0) {
           if (!('aadhar_no' in data[0])) setDbProfileAlterRequired(true);
           else setDbProfileAlterRequired(false);

           if (!('notifications' in data[0])) setDbNotificationsAlterRequired(true);
           else setDbNotificationsAlterRequired(false);
        }
      }
    } catch (error) { console.error("Profile fetch error:", error); }

    if (isAdmin) {
      try {
        const inqRes = await fetch(`${supabaseUrl}/rest/v1/contact_messages?order=createdAt.desc`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${currentSession.access_token}`, 'Content-Type': 'application/json' }
        });
        if (inqRes.status === 404) setDbInquiriesSetupRequired(true);
        else if (inqRes.ok) {
          const data = await inqRes.json();
          setInquiries(data || []);
          setDbInquiriesSetupRequired(false);
        }
      } catch (error) { console.error("Inquiries fetch error:", error); }
    }

    try {
      const chatQuery = isAdmin 
        ? `${supabaseUrl}/rest/v1/support_chats?admin_id=eq.${currentSession.user.id}&order=createdAt.asc`
        : `${supabaseUrl}/rest/v1/support_chats?user_id=eq.${currentSession.user.id}&order=createdAt.asc`;

      const chatRes = await fetch(chatQuery, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${currentSession.access_token}`, 'Content-Type': 'application/json' }
      });
      
      if (chatRes.status === 404) setDbChatsSetupRequired(true);
      else if (chatRes.ok) {
        const data = await chatRes.json();
        setSupportChats(data || []);
        setDbChatsSetupRequired(false);
      }
    } catch (error) { console.error("Chats fetch error:", error); }
  };

  useEffect(() => {
    let chatInterval;
    if (session && activeTab === 'chat') {
      chatInterval = setInterval(async () => {
        try {
          const chatQuery = isAdmin 
            ? `${supabaseUrl}/rest/v1/support_chats?admin_id=eq.${session.user.id}&order=createdAt.asc`
            : `${supabaseUrl}/rest/v1/support_chats?user_id=eq.${session.user.id}&order=createdAt.asc`;

          const chatRes = await fetch(chatQuery, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
          });
          
          if (chatRes.ok) {
            const data = await chatRes.json();
            setSupportChats(data || []);
          }
        } catch (error) { console.error("Chat polling error:", error); }
      }, 3000);
    }
    return () => clearInterval(chatInterval);
  }, [session, activeTab, isAdmin]);

  useEffect(() => {
    const initAuth = () => {
      const storedSession = localStorage.getItem('leaderpro_session');
      if (storedSession) {
        setSession(JSON.parse(storedSession));
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

  const handleLogout = async () => {
    if (session && !isAdmin) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/support_chats?user_id=eq.${session.user.id}`, {
          method: 'DELETE',
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
        });
      } catch (e) { 
        console.error("Chat deletion failed on logout", e); 
      }
    }

    localStorage.removeItem('leaderpro_session');
    setSession(null);
    setLoans([]);
    setProfiles([]);
    setSupportChats([]);
    setActiveTab('dashboard');
    setRoute('landing'); 
  };

  const deleteLoan = async (loanId) => {
    showConfirm("Loan Delete Karein", "Kya aap is application ko hamesha ke liye delete karna chahte hain?", async () => {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/loans?id=eq.${loanId}`, {
          method: 'DELETE',
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
        });
        if (!response.ok) throw new Error("Delete fail");
        
        const data = await response.json();
        if (data.length === 0) {
           setDbDeletePolicyRequired(true);
           showAlert("Security Error", "Supabase Delete Policy (RLS) missing hai. Koi data delete nahi hua. Kripya upar di gayi SQL Query run karein.");
           return;
        }

        setLoans(prev => prev.filter(l => l.id !== loanId));
        setDbDeletePolicyRequired(false);
        showAlert("Success", "Loan application delete ho gayi.");
      } catch (err) { showAlert("Error", "Loan delete nahi ho paya. Kripya Supabase Policies check karein."); }
    });
  };

  const updateLoanData = async (loanId, updateData, showSuccessAlert = true) => {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/loans?id=eq.${loanId}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(updateData)
      });
      if (!response.ok) throw new Error("Update fail");
      setLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updateData } : l));
      if (showSuccessAlert) showAlert("Success", `Loan data update ho gaya!`);
    } catch (err) { showAlert("Error", "Update nahi ho paya. Database structure check karein."); }
  };

  const createAdminLoan = async (loanData) => {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/loans`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(loanData)
      });
      if (!response.ok) throw new Error("Loan create fail");
      showAlert("Success", "Naya Loan safaltapurvak user ke khate mein add ho gaya!");
      fetchData(session);
    } catch (err) { showAlert("Error", "Loan add nahi ho paya. Database check karein."); }
  };

  const saveProfile = async (profileData, isEdit = false) => {
    try {
      const method = isEdit ? 'PATCH' : 'POST';
      const url = isEdit 
        ? `${supabaseUrl}/rest/v1/profiles?id=eq.${profileData.id}` 
        : `${supabaseUrl}/rest/v1/profiles`;
      
      const response = await fetch(url, {
        method: method,
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) throw new Error("Profile save failed");
      
      showAlert("Success", isEdit ? "Profile Update ho gayi!" : "Nayi Profile Ban Gayi! Admin ko ab ye dikhai degi.");
      fetchData(session); 
    } catch (err) { showAlert("Error", "Profile save nahi ho payi. Database setup check karein."); }
  };

  const deleteProfile = async (profile) => {
    showConfirm("User Ka Pura Account Delete Karein", "Kya aap is user ki profile, loans aur LOGIN ACCOUNT permanently delete karna chahte hain?", async () => {
      try {
        const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_user_account`, {
          method: 'POST',
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id_to_delete: profile.user_id })
        });

        if (!rpcResponse.ok) {
           setDbRpcRequired(true);
           
           await fetch(`${supabaseUrl}/rest/v1/loans?user_id=eq.${profile.user_id}`, {
             method: 'DELETE',
             headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
           });
           await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`, {
             method: 'DELETE',
             headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
           });
           
           setProfiles(prev => prev.filter(p => p.id !== profile.id));
           setLoans(prev => prev.filter(l => l.user_id !== profile.user_id));
           
           showAlert("Partial Success", "Data delete ho gaya, PAR login account delete karne ke liye Dashboard pe aayi nayi SQL Query run karna zaroori hai.");
           return;
        }

        setDbRpcRequired(false);
        setProfiles(prev => prev.filter(p => p.id !== profile.id));
        setLoans(prev => prev.filter(l => l.user_id !== profile.user_id));
        showAlert("Success", "User ka login account, profile aur sabhi loans hamesha ke liye delete ho gaye hain! Ab wo login nahi kar payega.");
      } catch (err) { showAlert("Error", "Account delete nahi ho paya."); }
    });
  };

  const sendUserNotification = async (userId, messageText) => {
    try {
      const profile = profiles.find(p => p.user_id === userId);
      if (!profile) return;
      const currentNotifs = Array.isArray(profile.notifications) ? profile.notifications : [];
      const newNotif = { id: Date.now(), text: messageText, date: Date.now(), read: false };
      const updatedNotifs = [newNotif, ...currentNotifs];

      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ notifications: updatedNotifs })
      });

      if (!response.ok) throw new Error("Message send failed");
      
      setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, notifications: updatedNotifs } : p));
      showAlert("Success", "Notification user ko bhej diya gaya hai!");
    } catch (err) {
      showAlert("Error", "Notification nahi ja saka.");
    }
  };

  const markNotificationsRead = async () => {
    if (!profiles[0]) return;
    const currentNotifs = Array.isArray(profiles[0].notifications) ? profiles[0].notifications : [];
    if (currentNotifs.every(n => n.read)) return; 

    const updatedNotifs = currentNotifs.map(n => ({ ...n, read: true }));
    try {
      await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${session.user.id}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: updatedNotifs })
      });
      setProfiles(prev => prev.map(p => p.user_id === session.user.id ? { ...p, notifications: updatedNotifs } : p));
    } catch (err) { console.error("Mark read error", err); }
  };

  const submitContactMessage = async (name, email, message) => {
    const response = await fetch(`${supabaseUrl}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ name, email, message, status: 'unread', createdAt: Date.now() })
    });
    if (!response.ok) throw new Error("Message submission failed");
  };

  const updateInquiryStatus = async (id, newStatus) => {
    try {
      await fetch(`${supabaseUrl}/rest/v1/contact_messages?id=eq.${id}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq));
    } catch(e) { showAlert("Error", "Status update failed."); }
  };

  const deleteInquiry = async (id) => {
    showConfirm("Delete Message", "Kya aap is message ko delete karna chahte hain?", async () => {
      try {
        await fetch(`${supabaseUrl}/rest/v1/contact_messages?id=eq.${id}`, {
          method: 'DELETE',
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
        });
        setInquiries(prev => prev.filter(inq => inq.id !== id));
        showAlert("Success", "Message delete ho gaya.");
      } catch(e) { showAlert("Error", "Delete failed."); }
    });
  };

  const handleSendLiveChat = async (userId, adminId, senderRole, text) => {
    const newChat = { user_id: userId, admin_id: adminId, sender_role: senderRole, message: text, createdAt: Date.now() };
    const tempId = Math.random().toString();
    
    setSupportChats(prev => [...prev, { ...newChat, id: tempId }]);

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/support_chats`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(newChat)
      });
      if (!response.ok) throw new Error("Chat fail");
      
      const savedData = await response.json();
      if (savedData && savedData.length > 0) {
         setSupportChats(prev => prev.map(c => c.id === tempId ? savedData[0] : c));
      }
    } catch (e) {
       console.error(e);
       setSupportChats(prev => prev.filter(c => c.id !== tempId));
       showAlert("Error", t("Failed to send message. Table might be missing.", "Message send fail ho gaya. Database table check karein."));
    }
  };

  const [showUserNotifs, setShowUserNotifs] = useState(false);

  const renderContent = () => {
    if (authLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#050505]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
        </div>
      );
    }

    if (route === 'landing') {
      return <LandingPage onNavigate={(path) => setRoute(path)} session={session} onSubmitContact={submitContactMessage} />;
    }

    if (route === 'auth') {
      return <AuthScreen setSession={(s) => { setSession(s); setRoute('app'); }} showAlert={showAlert} onBack={() => setRoute('landing')} />;
    }

    return (
      <div className="flex h-screen bg-[#050505] text-slate-300 font-sans relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none"></div>
        
        <aside className="w-64 bg-white/5 backdrop-blur-2xl border-r border-white/5 text-white flex flex-col z-10 shrink-0">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setRoute('landing')}>
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                <Home className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">LeaderPro</span>
            </div>
            {!isAdmin && profiles[0] && (
              <div className="relative cursor-pointer" onClick={() => { setShowUserNotifs(true); markNotificationsRead(); }}>
                <Bell className="h-6 w-6 text-slate-300 hover:text-cyan-400 transition-colors" />
                {Array.isArray(profiles[0].notifications) && profiles[0].notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-[#050505]"></span>
                  </span>
                )}
              </div>
            )}
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
            {isAdmin ? (
              <>
                <NavItem icon={<Users />} label={t("Admin Panel (Loans)", "Admin Panel (Loans)")} active={activeTab === 'admin_dashboard'} onClick={() => setActiveTab('admin_dashboard')} />
                <NavItem icon={<User />} label={t("User Profiles", "User Profiles")} active={activeTab === 'profiles'} onClick={() => setActiveTab('profiles')} />
                <NavItem icon={<MessageCircle />} label={t("Live Chat", "Live Chat / सहायता")} active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
              </>
            ) : (
              <>
                <NavItem icon={<Grid />} label={t("Your Dashboard", "Aapka Dashboard")} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <NavItem icon={<User />} label={t("My Profile", "Mera Profile")} active={activeTab === 'my_profile'} onClick={() => setActiveTab('my_profile')} />
                <NavItem icon={<Plus />} label={t("New Loan (LOS)", "Naya Loan (LOS)")} active={activeTab === 'apply'} onClick={() => setActiveTab('apply')} />
                <NavItem icon={<CreditCard />} label={t("My Loans (LSM)", "Mere Loans (LSM)")} active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} />
                <NavItem icon={<Headset />} label={t("Live Chat Support", "Live Chat / सहायता")} active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
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
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${isAdmin ? 'bg-indigo-500/20 text-indigo-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                {isAdmin ? 'ADMIN' : 'USER'}
              </span>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2.5 rounded-xl transition-all duration-300 font-medium">
              <LogOut className="h-4 w-4" />
              <span>{t("Secure Logout", "Surakshit Logout")}</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 z-10 flex flex-col relative custom-scrollbar">
          <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col relative">
            
            {/* DATABASE WARNINGS */}
            {dbSetupRequired && <DbWarning title="Loans Table Missing" query={`CREATE TABLE loans (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, admin_id uuid, amount numeric, "recoveredAmount" numeric DEFAULT 0, tenure numeric, "interestRate" numeric, emi numeric, status text, type text, "createdAt" int8, "adminNote" text);`} />}
            {dbAlterRequired && <DbWarning title="Loans Table Update Required" query={`ALTER TABLE loans ADD COLUMN admin_id uuid;`} isAlter />}
            {dbRecoveredAlterRequired && <DbWarning title="Top-up/Recovery Column Missing" query={`ALTER TABLE loans ADD COLUMN "recoveredAmount" numeric DEFAULT 0;`} isAlter />}
            {dbTransactionsAlterRequired && <DbWarning title="Transaction History Column Missing" query={`ALTER TABLE loans ADD COLUMN transactions jsonb DEFAULT '[]'::jsonb;`} isAlter />}
            {dbProfileSetupRequired && <DbWarning title="Profiles Table Missing" query={`CREATE TABLE profiles (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, admin_id uuid, full_name text, phone text, address text, kyc_status text DEFAULT 'Pending', "createdAt" int8);`} />}
            {dbProfileAlterRequired && <DbWarning title="Profile Columns Missing (Aadhar & Father Name)" query={`ALTER TABLE profiles ADD COLUMN aadhar_no text, ADD COLUMN father_name text;`} isAlter />}
            {dbNotificationsAlterRequired && <DbWarning title="Notifications Column Missing" query={`ALTER TABLE profiles ADD COLUMN notifications jsonb DEFAULT '[]'::jsonb;`} isAlter />}
            {dbInquiriesSetupRequired && <DbWarning title="Contact Messages Table Missing" query={`CREATE TABLE contact_messages (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text, email text, message text, status text DEFAULT 'unread', "createdAt" int8);\nALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Enable insert for all" ON contact_messages FOR INSERT WITH CHECK (true);\nCREATE POLICY "Enable all for authenticated users" ON contact_messages FOR ALL USING (true);`} />}
            {dbChatsSetupRequired && <DbWarning title="Support Chats Table Missing (NEW)" query={`CREATE TABLE support_chats (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, admin_id uuid, sender_role text, message text, "createdAt" int8);\nALTER TABLE support_chats ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Enable all for authenticated users" ON support_chats FOR ALL USING (true);`} />}
            {dbDeletePolicyRequired && <DbWarning title="Delete Permission Required (RLS Blocked)" query={`-- Inhe apne Supabase SQL Editor mein run karein taaki Delete kaam kare:\nCREATE POLICY "Enable Delete for Loans" ON loans FOR DELETE USING (true);\nCREATE POLICY "Enable Delete for Profiles" ON profiles FOR DELETE USING (true);`} isAlter />}
            {dbRpcRequired && <DbWarning title="Auth Account Delete RPC Missing" query={`-- User ko login karne se rokne ke liye ye RPC banayein:\nCREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete uuid)\nRETURNS void\nLANGUAGE plpgsql\nSECURITY DEFINER\nAS $$\nBEGIN\n  DELETE FROM auth.users WHERE id = user_id_to_delete;\n  DELETE FROM public.profiles WHERE user_id = user_id_to_delete;\n  DELETE FROM public.loans WHERE user_id = user_id_to_delete;\nEND;\n$$;`} isAlter />}

            {/* ADMIN TABS */}
            {activeTab === 'admin_dashboard' && isAdmin && <AdminDashboardView loans={loans} profiles={profiles} onDelete={deleteLoan} onUpdate={updateLoanData} onCreate={createAdminLoan} adminId={session.user.id} showAlert={showAlert} />}
            {activeTab === 'profiles' && isAdmin && <AdminProfilesView profiles={profiles} loans={loans} adminId={session.user.id} onSave={saveProfile} onDelete={deleteProfile} onSendMessage={sendUserNotification} showAlert={showAlert} />}
            {activeTab === 'inquiries' && isAdmin && <AdminInquiriesView inquiries={inquiries} onUpdateStatus={updateInquiryStatus} onDelete={deleteInquiry} t={t} />}
            {activeTab === 'chat' && isAdmin && <AdminLiveChatView profiles={profiles} chats={supportChats} onSend={handleSendLiveChat} adminId={session.user.id} onClose={() => setActiveTab('admin_dashboard')} t={t} />}
            
            {/* USER TABS */}
            {activeTab === 'dashboard' && !isAdmin && <DashboardView loans={loans.filter(l => l.user_id === session.user.id)} onNavigate={setActiveTab} />}
            {activeTab === 'my_profile' && !isAdmin && <UserMyProfileView profile={profiles[0]} loans={loans.filter(l => l.user_id === session.user.id)} session={session} onSave={saveProfile} showAlert={showAlert} />}
            {activeTab === 'apply' && !isAdmin && <OriginationView session={session} onNavigate={setActiveTab} onSuccess={() => fetchData(session)} isAdmin={isAdmin} showAlert={showAlert} />}
            {activeTab === 'loans' && !isAdmin && <MyLoansView loans={loans.filter(l => l.user_id === session.user.id)} profile={profiles[0]} />}
            {activeTab === 'chat' && !isAdmin && <UserLiveChatView session={session} profile={profiles[0]} chats={supportChats.filter(c => c.user_id === session.user.id)} onSend={handleSendLiveChat} onClose={() => setActiveTab('dashboard')} t={t} />}
          </div>
        </main>
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
        
        {/* NAYA: AI CHATBOT WIDGET YAHAN LAGA HAI */}
        {session && route === 'app' && (
           <AIChatbotWidget 
             session={session} 
             loans={loans} 
             profiles={profiles} 
             isAdmin={isAdmin} 
             t={t} 
             lang={lang} 
           />
        )}
        
        {/* User Notifications Modal */}
        {!isAdmin && showUserNotifs && profiles[0] && (
          <UserNotificationsModal 
             notifications={profiles[0].notifications} 
             onClose={() => setShowUserNotifs(false)} 
          />
        )}

        {/* Global Modals (Alert/Confirm) */}
        {modal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-[#111318] border border-white/10 p-6 rounded-3xl shadow-2xl max-w-sm w-full">
                <div className="flex items-center space-x-3 mb-4">
                   {modal.type === 'confirm' ? <AlertCircle className="h-6 w-6 text-amber-500" /> : <Shield className="h-6 w-6 text-cyan-500" />}
                   <h3 className="text-xl font-bold text-white">{modal.title}</h3>
                </div>
                <p className="text-slate-400 mb-8 text-sm leading-relaxed whitespace-pre-wrap">{modal.message}</p>
                <div className="flex justify-end gap-3">
                   {modal.type === 'confirm' && (
                     <button onClick={closeModal} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-colors">
                       {t("No, Cancel", "Nahi, Cancel")}
                     </button>
                   )}
                   <button 
                     onClick={() => {
                       if (modal.type === 'confirm' && modal.onConfirm) modal.onConfirm();
                       closeModal();
                     }} 
                     className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg ${modal.type === 'confirm' ? 'bg-red-500 hover:bg-red-400 text-black shadow-red-500/20' : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20'}`}
                   >
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
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        active 
          ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/10 border-l-2 border-cyan-400 text-white shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]' 
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-2 border-transparent'
      }`}
    >
      {React.cloneElement(icon, { className: `h-5 w-5 ${active ? 'text-cyan-400' : ''}` })}
      <span className="font-medium tracking-wide">{label}</span>
    </button>
  );
}

// ----------------------------------------------------------------------
// NAYA: LIVE CHAT VIEWS (ADMIN & USER) - WITH SCROLL FIXES
// ----------------------------------------------------------------------

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
                                 {new Date(Number(c.createdAt)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
                         {new Date(Number(c.createdAt)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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


// ----------------------------------------------------------------------
// ADMIN PROFILES VIEW (UPDATED WITH KYC DOCUMENT VIEWER)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// ADMIN PROFILES VIEW (UPDATED WITH SMART SEARCH BAR)
// ----------------------------------------------------------------------
function AdminProfilesView({ profiles, loans, adminId, onSave, onDelete, onSendMessage, showAlert }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [userId, setUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState(''); 
  const [aadharNo, setAadharNo] = useState(''); 
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [kycStatus, setKycStatus] = useState('Pending');

  // NAYA: Search State
  const [searchTerm, setSearchTerm] = useState('');

  const [notifyModal, setNotifyModal] = useState({ isOpen: false, userId: null, userName: '' });
  const [notifyMessage, setNotifyMessage] = useState('');
  
  const [docsModal, setDocsModal] = useState({ isOpen: false, profile: null });
  const [viewModal, setViewModal] = useState({ isOpen: false, profile: null });

  const openNewForm = () => { setEditId(null); setUserId(''); setFullName(''); setFatherName(''); setAadharNo(''); setPhone(''); setAddress(''); setKycStatus('Pending'); setShowForm(true); };
  const openEditForm = (profile) => { setEditId(profile.id); setUserId(profile.user_id); setFullName(profile.full_name); setFatherName(profile.father_name || ''); setAadharNo(profile.aadhar_no || ''); setPhone(profile.phone); setAddress(profile.address); setKycStatus(profile.kyc_status); setShowForm(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userId || !fullName) { showAlert("Warning", "User ID aur Naam zaroori hai!"); return; }
    if (!isValidUUID(userId.trim())) { showAlert("Warning", "User ID format galat hai!"); return; }
    const data = { admin_id: adminId, user_id: userId.trim(), full_name: fullName, father_name: fatherName, aadhar_no: aadharNo, phone: phone, address: address, kyc_status: kycStatus };
    if (editId) data.id = editId; else data.createdAt = Date.now();
    onSave(data, !!editId);
    setShowForm(false);
  };

  // NAYA: Search Filtering Logic
  const filteredProfiles = profiles.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (p.full_name && p.full_name.toLowerCase().includes(searchLower)) ||
      (p.phone && p.phone.includes(searchTerm)) ||
      (p.aadhar_no && p.aadhar_no.includes(searchTerm)) ||
      (p.user_id && p.user_id.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">User <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Profiles</span></h1>
          <p className="text-slate-400 mt-2 text-lg">Apne users ka data aur KYC manage karein.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
           {/* NAYA: Search Bar UI */}
           <div className="relative w-full sm:w-64 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Naam, Phone ya Aadhar se khojein..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
              />
           </div>

           <button onClick={showForm ? () => setShowForm(false) : openNewForm} className="flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/30 whitespace-nowrap">
             {showForm ? <X className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
             <span>{showForm ? 'Band Karein' : 'Naya User'}</span>
           </button>
        </div>
      </header>

      {/* Admin Profile Form (Hidden by default) */}
      {showForm && (
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-8 shadow-[0_0_30px_rgba(34,211,238,0.1)] mb-8 animate-in slide-in-from-top-4">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <User className="text-cyan-400 h-6 w-6" /> 
            <span>{editId ? 'Profile Edit Karein' : 'Naya User Data Bharein'}</span>
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">User ID (Auth ID)</label>
              <input type="text" value={userId} onChange={(e)=>setUserId(e.target.value)} placeholder="Jaise: 550e8400-e29b-41d4-a716..." className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none font-mono text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Poora Naam</label>
              <input type="text" value={fullName} onChange={(e)=>setFullName(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none" required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Pita Ka Naam</label>
              <input type="text" value={fatherName} onChange={(e)=>setFatherName(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Aadhar Number</label>
              <input type="text" value={aadharNo} onChange={(e)=>setAadharNo(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none tracking-widest" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">KYC Status</label>
              <select value={kycStatus} onChange={(e)=>setKycStatus(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none appearance-none">
                <option value="Pending" className="bg-slate-900">Pending</option>
                <option value="Verified" className="bg-slate-900">Verified</option>
                <option value="Rejected" className="bg-slate-900">Rejected</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end mt-4">
              <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-black px-8 py-3 rounded-xl font-bold transition-colors">
                {editId ? 'Save Changes' : 'Profile Banayein'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User list ab 'filteredProfiles' se render hogi */}
      <div className="grid grid-cols-1 gap-6 overflow-y-auto custom-scrollbar max-h-[600px] pr-2">
        {profiles.length === 0 && !showForm && (
          <p className="text-slate-500 text-center py-10 bg-white/5 rounded-3xl border border-white/5">Abhi tak koi user profile nahi bani hai.</p>
        )}
        
        {/* NAYA: Agar search me kuch nahi mila */}
        {profiles.length > 0 && filteredProfiles.length === 0 && (
          <div className="text-center py-10 bg-white/5 rounded-3xl border border-white/5">
             <Search className="h-10 w-10 mx-auto text-slate-600 mb-3" />
             <p className="text-slate-400">"{searchTerm}" se koi user nahi mila.</p>
          </div>
        )}

        {filteredProfiles.map(p => {
          return (
          <div key={p.id} className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex flex-col md:flex-row justify-between gap-6 hover:bg-white/10 transition-colors shrink-0">
            <div className="flex-1 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-500/20 p-3 rounded-full"><User className="text-indigo-400 h-6 w-6"/></div>
                <div>
                  <h3 
                    onClick={() => setViewModal({ isOpen: true, profile: p })}
                    className="text-xl font-bold text-white cursor-pointer hover:text-cyan-400 transition-colors inline-block"
                    title="Profile Dekhne Ke Liye Click Karein"
                  >
                    {p.full_name || 'Naam Nahi Diya'}
                  </h3>
                  <div className="mt-1">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${p.kyc_status === 'Verified' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                      KYC: {p.kyc_status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-300">
                <div className="flex items-center space-x-2"><Phone className="h-4 w-4 text-cyan-500"/> <span>{p.phone || 'N/A'}</span></div>
                <div className="flex items-center space-x-2"><Hash className="h-4 w-4 text-cyan-500"/> <span>Aadhar: {p.aadhar_no || 'N/A'}</span></div>
                <div className="col-span-1 sm:col-span-2 text-xs font-mono text-slate-500 mt-2">User ID: {p.user_id}</div>
              </div>
            </div>
            
            <div className="flex flex-wrap md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 shrink-0 min-w-[140px]">
              <button onClick={() => setDocsModal({ isOpen: true, profile: p })} className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg transition-colors flex-1 md:flex-none">
                <FileText className="h-4 w-4" /> <span>KYC Docs</span>
              </button>
              <button onClick={() => openEditForm(p)} className="flex items-center justify-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-cyan-400 rounded-lg transition-colors flex-1 md:flex-none">
                <Edit className="h-4 w-4" /> <span>Edit</span>
              </button>
              <button onClick={() => setNotifyModal({ isOpen: true, userId: p.user_id, userName: p.full_name })} className="flex items-center justify-center space-x-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors flex-1 md:flex-none">
                <Bell className="h-4 w-4" /> <span>Notify</span>
              </button>
              <button onClick={() => onDelete(p)} className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors flex-1 md:flex-none">
                <Trash className="h-4 w-4" /> <span>Delete</span>
              </button>
            </div>
          </div>
        )})}
      </div>

      {/* USER PROFILE VIEWER MODAL */}
      {viewModal.isOpen && viewModal.profile && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-[#111318] border border-cyan-500/30 p-6 md:p-8 rounded-3xl shadow-[0_0_40px_rgba(34,211,238,0.15)] max-w-2xl w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setViewModal({isOpen: false, profile: null})} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-8 border-b border-white/10 pb-6">
                 <div className="w-20 h-20 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/30 shrink-0">
                    <User className="h-10 w-10 text-cyan-400" />
                 </div>
                 <div className="text-center sm:text-left">
                    <h2 className="text-3xl font-bold text-white mb-1">{viewModal.profile.full_name}</h2>
                    {viewModal.profile.father_name && <p className="text-slate-400 text-sm mb-2">S/O {viewModal.profile.father_name}</p>}
                    <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${viewModal.profile.kyc_status === 'Verified' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                      {viewModal.profile.kyc_status === 'Verified' ? <Check className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                      KYC: {viewModal.profile.kyc_status}
                    </span>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                 <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 flex items-center"><Phone className="h-3 w-3 mr-2" /> Phone Number</p>
                    <p className="text-lg font-medium text-slate-200">{viewModal.profile.phone || 'N/A'}</p>
                 </div>
                 <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 flex items-center"><Hash className="h-3 w-3 mr-2" /> Aadhar Number</p>
                    <p className="text-lg font-medium text-slate-200 tracking-widest">{viewModal.profile.aadhar_no || 'N/A'}</p>
                 </div>
                 <div className="bg-black/40 p-5 rounded-2xl border border-white/5 sm:col-span-2">
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 flex items-center"><MapPin className="h-3 w-3 mr-2" /> Pata (Address)</p>
                    <p className="text-base font-medium text-slate-300 leading-relaxed">{viewModal.profile.address || 'Address nahi diya gaya hai.'}</p>
                 </div>
                 <div className="bg-black/40 p-4 rounded-2xl border border-white/5 sm:col-span-2">
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">User ID (System Tracking)</p>
                    <p className="text-xs font-mono text-cyan-500/70 break-all">{viewModal.profile.user_id}</p>
                 </div>
              </div>
              
              <div className="flex justify-end gap-3">
                 <button onClick={() => { setDocsModal({ isOpen: true, profile: viewModal.profile }); setViewModal({isOpen: false, profile: null}); }} className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 px-6 py-3 rounded-xl font-bold transition-all">
                    KYC Docs Dekhein
                 </button>
                 <button onClick={() => setViewModal({isOpen: false, profile: null})} className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-bold transition-all border border-white/10">
                    Band Karein
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* KYC DOCUMENTS VIEWER MODAL */}
      {docsModal.isOpen && docsModal.profile && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-[#111318] border border-purple-500/30 p-6 md:p-8 rounded-3xl shadow-[0_0_40px_rgba(168,85,247,0.15)] max-w-4xl w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setDocsModal({isOpen: false, profile: null})} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-black/50 p-2 rounded-full"><X className="h-6 w-6" /></button>
              
              <div className="flex items-center space-x-3 mb-6">
                 <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                   <Shield className="h-6 w-6 text-purple-400" />
                 </div>
                 <div>
                   <h3 className="text-2xl font-bold text-white tracking-tight">{docsModal.profile.full_name} - KYC Documents</h3>
                   <p className="text-slate-400 text-sm">Aadhar Number: <span className="text-white font-mono">{docsModal.profile.aadhar_no || 'Not Provided'}</span></p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <DocViewer title="Aadhar Front" url={docsModal.profile.aadhar_front_url} />
                 <DocViewer title="Aadhar Back" url={docsModal.profile.aadhar_back_url} />
                 <DocViewer title="PAN Card" url={docsModal.profile.pan_url} />
                 <DocViewer title="Selfie" url={docsModal.profile.selfie_url} />
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-4">
                 <button onClick={() => { onSave({...docsModal.profile, kyc_status: 'Rejected'}, true); setDocsModal({isOpen: false, profile: null}); }} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 px-6 py-3 rounded-xl font-bold transition-all">Reject KYC</button>
                 <button onClick={() => { onSave({...docsModal.profile, kyc_status: 'Verified'}, true); setDocsModal({isOpen: false, profile: null}); }} className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center"><Check className="h-5 w-5 mr-2"/> Approve KYC</button>
              </div>
           </div>
        </div>
      )}

      {/* NOTIFICATION MODAL */}
      {notifyModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-[#111318] border border-amber-500/30 p-6 md:p-8 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.15)] max-w-md w-full relative">
              <button onClick={() => setNotifyModal({isOpen: false, userId: null, userName: ''})} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center"><Bell className="h-6 w-6 mr-3 text-amber-400" /> Notify {notifyModal.userName}</h3>
              <textarea value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:ring-1 focus:ring-amber-500 outline-none resize-none h-32 mb-6" placeholder="Message likhein..."></textarea>
              <div className="flex gap-3">
                <button onClick={() => setNotifyModal({isOpen: false, userId: null, userName: ''})} className="flex-1 bg-white/5 text-slate-300 hover:text-white py-3.5 rounded-2xl font-bold transition-all border border-white/10">Cancel</button>
                <button onClick={() => { if(!notifyMessage.trim()) return; onSendMessage(notifyModal.userId, notifyMessage); setNotifyModal({ isOpen: false, userId: null, userName: '' }); setNotifyMessage(''); }} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black py-3.5 rounded-2xl font-bold shadow-[0_0_20px_rgba(245,158,11,0.3)]">Bhejein</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// ... aapka upar ka code (AdminProfilesView etc.)

// Helper Component for Admin KYC Viewer (SIRF EK BAAR HONA CHAHIYE)
function DocViewer({ title, url }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col">
       <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{title}</h4>
       <div className="flex-1 bg-black/60 rounded-xl border border-white/5 overflow-hidden min-h-[200px] flex items-center justify-center relative group">
          {url ? (
             <>
               <img src={url} alt={title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
               <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold backdrop-blur-sm">Click to View Full</a>
             </>
          ) : (
             <div className="text-center text-slate-600 flex flex-col items-center">
                <FileText className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-xs uppercase tracking-widest">Not Uploaded</span>
             </div>
          )}
       </div>
    </div>
  );
}
// ----------------------------------------------------------------------
// NAYA: FLOATING AI CHATBOT WIDGET
// ----------------------------------------------------------------------
function AIChatbotWidget({ session, loans, profiles, isAdmin, t, lang }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: t("Hello! I am your LeaderPro AI. How can I help you today?", "Namaste! Main aapka LeaderPro AI hoon. Aaj main aapki kya madad kar sakta hoon?") }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Jab naya message aaye, toh list ko neeche scroll karein
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const newMessages = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // AI ko app ka live context dena
      let contextInfo = "";
      if (isAdmin) {
         const activeLoans = loans.filter(l => l.status === 'active');
         const totalDisbursed = activeLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
         contextInfo = `[Admin Context: You are talking to the App Admin. Total active loans: ${activeLoans.length}, Total Disbursed: ₹${totalDisbursed}, Total Users: ${profiles.length}.]`;
      } else {
         const userLoans = loans.filter(l => l.status === 'active');
         const totalBorrowed = userLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
         contextInfo = `[User Context: You are talking to a Borrower. They have ${userLoans.length} active loans totaling ₹${totalBorrowed}.]`;
      }

      // Purani chat history ko ek string mein badalna taaki AI ko pichli baatein yaad rahein
      const historyString = newMessages.map(m => `${m.role === 'ai' ? 'AI' : 'User'}: ${m.text}`).join('\n');
      
      const sysInst = `You are LeaderPro AI, a highly intelligent and polite financial assistant for a micro-lending CRM. Respond in ${lang === 'en' ? 'English' : 'Hinglish (Hindi in English script)'}. Keep answers short (2-3 sentences max). Use emojis. NO markdown asterisks (*). ${contextInfo}`;
      
      const promptText = `Chat History:\n${historyString}\n\nBased on the history, respond directly to the latest User message.`;

      const response = await callGeminiAI(promptText, sysInst);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: t("Sorry, I am facing a network issue. Please try again.", "Maaf karna, network issue hai. Kripya dubara try karein.") }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300 ${isOpen ? 'bg-red-500 hover:bg-red-400 rotate-90' : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 hover:scale-110'}`}
      >
        {isOpen ? <X className="h-6 w-6 text-white" /> : <Bot className="h-7 w-7 text-white" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[100] w-[350px] max-w-[calc(100vw-3rem)] h-[500px] bg-[#111318]/95 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900/50 to-cyan-900/50 p-4 border-b border-white/10 flex items-center space-x-3 shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center p-2 shadow-lg">
              <Bot className="h-full w-full text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">LeaderPro AI</h3>
              <p className="text-[10px] text-emerald-400 flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span> Online</p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-sm' 
                    : 'bg-black/50 border border-white/5 text-slate-200 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-black/50 border border-white/5 p-3 rounded-2xl rounded-bl-sm flex space-x-2 items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                 </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-white/10 shrink-0 flex items-center space-x-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("Ask anything...", "Kuch bhi poochiye...")}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4 ml-1" />
            </button>
          </form>
        </div>
      )}
    </>
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

// ----------------------------------------------------------------------
// USER MY PROFILE VIEW (UPDATED WITH KYC DOCUMENT UPLOAD)
// ----------------------------------------------------------------------

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
