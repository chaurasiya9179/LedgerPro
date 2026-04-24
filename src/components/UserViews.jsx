import React, { useState, useContext, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import {
  Bot, Star, CreditCard, ChevronRight, FileText, Plus, Send, Clock, User,
  Phone, Hash, MapPin, Activity, Upload, Download, PieChart, BarChart,
  MessageSquare, MessageCircle, Mail, Check, X, UserPlus, Edit, Trash, Users,
  Bell, Headset, Lock, AlertCircle, Percent, TrendingUp, ShieldCheck, DollarSign, Award, Gift, LineChart, BookOpen, Lightbulb, Flame, Play, Pause, SkipForward, SkipBack, Headphones, Music, Home
} from 'lucide-react';
import { LanguageContext } from '../App';
import { supabaseUrl, supabaseKey, calculateAccruedInterest, callGeminiAI, calculateTrustScore, getScoreRating } from '../utils';

// ==========================================
// 1. DASHBOARD VIEW (MAIN PAGE)
// ==========================================
export function DashboardView({ loans = [], profile, onNavigate, session, showAlert, onSuccess }) {
  const { t, lang } = useContext(LanguageContext);
  
  // --- 1. ALL HOOKS AT THE TOP (TO PREVENT CRASHES) ---
  const safeSession = session || (localStorage.getItem('leaderpro_session') ? JSON.parse(localStorage.getItem('leaderpro_session')) : null);
  const userId = safeSession?.user?.id;
  const accessToken = safeSession?.access_token;

  const [aiModal, setAiModal] = useState({ isOpen: false, loading: false, result: '', error: '' });
  const [liveProfile, setLiveProfile] = useState(profile);
  const [isCheckingLock, setIsCheckingLock] = useState(true);
  const [dailyData, setDailyData] = useState(null);
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);

  const todayDate = new Date().toDateString(); 
  const quizStorageKey = `quiz_played_${userId}`;
  const dataStorageKey = `daily_bundle_data`;
  const bonusCoinsKey = `bonus_coins_${userId}`;
  const streakKey = `quiz_streak_${userId}`;
  const lastDateKey = `quiz_last_date_${userId}`;

  const [hasPlayedToday, setHasPlayedToday] = useState(localStorage.getItem(quizStorageKey) === todayDate);
  const [quizStatus, setQuizStatus] = useState(hasPlayedToday ? 'success' : null);
  const [bonusCoins, setBonusCoins] = useState(Number(localStorage.getItem(bonusCoinsKey)) || 0);
  const [streak, setStreak] = useState(Number(localStorage.getItem(streakKey)) || 0);

  const [showWheel, setShowWheel] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [wheelDegrees, setWheelDegrees] = useState(0);

  const [nearbyAdmins, setNearbyAdmins] = useState([]);
  const [isLinking, setIsLinking] = useState(false);

  const podcasts = [
    { id: 1, title: t("Fundamentals of Personal Finance", "व्यक्तिगत वित्त और निवेश रणनीतियों के मूल सिद्धांत"), duration: "23:05", host: "LeaderPro Studios", color: "from-purple-500 to-pink-700", audioUrl: "https://shortlink.uk/1snF9" },
    { id: 2, title: t("Emergency Fund Basics", "इमरजेंसी फंड क्यों है ज़रूरी?"), duration: "24:21", host: "LeaderPro Studios", color: "from-blue-500 to-indigo-700", audioUrl: "https://shortlink.uk/1snFw" },
    { id: 3, title: t("Boost CIBIL Score Fast", "सिबिल स्कोर तेज़ी से कैसे बढ़ाएं?"), duration: "21:41", host: "LeaderPro Studios", color: "from-green-500 to-emerald-700", audioUrl: "https://shortlink.uk/1snFD" },
  ];
  
  const [activePodcast, setActivePodcast] = useState(podcasts[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  // --- 2. ALL EFFECTS ---
  useEffect(() => {
    const fetchFreshProfile = async () => {
      if(!userId) { setIsCheckingLock(false); return; }
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        if (data && data.length > 0) setLiveProfile(data[0]);
      } catch(e) {}
      setIsCheckingLock(false);
    };
    fetchFreshProfile();
  }, [userId, accessToken]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(e => console.log("Audio error:", e));
      else audioRef.current.pause();
    }
  }, [isPlaying, activePodcast]);

  useEffect(() => {
    const fetchAdmins = async () => {
      if(!userId || !liveProfile) return;
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${accessToken}` } });
        const allProfiles = await res.json();
        const adminList = allProfiles.filter(p => p.user_id === p.admin_id);
        const exactMatchAdmins = adminList.filter(admin => admin.pincode === liveProfile?.pincode);
        setNearbyAdmins(exactMatchAdmins);
      } catch (err) { console.error(err); }
    };
    if (liveProfile && !liveProfile.admin_id) fetchAdmins();
  }, [liveProfile, accessToken, userId]);

  useEffect(() => {
    const loadDailyContent = async () => {
      if(!userId) return;
      const savedBundle = JSON.parse(localStorage.getItem(dataStorageKey));
      if (savedBundle && savedBundle.date === todayDate) { setDailyData(savedBundle.content); return; }
      setIsLoadingDaily(true);
      const prompt = `Generate a daily finance bundle in JSON format: 1. shloka (Sanskrit) 2. shloka_hi (Hindi trans) 3. wisdom_text (2 lines) 4. quiz_q (Finance question) 5. opt_a (Wrong) 6. opt_b (Correct). Return ONLY valid JSON.`;
      try {
        const response = await callGeminiAI(prompt, "You are a wise financial guru.");
        const cleanJson = response.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        localStorage.setItem(dataStorageKey, JSON.stringify({ date: todayDate, content: parsed }));
        setDailyData(parsed);
      } catch (err) {
        setDailyData({ shloka: "उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः।", shloka_hi: "मेहनत से ही काम पूरे होते हैं, केवल इच्छा करने से नहीं।", wisdom_text: "अपने कर्ज़ को चुकाने के लिए छोटे-छोटे कदम उठाएं, सफलता ज़रूर मिलेगी।", quiz_q: "ब्याज बचाने का सबसे अच्छा तरीका क्या है?", opt_a: "देर से पेमेंट करना", opt_b: "समय से पहले मूलधन चुकाना" });
      } finally { setIsLoadingDaily(false); }
    };
    loadDailyContent();
  }, [todayDate, userId]);

  // --- 3. LOGIC & FUNCTIONS ---
  const togglePlay = (podcast) => {
    if (activePodcast.id !== podcast.id) { setActivePodcast(podcast); setPlayProgress(0); setCurrentTime(0); setIsPlaying(true); } 
    else { setIsPlaying(!isPlaying); }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration) setPlayProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleAudioEnded = () => handleSkip('forward');
  const handleSkip = (direction) => {
    const currentIndex = podcasts.findIndex(p => p.id === activePodcast.id);
    let newIndex = direction === 'forward' ? (currentIndex + 1) % podcasts.length : (currentIndex - 1 + podcasts.length) % podcasts.length;
    setActivePodcast(podcasts[newIndex]); setPlayProgress(0); setCurrentTime(0); setIsPlaying(true);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - bounds.left) / bounds.width;
    const newTime = percentage * audioRef.current.duration;
    audioRef.current.currentTime = newTime; setCurrentTime(newTime); setPlayProgress(percentage * 100);
  };

  const formatTime = (tInSec) => {
    if (!tInSec || isNaN(tInSec)) return "0:00";
    const m = Math.floor(tInSec / 60); const s = Math.floor(tInSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSelectAdmin = async (admin) => {
    setIsLinking(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ admin_id: admin.user_id })
      });
      if (!res.ok) throw new Error("Sync failed");
      showAlert(t("Success", "सफलता"), t(`Synced with ${admin.full_name}! Waiting for their verification.`, `${admin.full_name} के साथ जुड़ गए! अब उनके वेरिफिकेशन का इंतज़ार करें।`));
      if (onSuccess) onSuccess(); 
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) { showAlert(t("Error", "त्रुटि"), t("Linking failed.", "लिंकिंग विफल रही।")); } 
    finally { setIsLinking(false); }
  };

  const handleAIAnalysis = async () => {
    setAiModal({ isOpen: true, loading: true, result: '', error: '' });
    const summary = { totalBorrowed: totalDisbursed, totalPaidBack: totalRecovery, currentDebt: netLiability, totalInterestAccrued: totalAccruedInterest, activeLoansCount: activeLoans.length };
    const promptText = `My Debt Profile: ${JSON.stringify(summary)}. Please provide a quick assessment of my financial health and give 2 practical tips on managing or paying off this debt.`;
    const sysInst = `You are a helpful empathetic personal finance AI advisor. Respond in ${lang === 'en' ? 'English' : 'Hindi'}. Be encouraging, keep it short, use bullet points.`;
    try {
      const response = await callGeminiAI(promptText, sysInst);
      setAiModal({ isOpen: true, loading: false, result: response, error: '' });
    } catch (e) { setAiModal({ isOpen: true, loading: false, result: '', error: t('AI Analysis failed.', 'AI विश्लेषण विफल हो गया।') }); }
  };

  const handleQuizAnswer = (isCorrect) => {
    if (hasPlayedToday) return; 
    let newStreak = streak;
    const lastDatePlayed = localStorage.getItem(lastDateKey);
    if (lastDatePlayed === new Date(Date.now() - 86400000).toDateString()) newStreak += 1; 
    else if (lastDatePlayed !== todayDate) newStreak = 1; 
    
    setStreak(newStreak); localStorage.setItem(streakKey, newStreak); localStorage.setItem(lastDateKey, todayDate);
    if (isCorrect) {
      setQuizStatus('success'); const finalCoins = bonusCoins + 10; setBonusCoins(finalCoins); localStorage.setItem(bonusCoinsKey, finalCoins); 
    } else { setQuizStatus('error'); }
    localStorage.setItem(quizStorageKey, todayDate); setHasPlayedToday(true);
    if (newStreak > 0 && newStreak % 1 === 0) setTimeout(() => { setShowWheel(true); }, 1500); 
  };

  const handleSpin = () => {
    setIsSpinning(true); setWheelDegrees(1800 + Math.floor(Math.random() * 360)); 
    setTimeout(() => {
       const won = [50, 100, 150, 200, 500][Math.floor(Math.random() * 5)];
       setSpinResult(won); const finalCoins = bonusCoins + won; setBonusCoins(finalCoins); localStorage.setItem(bonusCoinsKey, finalCoins); setIsSpinning(false);
    }, 3500); 
  };
  const closeWheel = () => { setShowWheel(false); setSpinResult(null); setWheelDegrees(0); };

  // Calculations
  const activeLoans = loans.filter(l => l.status === 'active');
  const totalDisbursed = activeLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const totalRecovery = activeLoans.reduce((sum, l) => sum + Number(l.recoveredAmount || 0), 0);
  const totalAccruedInterest = activeLoans.reduce((sum, l) => sum + calculateAccruedInterest(l.amount, l.interestRate, l.createdAt), 0);
  const netLiability = totalDisbursed + totalAccruedInterest - totalRecovery;
  const score = calculateTrustScore(loans);
  const rating = getScoreRating(score);
  const baseLeaderCoins = (loans.length > 0 && score > 400) ? (score - 400) * 10 : 0;
  const leaderCoins = baseLeaderCoins + bonusCoins;
  const totalSavedInterest = loans.reduce((sum, l) => {
    if (l.interestRate < 24) return sum + (Number(l.amount) * ((24 - l.interestRate) / 100));
    return sum;
  }, 0);
  const projectedWealth = Math.round(totalSavedInterest * Math.pow(1.12, 5));

  const hasBasicInfo = liveProfile && liveProfile.full_name && liveProfile.phone && liveProfile.address;
  const hasAllDocs = liveProfile && liveProfile.aadhar_front_url && liveProfile.aadhar_back_url && liveProfile.pan_url && liveProfile.selfie_url;
  const isProfileComplete = hasBasicInfo && hasAllDocs;
  const isSyncedWithAdmin = !!liveProfile?.admin_id;
  const isVerifiedByAdmin = liveProfile?.kyc_status === 'Verified';

  const firstName = liveProfile?.full_name ? liveProfile.full_name.split(' ')[0] : '';
  const displayTitle = lang === 'en' ? (firstName ? `${firstName}'s` : "Your") : (firstName ? `${firstName} का` : "आपका");

  // --- 4. EARLY RETURNS FOR LOCKS (MUST BE AFTER ALL HOOKS) ---
  if (isCheckingLock) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Activity className="animate-spin h-12 w-12 text-cyan-500" /></div>;
  }

  if (!isProfileComplete) {
    return (
      <div className="relative space-y-6 animate-in fade-in duration-1000 pb-10">
         <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-600/10 blur-[150px] rounded-full pointer-events-none -z-10"></div>
         <div className="bg-amber-500/10 border border-amber-500/30 p-8 rounded-[2.5rem] text-center mt-6 backdrop-blur-md shadow-xl">
            <Lock className="h-12 w-12 text-amber-400 mx-auto mb-4 animate-pulse" />
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-wide mb-2">{t("Step 1: Complete Your KYC", "स्टेप 1: अपनी KYC पूरी करें")}</h3>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">{t("Please fill all details and upload documents below to proceed.", "कृपया नीचे सारी जानकारी भरें और डाक्यूमेंट्स अपलोड करें।")}</p>
            <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="mt-6 inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-black px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105">
               <User className="h-5 w-5" /> <span>{t("Fill Profile Now", "अभी प्रोफाइल भरें")}</span>
            </button>
         </div>
         <div className="mt-8 transition-opacity">
            <UserMyProfileView profile={liveProfile} session={session} onSave={onSuccess} showAlert={showAlert} />
         </div>
      </div>
    );
  }

  if (isProfileComplete && !isSyncedWithAdmin) {
     return (
       <div className="relative space-y-6 animate-in fade-in duration-1000 pb-10">
         <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none -z-10"></div>
         <div className="bg-blue-500/10 border border-blue-500/30 p-8 rounded-[2.5rem] text-center mt-6 backdrop-blur-md shadow-xl">
            <Users className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-bounce" />
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-wide mb-2">{t("Step 2: Choose Your Branch", "स्टेप 2: अपनी ब्रांच चुनें")}</h3>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">{t("Your profile is saved. Now select your area Branch Manager so they can verify your documents.", "आपकी प्रोफाइल सेव हो गई है। अब अपने एरिया का ब्रांच मैनेजर चुनें ताकि वे आपके डाक्यूमेंट्स वेरीफाई कर सकें।")}</p>
         </div>
         <div className="bg-[#111318] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center"><MapPin className="h-5 w-5 mr-2 text-cyan-400" /> {t("Managers in Pincode:", "पिनकोड में मैनेजर:")} {liveProfile.pincode}</h2>
            </div>
            {nearbyAdmins.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {nearbyAdmins.map((admin) => (
                  <div key={admin.user_id} className="bg-[#111318] border border-white/10 hover:border-cyan-500/50 p-5 rounded-[2rem] transition-all duration-300 group shadow-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col items-start justify-between gap-5 relative overflow-hidden">
                    
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[30px] rounded-full group-hover:bg-cyan-500/10 transition-colors pointer-events-none"></div>

                    <div className="flex items-start gap-4 flex-1 w-full relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-900/50 to-black flex items-center justify-center border border-cyan-500/30 shrink-0 overflow-hidden shadow-inner">
                        {admin.selfie_url ? (
                           <img src={admin.selfie_url} alt="Admin" className="w-full h-full object-cover" />
                        ) : (
                           <span className="text-2xl font-black text-cyan-400 uppercase">{admin.full_name?.charAt(0) || 'A'}</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-white flex items-center tracking-wide">
                           {admin.full_name}
                           <span className="ml-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black flex items-center">
                              <Check className="h-2.5 w-2.5 mr-1" /> Verified
                           </span>
                        </h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5 mb-2">ID: {admin.user_id?.substring(0, 10).toUpperCase()}...</p>
                        
                        <p className="text-[10px] text-slate-400 flex items-start leading-relaxed">
                           <MapPin className="h-3.5 w-3.5 mr-1.5 mt-0.5 text-cyan-500 shrink-0" />
                           <span className="line-clamp-2">{admin.address || 'Address pending'}</span>
                        </p>
                        
                        {admin.phone && (
                           <p className="text-[10px] text-slate-400 flex items-center mt-1.5">
                             <Phone className="h-3.5 w-3.5 mr-1.5 text-cyan-500 shrink-0" />
                             +91 {admin.phone}
                           </p>
                        )}
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-between gap-4 border-t border-white/10 pt-4 relative z-10">
                      <div>
                         <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">{t("Interest Rate", "ब्याज दर")}</p>
                         <p className="text-2xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                           {admin.default_rate || 12.5}<span className="text-sm text-cyan-600">%</span>
                         </p>
                      </div>

                      <button onClick={() => handleSelectAdmin(admin)} disabled={isLinking} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-105">
                        {isLinking ? t("Linking...", "जोड़ रहे हैं...") : <><Check className="h-4 w-4 mr-2" /> {t("Select", "चुनें")}</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border border-red-500/20 rounded-3xl bg-red-950/10">
                <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                <p className="text-white font-bold">{t(`No Branch Manager found in Pincode ${liveProfile.pincode}`, `आपके पिनकोड ${liveProfile.pincode} पर अभी कोई ब्रांच मैनेजर नहीं है।`)}</p>
              </div>
            )}
         </div>
       </div>
     )
  }

  if (isProfileComplete && isSyncedWithAdmin && !isVerifiedByAdmin) {
    return (
      <div className="relative space-y-6 animate-in fade-in duration-1000 pb-10 flex flex-col items-center justify-center min-h-[70vh]">
         <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none -z-10 -translate-y-1/2"></div>
         <div className="bg-gradient-to-br from-indigo-950/50 to-black/80 border border-indigo-500/30 p-10 rounded-[3rem] text-center backdrop-blur-md shadow-2xl max-w-lg w-full">
            <div className="relative mx-auto w-24 h-24 mb-6">
               <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
               <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 border-2 border-indigo-500/50 rounded-full"><Clock className="h-10 w-10 text-indigo-400" /></div>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-wide mb-3">{t("Verification Pending", "वेरिफिकेशन पेंडिंग है")}</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">{t("Your profile has been submitted to your Branch Manager. Please wait while they review your KYC documents.", "आपकी प्रोफाइल ब्रांच मैनेजर को भेज दी गई है। कृपया उनके द्वारा डाक्यूमेंट्स चेक करने का इंतज़ार करें।")}</p>
            <div className="bg-black/50 border border-white/5 p-4 rounded-2xl flex items-center justify-center space-x-3 text-sm text-slate-400">
               <ShieldCheck className="h-5 w-5 text-indigo-400" /><span>{t("Dashboard will unlock automatically.", "डैशबोर्ड अपने आप खुल जाएगा।")}</span>
            </div>
         </div>
      </div>
    );
  }

  // --- 5. MAIN DASHBOARD RENDER ---
  return (
    <div className="relative space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-10">
      <audio ref={audioRef} src={activePodcast.audioUrl} onTimeUpdate={handleTimeUpdate} onEnded={handleAudioEnded} className="hidden" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      
      <header className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight capitalize">{displayTitle} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 capitalize">{t("Dashboard", "डैशबोर्ड")}</span></h1>
          <p className="text-slate-400 mt-2 text-lg">{t("Welcome to your personal financial command center.", "आपके पर्सनल फाइनेंसियल सेंटर में आपका स्वागत है।")}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <button onClick={() => onNavigate('my_profile')} className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-3.5 rounded-2xl transition-all font-bold group shadow-lg"><User className="h-5 w-5 text-slate-400 group-hover:text-white" /> <span>{t("Profile", "प्रोफाइल")}</span></button>
          <button onClick={handleAIAnalysis} className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-[#111318] border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 px-5 py-3.5 rounded-2xl transition-all font-bold group shadow-[0_0_20px_rgba(6,182,212,0.15)]"><Bot className="h-5 w-5 group-hover:scale-110" /> <span>{t("AI Advisor", "AI सलाहकार")}</span></button>
        </div>
      </header>

      {/* 🌟 COMPACT STATUS BAR 🌟 */}
      <div className="bg-[#111318]/80 backdrop-blur-md border border-white/10 px-5 py-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[30px] pointer-events-none"></div>
        <div className="flex items-center space-x-4">
          <div className={`p-2.5 rounded-xl border ${rating.bg} ${rating.border}`}><Star className={`h-5 w-5 ${rating.color}`} fill="currentColor" /></div>
          <div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">{t("Trust Score", "ट्रस्ट स्कोर")}</p>
            <div className="flex items-baseline"><span className="text-xl font-black text-white">{score}</span><span className="text-xs text-slate-500 font-bold ml-1">/900</span><span className={`ml-3 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${rating.bg} ${rating.color}`}>{rating.label}</span></div>
          </div>
        </div>
        <div className="hidden sm:block w-px h-10 bg-white/5"></div>
        <div className="flex items-center space-x-4 border-t border-white/5 sm:border-0 pt-3 sm:pt-0">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30"><Award className="h-5 w-5 text-amber-400" /></div>
          <div><p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest mb-0.5">{t("Leader Coins", "लीडर कॉइन्स")}</p>
            <div className="flex items-baseline"><span className="text-xl font-black text-amber-400">{leaderCoins}</span><span className="text-xs text-amber-500/60 font-bold ml-1">LC</span></div>
          </div>
        </div>
      </div>

      {/* CLICKABLE STATS HUD */}
      <div onClick={() => onNavigate('loans')} className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-2 cursor-pointer hover:-translate-y-1 transition-all duration-300 group/mainstats">
         <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] group-hover/mainstats:bg-white/[0.04] transition-all relative overflow-hidden"><Activity className="absolute -right-4 -top-4 w-24 h-24 text-blue-400 opacity-5" /><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">{t("Total Borrowed", "कुल लिया गया")}</p><p className="text-3xl font-black text-white">₹{totalDisbursed.toLocaleString('en-IN')}</p></div>
         <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] group-hover/mainstats:bg-white/[0.04] transition-all relative overflow-hidden"><TrendingUp className="absolute -right-4 -top-4 w-24 h-24 text-amber-400 opacity-5" /><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">{t("Interest & Fees", "ब्याज और फीस")}</p><p className="text-3xl font-black text-white">₹{totalAccruedInterest.toLocaleString('en-IN')}</p></div>
         <div className="bg-gradient-to-br from-cyan-950/40 to-blue-900/40 border border-cyan-500/30 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group hover:border-cyan-400/50 hover:shadow-[0_0_40px_rgba(6,182,212,0.25)] transition-all">
            <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-2 flex justify-between items-center"><span>{t("Net Liability", "कुल बाकी रकम")}</span><ChevronRight className="h-4 w-4 text-cyan-400 opacity-0 group-hover/mainstats:opacity-100 transition-opacity" /></p>
            <p className="text-4xl font-black text-cyan-300 relative z-10 tracking-tight">₹{netLiability.toLocaleString('en-IN')}</p>
         </div>
      </div>

      <UserVisualAnalytics loans={loans} t={t} />

      {/* 🎙️ LEADERPRO SHORTS */}
      <div className="bg-[#111318] border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden mt-8 group hover:border-white/10 transition-colors">
        <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${activePodcast.color} opacity-20 blur-3xl pointer-events-none transition-colors duration-1000`}></div>
        <div className="p-6 md:p-8 relative z-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-1/3 flex flex-col items-center shrink-0">
            <div className={`w-40 h-40 rounded-3xl bg-gradient-to-br ${activePodcast.color} flex items-center justify-center shadow-2xl mb-4 relative overflow-hidden group-hover:scale-105 transition-transform duration-500`}>
              {isPlaying && <div className="absolute inset-0 bg-white/10 animate-pulse"></div>}
              <Headphones className="h-16 w-16 text-white drop-shadow-lg" />
            </div>
            <h3 className="text-xl font-bold text-white text-center leading-tight mb-1">{activePodcast.title}</h3>
            <p className="text-sm text-slate-400 text-center flex items-center"><User className="h-3 w-3 mr-1"/> By {activePodcast.host}</p>
            <div className="flex items-center space-x-6 mt-6">
              <button onClick={() => handleSkip('backward')} className="text-slate-400 hover:text-white transition-colors"><SkipBack className="h-6 w-6" /></button>
              <button onClick={() => togglePlay(activePodcast)} className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]">{isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}</button>
              <button onClick={() => handleSkip('forward')} className="text-slate-400 hover:text-white transition-colors"><SkipForward className="h-6 w-6" /></button>
            </div>
            <div className="w-full mt-5 flex items-center space-x-3 px-2">
              <span className="text-xs text-slate-500 font-mono">{formatTime(currentTime)}</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer relative group/seekbar" onClick={handleSeek}>
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/seekbar:opacity-100 transition-opacity"></div>
                <div className="h-full bg-white transition-all duration-100 ease-linear relative" style={{ width: `${playProgress}%` }}><div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg scale-0 group-hover/seekbar:scale-100 transition-transform"></div></div>
              </div>
              <span className="text-xs text-slate-500 font-mono">{activePodcast.duration}</span>
            </div>
          </div>
          <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8">
            <div className="flex items-center justify-between mb-4"><h4 className="text-lg font-bold text-white tracking-wide flex items-center"><Music className="h-5 w-5 mr-2 text-indigo-400"/> {t("LeaderPro Shorts", "लीडरप्रो शॉर्ट्स")}</h4><span className="text-[10px] uppercase tracking-widest font-bold bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30">Podcast</span></div>
            <div className="space-y-3">
              {podcasts.map((podcast) => (
                <div key={podcast.id} onClick={() => togglePlay(podcast)} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${activePodcast.id === podcast.id ? 'bg-white/10 border border-white/20 shadow-inner' : 'bg-black/30 border border-white/5 hover:bg-white/5'}`}>
                  <div className="flex items-center space-x-4"><div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">{activePodcast.id === podcast.id && isPlaying ? <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div> : <Play className="h-4 w-4 text-slate-400 ml-0.5" />}</div><div><p className={`font-bold text-sm ${activePodcast.id === podcast.id ? 'text-white' : 'text-slate-300'}`}>{podcast.title}</p><p className="text-xs text-slate-500">{podcast.host}</p></div></div>
                  <span className="text-xs font-mono text-slate-500">{podcast.duration}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 🕉️ AUTOMATED DAILY WISDOM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 mt-6 relative z-10">
        <div className="bg-gradient-to-br from-orange-950/50 via-[#111318] to-[#111318] border border-orange-500/20 p-6 md:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group min-h-[220px]">
           {isLoadingDaily && <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-sm"><Activity className="animate-spin text-orange-400" /></div>}
           <div className="flex items-center justify-between mb-6">
             <div className="flex items-center space-x-3"><div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20"><BookOpen className="h-5 w-5 text-orange-400" /></div><h3 className="text-xl font-bold text-white tracking-wide">{t("Daily Wisdom", "आज का सुविचार")}</h3></div>
             {streak > 0 && (<div className="flex items-center space-x-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.2)] animate-in slide-in-from-right duration-500"><Flame className={`h-4 w-4 ${hasPlayedToday ? 'text-orange-400 animate-pulse' : 'text-slate-400'}`} /><span className="text-xs font-black text-orange-400 uppercase tracking-widest">{streak} {t("Day Streak", "दिन की स्ट्रीक")}</span></div>)}
           </div>
           {dailyData && (<div className="animate-in fade-in duration-700"><p className="text-orange-300 font-bold text-xl md:text-2xl mb-4 leading-relaxed font-serif">"{dailyData.shloka}"</p><p className="text-slate-300 text-sm mb-2 font-medium italic">- {dailyData.shloka_hi}</p><p className="text-slate-500 text-xs leading-relaxed">{dailyData.wisdom_text}</p></div>)}
        </div>
        <div className="bg-gradient-to-br from-indigo-950/40 to-[#111318] border border-indigo-500/30 p-6 md:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4"><div className="flex items-center space-x-3"><div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/30"><Lightbulb className="h-5 w-5 text-indigo-400" /></div><h3 className="text-xl font-bold text-white tracking-wide">{t("Learn & Earn", "सीखें और कमाएं")}</h3></div><div className="bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center shadow-[0_0_10px_rgba(245,158,11,0.2)]"><Gift className="h-3.5 w-3.5 mr-1.5" /> {t("Win 10 LC", "10 LC जीतें")}</div></div>
          <div className="relative min-h-[140px] flex flex-col justify-center">
            {isLoadingDaily ? <Activity className="animate-spin mx-auto text-indigo-400" /> : quizStatus === 'success' ? (<div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center animate-in zoom-in"><Check className="h-10 w-10 text-emerald-400 mx-auto mb-2"/><p className="text-emerald-200 text-sm font-bold">{t("Already Earned for Today! See you tomorrow.", "आज का इनाम मिल गया! कल मिलते हैं।")}</p></div>) : quizStatus === 'error' ? (<div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-center"><X className="h-10 w-10 text-red-400 mx-auto mb-2"/><p className="text-red-200 text-sm">{t("Better luck tomorrow!", "कल फिर कोशिश करें!")}</p></div>) : dailyData && (<div><p className="text-sm font-bold text-slate-300 mb-5">{dailyData.quiz_q}</p><div className="grid grid-cols-1 gap-3"><button onClick={() => handleQuizAnswer(false)} className="text-left p-4 rounded-xl border border-white/5 bg-black/40 hover:bg-white/5 text-slate-400 transition-all text-sm">{dailyData.opt_a}</button><button onClick={() => handleQuizAnswer(true)} className="text-left p-4 rounded-xl border border-white/5 bg-black/40 hover:bg-indigo-500/10 text-slate-400 transition-all text-sm">{dailyData.opt_b}</button></div></div>)}
          </div>
        </div>
      </div>

      {/* 📈 SMART WEALTH TRACKER */}
      <div className="bg-gradient-to-br from-emerald-950/40 to-[#05100a] border border-emerald-500/30 p-6 md:p-8 rounded-[2.5rem] shadow-[0_0_40px_rgba(16,185,129,0.1)] relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 mb-8 group hover:border-emerald-500/50 transition-all">
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 blur-[50px] pointer-events-none"></div>
        <div className="flex-1 w-full relative z-10"><div className="flex items-center space-x-3 mb-4"><div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30"><LineChart className="h-6 w-6 text-emerald-400" /></div><h2 className="text-2xl font-bold text-white tracking-wide">{t("Smart Wealth Tracker", "स्मार्ट वेल्थ ट्रैकर")}</h2></div><p className="text-sm text-slate-400 leading-relaxed mb-6">{t("Don't just borrow, start building wealth! Here is how much you've saved by using Leader Coins to reduce your interest.", "सिर्फ कर्ज़ मत लीजिए, वेल्थ बनाना शुरू कीजिए! देखिए लीडर कॉइन्स का इस्तेमाल करके आपने ब्याज में कितने पैसे बचाए हैं।")}</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="bg-black/40 p-5 rounded-2xl border border-white/5 border-l-2 border-l-emerald-500"><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{t("Saved on Interest", "ब्याज पर बचाए")}</p><p className="text-2xl font-black text-emerald-400">₹{totalSavedInterest.toLocaleString('en-IN')}</p></div><div className="bg-black/40 p-5 rounded-2xl border border-white/5 border-l-2 border-l-cyan-500"><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{t("Value after 5 Years", "5 साल बाद की वैल्यू")}</p><p className="text-2xl font-black text-cyan-400">₹{projectedWealth.toLocaleString('en-IN')}</p></div></div></div>
        <div className="w-full lg:w-1/3 bg-emerald-950/30 p-6 rounded-3xl border border-emerald-500/20 shadow-inner relative z-10 text-center lg:text-left"><div className="flex justify-center lg:justify-start mb-3"><TrendingUp className="h-8 w-8 text-emerald-400" /></div><h4 className="text-white font-bold text-lg mb-2">{t("The Power of Compounding", "कंपाउंडिंग की ताकत")}</h4><p className="text-xs text-emerald-200/70 leading-relaxed">{t("If you invest your saved ₹" + Math.floor(totalSavedInterest) + " in a High Dividend Yield portfolio or equity SIP, it could grow to ₹" + projectedWealth + " in just 5 years at an expected 12% return!", "अगर आप अपने बचाए हुए ₹" + Math.floor(totalSavedInterest) + " को किसी हाई-डिविडेंड यील्ड पोर्टफोलियो या SIP में लगाते हैं, तो 12% के अनुमानित रिटर्न के साथ यह 5 साल में ₹" + projectedWealth + " हो सकता है!")}</p></div>
      </div>

      {/* REQUEST NEW LOAN BUTTON */}
      <div className="mt-8 relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-[2.5rem] blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
        <button onClick={() => onNavigate('apply')} className="w-full bg-gradient-to-r from-[#161922] to-[#0f1115] border border-white/10 hover:-translate-y-1 hover:border-cyan-500/30 p-8 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between transition-all duration-300 transform relative overflow-hidden z-10">
          <div className="flex items-center space-x-6 text-left">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 bg-gradient-to-br from-indigo-500 to-cyan-500 group-hover:scale-110"><Plus className="h-8 w-8 text-white" /></div>
            <div>
              <h2 className="text-2xl font-black mb-1 tracking-wide text-white">{t("Apply for a New Loan", "नया लोन अप्लाई करें")}</h2>
              <p className="text-sm text-slate-400">{t("100% digital process with instant admin approval.", "100% डिजिटल प्रोसेस, तुरंत अप्रूवल के साथ।")}</p>
            </div>
          </div>
          <div className="mt-6 sm:mt-0 w-12 h-12 border rounded-full flex items-center justify-center transition-colors border-white/10 group-hover:bg-white/10"><ChevronRight className="h-6 w-6 text-slate-300 group-hover:text-white" /></div>
        </button>
      </div>

      <AIInsightsModal isOpen={aiModal.isOpen} onClose={() => setAiModal({ ...aiModal, isOpen: false })} loading={aiModal.loading} result={aiModal.result} error={aiModal.error} t={t} />

      {/* 🎡 THE SPIN WHEEL MODAL 🎡 */}
      {showWheel && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-gradient-to-b from-[#161922] to-black border border-amber-500/30 p-8 rounded-[3rem] shadow-[0_0_80px_rgba(245,158,11,0.2)] max-w-sm w-full relative flex flex-col items-center text-center overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-wide uppercase flex items-center"><Gift className="h-6 w-6 text-amber-400 mr-2" /> {t("Jackpot!", "जैकपॉट!")}</h2>
            <p className="text-slate-400 text-sm mb-8">{t("You completed a 7-Day Streak. Spin to win bonus Leader Coins!", "आपने 7 दिन की स्ट्रीक पूरी की है। घुमाएं और जीतें!")}</p>
            <div className="relative w-48 h-48 mb-8">
              <div className="absolute inset-0 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.3)] border-4 border-[#161922]" style={{ background: 'conic-gradient(#f59e0b 0% 20%, #ef4444 20% 40%, #8b5cf6 40% 60%, #3b82f6 60% 80%, #10b981 80% 100%)', transform: `rotate(${wheelDegrees}deg)`, transition: isSpinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}><div className="absolute inset-0 border-[8px] border-black/10 rounded-full"></div></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-black rounded-full border-2 border-white z-10 flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-[16px] border-t-white z-20"></div>
            </div>
            {spinResult ? (
              <div className="animate-in zoom-in duration-500 w-full">
                <p className="text-amber-400 font-black text-5xl mb-2">+{spinResult} <span className="text-2xl text-amber-500/70">LC</span></p>
                <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest mb-6">{t("Added to Balance!", "बैलेंस में जुड़ गए!")}</p>
                <button onClick={closeWheel} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black px-6 py-4 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 transition-transform">{t("Claim & Close", "कलेक्ट करें")}</button>
              </div>
            ) : (
              <button onClick={handleSpin} disabled={isSpinning} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform">{isSpinning ? t("Spinning...", "घूम रहा है...") : t("Spin The Wheel", "चकरी घुमाएं")}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. VISUAL ANALYTICS
// ==========================================
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

// ==========================================
// 3. APPLY FOR LOAN (LOCKED IF NOT VERIFIED)
// ==========================================
export function OriginationView({ session, onNavigate, onSuccess, isAdmin, showAlert, loans = [], profile }) {
  const { t } = useContext(LanguageContext);
  
  // 1. ALL HOOKS
  const safeSession = session || (localStorage.getItem('leaderpro_session') ? JSON.parse(localStorage.getItem('leaderpro_session')) : null);
  const userId = safeSession?.user?.id;
  const accessToken = safeSession?.access_token;

  const [liveProfile, setLiveProfile] = useState(profile);
  const [isCheckingLock, setIsCheckingLock] = useState(true);
  const [amount, setAmount] = useState(1000);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [applyDiscount, setApplyDiscount] = useState(false);

  useEffect(() => {
    const fetchFreshProfile = async () => {
      if(!userId) { setIsCheckingLock(false); return; }
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        if (data && data.length > 0) setLiveProfile(data[0]);
      } catch(e) {}
      setIsCheckingLock(false);
    };
    fetchFreshProfile();
  }, [userId, accessToken]);

  // 2. LOGIC
  const score = calculateTrustScore(loans);
  const baseLeaderCoins = (loans.length > 0 && score > 400) ? (score - 400) * 10 : 0;
  const bonusCoinsKey = `bonus_coins_${userId}`;
  const earnedBonusCoins = Number(localStorage.getItem(bonusCoinsKey)) || 0;
  const totalLeaderCoins = baseLeaderCoins + earnedBonusCoins;
  const hasEnoughCoins = totalLeaderCoins >= 500;
  const displayedCoins = applyDiscount ? totalLeaderCoins - 500 : totalLeaderCoins;

  const baseInterestRate = 24;
  const finalInterestRate = applyDiscount ? (baseInterestRate - 2) : baseInterestRate;

  const calculateMonths = (end) => {
    const start = new Date(); const endD = new Date(end);
    let diffMonths = (endD.getFullYear() - start.getFullYear()) * 12 + (endD.getMonth() - start.getMonth());
    if (endD.getDate() < start.getDate()) diffMonths--;
    return diffMonths > 0 ? diffMonths : 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) { showAlert(t("Warning", "चेतावनी"), t("Consent is required.", "सहमति जरूरी है।")); return; }
    setIsSubmitting(true);
    
    try {
      let finalAdminId = null;
      if (!isAdmin) {
        finalAdminId = liveProfile?.admin_id || safeSession?.user?.user_metadata?.linked_admin_id;
        if (!finalAdminId) {
          showAlert(t("Action Required", "ध्यान दें"), t("Please select your Branch Manager from the dashboard before applying for a loan.", "लोन अप्लाई करने से पहले कृपया डैशबोर्ड से अपना ब्रांच मैनेजर चुनें।"));
          setIsSubmitting(false); onNavigate('dashboard'); return;
        }
      }

      const calculatedTenure = calculateMonths(endDate);
      const response = await fetch(`${supabaseUrl}/rest/v1/loans`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ 
          user_id: userId, admin_id: finalAdminId, amount: Number(amount), recoveredAmount: 0, 
          transactions: [], tenure: Number(calculatedTenure), interestRate: finalInterestRate, emi: 0, status: 'pending', type: 'Personal Loan', createdAt: Date.now(), adminNote: '' 
        })
      });
      
      if (!response.ok) throw new Error("Fail");
      
      setIsSubmitting(false); if (onSuccess) onSuccess(); onNavigate('loans'); 
    } catch (err) { showAlert(t("Error", "त्रुटि"), t("Could not save. Check DB.", "सेव नहीं हो पाया। डेटाबेस चेक करें।")); setIsSubmitting(false); }
  };

  // 3. EARLY RETURNS FOR LOCKS (AFTER HOOKS)
  if (isCheckingLock) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Activity className="animate-spin h-12 w-12 text-cyan-500" /></div>;
  }

  if (liveProfile?.kyc_status !== 'Verified') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in duration-500 px-4">
        <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-[2.5rem] text-center shadow-xl max-w-md w-full backdrop-blur-md">
          <Lock className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">{t("Access Denied", "पहुँच वर्जित")}</h2>
          <p className="text-slate-400 text-sm mb-6">{t("Please complete your KYC and wait for Admin verification to unlock this feature.", "इस सुविधा का उपयोग करने के लिए कृपया अपनी KYC पूरी करें और एडमिन वेरिफिकेशन का इंतज़ार करें।")}</p>
          <button onClick={() => onNavigate && onNavigate('dashboard')} className="w-full bg-red-600 hover:bg-red-500 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            {t("Go to Dashboard", "डैशबोर्ड पर जाएँ")}
          </button>
        </div>
      </div>
    );
  }

  // 4. MAIN RENDER
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
                <input type="number" min="1000" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full pl-12 pr-6 py-5 bg-white/[0.02] border border-white/5 rounded-2xl text-white text-xl focus:bg-white/[0.04] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all font-bold" required />
              </div>
            </div>
            <div className="space-y-3 group">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-cyan-400 transition-colors">{t("I will repay by", "मैं वापस करूँगा (तारीख)")}</label>
              <input type="date" min={new Date().toISOString().split('T')[0]} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-6 py-5 bg-white/[0.02] border border-white/5 rounded-2xl text-white text-xl focus:bg-white/[0.04] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all font-medium" required />
              <p className="text-xs text-cyan-400/80 ml-1 mt-2 font-mono flex items-center"><Clock className="h-3 w-3 mr-1" /> {t("Tenure:", "समय:")} {calculateMonths(endDate)} {t("Months", "महीने")}</p>
            </div>
          </div>

          <div className={`p-6 md:p-8 rounded-3xl border transition-all duration-500 relative overflow-hidden ${applyDiscount ? 'bg-gradient-to-br from-amber-900/40 to-black border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : 'bg-black/40 border-white/5 hover:border-amber-500/30'}`}>
            {applyDiscount && <div className="absolute top-0 right-0 w-full h-full bg-amber-500/5 blur-[50px] pointer-events-none"></div>}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-2xl border transition-colors ${applyDiscount ? 'bg-amber-500/20 border-amber-500/50' : 'bg-white/5 border-white/10'}`}>
                  <Gift className={`h-6 w-6 ${applyDiscount ? 'text-amber-400' : 'text-slate-500'}`} />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${applyDiscount ? 'text-amber-400' : 'text-white'}`}>{t("Use Leader Coins", "लीडर कॉइन्स का इस्तेमाल करें")}</h3>
                  <p className="text-sm text-slate-400 mt-1">{t("Spend 500 coins to get a 2% discount on your interest rate.", "500 कॉइन्स खर्च करें और ब्याज दर में 2% की छूट पाएं।")}</p>
                  <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest mt-2 transition-all">{t("Your Balance:", "आपका बैलेंस:")} <span className={applyDiscount ? 'text-white font-black' : ''}>{displayedCoins} LC</span></p>
                </div>
              </div>
              <button type="button" disabled={!hasEnoughCoins} onClick={() => setApplyDiscount(!applyDiscount)} className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${applyDiscount ? 'bg-amber-500' : 'bg-slate-700'}`}>
                <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${applyDiscount ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            {!hasEnoughCoins && <p className="text-xs text-red-400/80 mt-4 font-bold flex items-center relative z-10"><X className="h-3 w-3 mr-1" /> {t("You need at least 500 Leader Coins to unlock this offer.", "इस ऑफर के लिए कम से कम 500 लीडर कॉइन्स चाहिए।")}</p>}
          </div>

          <div className={`border p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-inner transition-colors duration-500 ${applyDiscount ? 'bg-gradient-to-br from-amber-950/40 to-black border-amber-500/30' : 'bg-gradient-to-br from-indigo-950/40 to-black border-indigo-500/20'}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl border transition-colors ${applyDiscount ? 'bg-amber-500/10 border-amber-500/30' : 'bg-indigo-500/10 border-indigo-500/30'}`}>
                <Percent className={`h-6 w-6 ${applyDiscount ? 'text-amber-400' : 'text-indigo-400'}`} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">{applyDiscount ? t("Discounted Annual Rate", "छूट वाली वार्षिक दर") : t("Standard Annual Rate", "मानक वार्षिक दर")}</p>
                <p className="text-white text-sm">{t("Interest will be calculated on reducing balance.", "ब्याज बचे हुए मूलधन पर लगेगा।")}</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
               {applyDiscount && <span className="text-sm text-slate-500 line-through mb-1">{baseInterestRate}%</span>}
               <div className={`text-4xl font-black transition-colors ${applyDiscount ? 'text-amber-400' : 'text-indigo-400'}`}>{finalInterestRate}<span className={`text-2xl ${applyDiscount ? 'text-amber-200/50' : 'text-indigo-200/50'}`}>%</span></div>
            </div>
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
              <span className="text-white font-black tracking-widest uppercase text-lg">{isSubmitting ? t('Processing Data...', 'प्रोसेस हो रहा है...') : t('Submit Secure Application', 'सुरक्षित एप्लिकेशन जमा करें')}</span>
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 4. MY LOANS (LOCKED IF NOT VERIFIED)
// ==========================================
export function MyLoansView({ loans = [], profile, session, onNavigate }) {
  const { t } = useContext(LanguageContext);
  
  // 1. ALL HOOKS
  const safeSession = session || (localStorage.getItem('leaderpro_session') ? JSON.parse(localStorage.getItem('leaderpro_session')) : null);
  const userId = safeSession?.user?.id;
  const accessToken = safeSession?.access_token;

  const [historyLoan, setHistoryLoan] = useState(null); 
  const [liveProfile, setLiveProfile] = useState(profile);
  const [isCheckingLock, setIsCheckingLock] = useState(true);

  useEffect(() => {
    const fetchFreshProfile = async () => {
      if(!userId) { setIsCheckingLock(false); return; }
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        if (data && data.length > 0) setLiveProfile(data[0]);
      } catch(e) {}
      setIsCheckingLock(false);
    };
    fetchFreshProfile();
  }, [userId, accessToken]);

  // 2. LOGIC
  const downloadLedger = async (loan) => { 
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
        doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text(liveProfile?.full_name || 'N/A', 19, cardY + 14);
        doc.setFontSize(9); doc.setTextColor(71, 85, 105); doc.setFont("helvetica", "normal");
        const aadhar = liveProfile?.aadhar_no ? `Aadhar: XXXX-XXXX-${liveProfile.aadhar_no.slice(-4)}` : 'Aadhar: N/A';
        doc.text(aadhar, 19, cardY + 21); if (liveProfile?.phone) doc.text(`Phone: ${liveProfile.phone}`, 19, cardY + 26);
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

  // 3. EARLY RETURNS FOR LOCK (AFTER ALL HOOKS)
  if (isCheckingLock) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Activity className="animate-spin h-12 w-12 text-cyan-500" /></div>;
  }

  if (liveProfile?.kyc_status !== 'Verified' && loans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in duration-500 px-4">
        <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-[2.5rem] text-center shadow-xl max-w-md w-full backdrop-blur-md">
          <Lock className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">{t("Access Denied", "पहुँच वर्जित")}</h2>
          <p className="text-slate-400 text-sm mb-6">{t("Please complete your KYC and wait for Admin verification to unlock this feature.", "इस सुविधा का उपयोग करने के लिए कृपया अपनी KYC पूरी करें और एडमिन वेरिफिकेशन का इंतज़ार करें।")}</p>
          <button onClick={() => onNavigate && onNavigate('dashboard')} className="w-full bg-red-600 hover:bg-red-500 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            {t("Go to Dashboard", "डैशबोर्ड पर जाएँ")}
          </button>
        </div>
      </div>
    );
  }

  if (loans.length === 0) return (<div className="flex flex-col items-center justify-center py-32 opacity-50"><FileText className="h-20 w-20 text-slate-500 mb-6" /><h2 className="text-2xl font-bold text-white">{t("No loans found", "कोई लोन नहीं है")}</h2></div>);

  // 4. MAIN RENDER
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

// ==========================================
// 5. USER PROFILE FORM (NO LOCK HERE)
// ==========================================
export function UserMyProfileView({ profile, session, onSave, showAlert }) {
  const { t } = useContext(LanguageContext);
  
  // 1. ALL HOOKS
  const safeSession = session || (localStorage.getItem('leaderpro_session') ? JSON.parse(localStorage.getItem('leaderpro_session')) : null);
  const userId = safeSession?.user?.id;
  const accessToken = safeSession?.access_token;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [fatherName, setFatherName] = useState(profile?.father_name || '');
  const [aadharNo, setAadharNo] = useState(profile?.aadhar_no || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [pincode, setPincode] = useState(profile?.pincode || ''); 
  
  const [aadharFront, setAadharFront] = useState(null);
  const [aadharBack, setAadharBack] = useState(null);
  const [panCard, setPanCard] = useState(null);
  const [selfie, setSelfie] = useState(null);

  const isVerified = profile?.kyc_status === 'Verified';

  // 2. LOGIC
  const uploadFile = async (file, type) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${type}_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    try {
      const response = await fetch(`${supabaseUrl}/storage/v1/object/kyc-documents/${filePath}`, { 
        method: 'POST', 
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${accessToken}`, 'Content-Type': file.type }, 
        body: file 
      });
      if (!response.ok) throw new Error(`Failed to upload ${type}`);
      return `${supabaseUrl}/storage/v1/object/public/kyc-documents/${filePath}`;
    } catch (err) { return null; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !phone || !aadharNo || !address || !pincode) { 
      showAlert(t("Warning", "चेतावनी"), t("Please fill all required details.", "कृपया सभी जरूरी जानकारी भरें।")); 
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
    
    const payload = { 
      user_id: userId, 
      admin_id: profile?.admin_id || safeSession?.user?.user_metadata?.linked_admin_id || null, 
      full_name: fullName, 
      father_name: fatherName, 
      aadhar_no: aadharNo, 
      phone: phone, 
      address: address, 
      pincode: pincode, 
      kyc_status: profile?.kyc_status === 'Verified' ? 'Verified' : 'Pending', 
      aadhar_front_url, aadhar_back_url, pan_url, selfie_url 
    };
    
    if (!profile?.id) payload.createdAt = Date.now();
    
    try {
      const url = profile?.id ? `${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}` : `${supabaseUrl}/rest/v1/profiles`;
      const method = profile?.id ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save profile");
      showAlert(t("Success", "सफलता"), t("Profile Saved! Please sync with an admin for verification.", "प्रोफाइल सेव हो गई! वेरिफिकेशन के लिए एडमिन चुनें।"));

      if (typeof onSave === 'function') { try { await onSave(); } catch(e) {} }
      setTimeout(() => { window.location.reload(); }, 1000);

    } catch (err) { showAlert(t("Error", "त्रुटि"), t("Could not save profile. Check connection.", "प्रोफाइल सेव नहीं हो पाई। कनेक्शन चेक करें।")); } 
    finally { setIsSubmitting(false); }
  };

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
            <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-cyan-400">{t("Father's Name", "पिता का नाम")}</label><input type="text" value={fatherName} onChange={(e) => setFatherName(e.target.value)} disabled={isVerified} className="w-full px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl text-white text-lg focus:bg-white/[0.05] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" required /></div>
            <div className="space-y-2 group relative"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center">{t("Aadhar Number", "आधार नंबर")}</label><input type="text" maxLength="12" value={aadharNo} onChange={(e) => setAadharNo(e.target.value.replace(/\D/g,''))} disabled={isVerified} className="w-full px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl text-white text-lg font-mono tracking-widest focus:bg-white/[0.05] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" required /></div>
            <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-cyan-400">{t("Phone Number", "फोन नंबर")}</label><input type="text" maxLength="10" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g,''))} disabled={isVerified} className="w-full px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl text-white text-lg font-mono focus:bg-white/[0.05] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" required /></div>
            
            <div className="space-y-2 group"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-cyan-400">{t("Area Pincode", "पिनकोड")}</label><input type="text" maxLength="6" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} disabled={isVerified} className="w-full px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl text-white text-lg font-mono focus:bg-white/[0.05] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" required /></div>

            <div className="space-y-2 group md:col-span-2 mt-2"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-cyan-400">{t("Residential Address", "घर का पता")}</label><textarea value={address} onChange={(e) => setAddress(e.target.value)} disabled={isVerified} className="w-full px-5 py-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl text-white text-lg focus:bg-white/[0.05] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none resize-none h-24 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" required /></div>
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

// ==========================================
// 6. LIVE CHAT (LOCKED IF NOT VERIFIED)
// ==========================================
export function UserLiveChatView({ session, profile, chats, onSend, onClose, onNavigate }) {
  const { t } = useContext(LanguageContext);
  
  // 1. ALL HOOKS
  const safeSession = session || (localStorage.getItem('leaderpro_session') ? JSON.parse(localStorage.getItem('leaderpro_session')) : null);
  const userId = safeSession?.user?.id;
  const accessToken = safeSession?.access_token;

  const [msgInput, setMsgInput] = useState('');
  const [liveProfile, setLiveProfile] = useState(profile);
  const [isCheckingLock, setIsCheckingLock] = useState(true);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const fetchFreshProfile = async () => {
      if(!userId) { setIsCheckingLock(false); return; }
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
          headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        if (data && data.length > 0) setLiveProfile(data[0]);
      } catch(e) {}
      setIsCheckingLock(false);
    };
    fetchFreshProfile();
  }, [userId, accessToken]);

  useEffect(() => { const timer = setTimeout(() => { if (chatContainerRef.current) { chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; } }, 50); return () => clearTimeout(timer); }, [chats]);

  // 2. LOGIC
  const handleSend = (e) => { e.preventDefault(); if (!msgInput.trim()) return; const linkedAdminId = safeSession?.user?.user_metadata?.linked_admin_id || liveProfile?.admin_id; onSend(userId, linkedAdminId, 'user', msgInput); setMsgInput(''); };

  // 3. EARLY RETURNS (AFTER HOOKS)
  if (isCheckingLock) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Activity className="animate-spin h-12 w-12 text-cyan-500" /></div>;
  }

  if (liveProfile?.kyc_status !== 'Verified') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in duration-500 px-4">
        <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-[2.5rem] text-center shadow-xl max-w-md w-full backdrop-blur-md">
          <Lock className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">{t("Access Denied", "पहुँच वर्जित")}</h2>
          <p className="text-slate-400 text-sm mb-6">{t("Please complete your KYC and wait for Admin verification to unlock Live Chat.", "लाइव चैट शुरू करने के लिए कृपया अपनी KYC पूरी करें और एडमिन वेरिफिकेशन का इंतज़ार करें।")}</p>
          <button onClick={() => onNavigate && onNavigate('dashboard')} className="w-full bg-red-600 hover:bg-red-500 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            {t("Go to Dashboard", "डैशबोर्ड पर जाएँ")}
          </button>
        </div>
      </div>
    );
  }

  // 4. MAIN RENDER
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

// ==========================================
// 7. LOAN HISTORY MODAL
// ==========================================
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

// ==========================================
// 8. USER NOTIFICATIONS MODAL
// ==========================================
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