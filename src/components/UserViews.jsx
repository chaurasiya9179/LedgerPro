// src/components/UserViews.jsx
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
  Bell, Headset, Lock, AlertCircle
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <header className="mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{t("Your", "आपका")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{t("Dashboard", "डैशबोर्ड")}</span></h1>
        </div>
        <button onClick={handleAIAnalysis} className="hidden sm:flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl transition-all text-sm font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          <Bot className="h-4 w-4" /> <span>{t("AI Advisor", "AI सलाहकार")}</span>
        </button>
      </header>

      <button onClick={handleAIAnalysis} className="sm:hidden w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white px-5 py-3 rounded-xl transition-all text-sm font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)] mb-4">
        <Bot className="h-5 w-5" /> <span>{t("AI Advisor", "AI सलाहकार")}</span>
      </button>

      {/* 1. FRONT PAGE PROFILE BANNER */}
      {profile ? (
        <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 p-6 md:p-8 rounded-[2rem] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none"></div>

          <div className="flex items-center space-x-5 relative z-10 w-full sm:w-auto">
            <div className="bg-black/30 p-4 rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)] shrink-0">
              <User className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-cyan-400 uppercase tracking-widest font-bold mb-1">{t("Welcome Back", "वापसी पर स्वागत है")}</p>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-wide">{profile.full_name}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-slate-300">
                <span className="flex items-center"><Phone className="h-3 w-3 mr-1 text-slate-400" /> {profile.phone || t('N/A', 'उपलब्ध नहीं')}</span>
                <span className="text-slate-600 hidden sm:inline">|</span>
                <span className={`font-bold flex items-center px-2 py-0.5 rounded-md ${profile.kyc_status === 'Verified' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {profile.kyc_status === 'Verified' ? <Check className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                  KYC: {profile.kyc_status === 'Verified' ? t('Verified', 'वेरीफाइड') : t('Pending', 'पेंडिंग')}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => onNavigate('my_profile')} className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/10 text-white px-6 py-3 rounded-xl transition-all text-sm font-bold flex items-center justify-center relative z-10 shrink-0">
            <Edit className="h-4 w-4 mr-2" /> {t("View Profile", "प्रोफाइल देखें")}
          </button>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 p-6 md:p-8 rounded-[2rem] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-amber-400 flex items-center"><AlertCircle className="h-6 w-6 mr-2" /> {t("Profile Incomplete", "प्रोफाइल अधूरी है")}</h2>
            <p className="text-sm text-slate-300 mt-1">{t("Please fill your profile details before applying for a new loan.", "नया लोन अप्लाई करने से पहले अपनी प्रोफाइल डिटेल भरना जरूरी है।")}</p>
          </div>
          <button onClick={() => onNavigate('my_profile')} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-xl transition-all text-sm font-bold shadow-lg shadow-amber-500/20">
            {t("Set Up Profile", "प्रोफाइल सेटअप करें")}
          </button>
        </div>
      )}

      {/* 2. COMPACT TRUST SCORE CARD */}
      <div className="bg-[#161113] border border-red-500/20 p-5 md:p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="bg-red-500/10 p-3 rounded-full shrink-0">
              <Star className="text-red-400 h-6 w-6" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">{t("LeaderPro Trust Score", "लीडरप्रो ट्रस्ट स्कोर")}</h2>
              <p className="text-xs text-slate-400 mt-1">{t("Live report card of your financial reliability", "आपकी आर्थिक विश्वसनीयता का लाइव रिपोर्ट कार्ड")}</p>
            </div>
          </div>
          <div className="text-left md:text-right">
            <div className="text-4xl font-black text-red-400 leading-none">
              467<span className="text-lg text-slate-500 font-bold ml-1">/900</span>
            </div>
            <span className="inline-block mt-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">{t("Risky Member", "जोखिम वाले सदस्य")}</span>
          </div>
        </div>
        <div className="relative z-10">
          <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400" style={{ width: '28%' }}></div>
          </div>
          <div className="flex justify-between text-[9px] font-bold text-slate-500 mt-2 uppercase tracking-widest">
            <span className="text-red-400">{t("Risky (300)", "जोखिम (300)")}</span>
            <span className="text-amber-400">{t("Standard (500)", "सामान्य (500)")}</span>
            <span className="text-emerald-400">{t("Elite (900)", "एलीट (900)")}</span>
          </div>
        </div>
      </div>

      {/* 3. VISUAL ANALYTICS */}
      <UserVisualAnalytics loans={loans} t={t} />

      {/* 4. REQUEST NEW LOAN BUTTON */}
      <div className="mt-8">
        <button
          onClick={() => onNavigate('apply')}
          className="w-full bg-gradient-to-r from-indigo-600/80 to-cyan-600/80 hover:from-indigo-500 hover:to-cyan-500 text-white p-6 md:p-8 rounded-3xl shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col sm:flex-row items-center justify-between group transition-all duration-300 transform hover:-translate-y-1 border border-white/10 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center space-x-5 text-left relative z-10">
            <div className="bg-white/10 p-4 rounded-2xl group-hover:scale-110 transition-transform">
              <Plus className="h-8 w-8 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{t("Apply for a New Loan", "नया लोन अप्लाई करें")}</h2>
              <p className="text-indigo-200 text-sm">{t("With instant approval and 100% digital process.", "तुरंत अप्रूवल और 100% डिजिटल प्रोसेस के साथ।")}</p>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 bg-white/10 p-3 rounded-full group-hover:bg-white/20 transition-colors relative z-10">
            <ChevronRight className="h-6 w-6 text-white" />
          </div>
        </button>
      </div>

      {/* 5. ACTIVE LOANS LIST */}
      <div className="mt-8 bg-[#111318] p-6 rounded-3xl border border-white/[0.04] shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-cyan-400" />
            {t("Active Loans", "चल रहे लोन")}
          </h2>
          <button onClick={() => onNavigate('loans')} className="text-sm text-cyan-400 hover:text-cyan-300 font-medium flex items-center transition-colors">
            {t("View Full Ledger", "पूरा लेज़र देखें")} <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>

        {activeLoans.length === 0 ? (
          <div className="bg-black/30 p-8 rounded-2xl border border-white/[0.02] text-center">
            <FileText className="h-8 w-8 text-slate-600 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400 text-sm">{t("You do not have any active loans.", "आपका कोई एक्टिव लोन नहीं है।")}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeLoans.map(loan => {
              const accruedInt = calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt);
              const baki = Number(loan.amount) + accruedInt - Number(loan.recoveredAmount || 0);
              return (
                <div key={loan.id} className="bg-black/30 p-5 rounded-2xl border border-white/[0.04] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/10 transition-all">
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">{loan.type || 'Personal Loan'}</h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      ID: {loan.id.substring(0, 8).toUpperCase()} • {t("Started:", "शुरू हुआ:")} {new Date(Number(loan.createdAt)).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-6 text-right w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{t("Principal", "मूलधन")}</p>
                      <p className="font-bold text-slate-300">₹{Number(loan.amount).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-emerald-400/80 mb-1">{t("Net Balance", "नेट बाकी")}</p>
                      <p className="font-bold text-emerald-400 text-lg">₹{baki.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AIInsightsModal
        isOpen={aiModal.isOpen}
        onClose={() => setAiModal({ ...aiModal, isOpen: false })}
        loading={aiModal.loading}
        result={aiModal.result}
        error={aiModal.error}
        t={t}
      />
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 mb-2 animate-in fade-in duration-500 shrink-0">
      <div className="bg-[#111318] p-6 rounded-3xl border border-white/[0.04] shadow-xl hover:border-emerald-500/20 transition-all flex flex-col sm:flex-row items-center gap-6">
        <div className="flex justify-center shrink-0">
          <div className="w-32 h-32 rounded-full flex items-center justify-center border border-white/5 shadow-[0_0_20px_rgba(16,185,129,0.2)]" style={{ background: `conic-gradient(#10b981 ${recoveryPct}%, #1e293b ${recoveryPct}% 100%)` }}>
            <div className="w-24 h-24 bg-[#111318] rounded-full flex items-center justify-center flex-col shadow-inner">
              <span className="text-2xl font-black text-emerald-400">{recoveryPct}%</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">{t("Paid", "चुकाया गया")}</span>
            </div>
          </div>
        </div>
        <div className="w-full text-center sm:text-left">
          <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest flex items-center justify-center sm:justify-start">
            <PieChart className="h-4 w-4 mr-2 text-emerald-400" /> {t("Repayment Progress", "भुगतान प्रगति")}
          </h3>
          <p className="text-xs text-slate-400 mb-4">{t("Your journey to becoming debt-free.", "कर्ज-मुक्त होने की आपकी यात्रा।")}</p>
          <div className="bg-black/30 px-4 py-2 rounded-xl inline-block border border-white/5">
            <span className="text-xs text-slate-500 block uppercase tracking-widest">{t("Remaining", "बाकी है")}</span>
            <span className="text-lg font-bold text-white">₹{(totalExpected - totalRecovery).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="bg-[#111318] p-6 rounded-3xl border border-white/[0.04] shadow-xl hover:border-amber-500/20 transition-all flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center">
            <BarChart className="h-4 w-4 mr-2 text-amber-400" /> {t("Debt Breakdown", "कर्ज का विवरण")}
          </h3>
          <div className="space-y-4">
            <div className="w-full h-8 bg-slate-800/50 rounded-xl overflow-hidden flex border border-white/5">
              <div className="bg-blue-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-1000" style={{ width: `${principalPct}%` }}>{principalPct > 10 ? t('Principal', 'मूलधन') : ''}</div>
              <div className="bg-amber-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-1000" style={{ width: `${interestPct}%` }}>{interestPct > 10 ? t('Interest', 'ब्याज') : ''}</div>
            </div>
          </div>
        </div>
        <div className="pt-4 mt-4 border-t border-white/10 grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 bg-black/20 p-2 rounded-lg border border-white/5">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">{t("Principal", "मूलधन")}</p>
              <p className="text-sm font-bold text-white">₹{totalDisbursed.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-black/20 p-2 rounded-lg border border-white/5">
            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">{t("Interest", "ब्याज")}</p>
              <p className="text-sm font-bold text-white">₹{totalInterest.toLocaleString('en-IN')}</p>
            </div>
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
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);

  const interestRate = 24;

  const calculateMonths = (end) => {
    const start = new Date();
    const endD = new Date(end);
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
      setIsSubmitting(false);
      if (onSuccess) onSuccess();
      onNavigate('loans');
    } catch (err) { showAlert(t("Error", "त्रुटि"), t("Could not save. Check DB.", "सेव नहीं हो पाया। डेटाबेस चेक करें।")); setIsSubmitting(false); }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-700">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight">{t("Loan Origination", "लोन की शुरुआत")}</h1>
      </header>
      <div className="bg-[#111318] rounded-3xl border border-white/[0.04] p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">{t("Loan Amount (₹)", "लोन राशि (₹)")}</label>
              <input type="number" min="5000" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-5 py-4 bg-black/40 border border-white/[0.04] rounded-2xl text-white outline-none focus:ring-1 focus:ring-cyan-500" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">{t("End Date", "अंतिम तारीख")}</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-5 py-4 bg-black/40 border border-white/[0.04] rounded-2xl text-white outline-none focus:ring-1 focus:ring-cyan-500"
                required
              />
              <p className="text-xs text-cyan-400/80 ml-1 mt-1">{t("Estimated Time:", "अनुमानित समय:")} {calculateMonths(endDate)} {t("Months", "महीने")}</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-900/30 to-cyan-900/30 p-6 rounded-2xl border border-white/[0.04] flex justify-center">
            <div className="text-center"><p className="text-sm text-cyan-200/70 mb-1">{t("Annual Interest Rate", "वार्षिक ब्याज दर")}</p><p className="text-2xl font-bold text-white">{interestRate}%</p></div>
          </div>
          <label className="flex items-start space-x-4 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-6 h-6 border-slate-600 rounded-lg checked:bg-cyan-500" />
            <span className="text-sm text-slate-400">{t("I consent to my data being securely stored in India.", "मैं अपनी सहमति देता/देती हूँ कि मेरा डेटा भारत में सुरक्षित रखा जाए।")}</span>
          </label>
          <button type="submit" disabled={isSubmitting || !consent} className="w-full py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 transition-all">{isSubmitting ? t('Processing...', 'प्रोसेस हो रहा है...') : t('Submit Application', 'एप्लिकेशन जमा करें')}</button>
        </form>
      </div>
    </div>
  );
}

export function MyLoansView({ loans, profile }) {
  const { t } = useContext(LanguageContext);
  const [historyLoan, setHistoryLoan] = useState(null); 

  if (loans.length === 0) return (<div className="text-center py-20"><h2 className="text-2xl font-bold text-white">{t("No loans found", "कोई लोन नहीं है")}</h2></div>);

const downloadLedger = async (loan) => {
    try {
      const accruedInterest = calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt);
      const netBaki = Number(loan.amount) + accruedInterest - Number(loan.recoveredAmount || 0);

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text("LeaderPro - Loan Ledger", 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);
      doc.text(`Borrower: ${profile?.full_name || 'N/A'}`, 14, 38);
      doc.text(`Loan ID: ${loan.id}`, 14, 44);

      const tableRows = [
        ["Disbursed Date", new Date(Number(loan.createdAt)).toLocaleDateString()],
        ["Principal Amount", `Rs. ${Number(loan.amount).toLocaleString('en-IN')}`],
        ["Interest Rate", `${loan.interestRate}% P.A.`],
        ["Accrued Interest", `Rs. ${accruedInterest.toLocaleString('en-IN')}`],
        ["Recovered Amount", `Rs. ${Number(loan.recoveredAmount || 0).toLocaleString('en-IN')}`],
        ["Net Liability", `Rs. ${netBaki.toLocaleString('en-IN')}`],
        ["Status", loan.status === 'active' ? 'Active' : loan.status.charAt(0).toUpperCase() + loan.status.slice(1)]
      ];

      if (loan.adminNote) {
        tableRows.push(["Admin Note", loan.adminNote]);
      }

      autoTable(doc, {
        startY: 52,
        head: [["Field", "Details"]],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [8, 145, 178] }, 
        styles: { fontSize: 10 }
      });

      // 📱 MOBILE vs 💻 WEB DOWNLOAD LOGIC
      if (Capacitor.isNativePlatform()) {
        const fileName = `LeaderPro_Ledger_${loan.id.substring(0,8)}.pdf`;
        const pdfBase64 = doc.output('datauristring').split(',')[1]; 
        
        // Save to temporary Cache directory
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache
        });
        
        // Open the native mobile Share/Save menu
        await Share.share({
          title: 'Loan Ledger PDF',
          text: 'Here is your Loan Ledger from LeaderPro.',
          url: writeResult.uri,
          dialogTitle: 'Save or Share PDF Ledger',
        });

      } else {
        doc.save(`LeaderPro_Ledger_${loan.id.substring(0,8)}.pdf`);
      }
    } catch (error) {
      console.error("PDF Error: ", error);
      alert(t("Error generating or downloading PDF. Please try again.", "PDF बनाने या डाउनलोड करने में एरर आई है। कृपया दोबारा प्रयास करें।"));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="mb-8"><h1 className="text-4xl font-bold text-white tracking-tight">{t("My Loans", "मेरे लोन")}</h1></header>
      <div className="grid gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {loans.map((loan) => {
          const accruedInterest = calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt);
          const netBaki = Number(loan.amount) + accruedInterest - Number(loan.recoveredAmount || 0);
          
          return (
          <div key={loan.id} className="bg-[#111318] rounded-3xl border border-white/[0.04] p-6 flex flex-col md:flex-row md:items-start justify-between gap-8 shadow-xl shrink-0">
            <div className="flex-1 w-full">
              <div className="flex items-center space-x-4 mb-3">
                <h3 className="text-2xl font-bold text-white">{loan.type || 'Personal Loan'}</h3>
                <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase bg-white/10 text-white">{loan.status}</span>
              </div>
              <p className="text-sm text-slate-400 mb-6 font-mono">{t("Started on:", "शुरू हुआ:")} {new Date(Number(loan.createdAt)).toLocaleDateString()}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-black/30 p-4 rounded-2xl border border-white/[0.04]"><p className="text-xs text-slate-500 uppercase">{t("Principal Given", "मूलधन दिया गया")}</p><p className="font-bold text-white">₹{Number(loan.amount).toLocaleString('en-IN')}</p></div>
                <div className="bg-black/30 p-4 rounded-2xl border border-white/[0.04]"><p className="text-xs text-slate-500 uppercase">{t("Accrued Interest", "लगा ब्याज")} ({loan.interestRate}%)</p><p className="font-bold text-amber-400">+ ₹{accruedInterest.toLocaleString('en-IN')}</p></div>
                <div className="bg-black/30 p-4 rounded-2xl border border-white/[0.04]"><p className="text-xs text-slate-500 uppercase">{t("Amount Recovered", "वापस आया")}</p><p className="font-bold text-emerald-400">- ₹{Number(loan.recoveredAmount || 0).toLocaleString('en-IN')}</p></div>
                <div className="bg-black/30 p-4 rounded-2xl border border-white/[0.04]"><p className="text-xs text-emerald-300 uppercase">{t("Net Balance", "नेट बाकी")}</p><p className="font-bold text-white">₹{netBaki.toLocaleString('en-IN')}</p></div>
              </div>
              {loan.adminNote && (
                <div className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-xl flex items-start space-x-3"><MessageSquare className="h-5 w-5 text-indigo-400" /><div><p className="text-xs text-indigo-300 font-bold uppercase">{t("Admin Message / Terms:", "एडमिन संदेश / शर्तें:")}</p><p className="text-white text-sm">{loan.adminNote}</p></div></div>
              )}
            </div>
            
            <div className="flex flex-col space-y-4 min-w-[200px] w-full md:w-auto shrink-0 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
              <button onClick={() => setHistoryLoan(loan)} className="w-full flex items-center justify-center space-x-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 px-5 py-3.5 rounded-2xl transition-all duration-300 font-medium">
                <Clock className="h-5 w-5 text-blue-400" />
                <span>{t("View History", "हिस्ट्री देखें")}</span>
              </button>
              <button onClick={() => downloadLedger(loan)} className="w-full flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-3.5 rounded-2xl transition-all duration-300 font-medium">
                <FileText className="h-5 w-5 text-slate-300" />
                <span>{t("Download Ledger", "लेज़र डाउनलोड करें")}</span>
              </button>
            </div>
          </div>
        )})}
      </div>
      
      {historyLoan && (
         <LoanHistoryModal 
           loan={historyLoan} 
           onClose={() => setHistoryLoan(null)} 
           t={t}
         />
      )}
    </div>
  );
}

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

  const uploadFile = async (file, type) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}_${type}_${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;

    try {
      const response = await fetch(`${supabaseUrl}/storage/v1/object/kyc-documents/${filePath}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': file.type
        },
        body: file
      });
      if (!response.ok) throw new Error(`Failed to upload ${type}`);
      return `${supabaseUrl}/storage/v1/object/public/kyc-documents/${filePath}`;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName) { showAlert(t("Warning", "चेतावनी"), t("Name is required", "नाम लिखना जरूरी है")); return; }
    setIsSubmitting(true);

    let aadhar_front_url = profile?.aadhar_front_url || null;
    let aadhar_back_url = profile?.aadhar_back_url || null;
    let pan_url = profile?.pan_url || null;
    let selfie_url = profile?.selfie_url || null;

    if (aadharFront) aadhar_front_url = await uploadFile(aadharFront, 'aadhar_front');
    if (aadharBack) aadhar_back_url = await uploadFile(aadharBack, 'aadhar_back');
    if (panCard) pan_url = await uploadFile(panCard, 'pan');
    if (selfie) selfie_url = await uploadFile(selfie, 'selfie');

    const data = {
      user_id: session.user.id,
      admin_id: session.user.user_metadata?.linked_admin_id,
      full_name: fullName,
      father_name: fatherName,
      aadhar_no: aadharNo,
      phone: phone,
      address: address,
      kyc_status: profile?.kyc_status === 'Verified' ? 'Verified' : 'Pending',
      aadhar_front_url,
      aadhar_back_url,
      pan_url,
      selfie_url
    };

    if (!profile) data.createdAt = Date.now();
    else data.id = profile.id;

    await onSave(data, !!profile);
    setIsSubmitting(false);
  };

  const FileUploadBtn = ({ label, onChange, currentUrl }) => (
    <div className="relative group cursor-pointer w-full">
      <input type="file" accept="image/*" onChange={onChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
      <div className={`flex items-center justify-center space-x-2 border-2 border-dashed p-4 rounded-xl transition-all duration-300 ${currentUrl ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-600 bg-black/40 group-hover:border-cyan-500 group-hover:bg-cyan-950/30'}`}>
        {currentUrl ? <Check className="h-5 w-5 text-emerald-400" /> : <Upload className="h-5 w-5 text-slate-400 group-hover:text-cyan-400" />}
        <span className={`text-sm font-semibold ${currentUrl ? 'text-emerald-400' : 'text-slate-300 group-hover:text-cyan-400'}`}>
          {currentUrl ? `${label} (${t("Uploaded", "अपलोड हो गया")})` : `${t("Upload", "अपलोड करें")} ${label}`}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">{t("My Profile & KYC", "मेरी प्रोफाइल और KYC")}</h1>
        <p className="text-slate-400 mt-2 text-lg">{t("Fill your details and upload KYC documents.", "अपनी जानकारी भरें और KYC डाक्यूमेंट्स अपलोड करें।")}</p>
      </header>

      <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-cyan-500/30 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center space-x-3 mb-6">
          <User className="text-cyan-400 h-8 w-8" />
          <h2 className="text-2xl font-bold text-white">{t("Fill Your Details (Profile)", "अपनी जानकारी (प्रोफाइल) भरें")}</h2>
          {profile?.kyc_status === 'Verified' && <span className="ml-auto bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold flex items-center"><Check className="h-4 w-4 mr-1" /> KYC Verified</span>}
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Full Name", "पूरा नाम")}</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none" required disabled={profile?.kyc_status === 'Verified'} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Father's Name", "पिता का नाम")}</label>
              <input type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none" disabled={profile?.kyc_status === 'Verified'} />
            </div>

            <div className="space-y-2 relative">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center">
                {t("Aadhar Number", "आधार नंबर")}
                <Lock className="h-3 w-3 ml-2 text-red-400/80" />
              </label>
              <input
                type="text"
                value={aadharNo}
                readOnly={true}
                className="w-full px-4 py-3 bg-black/50 border border-white/5 rounded-xl text-slate-500 font-mono tracking-widest cursor-not-allowed outline-none select-all"
              />
              <p className="text-[10px] text-slate-500/80">{t("Aadhar provided during account creation cannot be changed.", "अकाउंट बनाते समय दिया गया आधार नंबर बदला नहीं जा सकता।")}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Phone Number", "फोन नंबर")}</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{t("Address", "पता")}</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none resize-none h-24" />
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center"><FileText className="h-5 w-5 mr-2 text-cyan-400" /> {t("Upload KYC Documents", "KYC डाक्यूमेंट्स अपलोड करें")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FileUploadBtn label="Aadhar Front" onChange={(e) => setAadharFront(e.target.files[0])} currentUrl={profile?.aadhar_front_url || aadharFront} />
              <FileUploadBtn label="Aadhar Back" onChange={(e) => setAadharBack(e.target.files[0])} currentUrl={profile?.aadhar_back_url || aadharBack} />
              <FileUploadBtn label="PAN Card" onChange={(e) => setPanCard(e.target.files[0])} currentUrl={profile?.pan_url || panCard} />
              <FileUploadBtn label="Selfie Photo" onChange={(e) => setSelfie(e.target.files[0])} currentUrl={profile?.selfie_url || selfie} />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-cyan-500 hover:bg-cyan-400 text-black px-8 py-4 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] text-lg">
            {isSubmitting ? t('Uploading Documents & Saving...', 'डाक्यूमेंट्स अपलोड और सेव हो रहे हैं...') : t('Save Profile & Documents', 'प्रोफाइल और डाक्यूमेंट्स सेव करें')}
          </button>
        </form>
      </div>
    </div>
  );
}

export function UserLiveChatView({ session, profile, chats, onSend, onClose }) {
  const { t } = useContext(LanguageContext);
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
          <h1 className="text-4xl font-bold text-white tracking-tight">{t("Live Chat / Support", "लाइव चैट / सहायता")}</h1>
          <p className="text-slate-400 mt-2 text-lg">{t("Send a direct message to your Admin.", "अपने एडमिन को सीधा मैसेज भेजें।")}</p>
        </div>
        <button onClick={onClose} className="flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl transition-all text-sm font-bold w-full sm:w-auto">
          <X className="h-4 w-4" /> <span>{t("Close Chat", "चैट बंद करें")}</span>
        </button>
      </header>

      <div className="flex-1 bg-[#111318] rounded-3xl border border-white/[0.04] shadow-xl overflow-hidden flex flex-col min-h-0 max-w-3xl">
        <div className="p-4 border-b border-white/10 bg-black/20 flex items-center space-x-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center border border-indigo-500/30">
            <Headset className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">{t("Admin Support", "एडमिन सपोर्ट")}</h3>
            <p className="text-[10px] text-emerald-400 flex items-center"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span> {t("Online", "ऑनलाइन")}</p>
          </div>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 min-h-0 bg-black/10 scroll-smooth">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 text-center px-4">
              <MessageCircle className="h-16 w-16 opacity-20" />
              <p>{t("No messages yet. Say hello to your admin!", "अभी तक कोई मैसेज नहीं है। अपने एडमिन को हेलो कहें!")}</p>
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
              placeholder={t("Type your message here...", "अपना मैसेज यहाँ लिखें...")}
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

export function UserNotificationsModal({ notifications, onClose }) {
  const { t } = useContext(LanguageContext);
  const notifs = Array.isArray(notifications) ? notifications : [];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111318] border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full relative max-h-[80vh] flex flex-col">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"><X className="h-6 w-6" /></button>

        <div className="flex items-center space-x-3 mb-6 shrink-0">
          <div className="p-2 bg-blue-500/20 rounded-xl">
            <Bell className="h-6 w-6 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">{t("Your Messages", "आपके मैसेज")}</h3>
        </div>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
          {notifs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>{t("No new messages yet.", "अभी कोई नया मैसेज नहीं है।")}</p>
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
          {t("Close", "बंद करें")}
        </button>
      </div>
    </div>
  );
}