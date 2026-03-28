// src/components/UserViews.jsx
import React, { useState, useContext } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Naya tareeka
import { 
  Activity, CreditCard, Check, Plus, FileText, Bot, Sparkles, 
  PieChart, BarChart, Download, X, Clock, User, Phone, Hash, MapPin, Upload, MessageSquare,Star, Lock
} from 'lucide-react';
import { LanguageContext } from '../App';
import { supabaseUrl, supabaseKey, calculateAccruedInterest, callGeminiAI,generateLoanPDF,calculateTrustScore,getScoreRating } from '../utils';
import { StatCard, AIInsightsModal, LoanHistoryModal } from './AdminDashboard';

export function DashboardView({ loans, onNavigate }) {
  const { t, lang } = useContext(LanguageContext);
  
  // --- TRUST SCORE CALCULATION ---
  const trustScore = calculateTrustScore(loans);
  const rating = getScoreRating(trustScore);

  const activeLoans = loans.filter(l => l.status === 'active');
  // ... (baaki purana calculation code waisa hi rehne dein)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <header className="mb-8 flex justify-between items-end">
        {/* ... (Header code) */}
      </header>

      {/* Stat Cards Grid (Principal, Liability, Recovery) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ... (Aapke purane 3 StatCards) */}
      </div>

      {/* --- NAYA: TRUST SCORE WIDGET YAHAN LAGAYEIN --- */}
      <div className={`mt-8 p-8 rounded-[2.5rem] border ${rating.border} ${rating.bg} backdrop-blur-xl relative overflow-hidden group transition-all duration-500 hover:shadow-2xl`}>
        {/* Background Animation Blob */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center space-x-6 text-center md:text-left flex-col md:flex-row">
            <div className={`p-5 rounded-[2rem] bg-black/40 ${rating.color} shadow-inner border border-white/5`}>
              <Star className="h-10 w-10 animate-pulse" fill="currentColor" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">LeaderPro Trust Score</h3>
              <p className="text-slate-400 text-sm mt-1">Aapki financial reliability ka live report card</p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end">
            <div className="flex items-baseline space-x-1">
              <span className={`text-7xl font-black tracking-tighter ${rating.color}`}>{trustScore}</span>
              <span className="text-slate-500 font-bold text-xl">/900</span>
            </div>
            <div className={`mt-2 inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${rating.bg} ${rating.color} border ${rating.border} shadow-lg`}>
              {rating.label} Member
            </div>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="mt-10 relative">
          <div className="w-full h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 p-1 shadow-inner">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(34,211,238,0.4)] bg-gradient-to-r from-indigo-600 via-cyan-500 to-emerald-400`} 
              style={{ width: `${(trustScore / 900) * 100}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between mt-3 px-1">
            <div className="flex flex-col items-start">
               <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Risky Zone</span>
               <span className="text-xs font-bold text-red-500/50">300</span>
            </div>
            <div className="flex flex-col items-center">
               <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Standard</span>
               <span className="text-xs font-bold text-amber-500/50">500</span>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">Elite Member</span>
               <span className="text-xs font-bold text-emerald-500/50">900</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <UserVisualAnalytics loans={loans} t={t} />

      {/* Action Buttons Section */}
      {/* ... (Baaki code) */}
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
                   <span className="text-[10px] text-slate-500 uppercase tracking-widest">{t("Paid", "Chukaya")}</span>
                </div>
             </div>
          </div>
          <div className="w-full text-center sm:text-left">
             <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest flex items-center justify-center sm:justify-start">
                 <PieChart className="h-4 w-4 mr-2 text-emerald-400" /> {t("Repayment Progress", "Payment Progress")}
             </h3>
             <p className="text-xs text-slate-400 mb-4">{t("Your journey to becoming debt-free.", "Loan mukt hone ki aapki progress.")}</p>
             <div className="bg-black/30 px-4 py-2 rounded-xl inline-block border border-white/5">
                <span className="text-xs text-slate-500 block uppercase tracking-widest">{t("Remaining", "Baki Hai")}</span>
                <span className="text-lg font-bold text-white">₹{(totalExpected - totalRecovery).toLocaleString('en-IN')}</span>
             </div>
          </div>
       </div>

       <div className="bg-[#111318] p-6 rounded-3xl border border-white/[0.04] shadow-xl hover:border-amber-500/20 transition-all flex flex-col justify-between">
          <div>
             <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center">
                <BarChart className="h-4 w-4 mr-2 text-amber-400" /> {t("Debt Breakdown", "Rashi Ka Vibhajan")}
             </h3>
             <div className="space-y-4">
                <div className="w-full h-8 bg-slate-800/50 rounded-xl overflow-hidden flex border border-white/5">
                   <div className="bg-blue-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-1000" style={{ width: `${principalPct}%` }}>{principalPct > 10 ? 'Principal' : ''}</div>
                   <div className="bg-amber-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-1000" style={{ width: `${interestPct}%` }}>{interestPct > 10 ? 'Interest' : ''}</div>
                </div>
             </div>
          </div>
          <div className="pt-4 mt-4 border-t border-white/10 grid grid-cols-2 gap-4">
             <div className="flex items-center space-x-3 bg-black/20 p-2 rounded-lg border border-white/5">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                <div>
                   <p className="text-[10px] text-slate-500 uppercase">{t("Principal", "Mool Rashi")}</p>
                   <p className="text-sm font-bold text-white">₹{totalDisbursed.toLocaleString('en-IN')}</p>
                </div>
             </div>
             <div className="flex items-center space-x-3 bg-black/20 p-2 rounded-lg border border-white/5">
                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
                <div>
                   <p className="text-[10px] text-slate-500 uppercase">{t("Interest", "Laga Byaj")}</p>
                   <p className="text-sm font-bold text-white">₹{totalInterest.toLocaleString('en-IN')}</p>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

export function OriginationView({ session, onNavigate, onSuccess, isAdmin, showAlert }) {
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
    if (!consent) { showAlert("Warning", "Consent zaroori hai."); return; }
    
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
    } catch (err) { showAlert("Error", "Save nahi ho paya. DB check karein."); setIsSubmitting(false); }
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-700">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight">Loan <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Shuruvaat</span></h1>
      </header>
      <div className="bg-[#111318] rounded-3xl border border-white/[0.04] p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Loan Rashi (₹)</label><input type="number" min="5000" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-5 py-4 bg-black/40 border border-white/[0.04] rounded-2xl text-white outline-none focus:ring-1 focus:ring-cyan-500" required /></div>
            <div className="space-y-2">
               <label className="text-sm font-medium text-slate-300">Kab Tak Ke Liye (End Date)</label>
               <input 
                 type="date" 
                 min={new Date().toISOString().split('T')[0]}
                 value={endDate} 
                 onChange={(e) => setEndDate(e.target.value)} 
                 className="w-full px-5 py-4 bg-black/40 border border-white/[0.04] rounded-2xl text-white outline-none focus:ring-1 focus:ring-cyan-500" 
                 required 
               />
               <p className="text-xs text-cyan-400/80 ml-1 mt-1">Anumanit Samay: {calculateMonths(endDate)} Mahine</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-900/30 to-cyan-900/30 p-6 rounded-2xl border border-white/[0.04] flex justify-center">
            <div className="text-center"><p className="text-sm text-cyan-200/70 mb-1">Saalana Byaj Dar</p><p className="text-2xl font-bold text-white">{interestRate}%</p></div>
          </div>
          <label className="flex items-start space-x-4 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-6 h-6 border-slate-600 rounded-lg checked:bg-cyan-500" />
            <span className="text-sm text-slate-400">Main apni sahmati deta/deti hoon ki mera data Bharat (India) mein safe rakha jaye.</span>
          </label>
          <button type="submit" disabled={isSubmitting || !consent} className="w-full py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 transition-all">{isSubmitting ? 'Processing...' : 'Application Jama Karein'}</button>
        </form>
      </div>
    </div>
  );
}

export function MyLoansView({ loans, profile }) {
  const [historyLoan, setHistoryLoan] = useState(null); 

  if (loans.length === 0) return (<div className="text-center py-20"><h2 className="text-2xl font-bold text-white">Koi loan nahi hai</h2></div>);

 // PDF DOWNLOAD CALL (Line 235 ke aas-paas)
  const downloadLedger = async (loan) => {
    try {
      // 1. Pehle PDF generate karein (Ye aapke utils se aa raha hai)
      const doc = generateLoanPDF(loan, profile);
      
      // 2. Mobile App Check
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        // PDF ko Data URI mein convert karein
        const pdfDataUri = doc.output('datauristring');
        
        // System browser (Chrome) mein download ke liye bhejein
        await Browser.open({ 
          url: pdfDataUri, 
          windowName: '_system' 
        });
      } else {
        // Normal Laptop/Web browser ke liye
        doc.save(`LeaderPro_Ledger_${loan.id.substring(0,8)}.pdf`);
      }
    } catch (error) {
      console.error("PDF Error: ", error);
      alert("PDF banane ya download karne mein error aayi hai.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="mb-8"><h1 className="text-4xl font-bold text-white tracking-tight">Mere <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Loans</span></h1></header>
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
              <p className="text-sm text-slate-400 mb-6 font-mono">Shuru hua: {new Date(Number(loan.createdAt)).toLocaleDateString()}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-black/30 p-4 rounded-2xl border border-white/[0.04]"><p className="text-xs text-slate-500 uppercase">Pehle Diye</p><p className="font-bold text-white">₹{Number(loan.amount).toLocaleString('en-IN')}</p></div>
                <div className="bg-black/30 p-4 rounded-2xl border border-white/[0.04]"><p className="text-xs text-slate-500 uppercase">Laga Byaj ({loan.interestRate}%)</p><p className="font-bold text-amber-400">+ ₹{accruedInterest.toLocaleString('en-IN')}</p></div>
                <div className="bg-black/30 p-4 rounded-2xl border border-white/[0.04]"><p className="text-xs text-slate-500 uppercase">Wapas Aaye</p><p className="font-bold text-emerald-400">- ₹{Number(loan.recoveredAmount || 0).toLocaleString('en-IN')}</p></div>
                <div className="bg-black/30 p-4 rounded-2xl border border-white/[0.04]"><p className="text-xs text-emerald-300 uppercase">Net Baki</p><p className="font-bold text-white">₹{netBaki.toLocaleString('en-IN')}</p></div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-4 min-w-[200px] w-full md:w-auto shrink-0 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
              <button onClick={() => setHistoryLoan(loan)} className="w-full flex items-center justify-center space-x-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 px-5 py-3.5 rounded-2xl transition-all duration-300 font-medium">
                <Clock className="h-5 w-5 text-blue-400" />
                <span>History Dekhein</span>
              </button>
              <button onClick={() => downloadLedger(loan)} className="w-full flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-3.5 rounded-2xl transition-all duration-300 font-medium">
                <FileText className="h-5 w-5 text-slate-300" />
                <span>Ledger Download</span>
              </button>
            </div>
          </div>
        )})}
      </div>
      
      {historyLoan && (
         <LoanHistoryModal 
           loan={historyLoan} 
           onClose={() => setHistoryLoan(null)} 
         />
      )}
    </div>
  );
}

export function UserMyProfileView({ profile, session, onSave, showAlert }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [fatherName, setFatherName] = useState(profile?.father_name || ''); 
  // Note: AadharNo state is still here, but user won't be able to change it
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
     if(!fullName) { showAlert("Warning", "Naam likhna zaroori hai"); return; }
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
       aadhar_no: aadharNo, // Database me bhejne ke liye 
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
     showAlert("Success", "Profile aur Documents save ho gaye!");
  };

  const FileUploadBtn = ({ label, onChange, currentUrl }) => (
    <div className="relative group cursor-pointer w-full">
      <input type="file" accept="image/*" onChange={onChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
      <div className={`flex items-center justify-center space-x-2 border-2 border-dashed p-4 rounded-xl transition-all duration-300 ${currentUrl ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-600 bg-black/40 group-hover:border-cyan-500 group-hover:bg-cyan-950/30'}`}>
        {currentUrl ? <Check className="h-5 w-5 text-emerald-400" /> : <Upload className="h-5 w-5 text-slate-400 group-hover:text-cyan-400" />}
        <span className={`text-sm font-semibold ${currentUrl ? 'text-emerald-400' : 'text-slate-300 group-hover:text-cyan-400'}`}>
          {currentUrl ? `${label} (Uploaded)` : `Upload ${label}`}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">Mera <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Profile & KYC</span></h1>
        <p className="text-slate-400 mt-2 text-lg">Apni details bharein aur KYC documents upload karein.</p>
      </header>

      <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-cyan-500/30 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center space-x-3 mb-6">
           <User className="text-cyan-400 h-8 w-8" />
           <h2 className="text-2xl font-bold text-white">Apni Jankari (Profile) Bharein</h2>
           {profile?.kyc_status === 'Verified' && <span className="ml-auto bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold flex items-center"><Check className="h-4 w-4 mr-1"/> KYC Verified</span>}
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Poora Naam</label>
              <input type="text" value={fullName} onChange={(e)=>setFullName(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none" required disabled={profile?.kyc_status === 'Verified'} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Pita Ka Naam (Father's Name)</label>
              <input type="text" value={fatherName} onChange={(e)=>setFatherName(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none" disabled={profile?.kyc_status === 'Verified'} />
            </div>
            
            {/* --- NAYA: AADHAR LOCK FEATURE --- */}
            <div className="space-y-2 relative">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center">
                Aadhar Number 
                <Lock className="h-3 w-3 ml-2 text-red-400/80" />
              </label>
              <input 
                type="text" 
                value={aadharNo} 
                readOnly={true} // Ye input ko type hone se rokega
                className="w-full px-4 py-3 bg-black/50 border border-white/5 rounded-xl text-slate-500 font-mono tracking-widest cursor-not-allowed outline-none select-all" 
              />
              <p className="text-[10px] text-slate-500/80">Account banate waqt diya gaya Aadhar change nahi kiya ja sakta.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Phone Number</label>
              <input type="text" value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Pata (Address)</label>
              <textarea value={address} onChange={(e)=>setAddress(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none resize-none h-24" />
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center"><FileText className="h-5 w-5 mr-2 text-cyan-400"/> KYC Documents Upload Karein</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <FileUploadBtn label="Aadhar Front" onChange={(e) => setAadharFront(e.target.files[0])} currentUrl={profile?.aadhar_front_url || aadharFront} />
               <FileUploadBtn label="Aadhar Back" onChange={(e) => setAadharBack(e.target.files[0])} currentUrl={profile?.aadhar_back_url || aadharBack} />
               <FileUploadBtn label="PAN Card" onChange={(e) => setPanCard(e.target.files[0])} currentUrl={profile?.pan_url || panCard} />
               <FileUploadBtn label="Selfie Photo" onChange={(e) => setSelfie(e.target.files[0])} currentUrl={profile?.selfie_url || selfie} />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-cyan-500 hover:bg-cyan-400 text-black px-8 py-4 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] text-lg">
            {isSubmitting ? 'Uploading Documents & Saving...' : 'Save Profile & Documents'}
          </button>
        </form>
      </div>
    </div>
  );
}