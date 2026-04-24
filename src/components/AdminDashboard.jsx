import React, { useState, useContext, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { 
  Search, Sparkles, File, FileText, Plus, DollarSign, Key, Copy, Users, Activity, 
  CreditCard, Check, BarChart, UserPlus, Clock, User, MessageSquare, MessageCircle, Edit, Trash, 
  Upload, Download, Bot, X, PieChart, Star, Percent, TrendingUp, MapPin, Phone, ChevronRight, ShieldCheck, AlertCircle, AlertTriangle, Lock, Home, Crown, Bell, Headset ,Hash,ShieldAlert,Eye,Shield
} from 'lucide-react';
import { LanguageContext } from '../App';
import { calculateAccruedInterest, callGeminiAI, calculateTrustScore, getScoreRating, isValidUUID } from '../utils';

const supabaseUrl = 'https://wvyklgrphhamhnpkahra.supabase.co';
const supabaseKey = 'sb_publishable_wOiUxxfvY7dlbwNrIRMBrg_N6oz1ZNf';

// ==========================================
// 1. ADMIN DASHBOARD VIEW (MAIN)
// ==========================================
export default function AdminDashboardView({ loans, profiles, onDelete, onUpdate, onCreate, adminId, showAlert, session }) {
  const { t, lang } = useContext(LanguageContext);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [activeTab, setActiveTab] = useState('loans'); 
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [manageFundsLoanId, setManageFundsLoanId] = useState(null);
  const [historyLoan, setHistoryLoan] = useState(null); 
  const [showNewLoanForm, setShowNewLoanForm] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [aiModal, setAiModal] = useState({ isOpen: false, loading: false, result: '', error: '' });

  const [adminMessage, setAdminMessage] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editTenure, setEditTenure] = useState('');
  const [editDate, setEditDate] = useState('');

  const [topupAmount, setTopupAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');

  const [newUserId, setNewUserId] = useState('');
  const [newAmount, setNewAmount] = useState(50000);
  const [newRate, setNewRate] = useState(36);

  // 🔥 NAYA: Auto fetch Admin's custom Interest Rate
  useEffect(() => {
    const currentAdminProfile = profiles?.find(p => p.user_id === session?.user?.id);
    if (currentAdminProfile?.default_rate) {
      setNewRate(currentAdminProfile.default_rate);
    }
  }, [profiles, session]);

  const [newTenure, setNewTenure] = useState(12);
  const [newDate, setNewDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  const activeLoans = loans.filter(l => l.status === 'active');
  const totalDisbursed = activeLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const totalRecovery = activeLoans.reduce((sum, l) => sum + Number(l.recoveredAmount || 0), 0);
  const totalAccruedInterest = activeLoans.reduce((sum, l) => sum + calculateAccruedInterest(l.amount, l.interestRate, l.createdAt), 0);
  const netLiability = totalDisbursed + totalAccruedInterest - totalRecovery;

  const enrichedLoans = loans.map(loan => ({ ...loan, userName: profiles?.find(p => p.user_id === loan.user_id)?.full_name || 'N/A' }));
  const filteredLoans = enrichedLoans.filter(loan => 
    loan.userName.toLowerCase().includes(searchTerm.toLowerCase()) || loan.user_id.toLowerCase().includes(searchTerm.toLowerCase()) || loan.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

// 🔥 ADMIN KI KHUD KI PROFILE HATA DI 🔥
  const filteredProfiles = profiles?.filter(p => 
    p.user_id !== adminId && // <-- बस ये एक लाइन जोड़ी है 
    (
      (p.full_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) || 
      (p.phone || '').includes(userSearchTerm) ||
      (p.user_id || '').toLowerCase().includes(userSearchTerm.toLowerCase())
    )
  ) || [];

  const sendWhatsAppReminder = (loan, profile) => {
    const rawPhone = profile?.phone || loan.userPhone || "";
    if (!rawPhone) { showAlert(t("Error", "त्रुटि"), t("User phone number not found!", "यूजर का फोन नंबर नहीं मिला!")); return; }
    const formattedPhone = rawPhone.startsWith('+91') ? rawPhone : `+91${rawPhone}`;
    const accruedInterest = calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt);
    const dueAmount = Number(loan.amount) + accruedInterest - Number(loan.recoveredAmount || 0);
    let message = "";
    const userName = profile?.full_name ? profile.full_name.split(' ')[0] : "User";
    if (loan.status === 'active') { message = `Hello ${userName} 👋,\n\nThis is a gentle reminder from *LeaderPro*.\n\nYour net loan liability of *₹${Math.round(dueAmount).toLocaleString('en-IN')}* is currently active.\n\nPlease clear your dues on time to maintain a high Trust Score (🌟) and keep enjoying low-interest loans.\n\nThank you!\n- LeaderPro Admin`; }
    else { message = `⚠️ URGENT NOTICE ⚠️\n\nHello ${userName},\n\nYour loan repayment of *₹${Math.round(dueAmount).toLocaleString('en-IN')}* is OVERDUE at *LeaderPro*.\n\nNot paying on time will crash your Trust Score and block future loans. Please pay immediately to avoid penalty charges.\n\n- LeaderPro Admin`; }
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
  };

  const exportToCSV = async () => {
    try {
      const headers = ['Loan ID', 'Date', 'User Name', 'User ID', 'Principal Amount', 'Interest Rate (%)', 'Tenure (Months)', 'Recovered Amount', 'Net Liability', 'Status'];
      const rows = filteredLoans.map(l => [
        l.id, new Date(Number(l.createdAt)).toLocaleDateString('en-IN'), `"${l.userName}"`, l.user_id, l.amount, l.interestRate, l.tenure, l.recoveredAmount || 0,
        (Number(l.amount) + calculateAccruedInterest(l.amount, l.interestRate, l.createdAt) - Number(l.recoveredAmount || 0)), 
        l.status === 'active' ? 'Active' : l.status.charAt(0).toUpperCase() + l.status.slice(1)
      ]);
      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const fileName = `LedgerPro_Loans_${Date.now()}.csv`;

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({ path: fileName, data: csvContent, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: 'Export Loan Data', text: 'LedgerPro Loan Export', url: result.uri, dialogTitle: 'Save Excel File' });
      } else {
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    } catch (error) {
      showAlert(t("Error", "त्रुटि"), t("Export failed.", "एक्सपोर्ट विफल रहा।"));
    }
  };

  const handleAIAnalysis = async () => {
    setAiModal({ isOpen: true, loading: true, result: '', error: '' });
    const recoveryRate = totalDisbursed > 0 ? ((totalRecovery / totalDisbursed) * 100).toFixed(1) : 0;
    const interestRatio = totalDisbursed > 0 ? ((totalAccruedInterest / totalDisbursed) * 100).toFixed(1) : 0;
    const sysInst = `Role: Chief Risk Officer (CRO) for a micro-lending firm.\nTask: Analyze portfolio data and provide blunt, highly actionable risk mitigation strategies.\nLanguage: ${lang === 'en' ? 'Professional English' : 'Professional Hinglish'}.\nRules: Strictly adhere to the requested format. NO markdown symbols like asterisks (*) or hashes (#). Use emojis. Be strictly data-driven and strategic.`;
    const promptText = `\n[PORTFOLIO DATA]\n- Disbursed Principal: ₹${totalDisbursed}\n- Total Recovered: ₹${totalRecovery} (Recovery Rate: ${recoveryRate}%)\n- Net Live Liability: ₹${netLiability}\n- Accrued Interest: ₹${totalAccruedInterest} (Interest is ${interestRatio}% of principal)\n- Active Borrowers: ${activeLoans.length}\n\n[OUTPUT FORMAT REQUIRED]\n📊 Executive Summary: [1 sentence analyzing the recovery rate vs liability]\n🔴 Primary Risk: [Identify the biggest financial threat based on the exact numbers provided]\n🎯 Strategic Action 1: [1 specific tactic to increase recovery from current borrowers]\n📈 Strategic Action 2: [1 specific tactic for future loan approvals or interest structuring]\n    `;
    try {
        const response = await callGeminiAI(promptText, sysInst);
        setAiModal({ isOpen: true, loading: false, result: response, error: '' });
    } catch (e) {
        setAiModal({ isOpen: true, loading: false, result: '', error: t('AI Analysis failed. Please try again.', 'AI विश्लेषण विफल हो गया। कृपया दोबारा कोशिश करें।') });
    }
  };

  const handleCopyCode = () => {
    const textArea = document.createElement("textarea");
    textArea.value = adminId; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); showAlert(t("Success", "सफलता"), t("Admin Code copied!", "एडमिन कोड कॉपी हो गया!")); } 
    catch (err) { showAlert(t("Error", "त्रुटि"), t("Copy failed.", "कॉपी विफल।")); }
    document.body.removeChild(textArea);
  };

  const handleReviewClick = (loan) => {
    setManageFundsLoanId(null); setEditingLoanId(loan.id); setAdminMessage(loan.adminNote || ''); setEditAmount(loan.amount); setEditRate(loan.interestRate || 12.5); setEditTenure(loan.tenure);
    const dateObj = new Date(Number(loan.createdAt)); dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset()); setEditDate(dateObj.toISOString().slice(0, 16));
  };

  const handleFundsClick = (loan) => {
    setEditingLoanId(null); setManageFundsLoanId(loan.id); setTopupAmount(''); setRepayAmount('');
  };

  const submitReview = (loanId, newStatus) => {
    onUpdate(loanId, { status: newStatus, adminNote: adminMessage, amount: Number(editAmount), interestRate: Number(editRate), tenure: Number(editTenure), createdAt: new Date(editDate).getTime(), emi: 0 });
    setEditingLoanId(null);
  };

  const submitFunds = (loan) => {
    const topup = Number(topupAmount || 0); const repay = Number(repayAmount || 0);
    if (topup === 0 && repay === 0) { showAlert(t("Warning", "चेतावनी"), t("Enter an amount.", "रकम दर्ज करें।")); return; }
    const newTotalAmount = Number(loan.amount || 0) + topup;
    const newTotalRecovered = Number(loan.recoveredAmount || 0) + repay;
    const newTransaction = { id: Date.now() + Math.random(), date: Date.now(), topup: topup, repay: repay };
    const updatedTransactions = [...(Array.isArray(loan.transactions) ? loan.transactions : []), newTransaction];
    onUpdate(loan.id, { amount: newTotalAmount, recoveredAmount: newTotalRecovered, transactions: updatedTransactions }, false); 
    showAlert(t("Success", "सफलता"), t("Ledger Updated Successfully!", "लेज़र सफलतापूर्वक अपडेट हो गया!"));
    setManageFundsLoanId(null);
  };

  const handleCreateLoanSubmit = (e) => {
    e.preventDefault();
    if (!newUserId) { showAlert(t("Warning", "चेतावनी"), t("User ID is required!", "यूजर आईडी दर्ज करना अनिवार्य है!")); return; }
    if (!newUserId.trim().match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) { showAlert(t("Warning", "चेतावनी"), t("User ID is in incorrect format.", "यूजर आईडी का फॉर्मेट गलत है।")); return; }
    onCreate({ user_id: newUserId.trim(), admin_id: adminId, amount: Number(newAmount), recoveredAmount: 0, transactions: [], interestRate: Number(newRate), tenure: Number(newTenure), emi: 0, status: 'active', type: 'Personal Loan', createdAt: new Date(newDate).getTime(), adminNote: t('Issued directly by Admin.', 'एडमिन द्वारा सीधे जारी किया गया।') });
    setShowNewLoanForm(false); setNewUserId(''); 
  };

  // 🔥 ADMIN VERIFICATION & SUSPENSION LOGIC 🔥
  const currentAdminProfile = profiles?.find(p => p.user_id === session?.user?.id);
  const hasAdminProfile = !!currentAdminProfile?.full_name; 
  const isAdminVerified = currentAdminProfile?.kyc_status === 'Verified';
  const isSuspended = currentAdminProfile?.kyc_status === 'Suspended'; // 🚨 NAYA LOGIC

  return (
    <div className="relative space-y-8 animate-in fade-in duration-1000 pb-10">

      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-600/10 blur-[150px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute top-[30%] left-[-10%] w-[400px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 shrink-0">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">{t("Panel", "पैनल")}</span></h1>
          <p className="text-slate-400 mt-2 text-lg">{t("Manage all applications, users, and issue new loans.", "सभी एप्लिकेशन, यूजर्स और लोन मैनेज करें।")}</p>
        </div>
        
        {isAdminVerified && (
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => setActiveTab(activeTab === 'admin_profile' ? 'loans' : 'admin_profile')}
              className={`flex-1 md:flex-none flex items-center justify-center space-x-2 border px-5 py-3.5 rounded-2xl transition-all font-bold shadow-lg ${activeTab === 'admin_profile' ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-400' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'}`}
            >
              {activeTab === 'admin_profile' ? <Home className="h-5 w-5 text-cyan-400" /> : <User className="h-5 w-5 text-slate-400" />}
              <span className="hidden sm:inline">{activeTab === 'admin_profile' ? t("Dashboard", "डैशबोर्ड") : t("Profile", "प्रोफाइल")}</span>
            </button>

            {activeTab !== 'admin_profile' && (
              <button onClick={() => setShowNewLoanForm(!showNewLoanForm)} className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-5 py-3.5 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105">
                {showNewLoanForm ? <X className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
                <span className="hidden sm:inline">{showNewLoanForm ? t('Close', 'बंद करें') : t('New Loan', 'नया लोन')}</span>
              </button>
            )}
          </div>
        )}
      </header>

      {!hasAdminProfile ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
           <div className="bg-amber-500/10 border border-amber-500/30 p-8 rounded-[2.5rem] text-center backdrop-blur-md shadow-xl">
              <Lock className="h-12 w-12 text-amber-400 mx-auto mb-4 animate-pulse" />
              <h3 className="text-2xl md:text-3xl font-black text-white tracking-wide mb-2">{t("Complete Your Profile", "अपनी प्रोफाइल पूरी करें")}</h3>
              <p className="text-slate-400 text-sm max-w-lg mx-auto">{t("Please complete your Branch Profile below. Once submitted, Super Admin will verify your account.", "कृपया नीचे अपनी ब्रांच प्रोफाइल पूरी करें। सबमिट करने के बाद, सुपर एडमिन आपके अकाउंट को वेरीफाई करेंगे।")}</p>
           </div>
           <AdminSelfProfileView session={session} showAlert={showAlert} t={t} />
        </div>
      ) : isSuspended ? (
        
        // 🚨 NAYA: SUSPENDED RED SCREEN 🚨
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in zoom-in duration-500">
           <div className="bg-gradient-to-br from-red-950/80 to-black/90 border border-red-500/50 p-10 rounded-[3rem] text-center backdrop-blur-md shadow-[0_0_50px_rgba(239,68,68,0.2)] max-w-lg w-full">
              <div className="relative mx-auto w-24 h-24 mb-6">
                 <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
                 <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 border-2 border-red-500/50 rounded-full">
                    <Lock className="h-10 w-10 text-red-400" />
                 </div>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-red-400 tracking-wide mb-3">{t("Account Suspended", "अकाउंट ब्लॉक कर दिया गया है")}</h3>
              <p className="text-red-200/70 text-sm mb-6 leading-relaxed">{t("Your Branch Admin access has been revoked by the Super Admin due to policy violations or pending audit.", "पॉलिसी के उल्लंघन या ऑडिट के कारण सुपर एडमिन ने आपका एक्सेस ब्लॉक कर दिया है।")}</p>
              <div className="bg-black/50 border border-red-500/30 p-4 rounded-2xl flex items-center justify-center space-x-3 text-sm text-red-400">
                 <AlertTriangle className="h-5 w-5" />
                 <span>{t("Contact Super Admin for support.", "सुपर एडमिन से संपर्क करें।")}</span>
              </div>
           </div>
        </div>
      
      ):!isAdminVerified ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in zoom-in duration-500">
           <div className="bg-gradient-to-br from-indigo-950/50 to-black/80 border border-indigo-500/30 p-10 rounded-[3rem] text-center backdrop-blur-md shadow-2xl max-w-lg w-full">
              <div className="relative mx-auto w-24 h-24 mb-6">
                 <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
                 <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 border-2 border-indigo-500/50 rounded-full">
                    <Clock className="h-10 w-10 text-indigo-400" />
                 </div>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white tracking-wide mb-3">{t("Pending Verification", "वेरिफिकेशन पेंडिंग है")}</h3>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">{t("Your profile has been submitted successfully! Please wait while the Super Admin reviews and approves your account.", "आपकी प्रोफाइल सफलतापूर्वक सबमिट हो गई है! कृपया सुपर एडमिन द्वारा अकाउंट अप्रूव होने का इंतज़ार करें।")}</p>
              
              <div className="bg-black/50 border border-white/5 p-4 rounded-2xl flex items-center justify-center space-x-3 text-sm text-slate-400">
                 <ShieldCheck className="h-5 w-5 text-indigo-400" />
                 <span>{t("Dashboard will unlock after approval.", "अप्रूवल के बाद डैशबोर्ड खुल जाएगा।")}</span>
              </div>
           </div>
        </div>
      ) : (

        <>
          {showNewLoanForm && activeTab !== 'admin_profile' && (
            <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-green-500/30 p-8 md:p-10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] mb-8 animate-in slide-in-from-top-4 shrink-0 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-green-500/20 blur-[40px] rounded-full pointer-events-none"></div>
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center space-x-3 relative z-10">
                <div className="bg-green-500/20 p-2 rounded-xl"><Plus className="text-green-400 h-6 w-6" /></div>
                <span>{t("Create New Loan for User", "यूजर के लिए नया लोन बनाएं")}</span>
              </h2>
              <form onSubmit={handleCreateLoanSubmit} className="space-y-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-green-400">{t("For whom? (Enter User ID)", "किसके लिए? (यूजर आईडी डालें)")}</label><input type="text" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} placeholder={t("Example: 550e8400-e29b-41d4-a716...", "जैसे: 550e8400-e29b-41d4-a716...")} className="w-full px-5 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-white focus:bg-white/[0.05] focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 outline-none font-mono text-sm transition-all" required /></div>
                  <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-green-400">{t("Date & Time", "तारीख और समय")}</label><input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full px-5 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-white focus:bg-white/[0.05] focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 outline-none transition-all" required /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-green-400">{t("Principal Amount (₹)", "मूल राशि (₹)")}</label><input type="number" min="5000" step="1000" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-full px-5 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-white focus:bg-white/[0.05] focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 outline-none text-xl font-bold transition-all" required /></div>
                  <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-green-400">{t("Interest Rate (%)", "ब्याज दर (%)")}</label><input type="number" step="0.1" value={newRate} onChange={(e) => setNewRate(e.target.value)} className="w-full px-5 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-white focus:bg-white/[0.05] focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 outline-none text-xl font-bold transition-all" required /></div>
                  <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-green-400">{t("Tenure (Months)", "समय (महीने)")}</label><input type="number" min="1" value={newTenure} onChange={(e) => setNewTenure(e.target.value)} className="w-full px-5 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-white focus:bg-white/[0.05] focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 outline-none text-xl font-bold transition-all" required /></div>
                </div>
                <div className="pt-4"><button type="submit" className="w-full bg-green-500 hover:bg-green-400 text-black px-8 py-4 rounded-2xl font-black tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] text-lg hover:scale-[1.01]">{t("Activate Loan", "लोन एक्टिव करें")}</button></div>
              </form>
            </div>
          )}

          {activeTab === 'admin_profile' ? (
            <div className="animate-in slide-in-from-bottom-8 duration-700">
              <AdminSelfProfileView session={session} showAlert={showAlert} t={t} />
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-gradient-to-r from-indigo-950/80 to-cyan-950/80 border border-indigo-500/30 p-8 rounded-[2.5rem] mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group shadow-xl">
                <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 blur-[50px] pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-cyan-500/20 p-2 rounded-lg border border-cyan-500/30"><Key className="h-5 w-5 text-cyan-400" /></div>
                    <h3 className="text-white font-bold text-xl tracking-wide">{t("Your Unique Admin Code", "आपका यूनिक एडमिन कोड")}</h3>
                  </div>
                  <p className="text-sm text-indigo-200/70 mb-4">{t("Share this code with users so they can link with your local branch.", "यह कोड यूजर्स के साथ शेयर करें ताकि वे आपकी ब्रांच से जुड़ सकें।")}</p>
                  <div className="bg-black/50 border border-white/10 px-5 py-3 rounded-xl font-mono text-cyan-300 text-base md:text-lg tracking-widest break-all shadow-inner inline-block">{adminId}</div>
                </div>
                <button onClick={handleCopyCode} className="relative z-10 shrink-0 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:scale-105"><Copy className="h-5 w-5" /> <span>{t("Copy Code", "कोड कॉपी करें")}</span></button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 shrink-0">
                <StatCard title={t("TOTAL USERS", "कुल यूजर")} value={profiles.length} icon={<Users className="h-6 w-6 text-[#3b82f6]" />} />
                <StatCard title={t("DISBURSED PRINCIPAL", "वितरित मूलधन")} value={`₹${totalDisbursed.toLocaleString('en-IN')}`} icon={<Activity className="h-6 w-6 text-[#f59e0b]" />} />
                <StatCard title={t("NET LIVE LIABILITY", "नेट लाइव बकाया")} value={`₹${netLiability.toLocaleString('en-IN')}`} icon={<CreditCard className="h-6 w-6 text-[#f59e0b]" />} />
                <StatCard title={t("TOTAL RECOVERY", "कुल वसूली")} value={`₹${totalRecovery.toLocaleString('en-IN')}`} icon={<Check className="h-6 w-6 text-[#10b981]" />} />
              </div>

              <AdminVisualAnalytics loans={loans} t={t} />

              <div className="flex bg-black/40 p-1.5 rounded-2xl w-fit border border-white/10 mb-6 shrink-0 shadow-lg overflow-x-auto mt-4">
                <button onClick={() => setActiveTab('loans')} className={`flex items-center px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'loans' ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><FileText className="h-4 w-4 mr-2" /> {t("Loan Applications", "लोन एप्लिकेशन")}</button>
                <button onClick={() => setActiveTab('users')} className={`flex items-center px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'users' ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Users className="h-4 w-4 mr-2" /> {t("Users Directory", "यूजर डायरेक्टरी")}</button>
                <button onClick={() => setActiveTab('analytics')} className={`flex items-center px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'analytics' ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><TrendingUp className="h-4 w-4 mr-2" /> {t("NPA & Profit", "रिस्क और प्रॉफिट")}</button>
              </div>

              {activeTab === 'analytics' && <AdminAnalyticsView loans={loans} profiles={profiles} t={t} sendWhatsAppReminder={sendWhatsAppReminder} />}

              {activeTab === 'loans' && (
                <div className="bg-gradient-to-br from-[#161922] to-[#0f1115] rounded-[2.5rem] border border-white/5 p-6 md:p-8 shadow-2xl overflow-hidden flex flex-col shrink-0 relative">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 blur-[100px] pointer-events-none"></div>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 relative z-10">
                    <div className="flex items-center space-x-3"><div className="bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20"><FileText className="h-6 w-6 text-cyan-400" /></div><h2 className="text-2xl font-bold text-white tracking-wide">{t("Loan Applications", "लोन एप्लिकेशन")}</h2></div>
                    <div className="flex flex-col sm:flex-row gap-3">
                       <div className="relative group w-full sm:w-72"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors" /><input type="text" placeholder={t("Search Name, User ID...", "नाम, यूजर আইডি खोजें...")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/5 hover:border-cyan-500/30 rounded-2xl text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-inner" /></div>
                       <button onClick={handleAIAnalysis} className="flex items-center justify-center space-x-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 px-6 py-3.5 rounded-2xl transition-all text-sm font-bold shadow-[0_0_15px_rgba(168,85,247,0.15)]"><Sparkles className="h-4 w-4" /> <span>{t("AI Insights", "AI विश्लेषण")}</span></button>
                       <button onClick={exportToCSV} className="flex items-center justify-center space-x-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 px-6 py-3.5 rounded-2xl transition-all text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)]"><File className="h-4 w-4" /> <span>{t("Excel Export", "एक्सेल डाउनलोड")}</span></button>
                    </div>
                  </div>
                  
                  {filteredLoans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 opacity-50 relative z-10"><FileText className="h-16 w-16 text-slate-500 mb-4" /><p className="text-slate-400 text-lg">{t("No applications found.", "कोई एप्लिकेशन नहीं मिली।")}</p></div>
                  ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar relative z-10 rounded-2xl border border-white/5 bg-black/20">
                      <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-20 bg-[#161922] shadow-md border-b border-white/10">
                          <tr>
                            <th className="py-5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("ID / Date", "आईडी / तारीख")}</th>
                            <th className="py-5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("User Info", "यूजर जानकारी")}</th>
                            <th className="py-5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Amount / Recv", "रकम / प्राप्त")}</th>
                            <th className="py-5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Status", "स्थिति")}</th>
                            <th className="py-5 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">{t("Action", "एक्शन")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredLoans.map(loan => (
                            <React.Fragment key={loan.id}>
                              <tr className="hover:bg-white/[0.03] transition-colors group">
                                <td className="py-5 px-6"><div className="font-mono text-xs text-cyan-400/70 bg-black/40 px-2 py-1 rounded inline-block mb-1">{loan.id.substring(0,8)}...</div><div className="text-sm text-slate-400">{new Date(Number(loan.createdAt)).toLocaleDateString('en-IN')}</div></td>
                                <td className="py-5 px-6"><div className="font-bold text-white mb-1 cursor-pointer hover:text-cyan-400 transition-colors flex items-center" onClick={() => { const profile = profiles.find(p => p.user_id === loan.user_id); setSelectedUserProfile({ ...profile, loans: loans.filter(l => l.user_id === loan.user_id) }); }}>{loan.userName} <ChevronRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" /></div><div className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">{loan.user_id.substring(0,18)}...</div></td>
                                <td className="py-5 px-6"><div className="font-bold text-white flex items-center"><span className="text-[10px] text-slate-500 mr-2 uppercase">{t("Disb:", "वितरित:")}</span> ₹{Number(loan.amount).toLocaleString('en-IN')}</div><div className="text-sm text-emerald-400 font-bold mt-1 flex items-center"><span className="text-[10px] text-emerald-500/70 mr-2 uppercase">{t("Recv:", "प्राप्त:")}</span> ₹{Number(loan.recoveredAmount || 0).toLocaleString('en-IN')}</div></td>
                                <td className="py-5 px-6"><span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${loan.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : loan.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>{loan.status}</span></td>
                                <td className="py-5 px-6 text-right space-x-2">
                                  {loan.status === 'active' && (
                                    <>
                                      <button onClick={() => sendWhatsAppReminder(loan, profiles?.find(p => p.user_id === loan.user_id))} className="p-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl transition-all hover:scale-110" title="Send WhatsApp Reminder"><MessageCircle className="h-4 w-4" /></button>
                                      <button onClick={() => setHistoryLoan(loan)} className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl transition-all hover:scale-110"><Clock className="h-4 w-4" /></button>
                                      <button onClick={() => handleFundsClick(loan)} className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl transition-all hover:scale-110"><CreditCard className="h-4 w-4" /></button>
                                    </>
                                  )}
                                  <button onClick={() => handleReviewClick(loan)} className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl transition-all hover:scale-110"><Edit className="h-4 w-4" /></button>
                                  <button onClick={() => onDelete(loan.id)} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition-all hover:scale-110"><Trash className="h-4 w-4" /></button>
                                </td>
                              </tr>
                              {manageFundsLoanId === loan.id && (<tr className="bg-gradient-to-r from-emerald-950/40 to-black/40 border-l-2 border-emerald-500 shadow-inner"><td colSpan="5" className="p-6 md:p-8"><div className="flex flex-col md:flex-row gap-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-6"><div className="flex-1 bg-white/[0.02] p-6 rounded-2xl border border-white/5"><h4 className="text-emerald-400 font-bold mb-5 flex items-center text-lg"><CreditCard className="h-5 w-5 mr-2" /> {t("Loan Fund Ledger", "लोन फंड लेज़र")}</h4><div className="space-y-4 text-sm"><div className="flex justify-between items-center"><span className="text-slate-400 uppercase tracking-widest text-[10px] font-bold">{t("Principal:", "मूलधन:")}</span> <span className="text-white font-bold text-base">₹{Number(loan.amount).toLocaleString('en-IN')}</span></div><div className="flex justify-between items-center"><span className="text-slate-400 uppercase tracking-widest text-[10px] font-bold">{t(`Accrued Interest (${loan.interestRate}%):`, `लगा ब्याज (${loan.interestRate}%):`)}</span> <span className="text-amber-400 font-bold text-base">+ ₹{calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt).toLocaleString('en-IN')}</span></div><div className="flex justify-between items-center"><span className="text-slate-400 uppercase tracking-widest text-[10px] font-bold">{t("Recovered:", "वापस आए:")}</span> <span className="text-emerald-400 font-bold text-base">- ₹{Number(loan.recoveredAmount || 0).toLocaleString('en-IN')}</span></div><div className="pt-3 border-t border-white/10 flex justify-between items-end"><span className="text-emerald-300/80 font-bold uppercase tracking-widest text-[10px]">{t("Net Liability:", "नेट बाकी:")}</span> <span className="text-emerald-400 font-black text-2xl">₹{(Number(loan.amount) + calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt) - Number(loan.recoveredAmount || 0)).toLocaleString('en-IN')}</span></div></div></div><div className="flex-1 flex flex-col justify-center space-y-6"><div className="flex flex-col sm:flex-row gap-5"><div className="flex-1 space-y-2 group"><label className="text-[10px] uppercase tracking-widest font-bold flex items-center text-amber-400 group-focus-within:text-amber-300 transition-colors"><Upload className="h-3 w-3 mr-1.5" /> {t("Add Top-up", "टॉप-अप दें")}</label><input type="number" placeholder="₹" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} className="w-full bg-black/50 border border-amber-500/30 rounded-xl px-5 py-4 text-amber-400 text-lg font-bold focus:bg-amber-950/20 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all" /></div><div className="flex-1 space-y-2 group"><label className="text-[10px] uppercase tracking-widest font-bold flex items-center text-emerald-400 group-focus-within:text-emerald-300 transition-colors"><Download className="h-3 w-3 mr-1.5" /> {t("Add Repayment", "वापस आए (रिपे)")}</label><input type="number" placeholder="₹" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} className="w-full bg-black/50 border border-emerald-500/30 rounded-xl px-5 py-4 text-emerald-400 text-lg font-bold focus:bg-emerald-950/20 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all" /></div></div><div className="flex gap-3 justify-end pt-2"><button onClick={() => submitFunds(loan)} className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">{t("Update Ledger", "लेज़र अपडेट करें")}</button><button onClick={() => setManageFundsLoanId(null)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3.5 rounded-xl text-sm font-bold transition-colors">{t("Cancel", "रद्द करें")}</button></div></div></div></td></tr>)}
                              {editingLoanId === loan.id && (<tr className="bg-gradient-to-r from-indigo-950/40 to-black/40 border-l-2 border-indigo-500 shadow-inner"><td colSpan="5" className="p-6 md:p-8"><div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-6"><h4 className="text-indigo-400 font-bold mb-5 flex items-center text-lg"><Edit className="h-5 w-5 mr-2" /> {t("Edit Loan Terms", "लोन की शर्तें बदलें")}</h4><div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"><div className="space-y-2 group"><label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold group-focus-within:text-indigo-400 transition-colors">{t("Principal Amount (₹)", "मूल राशि (₹)")}</label><input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/[0.05] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold" /></div><div className="space-y-2 group"><label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold group-focus-within:text-indigo-400 transition-colors">{t("Interest Rate (%)", "ब्याज दर (%)")}</label><input type="number" step="0.1" value={editRate} onChange={(e) => setEditRate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/[0.05] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold" /></div><div className="space-y-2 group"><label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold group-focus-within:text-indigo-400 transition-colors">{t("Tenure (Months)", "समय (महीने)")}</label><input type="number" value={editTenure} onChange={(e) => setEditTenure(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/[0.05] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold" /></div><div className="space-y-2 group"><label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold group-focus-within:text-indigo-400 transition-colors">{t("Date", "तारीख")}</label><input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/[0.05] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all font-bold" /></div></div><div className="flex flex-col lg:flex-row gap-6 items-end"><div className="flex-1 w-full space-y-2 group"><label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold group-focus-within:text-indigo-400 transition-colors">{t("Message/Terms for User:", "यूजर के लिए मैसेज/शर्तें:")}</label><textarea value={adminMessage} onChange={(e) => setAdminMessage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:bg-white/[0.05] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all h-24 resize-none leading-relaxed"></textarea></div><div className="flex flex-row lg:flex-col gap-3 w-full lg:w-auto"><button onClick={() => submitReview(loan.id, 'active')} className="flex-1 flex items-center justify-center space-x-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 px-6 py-3.5 rounded-xl transition-all font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)]"><Check className="h-5 w-5" /> <span>{t("Approve", "पास करें")}</span></button><button onClick={() => submitReview(loan.id, 'rejected')} className="flex-1 flex items-center justify-center space-x-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 px-6 py-3.5 rounded-xl transition-all font-bold shadow-[0_0_15px_rgba(239,68,68,0.15)]"><X className="h-5 w-5" /> <span>{t("Reject", "रद्द करें")}</span></button><button onClick={() => setEditingLoanId(null)} className="hidden lg:block text-[10px] text-slate-500 hover:text-white uppercase tracking-widest font-bold mt-2 text-center transition-colors">{t("Close Panel", "पैनल बंद करें")}</button></div></div></div></td></tr>)}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'users' && (
                <div className="bg-gradient-to-br from-[#161922] to-[#0f1115] rounded-[2.5rem] border border-white/5 p-6 md:p-8 shadow-2xl overflow-hidden flex flex-col shrink-0 relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 shrink-0 relative z-10">
                    <h2 className="text-2xl font-bold text-white flex items-center tracking-tight"><div className="bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20 mr-4"><Users className="h-6 w-6 text-cyan-400" /></div>{t("Registered Users Directory", "रजिस्टर्ड यूजर डायरेक्टरी")}</h2>
                    <div className="relative w-full md:w-80 group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-cyan-400 transition-colors" /><input type="text" placeholder={t("Search by name, phone or ID...", "नाम, फोन या आईडी से खोजें...")} value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/5 hover:border-cyan-500/30 rounded-2xl text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-inner" /></div>
                  </div>
                  {filteredProfiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50 relative z-10"><div className="p-6 bg-white/5 rounded-full mb-4 border border-white/5"><Users className="h-12 w-12 text-slate-400" /></div><p className="text-slate-400 text-lg font-medium">{t("No users match your search.", "सर्च के अनुसार कोई यूजर नहीं मिला।")}</p></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar pb-4 relative z-10">
                      {filteredProfiles.map(p => {
                        const userLoans = loans.filter(l => l.user_id === p.user_id);
                        const aLoans = userLoans.filter(l => l.status === 'active');
                        const tP = aLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
                        const tR = aLoans.reduce((sum, l) => sum + Number(l.recoveredAmount || 0), 0);
                        const tI = aLoans.reduce((sum, l) => sum + calculateAccruedInterest(l.amount, l.interestRate, l.createdAt), 0);
                        const nA = tP + tI - tR;
                        const aR = aLoans.length > 0 ? (aLoans.reduce((sum, l) => sum + Number(l.interestRate || 0), 0) / aLoans.length).toFixed(1) : 0;
                        return (
                          <div key={p.id} className="bg-black/40 backdrop-blur-md border border-white/5 p-6 rounded-[2rem] hover:border-cyan-500/40 hover:bg-cyan-950/20 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between h-full shadow-lg">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-cyan-500/10 rounded-full blur-[30px] group-hover:bg-cyan-400/20 transition-colors duration-500 pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-6 relative z-10">
                              <div className="flex items-center space-x-5 cursor-pointer" onClick={() => setSelectedUserProfile({ ...p, loans: userLoans })}>
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/20 text-cyan-300 font-black text-2xl shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:scale-110 transition-transform duration-500 shrink-0">{p.full_name ? String(p.full_name).charAt(0).toUpperCase() : <User className="h-7 w-7" />}</div>
                                <div className="overflow-hidden"><h3 className="text-white font-bold text-lg truncate group-hover:text-cyan-300 transition-colors" title={p.full_name}>{p.full_name || t('Unknown User', 'अज्ञात यूजर')}</h3><p className="text-xs text-slate-400 font-mono mt-1 flex items-center"><Phone className="h-3 w-3 mr-1.5 text-slate-500" />{p.phone || t('No Phone', 'फोन नंबर नहीं')}</p></div>
                              </div>
                            </div>
                            
                            <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5 mb-6 space-y-4 relative z-10 shadow-inner">
                              <div className="flex justify-between items-center"><div><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">{t("Principal", "मूलधन")}</p><p className="text-sm font-bold text-white">₹{tP.toLocaleString('en-IN')}</p></div><div className="text-right"><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">{t("Rate / Int", "दर / ब्याज")}</p><p className="text-sm font-bold text-amber-400">{aR}% <span className="text-slate-600 mx-1">|</span> ₹{tI.toLocaleString('en-IN')}</p></div></div>
                              <div className="pt-3 border-t border-white/5 flex justify-between items-end"><span className="text-[10px] text-cyan-400/80 font-bold uppercase tracking-widest">{t("Net Liability", "कुल बाकी")}</span><span className="text-xl font-black text-cyan-400 tracking-tight">₹{nA.toLocaleString('en-IN')}</span></div>
                            </div>
                            
                            <div className="flex items-center justify-between relative z-10 mt-auto">
                              {p.kyc_status === 'Verified' ? (
                                <span className="px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest flex items-center bg-emerald-500/10 border-emerald-500/30 text-emerald-400"><ShieldCheck className="h-3 w-3 mr-1" /> Verified</span>
                              ) : (
                                <button onClick={() => {
                                  fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${p.user_id}`, { method: 'PATCH', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ kyc_status: 'Verified' }) }).then(res => { if(res.ok) { showAlert("Success", "KYC Approved!"); setTimeout(()=>window.location.reload(), 1000);} });
                                }} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center">
                                  <Check className="h-4 w-4 mr-1" /> {t("Approve KYC", "KYC पास करें")}
                                </button>
                              )}
                              <span onClick={() => setSelectedUserProfile({ ...p, loans: userLoans })} className="text-[10px] text-slate-400 group-hover:text-cyan-400 font-bold uppercase tracking-widest flex items-center cursor-pointer transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">{t("View Details", "प्रोफाइल देखें")} <ChevronRight className="h-3 w-3 ml-1 transform group-hover:translate-x-1 transition-transform" /></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ALL MODALS */}
      <LoanHistoryModal loan={historyLoan} userName={historyLoan?.userName} onClose={() => setHistoryLoan(null)} t={t} />
      <AIInsightsModal isOpen={aiModal.isOpen} onClose={() => setAiModal({ ...aiModal, isOpen: false })} loading={aiModal.loading} result={aiModal.result} error={aiModal.error} t={t} />
      {selectedUserProfile && (
        <UserDetailModal 
          userProfile={selectedUserProfile} 
          onClose={() => setSelectedUserProfile(null)} 
          t={t} 
          onVerify={(userId) => {
            fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, { method: 'PATCH', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ kyc_status: 'Verified' }) }).then(res => { if(res.ok) { showAlert("Success", "KYC Approved!"); setTimeout(()=>window.location.reload(), 1000);} });
          }} 
        />
      )}
    </div>
  );
}

// ==========================================
// 👑 SUPER ADMIN MASTER CONTROL CENTER (UPDATED)
// ==========================================
export function SuperAdminDashboardView({ profiles, session, showAlert }) {
  const { t } = useContext(LanguageContext);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null); // Profile dekhne ke liye
  const [editingAdmin, setEditingAdmin] = useState(null); // Edit karne ke liye

  const allAdmins = profiles?.filter(p => p.admin_id === p.user_id && p.user_id !== session?.user?.id) || [];
  const pendingAdmins = allAdmins.filter(a => a.kyc_status === 'Pending');
  const verifiedAdmins = allAdmins.filter(a => a.kyc_status === 'Verified');
  const suspendedAdmins = allAdmins.filter(a => a.kyc_status === 'Suspended' || a.kyc_status === 'Rejected');
  
  const totalUsers = profiles?.length - allAdmins.length - 1; 

  // 🔥 ADMIN DELETE LOGIC
  const handleDeleteAdmin = async (adminId) => {
    if(!window.confirm("WARNING: Kya aap is Admin ko permanently delete karna chahte hain? Iska saara data hat jayega.")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${adminId}`, {
        method: 'DELETE',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error("Delete failed");
      showAlert("Success", "Admin deleted from system!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) { showAlert("Error", "Could not delete admin."); }
    finally { setIsLoading(false); }
  };

  const handleAdminStatus = async (adminId, status) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${adminId}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ kyc_status: status })
      });
      if (!res.ok) throw new Error("Update failed");
      showAlert("Success", `Status updated to ${status}!`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) { showAlert("Error", "Could not update status."); } 
    finally { setIsLoading(false); }
  };

  return (
    <div className="relative space-y-8 animate-in fade-in duration-1000 pb-20 max-w-7xl mx-auto">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-600/10 blur-[150px] rounded-full pointer-events-none -z-10"></div>
      
      <header className="mb-10 text-center sm:text-left pt-8">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-600 tracking-tight flex items-center justify-center sm:justify-start">
           <Crown className="h-10 w-10 mr-3 text-amber-500" /> Super Admin Center
        </h1>
        <p className="text-slate-400 text-lg mt-2">Manage Branch Managers, review KYC and control the system.</p>
      </header>

      {/* 📊 STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         <div className="bg-gradient-to-br from-black to-[#0a0a0a] border border-amber-500/30 p-6 rounded-[2rem] shadow-xl">
            <p className="text-amber-500 font-bold uppercase tracking-widest text-[10px] mb-2">Total Admins</p>
            <p className="text-4xl font-black text-white">{allAdmins.length}</p>
         </div>
         <div className="bg-gradient-to-br from-black to-[#0a0a0a] border border-emerald-500/30 p-6 rounded-[2rem] shadow-xl">
            <p className="text-emerald-500 font-bold uppercase tracking-widest text-[10px] mb-2">Total Users</p>
            <p className="text-4xl font-black text-white">{totalUsers > 0 ? totalUsers : 0}</p>
         </div>
         <div className="bg-gradient-to-br from-black to-[#0a0a0a] border border-blue-500/30 p-6 rounded-[2rem] shadow-xl">
            <p className="text-blue-500 font-bold uppercase tracking-widest text-[10px] mb-2">Pending</p>
            <p className="text-4xl font-black text-white">{pendingAdmins.length}</p>
         </div>
         <div className="bg-gradient-to-br from-black to-[#0a0a0a] border border-red-500/30 p-6 rounded-[2rem] shadow-xl">
            <p className="text-red-500 font-bold uppercase tracking-widest text-[10px] mb-2">Blocked</p>
            <p className="text-4xl font-black text-red-400">{suspendedAdmins.length}</p>
         </div>
      </div>

      {/* ✅ ACTIVE ADMINS LIST WITH VIEW/EDIT/DELETE */}
      <div className="bg-[#111318]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
         <h2 className="text-2xl font-bold text-white mb-6 flex items-center"><ShieldCheck className="h-6 w-6 mr-3 text-emerald-400" /> Active Branch Admins</h2>
         
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {verifiedAdmins.map(admin => (
               <div key={admin.user_id} className="bg-black/40 border border-white/10 p-6 rounded-3xl flex items-center justify-between group hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center space-x-4">
                     <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-black flex items-center justify-center border border-white/5 text-cyan-400 font-bold text-xl">
                        {admin.full_name?.charAt(0)}
                     </div>
                     <div>
                        <h4 className="text-white font-bold text-lg">{admin.full_name}</h4>
                        <p className="text-xs text-slate-500">Pincode: {admin.pincode}</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                     <button onClick={() => setSelectedAdmin(admin)} className="p-2.5 bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 rounded-xl transition-all" title="View Profile"><Eye className="h-5 w-5" /></button>
                     <button onClick={() => setEditingAdmin(admin)} className="p-2.5 bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 rounded-xl transition-all" title="Edit Admin"><Edit className="h-5 w-5" /></button>
                     <button onClick={() => handleAdminStatus(admin.user_id, 'Suspended')} className="p-2.5 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-all" title="Block Admin"><Lock className="h-5 w-5" /></button>
                     <button onClick={() => handleDeleteAdmin(admin.user_id)} className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all" title="Delete Admin"><Trash className="h-5 w-5" /></button>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* 🚨 PENDING & BLOCKED SECTIONS (REDUCED SIZE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pending Section */}
          <div className="bg-[#111318]/60 border border-white/5 rounded-[2.5rem] p-6 shadow-xl">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Clock className="h-5 w-5 mr-2 text-amber-400" /> Pending Approvals</h3>
             <div className="space-y-4">
                {pendingAdmins.map(a => (
                   <div key={a.user_id} className="bg-black/30 p-4 rounded-2xl flex justify-between items-center">
                      <span className="text-slate-300 font-medium">{a.full_name}</span>
                      <button onClick={() => setSelectedAdmin(a)} className="text-xs bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-lg font-bold uppercase">Review KYC</button>
                   </div>
                ))}
             </div>
          </div>

          {/* Blocked Section */}
          <div className="bg-[#111318]/60 border border-white/5 rounded-[2.5rem] p-6 shadow-xl">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center"><ShieldAlert className="h-5 w-5 mr-2 text-red-500" /> Suspended Admins</h3>
             <div className="space-y-4">
                {suspendedAdmins.map(a => (
                   <div key={a.user_id} className="bg-black/30 p-4 rounded-2xl flex justify-between items-center">
                      <span className="text-slate-500 line-through">{a.full_name}</span>
                      <div className="flex space-x-2">
                        <button onClick={() => handleAdminStatus(a.user_id, 'Verified')} className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg font-bold uppercase">Unblock</button>
                        <button onClick={() => handleDeleteAdmin(a.user_id)} className="text-[10px] text-red-500 bg-red-500/10 p-1.5 rounded-lg"><Trash className="h-4 w-4" /></button>
                      </div>
                   </div>
                ))}
             </div>
          </div>
      </div>

      {/* MODALS */}
      {selectedAdmin && <AdminDetailModal profile={selectedAdmin} onClose={() => setSelectedAdmin(null)} onStatusChange={handleAdminStatus} t={t} />}
      {editingAdmin && <AdminEditModal profile={editingAdmin} onClose={() => setEditingAdmin(null)} session={session} showAlert={showAlert} t={t} />}
    </div>
  );
}

// ==========================================
// 🌟 ADMIN SELF PROFILE VIEW (WITH CUSTOM INTEREST RATE)
// ==========================================
export function AdminSelfProfileView({ session, showAlert, t }) {
  const [profile, setProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [aadharNo, setAadharNo] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [defaultRate, setDefaultRate] = useState(12.5); // 🔥 NAYA: Interest Rate State
  
  const [aadharFront, setAadharFront] = useState(null);
  const [aadharBack, setAadharBack] = useState(null);
  const [panCard, setPanCard] = useState(null);
  const [selfie, setSelfie] = useState(null);

  const isVerified = profile?.kyc_status === 'Verified';

  const getSession = () => {
    if (session && session.user) return session;
    try { return JSON.parse(localStorage.getItem('leaderpro_session')); } 
    catch (e) { return null; }
  };

  useEffect(() => {
    const fetchAdminProfile = async () => {
      const currentSession = getSession();
      if (!currentSession?.user?.id) { setIsLoading(false); return; }
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${currentSession.user.id}`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${currentSession.access_token}` }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          const p = data[0];
          setProfile(p);
          setFullName(p.full_name || '');
          setFatherName(p.father_name || '');
          setAadharNo(p.aadhar_no || '');
          setPhone(p.phone || '');
          setAddress(p.address || '');
          setPincode(p.pincode || '');
          setDefaultRate(p.default_rate || 12.5); // 🔥 NAYA: Fetch Rate
        }
      } catch (err) { console.error("Fetch profile error:", err); } 
      finally { setIsLoading(false); }
    };
    fetchAdminProfile();
  }, [session]);

  const uploadFile = async (file, type) => { 
    if (!file) return null;
    const currentSession = getSession();
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentSession.user.id}_${type}_${Date.now()}.${fileExt}`;
    const filePath = `${currentSession.user.id}/${fileName}`;
    try {
      const response = await fetch(`${supabaseUrl}/storage/v1/object/kyc-documents/${filePath}`, { method: 'POST', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${currentSession.access_token}`, 'Content-Type': file.type }, body: file });
      if (!response.ok) throw new Error(`Failed to upload ${type}`);
      return `${supabaseUrl}/storage/v1/object/public/kyc-documents/${filePath}`;
    } catch (err) { return null; }
  };

  const handleSaveAdminProfile = async (e) => {
    e.preventDefault();
    const currentSession = getSession();
    if (!currentSession?.user?.id) return;

    if (!fullName || !pincode || !address || !phone) {
      showAlert(t("Warning", "चेतावनी"), t("Name, Phone, Address, and Pincode are required.", "नाम, फोन, पता और पिनकोड लिखना जरूरी है।"));
      return;
    }

    setIsSubmitting(true);
    let aadhar_front_url = profile?.aadhar_front_url || null; 
    let aadhar_back_url = profile?.aadhar_back_url || null; 
    let pan_url = profile?.pan_url || null; 
    let selfie_url = profile?.selfie_url || null;
    
    if (aadharFront) aadhar_front_url = await uploadFile(aadharFront, 'aadhar_front');
    if (aadharBack) aadhar_back_url = await uploadFile(aadharBack, 'aadhar_back');
    if (panCard) pan_url = await uploadFile(panCard, 'pan');
    if (selfie) selfie_url = await uploadFile(selfie, 'selfie');
    
    try {
      const payload = {
        full_name: fullName, father_name: fatherName, aadhar_no: aadharNo, phone: phone,
        address: address, pincode: pincode, default_rate: Number(defaultRate), // 🔥 NAYA: Save Rate
        kyc_status: profile?.kyc_status === 'Verified' ? 'Verified' : 'Pending', 
        aadhar_front_url, aadhar_back_url, pan_url, selfie_url
      };

      if (!profile?.user_id) {
         payload.user_id = currentSession.user.id;
         payload.admin_id = currentSession.user.id;
      }

      const url = profile?.user_id 
          ? `${supabaseUrl}/rest/v1/profiles?user_id=eq.${currentSession.user.id}` 
          : `${supabaseUrl}/rest/v1/profiles`;
          
      const method = profile?.user_id ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${currentSession.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save");
      
      showAlert(t("Success!", "सफलता!"), t("Your profile is submitted. Please wait for Super Admin verification.", "आपकी प्रोफाइल सबमिट हो गई है। सुपर एडमिन के वेरिफिकेशन का इंतज़ार करें।"));
      setProfile({...profile, ...payload});
      
      setTimeout(() => { window.location.reload(); }, 1500);

    } catch (err) { showAlert(t("Error", "त्रुटि"), t("Failed to save.", "सेव नहीं हो पाया।")); } 
    finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="py-20 text-center text-cyan-500 font-bold animate-pulse">{t("Loading your profile...", "प्रोफाइल लोड हो रही है...")}</div>;
  
  const FileUploadBtn = ({ label, onChange, currentUrl }) => ( 
      <div className="relative group cursor-pointer w-full">
        <input type="file" accept="image/*" onChange={onChange} disabled={isVerified} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" />
        <div className={`flex items-center justify-center space-x-2 border-2 border-dashed p-4 rounded-xl transition-all duration-300 ${currentUrl || isVerified ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-600 bg-black/40 group-hover:border-cyan-500 group-hover:bg-cyan-950/30'}`}>
          {currentUrl || isVerified ? <Check className="h-5 w-5 text-emerald-400" /> : <Upload className="h-5 w-5 text-slate-400 group-hover:text-cyan-400" />}
          <span className={`text-sm font-semibold ${currentUrl || isVerified ? 'text-emerald-400' : 'text-slate-300 group-hover:text-cyan-400'}`}>
            {currentUrl ? `${label} (${t("Uploaded", "अपलोड हो गया")})` : isVerified ? `${label} (${t("Verified", "वेरीफाइड")})` : `${t("Upload", "अपलोड करें")} ${label}`}
          </span>
        </div>
      </div>
  );

  return (
    <div className="bg-gradient-to-br from-[#161922] to-[#0f1115] rounded-[2.5rem] border border-white/5 p-6 md:p-10 shadow-2xl relative overflow-hidden animate-in fade-in duration-500">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[50px] pointer-events-none"></div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10 pb-8 border-b border-white/5 relative z-10">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] shrink-0"><User className="text-cyan-400 h-8 w-8" /></div>
          <div><h2 className="text-2xl font-bold text-white tracking-wide">{t("My Admin Profile", "मेरी एडमिन प्रोफाइल")}</h2><p className="text-sm text-slate-500">{t("Secure & Encrypted", "सुरक्षित और एन्क्रिप्टेड")}</p></div>
        </div>
        {isVerified && (<div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.2)] shrink-0"><Check className="h-4 w-4" /><span className="text-sm font-bold uppercase tracking-widest">{t("Verified Shield", "वेरीफाइड शील्ड")}</span></div>)}
      </div>

      <form onSubmit={handleSaveAdminProfile} className="space-y-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-cyan-400">{t("Legal Full Name", "कानूनी पूरा नाम")}</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isVerified} className="w-full px-5 py-4 bg-black/40 hover:bg-black/60 border border-white/10 rounded-2xl text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" required /></div>
          <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-cyan-400">{t("Phone Number", "फोन नंबर")}</label><input type="text" maxLength="10" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} disabled={isVerified} className="w-full px-5 py-4 bg-black/40 hover:bg-black/60 border border-white/10 rounded-2xl text-white font-mono focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" required /></div>
          <div className="space-y-2 group relative"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">{t("ID Number", "आईडी नंबर")} <Lock className="h-3 w-3 ml-2 text-slate-600" /></label><input type="text" value={aadharNo} readOnly={true} className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-slate-500 font-mono tracking-widest cursor-not-allowed outline-none" /></div>
          <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-cyan-400">{t("Area Pincode", "पिनकोड")}</label><input type="text" maxLength="6" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} disabled={isVerified} className="w-full px-5 py-4 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/30 rounded-2xl text-cyan-400 font-black tracking-widest focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" required /><p className="text-[10px] text-slate-500 ml-1 mt-1">{t("Users will see you on this pincode.", "यूजर्स को आप इस पिनकोड पर दिखेंगे।")}</p></div>
          
          {/* 🔥 NAYA: Interest Rate Field 🔥 */}
          <div className="space-y-2 group lg:col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-amber-400">{t("Default Interest Rate (%)", "आपकी डिफ़ॉल्ट ब्याज दर (%)")}</label><input type="number" step="0.1" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} disabled={isVerified} className="w-full px-5 py-4 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/30 rounded-2xl text-amber-400 font-black tracking-widest focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" required /><p className="text-[10px] text-amber-500/70 ml-1 mt-1">{t("This base rate will be applied to all loans from your branch.", "यह आपकी ब्रांच का मुख्य ब्याज दर होगा।")}</p></div>
          
          <div className="space-y-2 group md:col-span-2 lg:col-span-3 mt-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-cyan-400">{t("Office / Residential Address", "ऑफिस / घर का पता")}</label><textarea value={address} onChange={(e) => setAddress(e.target.value)} disabled={isVerified} className="w-full px-5 py-4 bg-black/40 hover:bg-black/60 border border-white/10 rounded-2xl text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none resize-none h-24 transition-all disabled:opacity-50 disabled:cursor-not-allowed" required></textarea></div>
        </div>

        <div className="pt-10 mt-6 border-t border-white/5">
          <h3 className="text-xl font-bold text-white mb-8 tracking-wide">{t("Identity Documents (KYC)", "पहचान पत्र (KYC)")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <FileUploadBtn label="Front ID" onChange={(e) => setAadharFront(e.target.files[0])} currentUrl={profile?.aadhar_front_url || aadharFront} />
            <FileUploadBtn label="Back ID" onChange={(e) => setAadharBack(e.target.files[0])} currentUrl={profile?.aadhar_back_url || aadharBack} />
            <FileUploadBtn label="PAN Card" onChange={(e) => setPanCard(e.target.files[0])} currentUrl={profile?.pan_url || panCard} />
            <FileUploadBtn label="Selfie Photo" onChange={(e) => setSelfie(e.target.files[0])} currentUrl={profile?.selfie_url || selfie} />
          </div>
        </div>

        {!isVerified && (
          <div className="pt-6">
            <button type="submit" disabled={isSubmitting} className="w-full relative overflow-hidden group bg-transparent border-none p-0 outline-none disabled:opacity-70 disabled:cursor-not-allowed">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 rounded-2xl opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500"></div>
              <div className="relative px-8 py-5 flex items-center justify-center">
                <span className="text-white font-black tracking-widest uppercase text-lg">{isSubmitting ? t('Encrypting & Saving...', 'एन्क्रिप्ट और सेव हो रहा है...') : t('Submit For Approval', 'अप्रूवल के लिए सबमिट करें')}</span>
              </div>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

// 🌟 STAT CARD 🌟
export function StatCard({ title, value, icon, iconBg = "bg-white/5", badgeText = "AGENCY SHIELD" }) { 
    return (
        <div className="bg-gradient-to-br from-[#161922] to-[#0f1115] border border-white/5 p-6 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col justify-between group hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_10px_40px_rgba(6,182,212,0.1)] relative overflow-hidden shrink-0">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-[20px] group-hover:bg-cyan-500/10 transition-colors duration-500 pointer-events-none"></div>
          <div className="flex items-start justify-between w-full mb-10 relative z-10">
            <div className={`p-4 rounded-2xl flex items-center justify-center ${iconBg} shadow-inner`}>{icon}</div>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-black/40 px-2 py-1 rounded-md border border-white/5">{badgeText}</span>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">{title}</p>
            <p className="text-3xl lg:text-4xl font-black text-white tracking-tight">{value}</p>
          </div>
        </div>
    );
}

// 🌟 ADMIN VISUAL ANALYTICS 🌟
export function AdminVisualAnalytics({ loans, t }) { 
    const activeLoans = loans.filter(l => l.status === 'active');
    const totalDisbursed = activeLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const totalRecovery = activeLoans.reduce((sum, l) => sum + Number(l.recoveredAmount || 0), 0);
    const totalInterest = activeLoans.reduce((sum, l) => sum + calculateAccruedInterest(l.amount, l.interestRate, l.createdAt), 0);
    const totalExpected = totalDisbursed + totalInterest;
    const recoveryPct = totalExpected > 0 ? Math.round((totalRecovery / totalExpected) * 100) : 0;
    const liabilityPct = totalExpected > 0 ? 100 - recoveryPct : 0;
    const activeCount = activeLoans.length;
    const pendingCount = loans.filter(l => l.status === 'pending').length;
    const rejectedCount = loans.filter(l => l.status === 'rejected').length;
    const totalCount = loans.length || 1;
    const activePct = (activeCount / totalCount) * 100;
    const pendingPct = (pendingCount / totalCount) * 100;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-in fade-in duration-500 shrink-0">
           <div className="bg-gradient-to-br from-[#161922] to-[#0f1115] p-8 rounded-[2.5rem] border border-white/5 shadow-xl hover:border-cyan-500/20 transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[50px] pointer-events-none group-hover:bg-cyan-500/10 transition-colors duration-500"></div>
              <div className="relative z-10">
                  <h3 className="text-sm font-bold text-white mb-8 uppercase tracking-widest flex items-center"><BarChart className="h-5 w-5 mr-3 text-cyan-400" /> {t("Financial Health", "आर्थिक स्थिति")}</h3>
                  <div className="space-y-5">
                     <div className="flex justify-between text-sm"><span className="text-emerald-400 font-bold flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>{t("Recovered", "वापस आए")} ({recoveryPct}%)</span><span className="text-amber-400 font-bold flex items-center">{t("Net Liability", "नेट बाकी")} ({liabilityPct}%)<span className="w-2 h-2 rounded-full bg-amber-500 ml-2"></span></span></div>
                     <div className="w-full h-6 bg-black/50 rounded-full overflow-hidden flex border border-white/10 shadow-inner"><div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-1000 relative" style={{ width: `${recoveryPct}%` }}><div className="absolute inset-0 bg-white/20 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div></div><div className="bg-gradient-to-r from-amber-600 to-amber-400 h-full transition-all duration-1000 relative" style={{ width: `${liabilityPct}%` }}></div></div>
                  </div>
              </div>
              <div className="pt-8 mt-8 border-t border-white/5 grid grid-cols-2 gap-5 relative z-10">
                 <div className="bg-black/30 p-5 rounded-2xl border border-white/5 text-left group-hover:border-emerald-500/20 transition-colors"><p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 font-bold">{t("Recovery", "रिकवरी")}</p><p className="text-2xl font-black text-emerald-400">₹{totalRecovery.toLocaleString('en-IN')}</p></div>
                 <div className="bg-black/30 p-5 rounded-2xl border border-white/5 text-left group-hover:border-amber-500/20 transition-colors"><p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 font-bold">{t("Liability", "लायबिलिटी")}</p><p className="text-2xl font-black text-amber-400">₹{(totalDisbursed + totalInterest - totalRecovery).toLocaleString('en-IN')}</p></div>
              </div>
           </div>
           
           <div className="bg-gradient-to-br from-[#161922] to-[#0f1115] p-8 rounded-[2.5rem] border border-white/5 shadow-xl hover:border-indigo-500/20 transition-all flex flex-col sm:flex-row items-center justify-between gap-8 relative overflow-hidden group">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 blur-[50px] pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-500"></div>
              <div className="w-full sm:w-1/2 relative z-10">
                <h3 className="text-sm font-bold text-white mb-8 uppercase tracking-widest flex items-center"><PieChart className="h-5 w-5 mr-3 text-indigo-400" /> {t("Applications", "एप्लिकेशन")}</h3>
                <div className="space-y-4">
                   <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-emerald-500 mr-3 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div><span className="text-sm text-slate-300 font-medium">{t("Active", "पास (Active)")}</span></div><span className="font-black text-white text-lg">{activeCount}</span></div>
                   <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/5 hover:border-amber-500/30 transition-colors"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-500 mr-3 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div><span className="text-sm text-slate-300 font-medium">{t("Pending", "पेंडिंग")}</span></div><span className="font-black text-white text-lg">{pendingCount}</span></div>
                   <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/5 hover:border-red-500/30 transition-colors"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-3 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div><span className="text-sm text-slate-300 font-medium">{t("Rejected", "रद्द (Rejected)")}</span></div><span className="font-black text-white text-lg">{rejectedCount}</span></div>
                </div>
              </div>
              <div className="flex justify-center shrink-0 relative z-10">
                 <div className="w-44 h-44 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10" style={{ background: `conic-gradient(#10b981 ${activePct}%, #f59e0b ${activePct}% ${activePct + pendingPct}%, #ef4444 ${activePct + pendingPct}% 100%)` }}>
                    <div className="w-32 h-32 bg-[#111318] rounded-full flex items-center justify-center flex-col shadow-inner border border-white/5">
                       <span className="text-4xl font-black text-white tracking-tight">{totalCount}</span>
                       <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">{t("Total", "कुल")}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
    );
}

// 🌟 ADMIN ANALYTICS VIEW 🌟
export function AdminAnalyticsView({ loans, profiles, t, sendWhatsAppReminder }) { 
    const safeLoans = Array.isArray(loans) ? loans : [];
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const activeLoans = safeLoans.filter(l => l.status === 'active');
    
    const npaLoans = activeLoans.filter(loan => {
      const txs = Array.isArray(loan.transactions) ? loan.transactions : [];
      const lastActivityDate = txs.length > 0 ? Math.max(...txs.map(tx => tx.date)) : Number(loan.createdAt);
      return lastActivityDate < thirtyDaysAgo;
    }).map(loan => {
      const userProfile = profiles?.find(p => p.user_id === loan.user_id);
      const accruedInterest = calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt);
      const netBaki = Number(loan.amount) + accruedInterest - Number(loan.recoveredAmount || 0);
      const daysOverdue = Math.floor((Date.now() - (txs => txs.length > 0 ? Math.max(...txs.map(t=>t.date)) : loan.createdAt)(loan.transactions || [])) / (1000 * 60 * 60 * 24));
      return { ...loan, userProfile, netBaki, daysOverdue };
    }).sort((a, b) => b.daysOverdue - a.daysOverdue);

    const totalPrincipalActive = activeLoans.reduce((sum, l) => sum + Number(l.amount || 0) - Number(l.recoveredAmount || 0), 0);
    const avgInterestRate = activeLoans.length > 0 ? activeLoans.reduce((sum, l) => sum + Number(l.interestRate || 0), 0) / activeLoans.length : 0;
    const monthlyExpectedProfit = (totalPrincipalActive * (avgInterestRate / 100)) / 12;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    
    const forecastData = Array.from({ length: 6 }).map((_, i) => {
      const monthIndex = (currentMonth + i + 1) % 12;
      const curve = 1 + (Math.sin(i) * 0.1); 
      const projectedAmount = monthlyExpectedProfit * curve;
      return { month: monthNames[monthIndex], amount: projectedAmount > 0 ? projectedAmount : (5000 + (Math.random() * 2000)) };
    });
    const maxForecast = Math.max(...forecastData.map(d => d.amount), 1);

    return (
      <div className="space-y-8 animate-in fade-in duration-700 relative">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/10 blur-[150px] rounded-full pointer-events-none -z-10"></div>
        <header className="mb-8 shrink-0 pt-4">
           <h2 className="text-3xl font-black text-white tracking-tight flex items-center"><TrendingUp className="h-8 w-8 mr-3 text-purple-400" />{t("Risk & Profit Analytics", "रिस्क और प्रॉफिट एनालिटिक्स")}</h2>
           <p className="text-slate-400 mt-2 text-lg">{t("Track your defaulters and forecast future earnings.", "अपने डिफॉल्टर्स ट्रैक करें और भविष्य की कमाई का अनुमान लगाएँ।")}</p>
        </header>

        <div className="bg-gradient-to-br from-[#161922] to-[#0f1115] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[60px] pointer-events-none"></div>
          <div className="flex items-center justify-between mb-10 relative z-10">
             <div><h3 className="text-xl font-bold text-white flex items-center"><BarChart className="h-5 w-5 mr-2 text-purple-400" /> {t("6-Month Profit Forecast", "6-महीने का प्रॉफिट अनुमान")}</h3><p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{t("Expected Interest Earnings", "अनुमानित ब्याज की कमाई")}</p></div>
             <div className="text-right bg-black/30 p-4 rounded-2xl border border-white/5"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t("Avg Monthly", "औसत मासिक")}</p><p className="text-2xl font-black text-purple-400">₹{Math.round(monthlyExpectedProfit).toLocaleString('en-IN')}</p></div>
          </div>
          
          <div className="h-56 flex items-end justify-between gap-2 sm:gap-6 relative z-10 border-b border-white/10 pb-2 mt-8">
            {forecastData.map((data, idx) => {
              const heightPct = (data.amount / maxForecast) * 100;
              const finalHeight = Math.max(5, heightPct);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group/bar cursor-pointer relative">
                   <div className="absolute -top-10 opacity-0 group-hover/bar:opacity-100 transition-all duration-300 bg-black text-white text-[10px] font-bold py-1.5 px-3 rounded-lg border border-purple-500/30 whitespace-nowrap z-20 shadow-[0_0_15px_rgba(168,85,247,0.4)]">₹{Math.round(data.amount).toLocaleString('en-IN')}</div>
                   <div className="w-full flex-1 flex items-end justify-center">
                      <div className="w-10 sm:w-16 bg-gradient-to-t from-purple-900/50 to-purple-500/80 rounded-t-xl transition-all duration-700 group-hover/bar:from-purple-600 group-hover/bar:to-cyan-400 relative overflow-hidden shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover/bar:shadow-[0_0_20px_rgba(6,182,212,0.5)]" style={{ height: `${finalHeight}%` }}>
                         <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.1) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.1) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                      </div>
                   </div>
                   <span className="text-xs text-slate-400 font-bold mt-3 tracking-widest uppercase">{data.month}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-[#111318] rounded-[2.5rem] border border-red-500/20 p-8 shadow-[0_0_50px_rgba(239,68,68,0.05)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-8 relative z-10">
             <div className="flex items-center space-x-4"><div className="bg-red-500/10 p-3 rounded-2xl border border-red-500/30 animate-pulse"><AlertTriangle className="h-6 w-6 text-red-500" /></div><div><h3 className="text-2xl font-bold text-red-400">{t("NPA / Defaulters Zone", "डिफॉल्टर ज़ोन (NPA)")}</h3><p className="text-xs text-red-500/70 mt-1 uppercase tracking-widest font-bold">{t("No payment received in last 30+ days", "पिछले 30+ दिनों से कोई पेमेंट नहीं")}</p></div></div>
             <div className="bg-red-950/40 px-4 py-2 rounded-xl border border-red-500/30 text-red-400 font-black text-xl">{npaLoans.length} {t("Risky", "रिस्की")}</div>
          </div>
          
          {npaLoans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-emerald-950/10 rounded-3xl border border-emerald-500/10"><ShieldCheck className="h-16 w-16 text-emerald-500/50 mb-4" /><p className="text-emerald-400 text-lg font-bold">{t("All Clear! No defaulters found.", "सब बढ़िया है! कोई डिफॉल्टर नहीं मिला।")}</p></div>
          ) : (
            <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {npaLoans.map(loan => (
                <div key={loan.id} className="bg-gradient-to-r from-red-950/20 to-black/40 p-5 rounded-2xl border border-red-500/20 hover:border-red-500/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div className="flex items-center space-x-4"><div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20"><User className="h-5 w-5 text-red-400" /></div><div><h4 className="text-white font-bold text-lg">{loan.userProfile?.full_name || 'Unknown User'}</h4><p className="text-[10px] text-slate-400 font-mono flex items-center mt-1"><Phone className="h-3 w-3 mr-1" /> {loan.userProfile?.phone || 'N/A'}</p></div></div>
                   <div className="flex items-center space-x-6 bg-black/40 p-3 rounded-xl border border-white/5"><div className="text-center border-r border-white/10 pr-6"><p className="text-[9px] text-red-400 uppercase tracking-widest font-bold mb-1">{t("Overdue By", "इतने दिन से पेंडिंग")}</p><p className="text-lg font-black text-white">{loan.daysOverdue} <span className="text-xs font-normal text-slate-500">{t("Days", "दिन")}</span></p></div><div className="text-center"><p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">{t("Amount at Risk", "फंसा हुआ पैसा")}</p><p className="text-lg font-black text-red-400">₹{Math.round(loan.netBaki).toLocaleString('en-IN')}</p></div></div>
                   <button onClick={() => sendWhatsAppReminder && sendWhatsAppReminder({ ...loan, status: 'overdue' }, loan.userProfile)} className="w-full sm:w-auto bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-400 px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center"><MessageCircle className="h-4 w-4 mr-2" /> {t("Send Notice", "नोटिस भेजें")}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
}

// 🌟 LOAN HISTORY MODAL 🌟
export function LoanHistoryModal({ loan, onClose, userName, t }) {
  if (!loan) return null;
  const accruedInterest = calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt);
  const netBaki = Number(loan.amount) + accruedInterest - Number(loan.recoveredAmount || 0);
  const transactions = Array.isArray(loan.transactions) ? loan.transactions : [];
  const totalTopups = transactions.reduce((sum, tx) => sum + Number(tx.topup || 0), 0);
  const initialPrincipal = Number(loan.amount) - totalTopups;
  
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
       <div className="bg-[#0a0a0a]/90 border border-white/10 p-8 rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] max-w-lg w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue-600/20 blur-[80px] rounded-full pointer-events-none"></div>
          <button onClick={onClose} className="absolute top-8 right-8 text-slate-400 hover:text-white bg-white/5 p-2 rounded-full border border-white/10 transition-colors z-20"><X className="h-5 w-5" /></button>
          
          <div className="flex items-center space-x-4 mb-8 sticky top-0 z-10 pt-2 pb-4 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 -mx-8 px-8 -mt-8">
             <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
               <Clock className="h-7 w-7 text-blue-400" />
             </div>
             <div>
               <h3 className="text-2xl font-black text-white tracking-tight">{t("Loan History", "लोन हिस्ट्री")}</h3>
               <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">{t("Ledger & Transactions", "लेज़र और ट्रांज़ैक्शन")}</p>
             </div>
          </div>
          
          <div className="space-y-8 relative z-10 pb-6">
             <div className="bg-black/50 p-5 rounded-3xl border border-white/5 flex justify-between items-center shadow-inner">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{t("Loan ID", "लोन आईडी")}</p>
                  <p className="text-sm font-mono text-cyan-400 tracking-wider">{loan.id}</p>
                </div>
                {userName && <div className="text-right"><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{t("User", "यूजर")}</p><p className="text-sm text-white font-bold">{userName}</p></div>}
             </div>
             
             <div className="relative pl-6 border-l border-white/10 space-y-8 ml-3 py-2">
                <div className="relative">
                   <div className="absolute -left-[31.5px] top-1 h-4 w-4 rounded-full bg-cyan-500 border-4 border-[#0a0a0a] shadow-[0_0_15px_rgba(6,182,212,0.6)]"></div>
                   <p className="text-[10px] text-slate-500 font-mono mb-1.5 uppercase tracking-wider">{new Date(Number(loan.createdAt)).toLocaleString('en-IN')}</p>
                   <p className="text-sm text-white font-bold">{t("Loan Started (Initial Disbursed)", "लोन शुरू हुआ (पहला वितरण)")}</p>
                   <p className="text-2xl font-black text-cyan-400 mt-1 tracking-tight">+ ₹{initialPrincipal.toLocaleString('en-IN')}</p>
                </div>
                
                {transactions.map((tx, idx) => (
                   <div key={tx.id || idx} className="relative mt-8">
                      <div className={`absolute -left-[31.5px] top-1 h-4 w-4 rounded-full border-4 border-[#0a0a0a] shadow-lg ${tx.topup > 0 ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.6)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]'}`}></div>
                      <p className="text-[10px] text-slate-500 font-mono mb-1.5 uppercase tracking-wider">{new Date(tx.date).toLocaleString('en-IN')}</p>
                      
                      {tx.topup > 0 && (
                        <div className="mb-3 bg-purple-950/20 p-4 rounded-2xl border border-purple-500/10 inline-block w-full">
                          <p className="text-xs text-purple-200/80 font-bold uppercase tracking-widest mb-1">{t("Top-up Given", "और दिए (टॉप-अप)")}</p>
                          <p className="text-2xl font-black text-purple-400 tracking-tight">+ ₹{Number(tx.topup).toLocaleString('en-IN')}</p>
                        </div>
                      )}
                      
                      {tx.repay > 0 && (
                        <div className="bg-emerald-950/20 p-4 rounded-2xl border border-emerald-500/10 inline-block w-full">
                          <p className="text-xs text-emerald-200/80 font-bold uppercase tracking-widest mb-1">{t("Repayment Received", "वापस आए (रीपेमेंट)")}</p>
                          <p className="text-2xl font-black text-emerald-400 tracking-tight">- ₹{Number(tx.repay).toLocaleString('en-IN')}</p>
                        </div>
                      )}
                   </div>
                ))}

                <div className="relative mt-8">
                   <div className="absolute -left-[31.5px] top-1 h-4 w-4 rounded-full bg-amber-500 border-4 border-[#0a0a0a] shadow-[0_0_15px_rgba(245,158,11,0.6)]"></div>
                   <p className="text-[10px] text-slate-500 font-mono mb-1.5 uppercase tracking-wider">{t("Till Date Calculation", "आज तक का हिसाब")}</p>
                   <p className="text-sm text-white font-bold">{t(`Total Accrued Interest (${loan.interestRate}% P.A.)`, `कुल लगा ब्याज (${loan.interestRate}% P.A.)`)}</p>
                   <p className="text-2xl font-black text-amber-400 mt-1 tracking-tight">+ ₹{accruedInterest.toLocaleString('en-IN')}</p>
                </div>
             </div>
             
             <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center bg-gradient-to-r from-cyan-950/40 to-blue-950/40 p-6 rounded-3xl border-b border-cyan-500/20 shadow-inner">
                <span className="text-cyan-400/80 font-bold uppercase tracking-widest text-[10px]">{t("Net Liability", "नेट बाकी रकम")}</span>
                <span className="text-4xl font-black text-cyan-300 tracking-tight">₹{netBaki.toLocaleString('en-IN')}</span>
             </div>

             <button onClick={onClose} className="w-full mt-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all duration-300">
                {t("Close Window", "वापस जाएं")}
             </button>
          </div>
       </div>
        </div>
    );
}

// 🌟 AI INSIGHTS MODAL 🌟
export function AIInsightsModal({ isOpen, onClose, loading, result, error, t }) {
  if (!isOpen) return null;
  const handleDownload = async () => {
    if (!result) return;
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const blob = new Blob([result], { type: 'text/plain;charset=utf-8;' });
      const blobUrl = URL.createObjectURL(blob);
      try { await window.Capacitor.Plugins.Browser.open({ url: blobUrl }); } catch(e){}
    } else {
      const blob = new Blob([result], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `AI_Financial_Report_${new Date().toISOString().slice(0, 10)}.txt`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
     <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
         <div className="bg-[#0a0a0a]/90 border border-purple-500/20 p-8 rounded-[2.5rem] shadow-[0_0_80px_rgba(168,85,247,0.2)] max-w-lg w-full relative max-h-[85vh] flex flex-col overflow-hidden">
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-purple-600/20 blur-[80px] rounded-full pointer-events-none"></div>
            <button onClick={onClose} className="absolute top-8 right-8 text-slate-400 hover:text-white bg-white/5 p-2 rounded-full border border-white/10 transition-colors z-20"><X className="h-5 w-5" /></button>
            
            <div className="flex items-center space-x-4 mb-8 shrink-0 relative z-10">
               <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                 <Bot className="h-7 w-7 text-purple-400" />
               </div>
               <div>
                 <h3 className="text-2xl font-black text-white tracking-tight">{t("AI Insights", "AI विश्लेषण")}</h3>
                 <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">{t("Powered by Gemini", "जेमिनी AI द्वारा संचालित")}</p>
               </div>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 text-slate-300 text-sm md:text-base leading-relaxed space-y-4 custom-scrollbar relative z-10">
               {loading ? (
                   <div className="flex flex-col items-center justify-center py-16 space-y-6">
                       <div className="relative">
                         <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
                         <Sparkles className="h-12 w-12 text-purple-400 animate-pulse relative z-10" />
                       </div>
                       <p className="text-purple-300 animate-pulse font-bold tracking-widest uppercase text-sm">{t("Analyzing data...", "डेटा का विश्लेषण हो रहा है...")}</p>
                   </div>
               ) : error ? (
                   <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-2xl font-medium flex items-center"><AlertCircle className="h-5 w-5 mr-3 shrink-0"/> {error}</div>
               ) : (
                   <div className="whitespace-pre-wrap bg-white/[0.02] p-6 rounded-3xl border border-white/5 shadow-inner">{result}</div>
               )}
            </div>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 shrink-0 relative z-10">
               {!loading && !error && result && (
                  <button onClick={handleDownload} className="flex-1 flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.02]">
                     <Download className="h-4 w-4 mr-2" /> {t("Download Report", "रिपोर्ट डाउनलोड")}
                  </button>
               )}
               <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all duration-300">
                  {t("Dismiss", "बंद करें")}
               </button>
            </div>
         </div>
     </div>
  );
}

// 🌟 USER DETAIL MODAL 🌟
export function UserDetailModal({ userProfile, onClose, t, onVerify }) {
  if (!userProfile) return null;
  const userLoans = userProfile.loans || [];
  const activeLoans = userLoans.filter(l => l.status === 'active');
  const totalPrincipal = activeLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const totalRecovered = activeLoans.reduce((sum, l) => sum + Number(l.recoveredAmount || 0), 0);
  const totalInterest = activeLoans.reduce((sum, l) => sum + calculateAccruedInterest(l.amount, l.interestRate, l.createdAt), 0);
  const netAmount = totalPrincipal + totalInterest - totalRecovered;
  const avgRate = activeLoans.length > 0 ? (activeLoans.reduce((sum, l) => sum + Number(l.interestRate || 0), 0) / activeLoans.length).toFixed(1) : 0;
  const score = calculateTrustScore(userLoans);
  const rating = getScoreRating(score);
  
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500">
      <div className="relative w-full max-w-4xl rounded-[2.5rem] bg-[#0a0a0a] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>
        <button onClick={onClose} className="absolute top-6 right-6 p-2.5 bg-white/5 hover:bg-red-500/20 hover:border-red-500/50 border border-white/10 rounded-full text-slate-400 hover:text-red-400 z-20 transition-all duration-300"><X className="h-5 w-5" /></button>
        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-8 border-b border-white/5">
             <div className="flex items-center space-x-5">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-md"><User className="text-slate-300 h-10 w-10" /></div>
                <div className="space-y-1.5"><h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">{userProfile.full_name || 'N/A'}</h2><div className="flex items-center space-x-3"><span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-cyan-400 font-mono text-[10px] tracking-widest uppercase">ID: {userProfile.user_id.substring(0, 12)}...</span><span className={`px-2.5 py-1 rounded-lg border text-[10px] tracking-widest uppercase font-bold flex items-center ${userProfile.kyc_status === 'Verified' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>{userProfile.kyc_status === 'Verified' ? <><ShieldCheck className="h-3 w-3 mr-1" /> Verified</> : <><Clock className="h-3 w-3 mr-1" /> Pending</>}</span><span className={`px-2.5 py-1 rounded-lg border text-[10px] tracking-widest uppercase font-bold ${rating.border} ${rating.color} ${rating.bg}`}>{rating.label} {t("Risk", "रिस्क")}</span></div></div>
             </div>
             <div className="flex flex-col items-end bg-black/40 p-3 rounded-2xl border border-white/5"><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">{t("Trust Score", "ट्रस्ट स्कोर")}</p><div className="flex items-center space-x-1.5"><Star className={`h-6 w-6 ${rating.color}`} fill="currentColor" /><span className={`text-4xl font-black ${rating.color} tracking-tight`}>{score}</span></div></div>
          </div>
          <h3 className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-5 flex items-center"><Activity className="h-4 w-4 mr-2 text-blue-400" /> {t("Financial Summary (Active Loans)", "वित्तीय जानकारी (एक्टिव लोन)")}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-10">
             <div className="bg-white/[0.02] border border-white/5 p-5 md:p-6 rounded-3xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-500 group relative overflow-hidden"><div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign className="h-10 w-10 text-blue-400" /></div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 group-hover:text-blue-400 transition-colors">{t("Total Principal", "कुल मूलधन")}</p><p className="text-2xl md:text-3xl font-black text-white tracking-tight">₹{totalPrincipal.toLocaleString('en-IN')}</p></div>
             <div className="bg-white/[0.02] border border-white/5 p-5 md:p-6 rounded-3xl hover:border-purple-500/30 hover:bg-purple-500/5 transition-all duration-500 group relative overflow-hidden"><div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Percent className="h-10 w-10 text-purple-400" /></div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 group-hover:text-purple-400 transition-colors">{t("Avg. Rate (P.A.)", "औसत ब्याज दर")}</p><p className="text-2xl md:text-3xl font-black text-white tracking-tight">{avgRate}%</p></div>
             <div className="bg-white/[0.02] border border-white/5 p-5 md:p-6 rounded-3xl hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-500 group relative overflow-hidden"><div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp className="h-10 w-10 text-amber-400" /></div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 group-hover:text-amber-400 transition-colors">{t("Accrued Interest", "कुल लगा ब्याज")}</p><p className="text-2xl md:text-3xl font-black text-white tracking-tight">₹{totalInterest.toLocaleString('en-IN')}</p></div>
             <div className="bg-gradient-to-br from-cyan-950/40 to-blue-900/40 border border-cyan-500/30 p-5 md:p-6 rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden group"><div className="absolute right-0 bottom-0 w-32 h-32 bg-cyan-500/20 blur-[30px] rounded-full group-hover:bg-cyan-400/30 transition-all duration-500"></div><p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-2 relative z-10">{t("Total Net Liability", "कुल बाकी रकम")}</p><p className="text-3xl md:text-4xl font-black text-cyan-300 relative z-10 tracking-tight">₹{netAmount.toLocaleString('en-IN')}</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
             <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex items-start space-x-4"><div className="p-2 bg-white/5 rounded-xl shrink-0 border border-white/10"><User className="h-4 w-4 text-slate-400" /></div><div><p className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-widest">{t("Father's Name", "पिता का नाम")}</p><p className="text-white text-sm font-medium">{userProfile.father_name || t('Not Provided', 'जानकारी नहीं')}</p></div></div>
             <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex items-start space-x-4"><div className="p-2 bg-white/5 rounded-xl shrink-0 border border-white/10"><Phone className="h-4 w-4 text-slate-400" /></div><div><p className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-widest">{t("Mobile Number", "मोबाइल नंबर")}</p><p className="text-white text-sm font-medium font-mono tracking-wider">{userProfile.phone || 'N/A'}</p></div></div>
             <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex items-start space-x-4"><div className="p-2 bg-white/5 rounded-xl shrink-0 border border-white/10"><Key className="h-4 w-4 text-slate-400" /></div><div><p className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-widest">{t("ID Number", "आईडी नंबर")}</p><p className="text-white text-sm font-medium font-mono tracking-wider">{userProfile.aadhar_no || 'N/A'}</p></div></div>
             <div className="sm:col-span-3 bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex items-start space-x-4"><div className="p-2 bg-white/5 rounded-xl shrink-0 mt-1 border border-white/10"><MapPin className="h-4 w-4 text-slate-400" /></div><div><p className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-widest">{t("Full Residential Address", "पूरा घर का पता")}</p><p className="text-white text-sm leading-relaxed">{userProfile.address || t('No address found in records.', 'रिकॉर्ड में कोई पता नहीं मिला।')}</p></div></div>
          </div>
          
          {userProfile.kyc_status !== 'Verified' && onVerify && (
             <div className="flex justify-end pt-4 border-t border-white/5">
                <button onClick={() => onVerify(userProfile.user_id)} className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white rounded-2xl font-black tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 flex items-center">
                   <Check className="h-5 w-5 mr-2" /> {t("Approve User KYC", "यूज़र KYC पास करें")}
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// HELPER COMPONENT FOR KYC DOCUMENTS (Only used inside AdminProfilesView)
// ----------------------------------------------------------------------
export function DocViewer({ title, url, t }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col">
      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{title}</h4>
      <div className="flex-1 bg-black/60 rounded-xl border border-white/5 overflow-hidden min-h-[200px] flex items-center justify-center relative group">
        {url ? (
          <>
            <img src={url} alt={title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold backdrop-blur-sm">
              {t("Click to View Full", "पूरा देखने के लिए क्लिक करें")}
            </a>
          </>
        ) : (
          <div className="text-center text-slate-600 flex flex-col items-center">
            <FileText className="h-8 w-8 mb-2 opacity-50" />
            <span className="text-xs uppercase tracking-widest">{t("Not Uploaded", "अपलोड नहीं हुआ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN PROFILES VIEW (FIXED: Admin ki khud ki profile nahi dikhegi)
// ----------------------------------------------------------------------
export function AdminProfilesView({ profiles, loans, adminId, onSave, onDelete, onSendMessage, showAlert }) {
  const { t } = React.useContext(LanguageContext);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [userId, setUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [aadharNo, setAadharNo] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [kycStatus, setKycStatus] = useState('Pending');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [notifyModal, setNotifyModal] = useState({ isOpen: false, userId: null, userName: '' });
  const [notifyMessage, setNotifyMessage] = useState('');

  const [docsModal, setDocsModal] = useState({ isOpen: false, profile: null });
  const [viewModal, setViewModal] = useState({ isOpen: false, profile: null });

  const openNewForm = () => { setEditId(null); setUserId(''); setFullName(''); setFatherName(''); setAadharNo(''); setPhone(''); setAddress(''); setKycStatus('Pending'); setShowForm(true); };
  const openEditForm = (profile) => { setEditId(profile.id); setUserId(profile.user_id); setFullName(profile.full_name); setFatherName(profile.father_name || ''); setAadharNo(profile.aadhar_no || ''); setPhone(profile.phone); setAddress(profile.address); setKycStatus(profile.kyc_status); setShowForm(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userId || !fullName) { showAlert(t("Warning", "चेतावनी"), t("User ID and Name are required!", "यूजर आईडी और नाम जरूरी है!")); return; }
    if (!isValidUUID(userId.trim())) { showAlert(t("Warning", "चेतावनी"), t("Incorrect User ID format!", "यूजर आईडी फॉर्मेट गलत है!")); return; }
    const data = { admin_id: adminId, user_id: userId.trim(), full_name: fullName, father_name: fatherName, aadhar_no: aadharNo, phone: phone, address: address, kyc_status: kycStatus };
    if (editId) data.id = editId; else data.createdAt = Date.now();
    onSave(data, !!editId);
    setShowForm(false);
  };

  // 🔥 NAYA LOGIC: Admin ki khud ki profile ko list se hatao 🔥
  const userOnlyProfiles = profiles.filter(p => p.user_id !== adminId);

  const enrichedProfiles = userOnlyProfiles.map(p => {
    const hasActiveLoan = loans.some(l => l.user_id === p.user_id && l.status === 'active');
    return { ...p, isActiveBorrower: hasActiveLoan };
  });

  const filteredProfiles = enrichedProfiles.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = ( (p.full_name && p.full_name.toLowerCase().includes(searchLower)) || (p.phone && p.phone.includes(searchTerm)) || (p.aadhar_no && p.aadhar_no.includes(searchTerm)) || (p.user_id && p.user_id.toLowerCase().includes(searchLower)) );
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && p.isActiveBorrower) || (statusFilter === 'inactive' && !p.isActiveBorrower);
    return matchesSearch && matchesStatus;
  });

  const handleVerifyUser = async (userProfileId) => {
    try {
      const sessionData = localStorage.getItem('leaderpro_session');
      const token = sessionData ? JSON.parse(sessionData).access_token : '';
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userProfileId}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ kyc_status: 'Verified' })
      });
      if (!res.ok) throw new Error("Verification failed");
      showAlert(t("Success", "सफलता"), t("User KYC Verified successfully!", "यूज़र की KYC वेरीफाई हो गई!"));
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { showAlert(t("Error", "त्रुटि"), t("Verification failed.", "वेरिफिकेशन फेल हो गया।")); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">User <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Profiles</span></h1>
          <p className="text-slate-400 mt-2 text-lg">{t("Manage user data and KYC.", "अपने यूजर्स का डेटा और KYC मैनेज करें।")}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-56 md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="text" placeholder={t("Search...", "नाम, फोन से खोजें...")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all" /></div>
          <div className="w-full sm:w-40"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none appearance-none cursor-pointer"><option value="all" className="bg-slate-900">{t("All Users", "सभी यूजर्स")}</option><option value="active" className="bg-slate-900">{t("Active Borrowers", "एक्टिव कर्जदार")}</option><option value="inactive" className="bg-slate-900">{t("Inactive Users", "इनएक्टिव यूजर्स")}</option></select></div>
          <button onClick={showForm ? () => setShowForm(false) : openNewForm} className="flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/30 whitespace-nowrap">{showForm ? <X className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}<span>{showForm ? t('Close', 'बंद करें') : t('New User', 'नया यूजर')}</span></button>
        </div>
      </header>

      {showForm && (
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-8 shadow-[0_0_30px_rgba(34,211,238,0.1)] mb-8 animate-in slide-in-from-top-4">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2"><User className="text-cyan-400 h-6 w-6" /><span>{editId ? t('Edit Profile', 'प्रोफाइल एडिट करें') : t('Enter New User Data', 'नया यूजर डेटा भरें')}</span></h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2"><label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">User ID (Auth ID)</label><input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="550e8400-e29b-41d4-a716..." className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none font-mono text-sm" required /></div>
            <div className="space-y-2"><label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Full Name", "पूरा नाम")}</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none" required /></div>
            <div className="space-y-2"><label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Father's Name", "पिता का नाम")}</label><input type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none" /></div>
            <div className="space-y-2"><label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Aadhar Number", "आधार नंबर")}</label><input type="text" value={aadharNo} onChange={(e) => setAadharNo(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none tracking-widest" /></div>
            <div className="space-y-2"><label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Phone Number", "फोन नंबर")}</label><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none" /></div>
            <div className="space-y-2 md:col-span-2"><label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Address", "पता")}</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none" /></div>
            <div className="space-y-2"><label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">KYC Status</label><select value={kycStatus} onChange={(e) => setKycStatus(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none appearance-none"><option value="Pending" className="bg-slate-900">Pending</option><option value="Verified" className="bg-slate-900">Verified</option><option value="Rejected" className="bg-slate-900">Rejected</option></select></div>
            <div className="md:col-span-2 flex justify-end mt-4"><button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-black px-8 py-3 rounded-xl font-bold transition-colors">{editId ? t('Save Changes', 'बदलाव सेव करें') : t('Create Profile', 'प्रोफाइल बनाएं')}</button></div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 overflow-y-auto custom-scrollbar max-h-[600px] pr-2">
        {userOnlyProfiles.length === 0 && !showForm && <p className="text-slate-500 text-center py-10 bg-white/5 rounded-3xl border border-white/5">{t("No user profiles created yet.", "अभी तक कोई यूजर प्रोफाइल नहीं बनी है।")}</p>}
        {userOnlyProfiles.length > 0 && filteredProfiles.length === 0 && <div className="text-center py-10 bg-white/5 rounded-3xl border border-white/5"><Search className="h-10 w-10 mx-auto text-slate-600 mb-3" /><p className="text-slate-400">{t("No users found for this search.", "इस खोज से कोई यूजर नहीं मिला।")}</p></div>}

        {filteredProfiles.map(p => {
          return (
            <div key={p.id} className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex flex-col md:flex-row justify-between gap-6 hover:bg-white/10 transition-colors shrink-0">
              <div className="flex-1 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-500/20 p-3 rounded-full"><User className="text-indigo-400 h-6 w-6" /></div>
                  <div>
                  <h3 onClick={() => setViewModal({ isOpen: true, profile: { ...p, loans: loans.filter(l => l.user_id === p.user_id) } })} className="text-xl font-bold text-white cursor-pointer hover:text-cyan-400 transition-colors flex items-center" title={t("Click to view profile", "प्रोफाइल देखने के लिए क्लिक करें")}>
                      {p.full_name || t('Unnamed', 'नाम नहीं दिया')}
                      {p.isActiveBorrower ? <span className="ml-3 text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center uppercase tracking-widest"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span> {t("Active", "एक्टिव")}</span> : <span className="ml-3 text-[9px] bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded-full flex items-center uppercase tracking-widest"><span className="w-1.5 h-1.5 bg-slate-500 rounded-full mr-1"></span> {t("Inactive", "इनएक्टिव")}</span>}
                    </h3>
                    <div className="mt-1"><span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${p.kyc_status === 'Verified' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>KYC: {p.kyc_status === 'Verified' ? t('Verified', 'वेरीफाइड') : t('Pending', 'पेंडिंग')}</span></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-300">
                  <div className="flex items-center space-x-2"><Phone className="h-4 w-4 text-cyan-500" /> <span>{p.phone || 'N/A'}</span></div>
                  <div className="flex items-center space-x-2"><Hash className="h-4 w-4 text-cyan-500" /> <span>{t("Aadhar", "आधार")}: {p.aadhar_no || 'N/A'}</span></div>
                  <div className="col-span-1 sm:col-span-2 text-xs font-mono text-slate-500 mt-2">User ID: {p.user_id}</div>
                </div>
              </div>
              <div className="flex flex-wrap md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 shrink-0 min-w-[140px]">
                <button onClick={() => setDocsModal({ isOpen: true, profile: p })} className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg transition-colors flex-1 md:flex-none"><FileText className="h-4 w-4" /> <span>{t("KYC Docs", "KYC डाक्स")}</span></button>
                <button onClick={() => openEditForm(p)} className="flex items-center justify-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-cyan-400 rounded-lg transition-colors flex-1 md:flex-none"><Edit className="h-4 w-4" /> <span>{t("Edit", "एडिट")}</span></button>
                <button onClick={() => setNotifyModal({ isOpen: true, userId: p.user_id, userName: p.full_name })} className="flex items-center justify-center space-x-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors flex-1 md:flex-none"><Bell className="h-4 w-4" /> <span>{t("Notify", "नोटिफाई")}</span></button>
                <button onClick={() => onDelete(p)} className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors flex-1 md:flex-none"><Trash className="h-4 w-4" /> <span>{t("Delete", "डिलीट")}</span></button>
              </div>
            </div>
          )
        })}
      </div>

      {viewModal.isOpen && viewModal.profile && (
        <UserDetailModal userProfile={viewModal.profile} onClose={() => setViewModal({ isOpen: false, profile: null })} t={t} onVerify={handleVerifyUser} />
      )}

      {docsModal.isOpen && docsModal.profile && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111318] border border-purple-500/30 p-6 md:p-8 rounded-3xl shadow-[0_0_40px_rgba(168,85,247,0.15)] max-w-4xl w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setDocsModal({ isOpen: false, profile: null })} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-black/50 p-2 rounded-full"><X className="h-6 w-6" /></button>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30"><Shield className="h-6 w-6 text-purple-400" /></div>
              <div><h3 className="text-2xl font-bold text-white tracking-tight">{docsModal.profile.full_name} - {t("KYC Documents", "KYC डाक्यूमेंट्स")}</h3><p className="text-slate-400 text-sm">{t("Aadhar Number", "आधार नंबर")}: <span className="text-white font-mono">{docsModal.profile.aadhar_no || 'N/A'}</span></p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DocViewer title="Aadhar Front" url={docsModal.profile.aadhar_front_url} t={t} />
              <DocViewer title="Aadhar Back" url={docsModal.profile.aadhar_back_url} t={t} />
              <DocViewer title="PAN Card" url={docsModal.profile.pan_url} t={t} />
              <DocViewer title="Selfie" url={docsModal.profile.selfie_url} t={t} />
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-4">
              <button onClick={() => { onSave({ ...docsModal.profile, kyc_status: 'Rejected' }, true); setDocsModal({ isOpen: false, profile: null }); }} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 px-6 py-3 rounded-xl font-bold transition-all">{t("Reject KYC", "KYC रद्द करें")}</button>
              <button onClick={() => { handleVerifyUser(docsModal.profile.user_id); setDocsModal({ isOpen: false, profile: null }); }} className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center"><Check className="h-5 w-5 mr-2" /> {t("Approve KYC", "KYC पास करें")}</button>
            </div>
          </div>
        </div>
      )}

      {notifyModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111318] border border-amber-500/30 p-6 md:p-8 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.15)] max-w-md w-full relative">
            <button onClick={() => setNotifyModal({ isOpen: false, userId: null, userName: '' })} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center"><Bell className="h-6 w-6 mr-3 text-amber-400" /> {t("Notify", "नोटिफाई")} {notifyModal.userName}</h3>
            <textarea value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:ring-1 focus:ring-amber-500 outline-none resize-none h-32 mb-6" placeholder={t("Type your message...", "मैसेज लिखें...")}></textarea>
            <div className="flex gap-3">
              <button onClick={() => setNotifyModal({ isOpen: false, userId: null, userName: '' })} className="flex-1 bg-white/5 text-slate-300 hover:text-white py-3.5 rounded-2xl font-bold transition-all border border-white/10">{t("Cancel", "रद्द करें")}</button>
              <button onClick={() => { if (!notifyMessage.trim()) return; onSendMessage(notifyModal.userId, notifyMessage); setNotifyModal({ isOpen: false, userId: null, userName: '' }); setNotifyMessage(''); }} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black py-3.5 rounded-2xl font-bold shadow-[0_0_20px_rgba(245,158,11,0.3)]">{t("Send", "भेजें")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN INQUIRIES VIEW
// ----------------------------------------------------------------------
export function AdminInquiriesView({ inquiries, onUpdateStatus, onDelete, t }) {
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
// ADMIN LIVE CHAT VIEW
// ----------------------------------------------------------------------
export function AdminLiveChatView({ profiles, chats, onSend, adminId, onClose, t }) {
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
// ==========================================
// 👑 ADMIN DETAIL MODAL (SUPER ADMIN VIEW)
// ==========================================
function AdminDetailModal({ profile, onClose, onStatusChange, t }) {
   return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
       <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] shadow-2xl max-w-2xl w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-slate-400 hover:text-white"><X className="h-5 w-5"/></button>
          
          <div className="flex items-center space-x-6 mb-8 border-b border-white/5 pb-6">
             <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20"><User className="h-10 w-10 text-cyan-400" /></div>
             <div>
                <h2 className="text-3xl font-black text-white">{profile.full_name}</h2>
                <p className="text-slate-500 font-mono text-sm uppercase tracking-widest mt-1">Role: Branch Manager (Admin)</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
             <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Phone Number</p>
                <p className="text-white">{profile.phone}</p>
             </div>
             <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Aadhar Number</p>
                <p className="text-white font-mono">{profile.aadhar_no}</p>
             </div>
             <div className="bg-white/5 p-4 rounded-2xl md:col-span-2">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Office Address</p>
                <p className="text-white leading-relaxed">{profile.address} (PIN: {profile.pincode})</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <DocViewer title="Aadhar Front" url={profile.aadhar_front_url} t={t} />
             <DocViewer title="Aadhar Back" url={profile.aadhar_back_url} t={t} />
             <DocViewer title="PAN Card" url={profile.pan_url} t={t} />
             <DocViewer title="Selfie" url={profile.selfie_url} t={t} />
          </div>

          <div className="mt-10 flex gap-4">
             {profile.kyc_status !== 'Verified' && <button onClick={() => { onStatusChange(profile.user_id, 'Verified'); onClose(); }} className="flex-1 bg-emerald-500 text-black font-black py-4 rounded-2xl uppercase tracking-widest">Approve Admin</button>}
             {profile.kyc_status === 'Verified' && <button onClick={() => { onStatusChange(profile.user_id, 'Suspended'); onClose(); }} className="flex-1 bg-red-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest">Block Admin</button>}
             <button onClick={onClose} className="px-8 bg-white/5 text-slate-300 py-4 rounded-2xl font-bold border border-white/10">Close</button>
          </div>
       </div>
    </div>
   );
}

// ==========================================
// 👑 ADMIN EDIT MODAL (SUPER ADMIN EDIT)
// ==========================================
function AdminEditModal({ profile, onClose, session, showAlert, t }) {
  const [name, setName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone);
  const [address, setAddress] = useState(profile.address);
  const [pincode, setPincode] = useState(profile.pincode);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${profile.user_id}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, phone, address, pincode })
      });
      if (!res.ok) throw new Error("Update failed");
      showAlert("Success", "Admin profile updated successfully!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) { showAlert("Error", "Update failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="bg-[#111318] border border-white/10 p-8 rounded-[2.5rem] max-w-md w-full relative shadow-2xl">
         <h3 className="text-2xl font-black text-white mb-6">Edit Admin Details</h3>
         <form onSubmit={handleUpdate} className="space-y-5">
            <div className="space-y-2">
               <label className="text-[10px] text-slate-500 font-bold uppercase">Full Name</label>
               <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] text-slate-500 font-bold uppercase">Phone Number</label>
               <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] text-slate-500 font-bold uppercase">Pincode</label>
               <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] text-slate-500 font-bold uppercase">Office Address</label>
               <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none h-24 resize-none" />
            </div>
            <div className="flex gap-3 pt-4">
               <button type="submit" disabled={loading} className="flex-1 bg-cyan-600 text-white font-bold py-3 rounded-xl hover:bg-cyan-500 transition-all">{loading ? 'Saving...' : 'Update Admin'}</button>
               <button type="button" onClick={onClose} className="flex-1 bg-white/5 text-slate-400 font-bold py-3 rounded-xl border border-white/10">Cancel</button>
            </div>
         </form>
      </div>
    </div>
  );
}