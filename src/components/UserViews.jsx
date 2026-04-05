import React, { useState, useContext, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import {
  Bot, Star, CreditCard, ChevronRight, FileText, Plus, Send, Clock, User,
  Phone, Hash, MapPin, Activity, Upload, Download, PieChart, BarChart,
  MessageSquare, MessageCircle, Mail, Check, X, UserPlus, Edit, Trash,
  Bell, Headset, Lock, AlertCircle, Percent, TrendingUp, ShieldCheck,DollarSign
} from 'lucide-react';
import { LanguageContext } from '../App';
import { supabaseUrl, supabaseKey, calculateAccruedInterest, callGeminiAI, generateLoanPDF, calculateTrustScore, getScoreRating } from '../utils';
import { StatCard, AIInsightsModal, LoanHistoryModal } from './AdminDashboard';

export function DashboardView({ loans, profile, onNavigate, session, showAlert, onSuccess }) {
  const { t, lang } = useContext(LanguageContext);
  const activeLoans = loans.filter(l => l.status === 'active');
  const totalDisbursed = activeLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const totalRecovery = activeLoans.reduce((sum, l) => sum + Number(l.recoveredAmount || 0), 0);
  const totalAccruedInterest = activeLoans.reduce((sum, l) => sum + calculateAccruedInterest(l.amount, l.interestRate, l.createdAt), 0);
  const netLiability = totalDisbursed + totalAccruedInterest - totalRecovery;

  const [aiModal, setAiModal] = useState({ isOpen: false, loading: false, result: '', error: '' });

  const score = calculateTrustScore(loans);
  const rating = getScoreRating(score);

  const handleAIAnalysis = async () => {
    setAiModal({ isOpen: true, loading: true, result: '', error: '' });
    const summary = { totalBorrowed: totalDisbursed, totalPaidBack: totalRecovery, currentDebt: netLiability, totalInterestAccrued: totalAccruedInterest, activeLoansCount: activeLoans.length };
    const promptText = `My Debt Profile: ${JSON.stringify(summary)}. Please provide a quick assessment of my financial health and give 2 practical tips on managing or paying off this debt.`;
    const sysInst = `You are a helpful and empathetic personal finance AI advisor. Respond in ${lang === 'en' ? 'English' : 'Hindi (written in standard Latin/Hinglish script)'}. Be encouraging, keep it short, and use bullet points for the tips.`;
    try {
      const response = await callGeminiAI(promptText, sysInst);
      setAiModal({ isOpen: true, loading: false, result: response, error: '' });
    } catch (e) {
      setAiModal({ isOpen: true, loading: false, result: '', error: t('AI Analysis failed. Please try again.', 'AI विश्लेषण विफल हो गया। कृपया दोबारा कोशिश करें।') });
    }
  };

  return (
    <div className="relative space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-10">
      {/* 🌟 BACKGROUND ORBS 🌟 */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute top-[40%] left-[-10%] w-[400px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{t("Your", "आपका")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">{t("Dashboard", "डैशबोर्ड")}</span></h1>
          <p className="text-slate-400 mt-2 text-lg">{t("Welcome to your personal financial command center.", "आपके पर्सनल फाइनेंसियल सेंटर में आपका स्वागत है।")}</p>
        </div>
        <button onClick={handleAIAnalysis} className="flex items-center justify-center space-x-2 bg-[#111318] border border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-400 text-cyan-400 px-6 py-3.5 rounded-2xl transition-all font-bold shadow-[0_0_20px_rgba(6,182,212,0.15)] group w-full md:w-auto">
          <Bot className="h-5 w-5 group-hover:scale-110 transition-transform" /> <span>{t("AI Advisor", "AI सलाहकार")}</span>
        </button>
      </header>

      {/* 1. PREMIUM PROFILE BANNER */}
      {profile ? (
        <div className="bg-gradient-to-br from-[#161922] to-[#0f1115] border border-white/5 p-6 md:p-8 rounded-[2.5rem] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden group hover:border-cyan-500/20 transition-all duration-500">
          <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-transparent blur-[50px] pointer-events-none"></div>
          
          <div className="flex items-center space-x-6 relative z-10 w-full sm:w-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-3xl flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] shrink-0 group-hover:scale-105 transition-transform duration-500">
              <User className="h-10 w-10 text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold mb-1">{t("Welcome Back", "वापसी पर स्वागत है")}</p>
              <h2 className="text-3xl font-black text-white tracking-wide">{profile.full_name}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="flex items-center text-xs text-slate-400 font-mono"><Phone className="h-3 w-3 mr-1" /> {profile.phone || t('N/A', 'उपलब्ध नहीं')}</span>
                <span className={`px-2.5 py-1 rounded border text-[9px] font-bold uppercase tracking-widest flex items-center ${profile.kyc_status === 'Verified' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                  {profile.kyc_status === 'Verified' ? <><ShieldCheck className="h-3 w-3 mr-1" /> {t('KYC Verified', 'KYC वेरीफाइड')}</> : <><Clock className="h-3 w-3 mr-1" /> {t('KYC Pending', 'KYC पेंडिंग')}</>}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => onNavigate('my_profile')} className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3.5 rounded-2xl transition-all text-sm font-bold flex items-center justify-center relative z-10 shrink-0">
            <Edit className="h-4 w-4 mr-2 text-slate-400" /> {t("Manage Profile", "प्रोफाइल मैनेज करें")}
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-amber-950/40 to-black/40 border border-amber-500/30 p-6 md:p-8 rounded-[2.5rem] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 blur-[50px] pointer-events-none"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-amber-400 flex items-center"><AlertCircle className="h-6 w-6 mr-3" /> {t("Profile Incomplete", "प्रोफाइल अधूरी है")}</h2>
            <p className="text-sm text-amber-200/70 mt-2">{t("Please fill your profile details and complete KYC to unlock all features.", "कृपया अपनी जानकारी भरें और KYC पूरी करें।")}</p>
          </div>
          <button onClick={() => onNavigate('my_profile')} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black px-8 py-3.5 rounded-2xl transition-all font-bold shadow-[0_0_20px_rgba(245,158,11,0.3)] relative z-10">
            {t("Complete Setup", "सेटअप पूरा करें")}
          </button>
        </div>
      )}

      {/* 2. DASHBOARD STATS (MINI HUD) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.04] transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity"><Activity className="w-24 h-24 text-blue-400" /></div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 flex items-center relative z-10"><DollarSign className="h-3 w-3 mr-1 text-blue-400" /> {t("Total Borrowed", "कुल लिया गया")}</p>
          <p className="text-3xl font-black text-white relative z-10">₹{totalDisbursed.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.04] transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp className="w-24 h-24 text-amber-400" /></div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 flex items-center relative z-10"><Percent className="h-3 w-3 mr-1 text-amber-400" /> {t("Interest & Fees", "ब्याज और फीस")}</p>
          <p className="text-3xl font-black text-white relative z-10">₹{totalAccruedInterest.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-950/40 to-blue-900/40 border border-cyan-500/30 p-6 rounded-[2rem] shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden group sm:col-span-1">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/20 blur-[30px] rounded-full group-hover:bg-cyan-400/30 transition-all"></div>
          <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-2 relative z-10">{t("Net Liability", "कुल बाकी रकम")}</p>
          <p className="text-4xl font-black text-cyan-300 relative z-10 tracking-tight">₹{netLiability.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* 3. REQUEST NEW LOAN BUTTON (CINEMATIC) */}
      <div className="mt-8 relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-[2.5rem] blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
        <button
          onClick={() => onNavigate('apply')}
          className="w-full bg-gradient-to-r from-[#161922] to-[#0f1115] border border-white/10 p-8 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between transition-transform duration-300 transform hover:-translate-y-1 relative overflow-hidden z-10"
        >
          <div className="flex items-center space-x-6 text-left">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
              <Plus className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-1 tracking-wide">{t("Apply for a New Loan", "नया लोन अप्लाई करें")}</h2>
              <p className="text-slate-400 text-sm">{t("100% digital process with instant admin approval.", "100% डिजिटल प्रोसेस, तुरंत अप्रूवल के साथ।")}</p>
            </div>
          </div>
          <div className="mt-6 sm:mt-0 w-12 h-12 border border-white/10 rounded-full flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <ChevronRight className="h-6 w-6 text-slate-300 group-hover:text-white" />
          </div>
        </button>
      </div>

      {/* 4. COMPACT TRUST SCORE CARD */}
      <div className="bg-[#111318] border border-white/[0.04] p-6 md:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-5">
            <div className={`p-4 rounded-2xl shrink-0 ${rating.bg} ${rating.border}`}>
              <Star className={`h-8 w-8 ${rating.color}`} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">{t("LeaderPro Trust Score", "लीडरप्रो ट्रस्ट स्कोर")}</h2>
              <p className="text-sm text-slate-400 mt-1">{t("Based on your repayment history & KYC", "आपकी पेमेंट हिस्ट्री और KYC पर आधारित")}</p>
            </div>
          </div>
          <div className="text-left md:text-right bg-black/30 p-4 rounded-2xl border border-white/5">
            <div className="flex items-baseline md:justify-end">
              <span className={`text-4xl font-black leading-none ${rating.color}`}>{score}</span>
              <span className="text-lg text-slate-500 font-bold ml-1">/900</span>
            </div>
            <span className={`inline-block mt-2 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${rating.bg} ${rating.color}`}>{rating.label} {t("Member", "सदस्य")}</span>
          </div>
        </div>
      </div>

      <UserVisualAnalytics loans={loans} t={t} />

      <AIInsightsModal isOpen={aiModal.isOpen} onClose={() => setAiModal({ ...aiModal, isOpen: false })} loading={aiModal.loading} result={aiModal.result} error={aiModal.error} t={t} />
    </div>
  );
}

export function UserVisualAnalytics({ loans, t }) {
  const activeLoans = loans.filter(l => l.status === 'active');
  const totalDisbursed = activeLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const totalRecovery = activeLoans.reduce((sum, l) => sum + Number(l.recoveredAmount || 0), 0);
  const totalInterest = activeLoans.reduce((sum, l) => sum + calculateAccruedInterest(l.amount, l.interestRate, l.createdAt), 0);

  const totalExpected = totalDisbursed + totalInterest;
  const recoveryPct = totalExpected > 0 ? Math.round((totalRecovery / totalExpected) * 100) : 0;
  const principalPct = totalExpected > 0 ? Math.round((totalDisbursed / totalExpected) * 100) : 0;
  const interestPct = totalExpected > 0 ? Math.round((totalInterest / totalExpected) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 mb-2 animate-in fade-in duration-500 shrink-0">
      <div className="bg-[#111318] p-8 rounded-[2.5rem] border border-white/[0.04] shadow-xl hover:border-emerald-500/20 transition-all flex flex-col sm:flex-row items-center gap-8">
        <div className="flex justify-center shrink-0">
          <div className="w-36 h-36 rounded-full flex items-center justify-center border border-white/5 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative" style={{ background: `conic-gradient(#10b981 ${recoveryPct}%, #1e293b ${recoveryPct}% 100%)` }}>
            <div className="absolute inset-2 bg-[#111318] rounded-full flex items-center justify-center flex-col shadow-inner">
              <span className="text-3xl font-black text-emerald-400">{recoveryPct}%</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t("Paid", "चुकाया गया")}</span>
            </div>
          </div>
        </div>
        <div className="w-full text-center sm:text-left">
          <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest flex items-center justify-center sm:justify-start">
            <PieChart className="h-4 w-4 mr-2 text-emerald-400" /> {t("Repayment Progress", "भुगतान प्रगति")}
          </h3>
          <p className="text-xs text-slate-400 mb-5">{t("Your journey to becoming debt-free.", "कर्ज-मुक्त होने की आपकी यात्रा।")}</p>
          <div className="bg-black/30 px-5 py-3 rounded-2xl border border-white/5">
            <span className="text-[10px] text-slate-500 block uppercase tracking-widest mb-1">{t("Remaining Balance", "बाकी रकम")}</span>
            <span className="text-xl font-bold text-white tracking-tight">₹{(totalExpected - totalRecovery).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="bg-[#111318] p-8 rounded-[2.5rem] border border-white/[0.04] shadow-xl hover:border-blue-500/20 transition-all flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center">
            <BarChart className="h-4 w-4 mr-2 text-blue-400" /> {t("Debt Breakdown", "कर्ज का विवरण")}
          </h3>
          <div className="w-full h-4 bg-slate-800/50 rounded-full overflow-hidden flex border border-white/5 mb-8">
            <div className="bg-blue-500 h-full transition-all duration-1000 relative group" style={{ width: `${principalPct}%` }}>
               <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100">{principalPct}%</div>
            </div>
            <div className="bg-amber-500 h-full transition-all duration-1000 relative group" style={{ width: `${interestPct}%` }}>
               <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100">{interestPct}%</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 border-l-2 border-l-blue-500">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{t("Principal", "मूलधन")}</p>
            <p className="text-lg font-bold text-white">₹{totalDisbursed.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 border-l-2 border-l-amber-500">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{t("Interest", "ब्याज")}</p>
            <p className="text-lg font-bold text-white">₹{totalInterest.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OriginationView({ session, onNavigate, onSuccess, isAdmin, showAlert }) {
  const { t } = useContext(LanguageContext);
  const [amount, setAmount] = useState(100000);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const interestRate = 24;

  const calculateMonths = (end) => {
    const start = new Date(); const endD = new Date(end);
    let diffMonths = (endD.getFullYear() - start.getFullYear()) * 12 + (endD.getMonth() - start.getMonth());
    if (endD.getDate() < start.getDate()) diffMonths--;
    return diffMonths > 0 ? diffMonths : 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) { showAlert(t("Warning", "चेतावनी"), t("Consent is required.", "सहमति जरूरी है।")); return; }
    const linkedAdminId = isAdmin ? null : session.user.user_metadata?.linked_admin_id;
    setIsSubmitting(true);
    try {
      const calculatedTenure = calculateMonths(endDate);
      const response = await fetch(`${supabaseUrl}/rest/v1/loans`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ user_id: session.user.id, admin_id: linkedAdminId, amount: Number(amount), recoveredAmount: 0, transactions: [], tenure: Number(calculatedTenure), interestRate: interestRate, emi: 0, status: 'pending', type: 'Personal Loan', createdAt: Date.now(), adminNote: '' })
      });
      if (!response.ok) throw new Error("Fail");
      setIsSubmitting(false); if (onSuccess) onSuccess(); onNavigate('loans');
    } catch (err) { showAlert(t("Error", "त्रुटि"), t("Could not save. Check DB.", "सेव नहीं हो पाया। डेटाबेस चेक करें।")); setIsSubmitting(false); }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-1000 relative pb-20">
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>

      <header className="mb-10 text-center pt-8">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight mb-4">{t("Loan Application", "लोन एप्लिकेशन")}</h1>
        <p className="text-slate-400 text-lg">{t("Simple, transparent, and 100% digital.", "आसान, पारदर्शी और 100% डिजिटल।")}</p>
      </header>

      <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/[0.04] p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3 group">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-cyan-400 transition-colors">{t("I need a loan of (₹)", "मुझे लोन चाहिए (₹)")}</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                <input type="number" min="5000" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full pl-12 pr-6 py-5 bg-white/[0.02] border border-white/5 rounded-2xl text-white text-xl focus:bg-white/[0.04] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all font-bold" required />
              </div>
            </div>
            
            <div className="space-y-3 group">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-cyan-400 transition-colors">{t("I will repay by", "मैं वापस करूँगा (तारीख)")}</label>
              <input type="date" min={new Date().toISOString().split('T')[0]} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-6 py-5 bg-white/[0.02] border border-white/5 rounded-2xl text-white text-xl focus:bg-white/[0.04] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all font-medium" required />
              <p className="text-xs text-cyan-400/80 ml-1 mt-2 font-mono flex items-center"><Clock className="h-3 w-3 mr-1" /> {t("Tenure:", "समय:")} {calculateMonths(endDate)} {t("Months", "महीने")}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-950/40 to-black border border-indigo-500/20 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-inner">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/30"><Percent className="h-6 w-6 text-indigo-400" /></div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">{t("Standard Annual Rate", "मानक वार्षिक दर")}</p>
                <p className="text-white text-sm">{t("Interest will be calculated on reducing balance.", "ब्याज बचे हुए मूलधन पर लगेगा।")}</p>
              </div>
            </div>
            <div className="text-4xl font-black text-indigo-400">{interestRate}<span className="text-2xl text-indigo-200/50">%</span></div>
          </div>

          <label className="flex items-start space-x-4 cursor-pointer bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 p-5 rounded-2xl transition-colors">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-5 h-5 border-white/10 rounded checked:bg-cyan-500 bg-black/50 appearance-none flex items-center justify-center after:content-['✓'] after:text-white after:text-xs after:hidden checked:after:block" />
            <span className="text-sm text-slate-300 leading-relaxed">{t("I consent to my data being securely stored and processed in India for loan origination and KYC verification purposes.", "मैं अपनी सहमति देता/देती हूँ कि मेरा डेटा भारत में सुरक्षित रखा जाए और लोन तथा KYC के लिए इस्तेमाल किया जाए।")}</span>
          </label>

          <button type="submit" disabled={isSubmitting || !consent} className="w-full relative overflow-hidden group bg-transparent border-none p-0 outline-none disabled:opacity-50 disabled:cursor-not-allowed mt-4">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 rounded-2xl opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 rounded-2xl opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-500"></div>
            <div className="relative px-8 py-5 flex items-center justify-center space-x-3">
              {isSubmitting ? <Activity className="h-5 w-5 text-white animate-spin" /> : <Check className="h-6 w-6 text-white" />}
              <span className="text-white font-black tracking-widest uppercase text-lg">
                {isSubmitting ? t('Processing Data...', 'प्रोसेस हो रहा है...') : t('Submit Secure Application', 'सुरक्षित एप्लिकेशन जमा करें')}
              </span>
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}

export function MyLoansView({ loans, profile }) {
  const { t } = useContext(LanguageContext);
  const [historyLoan, setHistoryLoan] = useState(null); 

  if (loans.length === 0) return (<div className="flex flex-col items-center justify-center py-32 opacity-50"><FileText className="h-20 w-20 text-slate-500 mb-6" /><h2 className="text-2xl font-bold text-white">{t("No loans found", "कोई लोन नहीं है")}</h2></div>);

  const downloadLedger = async (loan) => { /* ... PDF Logic remains identical ... */ 
      try {
        const accruedInterest = calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt);
        const netBaki = Number(loan.amount) + accruedInterest - Number(loan.recoveredAmount || 0);
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFillColor(6, 182, 212); doc.rect(0, 0, pageWidth, 4, 'F');
        doc.setFontSize(28); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("LeaderPro", 14, 22);
        doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text("NEXT-GEN FINANCIAL LEDGER", 14.5, 27);
        doc.setFontSize(9); doc.setTextColor(148, 163, 184); doc.text("STATEMENT DATE", pageWidth - 14, 18, { align: "right" });
        doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text(new Date().toLocaleDateString('en-IN'), pageWidth - 14, 23, { align: "right" });
        doc.setFontSize(9); doc.setTextColor(148, 163, 184); doc.text("LOAN REFERENCE ID", pageWidth - 14, 30, { align: "right" });
        doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text(loan.id.substring(0, 8).toUpperCase(), pageWidth - 14, 35, { align: "right" });
        const cardY = 45;
        doc.setFillColor(248, 250, 252); doc.roundedRect(14, cardY, pageWidth / 2 - 18, 35, 3, 3, 'F');
        doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.text("ISSUED TO:", 19, cardY + 7);
        doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text(profile?.full_name || 'N/A', 19, cardY + 14);
        doc.setFontSize(9); doc.setTextColor(71, 85, 105); doc.setFont("helvetica", "normal");
        const aadhar = profile?.aadhar_no ? `Aadhar: XXXX-XXXX-${profile.aadhar_no.slice(-4)}` : 'Aadhar: N/A';
        doc.text(aadhar, 19, cardY + 21); if (profile?.phone) doc.text(`Phone: ${profile.phone}`, 19, cardY + 26);
        doc.setFillColor(15, 23, 42); doc.roundedRect(pageWidth / 2 + 4, cardY, pageWidth / 2 - 18, 35, 3, 3, 'F');
        doc.setFontSize(9); doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "bold"); doc.text("NET LIABILITY (BALANCE)", pageWidth / 2 + 9, cardY + 7);
        doc.setFontSize(22); doc.setTextColor(255, 255, 255); doc.text(`Rs. ${netBaki.toLocaleString('en-IN')}`, pageWidth / 2 + 9, cardY + 18);
        doc.setFontSize(9); doc.setTextColor(6, 182, 212); doc.setFont("helvetica", "normal"); doc.text(`Status: ${loan.status.toUpperCase()}`, pageWidth / 2 + 9, cardY + 26);
        let currentY = cardY + 50; doc.setFontSize(14); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("Transaction History", 14, currentY);
        const txRows = []; const transactionsArray = Array.isArray(loan.transactions) ? loan.transactions : [];
        const totalTopups = transactionsArray.reduce((sum, tx) => sum + Number(tx.topup || 0), 0); const initialAmount = Number(loan.amount) - totalTopups;
        txRows.push([new Date(Number(loan.createdAt)).toLocaleDateString('en-IN'), "Initial Loan Disbursed", `+ Rs. ${initialAmount.toLocaleString('en-IN')}`]);
        transactionsArray.forEach(tx => {
          const txDate = new Date(tx.date).toLocaleDateString('en-IN');
          if (Number(tx.topup) > 0) txRows.push([txDate, "Additional Top-up Given", `+ Rs. ${Number(tx.topup).toLocaleString('en-IN')}`]);
          if (Number(tx.repay) > 0) txRows.push([txDate, "Repayment Received", `- Rs. ${Number(tx.repay).toLocaleString('en-IN')}`]);
        });
        txRows.push([new Date().toLocaleDateString('en-IN'), `Accrued Interest (${loan.interestRate}% P.A.)`, `+ Rs. ${accruedInterest.toLocaleString('en-IN')}`]);
        autoTable(doc, { startY: currentY + 6, head: [["DATE", "DESCRIPTION", "AMOUNT"]], body: txRows, theme: 'plain', headStyles: { fillColor: [241, 245, 249], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 9 }, columnStyles: { 0: { cellWidth: 40, textColor: [71, 85, 105], fontStyle: 'normal' }, 1: { cellWidth: 'auto', textColor: [15, 23, 42], fontStyle: 'bold' }, 2: { cellWidth: 45, textColor: [15, 23, 42], halign: 'right', fontStyle: 'bold' } }, alternateRowStyles: { fillColor: [250, 250, 250] }, styles: { fontSize: 10, cellPadding: 6 }, didDrawCell: (data) => { if (data.row.section === 'body') { doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.1); doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height); } } });
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "normal"); doc.text("This statement is computer-generated and requires no signature.", pageWidth / 2, pageHeight - 15, { align: "center" }); doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold"); doc.text("LEADERPRO", pageWidth / 2, pageHeight - 10, { align: "center" }); }
        if (Capacitor.isNativePlatform()) { const fileName = `LeaderPro_Ledger_${loan.id.substring(0,8)}.pdf`; const pdfBase64 = doc.output('datauristring').split(',')[1]; const writeResult = await Filesystem.writeFile({ path: fileName, data: pdfBase64, directory: Directory.Cache }); await Share.share({ title: 'Loan Ledger PDF', text: 'Here is your Premium Loan Ledger from LeaderPro.', url: writeResult.uri, dialogTitle: 'Save or Share PDF Ledger', }); } else { doc.save(`LeaderPro_Ledger_${loan.id.substring(0,8)}.pdf`); }
      } catch (error) { console.error("PDF Error: ", error); alert(t("Error generating or downloading PDF. Please try again.", "PDF बनाने या डाउनलोड करने में एरर आई है। कृपया दोबारा प्रयास करें।")); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 relative pb-10">
      <div className="absolute top-[20%] left-0 w-[400px] h-[400px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <header className="mb-10"><h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{t("My Loans", "मेरे लोन")}</h1><p className="text-slate-400 mt-2 text-lg">{t("Track and manage your active and past accounts.", "अपने लोन अकाउंट ट्रैक करें।")}</p></header>
      
      <div className="grid gap-6">
        {loans.map((loan) => {
          const accruedInterest = calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt);
          const netBaki = Number(loan.amount) + accruedInterest - Number(loan.recoveredAmount || 0);
          const isActive = loan.status === 'active';
          
          return (
          <div key={loan.id} className="bg-gradient-to-br from-[#161922] to-[#0f1115] rounded-[2.5rem] border border-white/5 p-6 md:p-8 flex flex-col md:flex-row justify-between gap-8 shadow-xl hover:border-cyan-500/20 transition-all duration-500 group relative overflow-hidden">
            {isActive && <div className="absolute -right-10 -top-10 w-40 h-40 bg-cyan-500/10 blur-[40px] group-hover:bg-cyan-400/20 transition-colors duration-500 pointer-events-none"></div>}
            
            <div className="flex-1 w-full relative z-10">
              <div className="flex items-center space-x-4 mb-4">
                <h3 className="text-3xl font-black text-white tracking-wide">{loan.type || 'Personal Loan'}</h3>
                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : loan.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>{loan.status}</span>
              </div>
              <p className="text-sm text-slate-500 mb-8 font-mono flex items-center"><Hash className="h-4 w-4 mr-1 text-slate-600"/> ID: {loan.id.substring(0, 12).toUpperCase()} <span className="mx-3 border-l border-white/10 h-4"></span> <Clock className="h-4 w-4 mr-1 text-slate-600"/> {t("Started:", "शुरू हुआ:")} {new Date(Number(loan.createdAt)).toLocaleDateString('en-IN')}</p>
              
              {/* MINI HUD FOR LOAN CARD */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-black/30 p-5 rounded-2xl border border-white/[0.04] group-hover:border-white/10 transition-colors"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{t("Principal", "मूलधन")}</p><p className="text-xl font-bold text-white">₹{Number(loan.amount).toLocaleString('en-IN')}</p></div>
                <div className="bg-black/30 p-5 rounded-2xl border border-white/[0.04] group-hover:border-white/10 transition-colors"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{t("Interest", "लगा ब्याज")} ({loan.interestRate}%)</p><p className="text-xl font-bold text-amber-400">+ ₹{accruedInterest.toLocaleString('en-IN')}</p></div>
                <div className="bg-black/30 p-5 rounded-2xl border border-white/[0.04] group-hover:border-white/10 transition-colors"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{t("Paid", "वापस आया")}</p><p className="text-xl font-bold text-emerald-400">- ₹{Number(loan.recoveredAmount || 0).toLocaleString('en-IN')}</p></div>
                <div className="bg-cyan-950/20 p-5 rounded-2xl border border-cyan-500/20 shadow-inner group-hover:bg-cyan-900/30 transition-colors"><p className="text-[10px] text-cyan-400/80 uppercase font-bold tracking-widest mb-1">{t("Net Balance", "नेट बाकी")}</p><p className="text-xl font-black text-cyan-300">₹{netBaki.toLocaleString('en-IN')}</p></div>
              </div>
              
              {loan.adminNote && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl flex items-start space-x-4"><MessageSquare className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" /><div><p className="text-[10px] text-indigo-300/80 font-bold uppercase tracking-widest mb-1">{t("Admin Message / Terms:", "एडमिन संदेश / शर्तें:")}</p><p className="text-white text-sm leading-relaxed">{loan.adminNote}</p></div></div>
              )}
            </div>
            
            <div className="flex flex-col space-y-4 min-w-[220px] w-full md:w-auto shrink-0 border-t md:border-t-0 border-white/10 pt-6 md:pt-0 relative z-10 justify-center">
              <button onClick={() => setHistoryLoan(loan)} className="w-full flex items-center justify-center space-x-3 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 px-6 py-4 rounded-2xl transition-all duration-300 font-bold shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                <Activity className="h-5 w-5 text-cyan-400" />
                <span>{t("View Full Ledger", "पूरा लेज़र देखें")}</span>
              </button>
              <button onClick={() => downloadLedger(loan)} className="w-full flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-4 rounded-2xl transition-all duration-300 font-bold">
                <Download className="h-5 w-5 text-slate-300" />
                <span>{t("Download Statement", "स्टेटमेंट डाउनलोड")}</span>
              </button>
            </div>
          </div>
        )})}
      </div>
      
      {historyLoan && <LoanHistoryModal loan={historyLoan} onClose={() => setHistoryLoan(null)} t={t} />}
    </div>
  );
}

// 🌟 CINEMATIC USER PROFILE 🌟
export function UserMyProfileView({ profile, session, onSave, showAlert }) {
  const { t } = useContext(LanguageContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [fatherName, setFatherName] = useState(profile?.father_name || '');
  const [aadharNo, setAadharNo] = useState(profile?.aadhar_no || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [aadharFront, setAadharFront] = useState(null);
  const [aadharBack, setAadharBack] = useState(null);
  const [panCard, setPanCard] = useState(null);
  const [selfie, setSelfie] = useState(null);

  const isVerified = profile?.kyc_status === 'Verified';

  const uploadFile = async (file, type) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}_${type}_${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;
    try {
      const response = await fetch(`${supabaseUrl}/storage/v1/object/kyc-documents/${filePath}`, { method: 'POST', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': file.type }, body: file });
      if (!response.ok) throw new Error(`Failed to upload ${type}`);
      return `${supabaseUrl}/storage/v1/object/public/kyc-documents/${filePath}`;
    } catch (err) { return null; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName) { showAlert(t("Warning", "चेतावनी"), t("Name is required", "नाम लिखना जरूरी है")); return; }
    setIsSubmitting(true);
    let aadhar_front_url = profile?.aadhar_front_url || null; let aadhar_back_url = profile?.aadhar_back_url || null; let pan_url = profile?.pan_url || null; let selfie_url = profile?.selfie_url || null;
    if (aadharFront) aadhar_front_url = await uploadFile(aadharFront, 'aadhar_front');
    if (aadharBack) aadhar_back_url = await uploadFile(aadharBack, 'aadhar_back');
    if (panCard) pan_url = await uploadFile(panCard, 'pan');
    if (selfie) selfie_url = await uploadFile(selfie, 'selfie');
    const data = { user_id: session.user.id, admin_id: session.user.user_metadata?.linked_admin_id, full_name: fullName, father_name: fatherName, aadhar_no: aadharNo, phone: phone, address: address, kyc_status: isVerified ? 'Verified' : 'Pending', aadhar_front_url, aadhar_back_url, pan_url, selfie_url };
    if (!profile) data.createdAt = Date.now(); else data.id = profile.id;
    await onSave(data, !!profile);
    setIsSubmitting(false);
  };

const FileUploadBtn = ({ label, onChange, currentUrl }) => (
    <div className="relative group cursor-pointer w-full">
      <input 
        type="file" 
        accept="image/*" 
        onChange={onChange} 
        disabled={isVerified} 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" 
      />
      <div className={`flex items-center justify-center space-x-2 border-2 border-dashed p-4 rounded-xl transition-all duration-300 ${
        currentUrl || isVerified
          ? 'border-emerald-500/50 bg-emerald-500/10' 
          : 'border-slate-600 bg-black/40 group-hover:border-cyan-500 group-hover:bg-cyan-950/30'
      }`}>
        {currentUrl || isVerified ? <Check className="h-5 w-5 text-emerald-400" /> : <Upload className="h-5 w-5 text-slate-400 group-hover:text-cyan-400" />}
        <span className={`text-sm font-semibold ${currentUrl || isVerified ? 'text-emerald-400' : 'text-slate-300 group-hover:text-cyan-400'}`}>
          {currentUrl ? `${label} (${t("Uploaded", "अपलोड हो गया")})` : isVerified ? `${label} (${t("Verified", "वेरीफाइड")})` : `${t("Upload", "अपलोड करें")} ${label}`}
        </span>
      </div>
    </div>
  );

  return (
    <div className="relative max-w-5xl mx-auto space-y-8 animate-in fade-in duration-1000 pb-20">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <header className="relative z-10 mb-12 text-center sm:text-left pt-6">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500 tracking-tight mb-3">{t("Your Identity", "आपकी पहचान")}</h1>
        <p className="text-slate-400 text-lg">{t("Manage your personal information and verify your identity.", "अपनी निजी जानकारी मैनेज करें और पहचान वेरीफाई करें।")}</p>
      </header>

      <div className="relative z-10 bg-[#0a0a0a]/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/[0.04] p-6 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10 pb-8 border-b border-white/5">
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] shrink-0"><User className="text-cyan-400 h-8 w-8" /></div>
            <div><h2 className="text-2xl font-bold text-white tracking-wide">{t("Personal Data", "निजी जानकारी")}</h2><p className="text-sm text-slate-500">{t("Secure & Encrypted", "सुरक्षित और एन्क्रिप्टेड")}</p></div>
          </div>
          {isVerified && (<div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.2)] shrink-0"><Check className="h-4 w-4" /><span className="text-sm font-bold uppercase tracking-widest">{t("Verified Shield", "वेरीफाइड शील्ड")}</span></div>)}
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-cyan-400">{t("Legal Full Name", "कानूनी पूरा नाम")}</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isVerified} className="w-full px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl text-white text-lg focus:bg-white/[0.05] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" required /></div>
            <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-cyan-400">{t("Father's Name", "पिता का नाम")}</label><input type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)} disabled={isVerified} className="w-full px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl text-white text-lg focus:bg-white/[0.05] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" /></div>
            <div className="space-y-2 group relative"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">{t("Aadhar Number", "आधार नंबर")} <Lock className="h-3 w-3 ml-2 text-slate-600" /></label><input type="text" value={aadharNo} readOnly={true} className="w-full px-5 py-4 bg-black/40 border border-white/5 rounded-2xl text-slate-500 font-mono tracking-widest text-lg cursor-not-allowed outline-none select-all" /><p className="text-[10px] text-slate-600 ml-1 absolute -bottom-5">{t("Aadhar is permanently linked.", "आधार हमेशा के लिए लिंक है।")}</p></div>
            <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-cyan-400">{t("Phone Number", "फोन नंबर")}</label><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isVerified} className="w-full px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl text-white text-lg font-mono focus:bg-white/[0.05] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" /></div>
            <div className="space-y-2 group md:col-span-2 mt-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-cyan-400">{t("Residential Address", "घर का पता")}</label><textarea value={address} onChange={(e) => setAddress(e.target.value)} disabled={isVerified} className="w-full px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl text-white text-lg focus:bg-white/[0.05] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none resize-none h-32 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" /></div>
          </div>

          <div className="pt-10 mt-6 border-t border-white/5">
            <h3 className="text-xl font-bold text-white mb-8 tracking-wide">{t("Identity Documents (KYC)", "पहचान पत्र (KYC)")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <FileUploadBtn label="Aadhar Front" onChange={(e) => setAadharFront(e.target.files[0])} currentUrl={profile?.aadhar_front_url || aadharFront} />
              <FileUploadBtn label="Aadhar Back" onChange={(e) => setAadharBack(e.target.files[0])} currentUrl={profile?.aadhar_back_url || aadharBack} />
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
                  <span className="text-white font-black tracking-widest uppercase text-lg">{isSubmitting ? t('Encrypting & Saving...', 'एन्क्रिप्ट और सेव हो रहा है...') : t('Save Secure Profile', 'सुरक्षित प्रोफाइल सेव करें')}</span>
                </div>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export function UserLiveChatView({ session, profile, chats, onSend, onClose }) {
  const { t } = useContext(LanguageContext);
  const [msgInput, setMsgInput] = useState('');
  const chatContainerRef = useRef(null);

  useEffect(() => { const timer = setTimeout(() => { if (chatContainerRef.current) { chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; } }, 50); return () => clearTimeout(timer); }, [chats]);

  const handleSend = (e) => { e.preventDefault(); if (!msgInput.trim()) return; const linkedAdminId = session.user.user_metadata?.linked_admin_id; onSend(session.user.id, linkedAdminId, 'user', msgInput); setMsgInput(''); };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px] animate-in fade-in duration-700 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
      <header className="mb-6 shrink-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div><h1 className="text-4xl font-bold text-white tracking-tight">{t("Live Chat / Support", "लाइव चैट / सहायता")}</h1><p className="text-slate-400 mt-2 text-lg">{t("Send a direct message to your Admin.", "अपने एडमिन को सीधा मैसेज भेजें।")}</p></div>
        <button onClick={onClose} className="flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-5 py-3 rounded-xl transition-all text-sm font-bold w-full sm:w-auto"><X className="h-4 w-4" /> <span>{t("Close Chat", "चैट बंद करें")}</span></button>
      </header>

      <div className="flex-1 bg-[#0a0a0a]/80 backdrop-blur-2xl rounded-3xl border border-white/[0.04] shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col min-h-0 max-w-4xl mx-auto w-full">
        <div className="p-5 border-b border-white/10 bg-black/40 flex items-center space-x-4 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-indigo-900/50 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]"><Headset className="h-6 w-6 text-indigo-400" /></div>
          <div><h3 className="font-bold text-white text-lg">{t("Admin Support", "एडमिन सपोर्ट")}</h3><p className="text-xs text-emerald-400 flex items-center font-mono uppercase tracking-widest"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span> {t("Online", "ऑनलाइन")}</p></div>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 min-h-0 bg-transparent scroll-smooth">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 text-center px-4">
              <MessageCircle className="h-20 w-20 opacity-20 mb-4" />
              <p className="text-lg">{t("No messages yet. Say hello to your admin!", "अभी तक कोई मैसेज नहीं है। अपने एडमिन को हेलो कहें!")}</p>
            </div>
          ) : (
            chats.map(c => (
              <div key={c.id} className={`flex ${c.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl relative ${c.sender_role === 'user' ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-sm shadow-[0_5px_20px_rgba(6,182,212,0.2)]' : 'bg-white/5 backdrop-blur-md text-slate-200 rounded-bl-sm border border-white/10 shadow-lg'}`}>
                  <p className="text-sm md:text-base leading-relaxed">{c.message}</p>
                  <p className={`text-[10px] mt-2 text-right font-mono ${c.sender_role === 'user' ? 'text-cyan-200/70' : 'text-slate-500'}`}>{new Date(Number(c.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 bg-black/40 border-t border-white/10 shrink-0">
          <form onSubmit={handleSend} className="flex items-center space-x-4">
            <input type="text" value={msgInput} onChange={(e) => setMsgInput(e.target.value)} placeholder={t("Type your message here...", "अपना मैसेज यहाँ लिखें...")} className="flex-1 bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 text-white focus:bg-white/[0.05] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all" />
            <button type="submit" disabled={!msgInput.trim()} className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white flex items-center justify-center transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0 hover:scale-105"><Send className="h-6 w-6 ml-1" /></button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function UserNotificationsModal({ notifications, onClose }) {
  const { t } = useContext(LanguageContext);
  const notifs = Array.isArray(notifications) ? notifications : [];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a]/90 border border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.8)] max-w-md w-full relative max-h-[80vh] flex flex-col overflow-hidden">
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-600/20 blur-[50px] rounded-full pointer-events-none"></div>
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-400 hover:text-white transition-all z-10"><X className="h-5 w-5" /></button>

        <div className="flex items-center space-x-4 mb-8 shrink-0 relative z-10">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Bell className="h-7 w-7 text-blue-400" />
          </div>
          <h3 className="text-3xl font-black text-white tracking-tight">{t("Messages", "मैसेज")}</h3>
        </div>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar relative z-10">
          {notifs.length === 0 ? (
            <div className="text-center py-16 text-slate-500 flex flex-col items-center">
              <div className="p-6 bg-white/5 rounded-full mb-4"><MessageCircle className="h-12 w-12 opacity-30" /></div>
              <p className="text-lg font-medium">{t("No new messages.", "अभी कोई नया मैसेज नहीं है।")}</p>
            </div>
          ) : (
            notifs.map((n, i) => (
              <div key={n.id || i} className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 hover:bg-blue-900/10 transition-colors group relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 flex items-center"><Clock className="h-3 w-3 mr-1" /> {new Date(n.date).toLocaleString('en-IN')}</p>
                <p className="text-sm text-slate-200 leading-relaxed">{n.text}</p>
              </div>
            ))
          )}
        </div>

        <button onClick={onClose} className="w-full mt-6 shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-2xl font-bold transition-all duration-300 relative z-10">
          {t("Close Window", "बंद करें")}
        </button>
      </div>
    </div>
  );
}