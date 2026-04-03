import React, { useState, useContext } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { 
  Search, Sparkles, File, FileText, Plus, DollarSign, Key, Copy, Users, Activity, 
  CreditCard, Check, BarChart,UserPlus, Clock, User, MessageSquare, Edit, Trash, 
  Upload, Download, Bot, X, PieChart ,Star
} from 'lucide-react';
import { LanguageContext } from '../App';
import { calculateAccruedInterest, callGeminiAI ,calculateTrustScore, getScoreRating} from '../utils';

export default function AdminDashboardView({ loans, profiles, onDelete, onUpdate, onCreate, adminId, showAlert }) {
  const { t, lang } = useContext(LanguageContext);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [newRate, setNewRate] = useState(12.5);
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

const exportToCSV = async () => {
    const headers = [
      'Loan ID', 'Date', 'User Name', 'User ID', 'Principal Amount', 
      'Interest Rate (%)', 'Tenure (Months)', 'Recovered Amount', 
      'Net Liability', 'Status'
    ];
    
    const rows = filteredLoans.map(l => [
      l.id, new Date(Number(l.createdAt)).toLocaleDateString(), `"${l.userName}"`, l.user_id, 
      l.amount, l.interestRate, l.tenure, l.recoveredAmount || 0,
      (Number(l.amount) + calculateAccruedInterest(l.amount, l.interestRate, l.createdAt) - Number(l.recoveredAmount || 0)), 
      l.status === 'active' ? 'Active' : l.status.charAt(0).toUpperCase() + l.status.slice(1)
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    if (Capacitor.isNativePlatform()) {
      // 📱 MOBILE APP DOWNLOAD LOGIC (USING SHARE)
      try {
        const fileName = `LeaderPro_Loans_${Date.now()}.csv`;
        
        // Save to temporary Cache directory first
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: csvContent,
          directory: Directory.Cache, 
          encoding: Encoding.UTF8
        });

        // Open the native mobile Share/Save menu
        await Share.share({
          title: 'Export Loan Data',
          text: 'Here is the exported Excel/CSV file from LeaderPro.',
          url: writeResult.uri,
          dialogTitle: 'Save or Share Excel File',
        });

      } catch (error) {
        console.error("Mobile Export Error:", error);
        showAlert(t("Error", "त्रुटि"), t("Export failed. Please try again.", "एक्सपोर्ट विफल रहा। कृपया पुनः प्रयास करें।"));
      }
    } else {
      // 💻 WEB BROWSER DOWNLOAD LOGIC
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `LeaderPro_Loans_${new Date().toLocaleDateString().replace(/\//g,'-')}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleAIAnalysis = async () => {
    setAiModal({ isOpen: true, loading: true, result: '', error: '' });
    const recoveryRate = totalDisbursed > 0 ? ((totalRecovery / totalDisbursed) * 100).toFixed(1) : 0;
    const interestRatio = totalDisbursed > 0 ? ((totalAccruedInterest / totalDisbursed) * 100).toFixed(1) : 0;
    const sysInst = `Role: Chief Risk Officer (CRO) for a micro-lending firm.
Task: Analyze portfolio data and provide blunt, highly actionable risk mitigation strategies.
Language: ${lang === 'en' ? 'Professional English' : 'Professional Hinglish (Hindi written in English alphabet)'}.
Rules: Strictly adhere to the requested format. NO markdown symbols like asterisks (*) or hashes (#). Use emojis. Be strictly data-driven and strategic.`;

    const promptText = `
[PORTFOLIO DATA]
- Disbursed Principal: ₹${totalDisbursed}
- Total Recovered: ₹${totalRecovery} (Recovery Rate: ${recoveryRate}%)
- Net Live Liability: ₹${netLiability}
- Accrued Interest: ₹${totalAccruedInterest} (Interest is ${interestRatio}% of principal)
- Active Borrowers: ${activeLoans.length}

[OUTPUT FORMAT REQUIRED]
📊 Executive Summary: [1 sentence analyzing the recovery rate vs liability]
🔴 Primary Risk: [Identify the biggest financial threat based on the exact numbers provided]
🎯 Strategic Action 1: [1 specific tactic to increase recovery from current borrowers]
📈 Strategic Action 2: [1 specific tactic for future loan approvals or interest structuring]
    `;

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
    const topup = Number(topupAmount || 0);
    const repay = Number(repayAmount || 0);

    if (topup === 0 && repay === 0) {
       showAlert(t("Warning", "चेतावनी"), t("You have not entered any amount.", "आपने कोई रकम दर्ज नहीं की है।"));
       return;
    }

    const currentAmount = Number(loan.amount || 0);
    const currentRecovered = Number(loan.recoveredAmount || 0);
    const newTotalAmount = currentAmount + topup;
    const newTotalRecovered = currentRecovered + repay;

    const newTransaction = { id: Date.now() + Math.random(), date: Date.now(), topup: topup, repay: repay };
    const existingTransactions = Array.isArray(loan.transactions) ? loan.transactions : [];
    const updatedTransactions = [...existingTransactions, newTransaction];

    onUpdate(loan.id, { amount: newTotalAmount, recoveredAmount: newTotalRecovered, transactions: updatedTransactions }, false); 
    
    showAlert(t("Success", "सफलता"), t(`Transaction Record Saved!\n\nNew Total Disbursed: ₹${newTotalAmount}\nNew Total Recovery: ₹${newTotalRecovered}`, `लेनदेन रिकॉर्ड सेव हो गया!\n\nनया कुल वितरण: ₹${newTotalAmount}\nनई कुल वसूली: ₹${newTotalRecovered}`));
    setManageFundsLoanId(null);
  };

  const handleCreateLoanSubmit = (e) => {
    e.preventDefault();
    if (!newUserId) { showAlert(t("Warning", "चेतावनी"), t("User ID is required!", "यूजर आईडी दर्ज करना अनिवार्य है!")); return; }
    if (!newUserId.trim().match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) { showAlert(t("Warning", "चेतावनी"), t("User ID is in incorrect format.", "यूजर आईडी का फॉर्मेट गलत है।")); return; }
    onCreate({ user_id: newUserId.trim(), admin_id: adminId, amount: Number(newAmount), recoveredAmount: 0, transactions: [], interestRate: Number(newRate), tenure: Number(newTenure), emi: 0, status: 'active', type: 'Personal Loan', createdAt: new Date(newDate).getTime(), adminNote: t('Issued directly by Admin.', 'एडमिन द्वारा सीधे जारी किया गया।') });
    setShowNewLoanForm(false); setNewUserId(''); 
  };

  const generateAuditTrail = () => {
    let activities = [];

    if (Array.isArray(profiles)) {
      profiles.forEach(p => {
        if (p.createdAt) {
          activities.push({
            id: `prof_${p.id}`,
            title: t('New User Joined', 'नया यूजर जुड़ा'),
            desc: t(`${p.full_name || 'New User'} created an account.`, `${p.full_name || 'नए यूजर'} ने अकाउंट बनाया।`),
            time: Number(p.createdAt),
            icon: <UserPlus className="h-4 w-4 text-blue-400" />,
            bg: 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
          });
        }
      });
    }

    if (Array.isArray(loans)) {
      loans.forEach(loan => {
        const userName = profiles?.find(p => p.user_id === loan.user_id)?.full_name || t('Unknown User', 'अज्ञात यूजर');

        if (loan.createdAt) {
          activities.push({
            id: `loan_${loan.id}`,
            title: t('New Loan Approved', 'नया लोन पास हुआ'),
            desc: t(`Loan of ₹${Number(loan.amount).toLocaleString('en-IN')} was given to ${userName}.`, `₹${Number(loan.amount).toLocaleString('en-IN')} का लोन ${userName} को दिया गया।`),
            time: Number(loan.createdAt),
            icon: <FileText className="h-4 w-4 text-cyan-400" />,
            bg: 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
          });
        }

        if (Array.isArray(loan.transactions)) {
          loan.transactions.forEach((tx, idx) => {
            if (Number(tx.topup) > 0) {
              activities.push({
                id: `topup_${loan.id}_${idx}`,
                title: t('Top-up Given', 'टॉप-अप दिया गया'),
                desc: t(`₹${Number(tx.topup).toLocaleString('en-IN')} more given to ${userName}.`, `₹${Number(tx.topup).toLocaleString('en-IN')} और दिए गए ${userName} को।`),
                time: Number(tx.date),
                icon: <Upload className="h-4 w-4 text-purple-400" />,
                bg: 'bg-purple-500/10 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
              });
            }
            if (Number(tx.repay) > 0) {
              activities.push({
                id: `repay_${loan.id}_${idx}`,
                title: t('Installment Received (Repay)', 'किस्त वापस आई (रिपे)'),
                desc: t(`₹${Number(tx.repay).toLocaleString('en-IN')} received from ${userName}.`, `₹${Number(tx.repay).toLocaleString('en-IN')} प्राप्त हुए ${userName} से।`),
                time: Number(tx.date),
                icon: <Download className="h-4 w-4 text-emerald-400" />,
                bg: 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
              });
            }
          });
        }
      });
    }

    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return activities
      .filter(act => act.time >= oneWeekAgo)
      .sort((a, b) => b.time - a.time)
      .slice(0, 15);
  };

  const recentActivities = generateAuditTrail();

  const timeAgo = (timestamp) => {
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      let interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + t(" days ago", " दिन पहले");
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + t(" hours ago", " घंटे पहले");
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + t(" min ago", " मिनट पहले");
      return t("Just now", "अभी-अभी");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">{t("Panel (Loans)", "पैनल (लोन)")}</span></h1>
          <p className="text-slate-400 mt-2 text-lg">{t("Manage all applications and issue new loans.", "सभी एप्लिकेशन मैनेज करें और नए लोन जारी करें।")}</p>
        </div>
        <button onClick={() => setShowNewLoanForm(!showNewLoanForm)} className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-green-500/30">
          {showNewLoanForm ? <X className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
          <span>{showNewLoanForm ? t('Close', 'बंद करें') : t('Create New Loan (Direct)', 'नया लोन बनाएं (डायरेक्ट)')}</span>
        </button>
      </header>

      {showNewLoanForm && (
        <div className="bg-[#111318] border border-green-500/30 p-8 rounded-3xl shadow-2xl mb-8 animate-in slide-in-from-top-4 shrink-0">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <Plus className="text-green-400 h-6 w-6" /> 
            <span>{t("Create New Loan for User", "यूजर के लिए नया लोन बनाएं")}</span>
          </h2>
          <form onSubmit={handleCreateLoanSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("For whom? (Enter User ID)", "किसके लिए? (यूजर आईडी डालें)")}</label>
                <input type="text" value={newUserId} onChange={(e)=>setNewUserId(e.target.value)} placeholder={t("Example: 550e8400-e29b-41d4-a716...", "जैसे: 550e8400-e29b-41d4-a716...")} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Date & Time", "तारीख और समय")}</label>
                <input type="datetime-local" value={newDate} onChange={(e)=>setNewDate(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none" required />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Principal Amount (₹)", "मूल राशि (₹)")}</label>
                <input type="number" min="5000" step="1000" value={newAmount} onChange={(e)=>setNewAmount(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Interest Rate (%)", "ब्याज दर (%)")}</label>
                <input type="number" step="0.1" value={newRate} onChange={(e)=>setNewRate(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Tenure (Months)", "समय (महीने)")}</label>
                <input type="number" min="1" value={newTenure} onChange={(e)=>setNewTenure(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-green-500 outline-none" required />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button type="submit" className="bg-green-500 hover:bg-green-400 text-black px-8 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-green-500/20">
                {t("Activate Loan", "लोन एक्टिव करें")}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-900/40 to-cyan-900/40 border border-indigo-500/30 p-6 rounded-3xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group shrink-0">
         <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
         <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-2">
               <Key className="h-5 w-5 text-cyan-400" />
               <h3 className="text-white font-bold text-lg">{t("Your Unique Admin Code", "आपका यूनिक एडमिन कोड")}</h3>
            </div>
            <p className="text-sm text-indigo-200/70 mb-3">{t("New users must provide this code while creating an account.", "नए यूजर्स को अकाउंट बनाते समय यह कोड देना जरूरी है।")}</p>
            <div className="bg-black/50 border border-white/10 px-4 py-3 rounded-xl font-mono text-cyan-300 text-sm md:text-base break-all">
               {adminId}
            </div>
         </div>
         <button onClick={handleCopyCode} className="relative z-10 shrink-0 flex items-center justify-center space-x-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/50">
            <Copy className="h-5 w-5" /> <span>{t("Copy Code", "कोड कॉपी करें")}</span>
         </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 shrink-0">
        <StatCard title={t("TOTAL USERS", "कुल यूजर")} value={profiles.length} icon={<Users className="h-6 w-6 text-[#3b82f6]" />} iconBg="bg-[#3b82f6]/10" badgeText={t("AGENCY SHIELD", "एजेंसी शील्ड")} />
        <StatCard title={t("DISBURSED PRINCIPAL", "वितरित मूलधन")} value={`₹${totalDisbursed.toLocaleString('en-IN')}`} icon={<Activity className="h-6 w-6 text-[#f59e0b]" />} iconBg="bg-[#f59e0b]/10" badgeText={t("AGENCY SHIELD", "एजेंसी शील्ड")} />
        <StatCard title={t("NET LIVE LIABILITY", "नेट लाइव बकाया")} value={`₹${netLiability.toLocaleString('en-IN')}`} icon={<CreditCard className="h-6 w-6 text-[#f59e0b]" />} iconBg="bg-[#f59e0b]/10" badgeText={t("AGENCY SHIELD", "एजेंसी शील्ड")} />
        <StatCard title={t("TOTAL RECOVERY", "कुल वसूली")} value={`₹${totalRecovery.toLocaleString('en-IN')}`} icon={<Check className="h-6 w-6 text-[#10b981]" />} iconBg="bg-[#10b981]/10" badgeText={t("AGENCY SHIELD", "एजेंसी शील्ड")} />
      </div>

      <AdminVisualAnalytics loans={loans} t={t} />

      <div className="bg-[#111318] rounded-3xl border border-white/[0.04] p-6 shadow-xl mb-8 flex flex-col shrink-0 animate-in fade-in duration-700">
         <div className="flex items-center space-x-3 mb-6 shrink-0 border-b border-white/10 pb-4">
            <div className="p-2 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl border border-orange-500/30">
               <Activity className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t("Live Activity Feed", "लाइव गतिविधि फ़ीड")}</h2>
              <p className="text-xs text-slate-400">{t("All recent activities (Audit Trail)", "पिछली सारी गतिविधियां (ऑडिट ट्रेल)")}</p>
            </div>
         </div>

         <div className="overflow-x-auto custom-scrollbar pb-4">
            <div className="flex space-x-4">
               {recentActivities.map(act => (
                  <div key={act.id} className={`shrink-0 w-72 p-5 rounded-2xl border ${act.bg} bg-black/40 backdrop-blur-sm transition-transform hover:-translate-y-1`}>
                     <div className="flex justify-between items-start mb-3">
                        <div className="p-2 rounded-lg bg-black/40 border border-white/5">{act.icon}</div>
                        <span className="text-[10px] text-slate-400 font-mono bg-white/5 px-2 py-1 rounded-full border border-white/5">{act.time}</span>
                     </div>
                     <h4 className="text-sm font-bold text-white mb-1">{act.title}</h4>
                     <p className="text-xs text-slate-300 leading-relaxed">{act.desc}</p>
                  </div>
               ))}
               {recentActivities.length === 0 && (
                  <p className="text-slate-500 text-sm py-4 italic px-2">{t("No new updates in the system yet.", "अभी तक सिस्टम में कोई नया अपडेट नहीं हुआ है।")}</p>
               )}
            </div>
         </div>
      </div>

      <div className="bg-[#111318] rounded-3xl border border-white/[0.04] p-6 shadow-xl overflow-hidden flex flex-col shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
          <h2 className="text-xl font-bold text-white">{t("User Applications", "यूजर एप्लिकेशन")}</h2>
          <div className="flex flex-col sm:flex-row gap-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={t("Search Name, User ID or Loan ID...", "नाम, यूजर आईडी या लोन आईडी खोजें...")} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-9 pr-4 py-2.5 bg-black/40 border border-white/[0.04] rounded-xl text-white text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                />
             </div>
             
             <button onClick={handleAIAnalysis} className="flex items-center justify-center space-x-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 px-4 py-2.5 rounded-xl transition-all text-sm font-bold">
                <Sparkles className="h-4 w-4" /> <span>{t("AI Insights", "AI विश्लेषण")}</span>
             </button>

             <button onClick={exportToCSV} className="flex items-center justify-center space-x-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2.5 rounded-xl transition-all text-sm font-bold">
                <File className="h-4 w-4" /> <span>{t("Excel Download", "एक्सेल डाउनलोड")}</span>
             </button>
          </div>
        </div>
        
        {filteredLoans.length === 0 ? (
          <p className="text-slate-500 text-center py-10">{t("No applications found.", "कोई एप्लिकेशन नहीं मिली।")}</p>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-20 bg-[#111318] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)]">
                <tr className="border-b border-white/[0.04]">
                  <th className="py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest pl-4 bg-[#111318]">{t("ID / Date", "आईडी / तारीख")}</th>
                  <th className="py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest bg-[#111318]">{t("User Info (Name & ID)", "यूजर इन्फो (नाम और आईडी)")}</th>
                  <th className="py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest bg-[#111318]">{t("Amount / Recovery", "राशि / वसूली")}</th>
                  <th className="py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest bg-[#111318]">{t("Status", "स्थिति")}</th>
                  <th className="py-4 text-xs font-semibold text-slate-400 uppercase tracking-widest text-right pr-4 bg-[#111318]">{t("Action", "एक्शन")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredLoans.map(loan => (
                  <React.Fragment key={loan.id}>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pl-4">
                        <div className="font-mono text-xs text-slate-500">{loan.id.substring(0,8)}...</div>
                        <div className="text-sm text-slate-300">{new Date(Number(loan.createdAt)).toLocaleDateString()}</div>
                      </td>
                      <td className="py-4">
                        <div 
                          className="font-bold text-white mb-1 cursor-pointer hover:text-cyan-400 transition-colors flex items-center group"
                          onClick={() => {
                            const profile = profiles.find(p => p.user_id === loan.user_id);
                            setSelectedUserProfile({ ...profile, loans: loans.filter(l => l.user_id === loan.user_id) });
                          }}
                        >
                          {loan.userName}
                          <Star className="h-3 w-3 ml-2 text-yellow-500 opacity-50 group-hover:opacity-100" fill="currentColor" />
                        </div>
                        <div className="font-mono text-[10px] text-cyan-400 bg-black/20 px-1.5 py-0.5 rounded inline-block">
                          {loan.user_id.substring(0,18)}...
                        </div>
                      </td>
                      <td className="py-4">
                         <div className="font-bold text-white">{t("Disb:", "वितरित:")} ₹{Number(loan.amount).toLocaleString('en-IN')}</div>
                         <div className="text-xs text-emerald-400 font-semibold">{t("Recv:", "प्राप्त:")} ₹{Number(loan.recoveredAmount || 0).toLocaleString('en-IN')}</div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                          loan.status === 'active' ? 'bg-green-500/10 text-green-400' : 
                          loan.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 
                          'bg-orange-500/10 text-orange-400'
                        }`}>
                          {loan.status === 'active' ? t('Pass', 'पास') : loan.status === 'rejected' ? t('Rejected', 'रद्द') : t('Pending', 'पेंडिंग')}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-4 space-x-2">
                        {loan.status === 'active' && (
                           <>
                             <button onClick={() => setHistoryLoan(loan)} className="p-2 bg-blue-500/10 hover:bg-blue-500/30 border border-blue-500/20 text-blue-400 rounded-lg transition-colors" title={t("View Ledger History", "लेज़र हिस्ट्री देखें")}>
                               <Clock className="h-4 w-4" />
                             </button>
                             <button onClick={() => handleFundsClick(loan)} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/30 border border-emerald-500/20 text-emerald-400 rounded-lg transition-colors" title={t("Add Funds (Top-up / Repayment)", "फंड जोड़ें (टॉप-अप / रीपेमेंट)")}>
                               <CreditCard className="h-4 w-4" />
                             </button>
                           </>
                        )}
                        <button onClick={() => handleReviewClick(loan)} className="p-2 bg-indigo-500/10 hover:bg-indigo-500/30 border border-indigo-500/20 text-indigo-400 rounded-lg transition-colors" title={t("Edit Loan Terms & Review", "लोन की शर्तें बदलें और रिव्यू करें")}>
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => onDelete(loan.id)} className="p-2 bg-red-500/10 hover:bg-red-500/30 border border-red-500/20 text-red-400 rounded-lg transition-colors" title={t("Delete", "हटाएं")}>
                          <Trash className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    
                    {manageFundsLoanId === loan.id && (
                      <tr className="bg-emerald-950/20 border-l-2 border-emerald-500">
                        <td colSpan="5" className="p-6">
                           <div className="flex flex-col md:flex-row gap-8">
                              <div className="flex-1 bg-black/40 p-5 rounded-2xl border border-emerald-500/20">
                                 <h4 className="text-emerald-400 font-bold mb-4 flex items-center"><CreditCard className="h-4 w-4 mr-2"/> {t("Loan Fund Ledger", "लोन फंड लेज़र")}</h4>
                                 <div className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-400">{t("Principal:", "मूलधन:")}</span> <span className="text-white font-bold">₹{Number(loan.amount).toLocaleString('en-IN')}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">{t(`Accrued Interest (${loan.interestRate}%):`, `लगा ब्याज (${loan.interestRate}%):`)}</span> <span className="text-amber-400 font-bold">+ ₹{calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt).toLocaleString('en-IN')}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">{t("Recovered:", "वापस आए:")}</span> <span className="text-emerald-400 font-bold">- ₹{Number(loan.recoveredAmount || 0).toLocaleString('en-IN')}</span></div>
                                    <div className="pt-2 border-t border-white/10 flex justify-between">
                                      <span className="text-emerald-300 font-semibold">{t("Net Liability:", "नेट बाकी:")}</span> 
                                      <span className="text-emerald-400 font-bold text-lg">₹{(Number(loan.amount) + calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt) - Number(loan.recoveredAmount || 0)).toLocaleString('en-IN')}</span>
                                    </div>
                                 </div>
                              </div>
                              
                              <div className="flex-1 space-y-4">
                                 <div className="flex gap-4">
                                    <div className="flex-1 space-y-2">
                                       <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center text-amber-400"><Upload className="h-3 w-3 mr-1"/> {t("Add Top-up", "टॉप-अप दें")}</label>
                                       <input type="number" placeholder="₹" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} className="w-full bg-black/50 border border-amber-500/30 rounded-lg p-3 text-amber-400 focus:ring-1 focus:ring-amber-500 outline-none" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                       <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center text-emerald-400"><Download className="h-3 w-3 mr-1"/> {t("Add Repayment", "वापस आए (रिपे)")}</label>
                                       <input type="number" placeholder="₹" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} className="w-full bg-black/50 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none" />
                                    </div>
                                 </div>
                                 <div className="flex gap-2 justify-end pt-2">
                                    <button onClick={() => submitFunds(loan)} className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2 rounded-lg font-bold text-sm transition-colors">{t("Update Ledger", "लेज़र अपडेट करें")}</button>
                                    <button onClick={() => setManageFundsLoanId(null)} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm transition-colors">{t("Cancel", "रद्द करें")}</button>
                                 </div>
                              </div>
                           </div>
                        </td>
                      </tr>
                    )}

                    {editingLoanId === loan.id && (
                      <tr className="bg-white/5 border-l-2 border-indigo-500">
                        <td colSpan="5" className="p-6">
                          <div className="bg-black/30 p-4 rounded-xl border border-white/5 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                             <div>
                               <label className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 block">{t("Principal Amount (₹)", "मूल राशि (₹)")}</label>
                               <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                             </div>
                             <div>
                               <label className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 block">{t("Interest Rate (%)", "ब्याज दर (%)")}</label>
                               <input type="number" step="0.1" value={editRate} onChange={(e) => setEditRate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                             </div>
                             <div>
                               <label className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 block">{t("Tenure (Months)", "समय (महीने)")}</label>
                               <input type="number" value={editTenure} onChange={(e) => setEditTenure(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                             </div>
                             <div>
                               <label className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 block">{t("Date", "तारीख")}</label>
                               <input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
                             </div>
                          </div>

                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                              <label className="text-xs text-slate-400 uppercase tracking-widest mb-2 block">{t("Message/Terms for User:", "यूजर के लिए मैसेज/शर्तें:")}</label>
                              <textarea value={adminMessage} onChange={(e) => setAdminMessage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"></textarea>
                            </div>
                            <div className="flex flex-col space-y-2 justify-end min-w-[220px]">
                               <button onClick={() => submitReview(loan.id, 'active')} className="flex items-center justify-center space-x-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 px-4 py-2 rounded-xl transition-all font-medium"><Check className="h-4 w-4" /> <span>{t("Update & Approve", "अपडेट और पास करें")}</span></button>
                               <button onClick={() => submitReview(loan.id, 'rejected')} className="flex items-center justify-center space-x-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 px-4 py-2 rounded-xl transition-all font-medium"><X className="h-4 w-4" /> <span>{t("Reject", "रद्द करें")}</span></button>
                               <button onClick={() => setEditingLoanId(null)} className="text-xs text-slate-500 hover:text-slate-300 mt-2">{t("Close", "बंद करें")}</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <LoanHistoryModal 
        loan={historyLoan} 
        userName={historyLoan?.userName} 
        onClose={() => setHistoryLoan(null)} 
        t={t}
      />

      <AIInsightsModal 
         isOpen={aiModal.isOpen} 
         onClose={() => setAiModal({ ...aiModal, isOpen: false })}
         loading={aiModal.loading}
         result={aiModal.result}
         error={aiModal.error}
         t={t}
      />

      {/* --- USER DETAIL MODAL --- */}
      {selectedUserProfile && (
        <UserDetailModal 
          userProfile={selectedUserProfile} 
          onClose={() => setSelectedUserProfile(null)} 
          t={t} 
        />
      )}
    </div>
  );
}

// Ye Chote Components Isi File Mein Rakhein Taaki Error Na Aaye
export function StatCard({ title, value, icon, iconBg = "bg-white/5", badgeText = "AGENCY SHIELD" }) {
  return (
    <div className="bg-[#111318] border border-white/[0.04] p-6 rounded-3xl shadow-xl flex flex-col justify-between group hover:border-white/10 transition-all shrink-0">
      <div className="flex items-start justify-between w-full mb-8">
        <div className={`p-3 rounded-2xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-slate-600/80 uppercase tracking-widest">{badgeText}</span>
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}

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
       <div className="bg-[#111318] p-6 rounded-3xl border border-white/[0.04] shadow-xl hover:border-cyan-500/20 transition-all flex flex-col justify-between">
          <div>
              <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center">
                 <BarChart className="h-4 w-4 mr-2 text-cyan-400" /> {t("Financial Health", "आर्थिक स्थिति")}
              </h3>
              <div className="space-y-4">
                 <div className="flex justify-between text-sm">
                    <span className="text-emerald-400 font-bold">{t("Recovered", "वापस आए")} ({recoveryPct}%)</span>
                    <span className="text-amber-400 font-bold">{t("Net Liability", "नेट बाकी")} ({liabilityPct}%)</span>
                 </div>
                 <div className="w-full h-5 bg-slate-800/50 rounded-full overflow-hidden flex border border-white/5">
                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${recoveryPct}%` }}></div>
                    <div className="bg-amber-500 h-full transition-all duration-1000" style={{ width: `${liabilityPct}%` }}></div>
                 </div>
              </div>
          </div>
          <div className="pt-6 mt-6 border-t border-white/10 grid grid-cols-2 gap-4">
             <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{t("Recovery", "रिकवरी")}</p>
                <p className="text-lg font-bold text-emerald-400">₹{totalRecovery.toLocaleString('en-IN')}</p>
             </div>
             <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{t("Liability", "लायबिलिटी")}</p>
                <p className="text-lg font-bold text-amber-400">₹{(totalDisbursed + totalInterest - totalRecovery).toLocaleString('en-IN')}</p>
             </div>
          </div>
       </div>

       <div className="bg-[#111318] p-6 rounded-3xl border border-white/[0.04] shadow-xl hover:border-indigo-500/20 transition-all flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="w-full sm:w-1/2">
            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center">
               <PieChart className="h-4 w-4 mr-2 text-indigo-400" /> {t("Applications", "एप्लिकेशन")}
            </h3>
            <div className="space-y-4">
               <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/5"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div><span className="text-sm text-slate-300">{t("Active", "पास (Active)")}</span></div><span className="font-bold text-white">{activeCount}</span></div>
               <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/5"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-500 mr-2 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div><span className="text-sm text-slate-300">{t("Pending", "पेंडिंग")}</span></div><span className="font-bold text-white">{pendingCount}</span></div>
               <div className="flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/5"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-2 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div><span className="text-sm text-slate-300">{t("Rejected", "रद्द (Rejected)")}</span></div><span className="font-bold text-white">{rejectedCount}</span></div>
            </div>
          </div>
          <div className="flex justify-center shrink-0 relative">
             <div className="w-36 h-36 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/5" style={{ background: `conic-gradient(#10b981 ${activePct}%, #f59e0b ${activePct}% ${activePct + pendingPct}%, #ef4444 ${activePct + pendingPct}% 100%)` }}>
                <div className="w-28 h-28 bg-[#111318] rounded-full flex items-center justify-center flex-col shadow-inner border border-white/5">
                   <span className="text-3xl font-black text-white">{totalCount}</span>
                   <span className="text-[10px] text-slate-500 uppercase tracking-widest">{t("Total", "कुल")}</span>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

export function LoanHistoryModal({ loan, onClose, userName, t }) {
  if (!loan) return null;
  
  const accruedInterest = calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt);
  const netBaki = Number(loan.amount) + accruedInterest - Number(loan.recoveredAmount || 0);
  
  const transactions = Array.isArray(loan.transactions) ? loan.transactions : [];
  const totalTopups = transactions.reduce((sum, tx) => sum + Number(tx.topup || 0), 0);
  const initialPrincipal = Number(loan.amount) - totalTopups;
  
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-[#111318] border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl max-w-lg w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar">
          <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
          
          <div className="flex items-center space-x-3 mb-6 sticky top-0 bg-[#111318] z-10 py-2">
             <div className="p-2 bg-blue-500/20 rounded-xl">
               <Clock className="h-6 w-6 text-blue-400" />
             </div>
             <h3 className="text-2xl font-bold text-white tracking-tight">{t("Loan History & Ledger", "लोन हिस्ट्री और लेज़र")}</h3>
          </div>
          
          <div className="space-y-6">
             <div className="bg-black/40 p-4 rounded-2xl border border-white/[0.04]">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{t("Loan Account ID", "लोन अकाउंट आईडी")}</p>
                <p className="text-sm font-mono text-cyan-400">{loan.id}</p>
                {userName && <p className="text-sm text-white mt-2 font-bold flex items-center"><User className="h-4 w-4 mr-2 text-slate-400"/> {t("User:", "यूजर:")} {userName}</p>}
             </div>
             
             <div className="relative pl-6 border-l border-white/10 space-y-8 ml-2 py-2">
                <div className="relative">
                   <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-cyan-500 border-4 border-[#111318] shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                   <p className="text-xs text-slate-500 font-mono mb-1">{new Date(Number(loan.createdAt)).toLocaleString('en-IN')}</p>
                   <p className="text-sm text-white font-bold">{t("Loan Started (Initial Disbursed)", "लोन शुरू हुआ (पहला वितरण)")}</p>
                   <p className="text-xl font-black text-cyan-400 mt-1">+ ₹{initialPrincipal.toLocaleString('en-IN')}</p>
                </div>
                
                {transactions.map((tx, idx) => (
                   <div key={tx.id || idx} className="relative mt-8">
                      <div className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-4 border-[#111318] shadow-lg ${tx.topup > 0 ? 'bg-purple-500 shadow-purple-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`}></div>
                      <p className="text-xs text-slate-500 font-mono mb-1">{new Date(tx.date).toLocaleString('en-IN')}</p>
                      
                      {tx.topup > 0 && (
                        <div className="mb-3">
                          <p className="text-sm text-white font-bold">{t("Top-up Given", "और दिए (टॉप-अप)")}</p>
                          <p className="text-xl font-black text-purple-400 mt-1">+ ₹{Number(tx.topup).toLocaleString('en-IN')}</p>
                        </div>
                      )}
                      
                      {tx.repay > 0 && (
                        <div>
                          <p className="text-sm text-white font-bold">{t("Repayment Received", "वापस आए (रीपेमेंट)")}</p>
                          <p className="text-xl font-black text-emerald-400 mt-1">- ₹{Number(tx.repay).toLocaleString('en-IN')}</p>
                        </div>
                      )}
                   </div>
                ))}

                <div className="relative mt-8">
                   <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-amber-500 border-4 border-[#111318] shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                   <p className="text-xs text-slate-500 font-mono mb-1">{t("Till Date Calculation", "आज तक का हिसाब")}</p>
                   <p className="text-sm text-white font-bold">{t(`Total Accrued Interest (${loan.interestRate}% P.A.)`, `कुल लगा ब्याज (${loan.interestRate}% P.A.)`)}</p>
                   <p className="text-xl font-black text-amber-400 mt-1">+ ₹{accruedInterest.toLocaleString('en-IN')}</p>
                </div>
             </div>
             
             <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl sticky bottom-0 backdrop-blur-xl">
                <span className="text-slate-300 font-bold uppercase tracking-wider text-sm">{t("Net Liability", "नेट बाकी रकम")}</span>
                <span className="text-3xl font-black text-white tracking-tight">₹{netBaki.toLocaleString('en-IN')}</span>
             </div>

             <button onClick={onClose} className="w-full mt-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white py-3.5 rounded-2xl font-bold transition-all duration-300 flex justify-center items-center">
                <X className="h-4 w-4 mr-2" /> {t("Go Back", "वापस जाएं")}
             </button>
          </div>
       </div>
    </div>
  )
}

export function AIInsightsModal({ isOpen, onClose, loading, result, error, t }) {
  if (!isOpen) return null;

 const handleDownload = async () => {
    if (!result) return;
    
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const blob = new Blob([result], { type: 'text/plain;charset=utf-8;' });
      const blobUrl = URL.createObjectURL(blob);
      await Browser.open({ url: blobUrl, windowName: '_system' });
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
     <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
         <div className="bg-[#111318] border border-cyan-500/30 p-6 md:p-8 rounded-3xl shadow-[0_0_40px_rgba(34,211,238,0.15)] max-w-lg w-full relative max-h-[80vh] flex flex-col">
            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
            <div className="flex items-center space-x-3 mb-6 shrink-0">
               <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl border border-cyan-500/30">
                 <Bot className="h-6 w-6 text-cyan-400" />
               </div>
               <h3 className="text-2xl font-bold text-white tracking-tight">{t("AI Insights", "AI विश्लेषण")}</h3>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 text-slate-300 text-sm leading-relaxed space-y-4 custom-scrollbar">
               {loading ? (
                   <div className="flex flex-col items-center justify-center py-10 space-y-4">
                       <Sparkles className="h-10 w-10 text-cyan-400 animate-pulse" />
                       <p className="text-cyan-400/80 animate-pulse font-medium text-lg">{t("Analyzing data...", "डेटा का विश्लेषण हो रहा है...")}</p>
                   </div>
               ) : error ? (
                   <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl font-medium">{error}</div>
               ) : (
                   <div className="whitespace-pre-wrap">{result}</div>
               )}
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row gap-3 shrink-0">
               {!loading && !error && result && (
                  <button onClick={handleDownload} className="flex-1 flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-white py-3.5 rounded-2xl font-bold transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                     <Download className="h-4 w-4 mr-2" /> {t("Download Report", "रिपोर्ट डाउनलोड")}
                  </button>
               )}
               <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white py-3.5 rounded-2xl font-bold transition-all duration-300">
                  {t("Close", "बंद करें")}
               </button>
            </div>
         </div>
     </div>
  );
}

export function UserDetailModal({ userProfile, onClose, t }) {
  if (!userProfile) return null;

  const userLoans = userProfile.loans || [];
  const score = calculateTrustScore(userLoans);
  const rating = getScoreRating(score);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0f1115] border border-white/10 w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl relative border-t-indigo-500/50 border-t-4">
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white z-20 transition-all">
          <X className="h-5 w-5" />
        </button>

        <div className="p-8">
           <div className="flex justify-between items-start mb-10">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-white tracking-tight">{userProfile.full_name || t('N/A', 'उपलब्ध नहीं')}</h2>
                <p className="text-cyan-400 font-mono text-[10px] tracking-widest uppercase opacity-70">{t("User ID:", "यूजर आईडी:")} {userProfile.user_id?.substring(0,15)}...</p>
              </div>
              
              <div className={`text-right p-4 rounded-3xl border ${rating.border} ${rating.bg} backdrop-blur-md min-w-[120px]`}>
                <div className="flex items-center justify-end space-x-1 mb-1">
                  <Star className={`h-4 w-4 ${rating.color}`} fill="currentColor" />
                  <span className={`text-2xl font-black ${rating.color}`}>{score}</span>
                </div>
                <p className={`text-[8px] font-black uppercase tracking-widest ${rating.color}`}>{rating.label} {t("Risk", "जोखिम")}</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                 <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">{t("Father's Name", "पिता का नाम")}</p>
                 <p className="text-white font-medium">{userProfile.father_name || t('Not Provided', 'जानकारी नहीं')}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                 <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">{t("Mobile Number", "मोबाइल नंबर")}</p>
                 <p className="text-white font-medium font-mono">{userProfile.phone || t('N/A', 'उपलब्ध नहीं')}</p>
              </div>
              <div className="col-span-2 bg-white/5 p-4 rounded-2xl border border-white/5">
                 <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">{t("Full Address", "पूरा पता")}</p>
                 <p className="text-white text-sm leading-relaxed">{userProfile.address || t('No address found in records.', 'रिकॉर्ड में कोई पता नहीं मिला।')}</p>
              </div>
           </div>

           <div className="pt-6 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{t("Total Active Loans", "कुल एक्टिव लोन")}</p>
                <p className="text-2xl font-black text-white">{userLoans.length}</p>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{t("Member Status", "सदस्य स्थिति")}</p>
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${rating.bg} ${rating.color} border ${rating.border}`}>
                  {rating.label} {t("Member", "सदस्य")}
                </span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}