import React, { useState } from 'react';
import { Home, Mail, Lock, User, Hash, Crown, X } from 'lucide-react';
import { LanguageContext } from '../App';

// Supabase variables
const supabaseUrl = 'https://wvyklgrphhamhnpkahra.supabase.co';
const supabaseKey = 'sb_publishable_wOiUxxfvY7dlbwNrIRMBrg_N6oz1ZNf';

export default function AuthScreen({ setSession, showAlert, onBack }) {
  const { t, lang, setLang } = React.useContext(LanguageContext);
  const [isLogin, setIsLogin] = useState(true);
  
  // 🔥 Toggles: 'user', 'admin', 'super_admin'
  const [role, setRole] = useState('user');
  
  // States (Simplified for Fast Signup)
  const [fullName, setFullName] = useState('');
  const [pincode, setPincode] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // 🔥 Super Admin Security Key
  const [masterKey, setMasterKey] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');

  

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showAlert(t("Error", "त्रुटि"), t("Please enter your email first to reset the password.", "पासवर्ड रीसेट करने के लिए पहले अपना ईमेल दर्ज करें।"));
      return;
    }
    setIsResetting(true);
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error_description || data.msg || 'Password reset failed');
      showAlert(t("Success", "सफलता"), t("Password reset link sent! Please check your email inbox.", "पासवर्ड रीसेट लिंक भेज दिया गया है! कृपया अपना ईमेल चेक करें।"));
    } catch (err) {
      showAlert(t("Error", "त्रुटि"), err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = email.trim();

    // 1. FAST VALIDATION LOGIC
    if (!isLogin) {
       // 🔥 SUPER ADMIN VALIDATION 🔥
       if (role === 'super_admin') {
          if (!fullName.trim() || !masterKey.trim()) {
             setError(t("Name and Master Key are required for Super Admin.", "सुपर एडमिन के लिए नाम और मास्टर की (Key) जरूरी है।"));
             setLoading(false); return;
          }
          if (masterKey !== 'OWNER-BOSS-007') {
             setError(t("Invalid Master Key! Only authorized owners can create this account.", "गलत मास्टर की! केवल मालिक ही यह अकाउंट बना सकते हैं।"));
             setLoading(false); return;
          }
       } 
       // 🔥 USER & ADMIN VALIDATION (Only Name & Pincode needed now) 🔥
       else {
          if (!fullName.trim() || !pincode.trim()) { 
              setError(t("Name and Pincode are required.", "नाम और पिनकोड जरूरी है।")); 
              setLoading(false); return; 
          }
          if (!/^\d{6}$/.test(pincode.trim())) {
              setError(t("Pincode must be 6 digits.", "पिनकोड 6 अंकों का होना चाहिए।")); 
              setLoading(false); return; 
          }
       }
    }

    try {
      const endpoint = isLogin ? 'token?grant_type=password' : 'signup';
      
      const bodyPayload = isLogin 
        ? { email: cleanEmail, password } 
        : { 
            email: cleanEmail, 
            password, 
            data: { 
              role: role, 
              full_name: fullName.trim(), 
              pincode: role === 'super_admin' ? null : pincode.trim(), 
              linked_admin_id: null 
            } 
          };

      const response = await fetch(`${supabaseUrl}/auth/v1/${endpoint}`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error_description || data.msg || 'Login/Signup failed');

      if (data.access_token) {
         const userMeta = data.user.user_metadata || {};

         const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${data.user.id}`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${data.access_token}` }
         });
         const existingProfile = await profileRes.json();

         if (!existingProfile || existingProfile.length === 0) {
            // Create minimal profile, rest will be filled inside the app
            await fetch(`${supabaseUrl}/rest/v1/profiles`, {
               method: 'POST',
               headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${data.access_token}`, 
                  'Content-Type': 'application/json'
               },
               body: JSON.stringify({
                  user_id: data.user.id,
                  admin_id: role === 'admin' ? data.user.id : null,
                  full_name: userMeta.full_name || fullName.trim(),
                  pincode: userMeta.pincode || pincode.trim(), 
                  phone: null, // User app ke andar bharega
                  aadhar_no: null, // User app ke andar bharega
                  address: null, // User app ke andar bharega
                  kyc_status: role === 'super_admin' ? 'Verified' : 'Pending',
                  createdAt: Date.now()
               })
            });
         }

         localStorage.setItem('leaderpro_session', JSON.stringify(data));
         setSession(data);

      } else if (!isLogin && data.user) {
         showAlert(t("Success", "सफलता"), t("Account created! Check your email to verify and then Log In.", "अकाउंट बन गया! वेरीफाई करने के लिए अपना ईमेल चेक करें और फिर लॉगिन करें।"));
         setIsLogin(true);
         setPassword(''); setFullName(''); setPincode(''); setMasterKey('');
      }

    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-300">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-600/20 rounded-full blur-[150px] pointer-events-none"></div>

      {onBack && (
        <button onClick={onBack} className="absolute top-6 left-6 flex items-center text-slate-400 hover:text-white transition-colors z-20 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
          <X className="h-4 w-4 mr-2" /> {t("Go Back", "वापस जाएँ")}
        </button>
      )}

      <div className="absolute top-6 right-6 z-20 bg-black/30 p-1 rounded-xl flex space-x-1 border border-white/10">
        <button onClick={() => setLang('en')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'en' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}>EN</button>
        <button onClick={() => setLang('hi')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'hi' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}>HI</button>
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.4)] mb-4 relative">
            <Home className="h-8 w-8 text-white" />
            {role === 'super_admin' && !isLogin && <Crown className="h-5 w-5 text-amber-400 absolute -top-2 -right-2 animate-bounce" />}
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">LeaderPro</h1>
          <p className="text-slate-400 mt-2 text-sm uppercase tracking-widest font-medium text-center">
            {isLogin ? t("Secure Gateway", "सुरक्षित गेटवे") : t("Fast Registration", "नया अकाउंट बनाएं")}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-6 text-center shadow-[0_0_10px_rgba(239,68,68,0.1)]">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          
          {/* 🔥 3-WAY ROLE SELECTOR FOR SIGNUP 🔥 */}
          {!isLogin && (
            <div className="bg-black/30 p-1.5 rounded-2xl grid grid-cols-3 gap-1 border border-white/5 mb-6 relative z-10">
              <button type="button" onClick={() => setRole('user')} className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${role === 'user' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md' : 'text-slate-500 hover:bg-white/5'}`}>
                {t("User", "यूजर")}
              </button>
              <button type="button" onClick={() => setRole('admin')} className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${role === 'admin' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-md' : 'text-slate-500 hover:bg-white/5'}`}>
                {t("Admin", "एडमिन")}
              </button>
              <button type="button" onClick={() => setRole('super_admin')} className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${role === 'super_admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-md' : 'text-slate-500 hover:bg-white/5'}`}>
                {t("Owner", "मालिक")}
              </button>
            </div>
          )}

          {/* 🔥 SUPER ADMIN SPECIFIC FIELDS 🔥 */}
          {!isLogin && role === 'super_admin' && (
             <div className="space-y-5 animate-in fade-in zoom-in duration-300">
                <div className="space-y-2 relative">
                  <User className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
                  <input type="text" placeholder={t("Full Name", "पूरा नाम")} value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all outline-none" required />
                </div>
                
                <div className="space-y-2 relative">
                  <Lock className="absolute left-4 top-4 h-5 w-5 text-amber-500" />
                  <input type="password" placeholder={t("Master Key (Required)", "मास्टर की (अनिवार्य)")} value={masterKey} onChange={(e) => setMasterKey(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-amber-950/20 border border-amber-500/40 rounded-2xl text-amber-400 font-mono tracking-widest focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-amber-700/50" required />
                </div>
             </div>
          )}

          {/* 🔥 USER / ADMIN SPECIFIC FIELDS (Simplified) 🔥 */}
          {!isLogin && role !== 'super_admin' && (
             <div className="space-y-5 animate-in fade-in zoom-in duration-300">
                <div className="space-y-2 relative">
                  <User className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
                  <input type="text" placeholder={t("Full Name", "पूरा नाम")} value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none" required />
                </div>

                <div className="space-y-2 relative">
                  <Hash className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
                  <input type="text" maxLength="6" placeholder={t("Area Pincode (6 Digits)", "एरिया पिनकोड (6 अंक)")} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} className="w-full pl-12 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none font-mono" required />
                </div>
             </div>
          )}

          {/* COMMON FIELDS (EMAIL & PASSWORD) */}
          <div className="space-y-2 relative">
            <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
            <input type="email" placeholder={t("Enter Email ID", "ईमेल आईडी दर्ज करें")} value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full pl-12 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white outline-none transition-all focus:ring-2 ${!isLogin && role === 'super_admin' ? 'focus:ring-amber-500/50 focus:border-amber-500' : 'focus:ring-cyan-500/50 focus:border-cyan-500'}`} required />
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
              <input type="password" placeholder={t("Enter Password", "पासवर्ड लिखें")} value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full pl-12 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white outline-none transition-all focus:ring-2 ${!isLogin && role === 'super_admin' ? 'focus:ring-amber-500/50 focus:border-amber-500' : 'focus:ring-cyan-500/50 focus:border-cyan-500'}`} required />
            </div>
            {isLogin && (
              <div className="flex justify-end pt-2">
                <button type="button" onClick={handleForgotPassword} disabled={isResetting} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50" >
                  {isResetting ? t("Sending Link...", "लिंक भेज रहे हैं...") : t("Forgot Password?", "पासवर्ड भूल गए?")}
                </button>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className={`w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 relative overflow-hidden transform hover:-translate-y-1 mt-4 ${!isLogin && role === 'super_admin' ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]' : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-[0_0_30px_rgba(6,182,212,0.3)]'}`}>
            {loading ? 'Processing...' : (isLogin ? t("Login", "लॉगिन करें") : t("Create Account", "अकाउंट बनाएं"))}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/10 pt-6">
          <p className="text-slate-400 text-sm">
            {isLogin ? t("Don't have an account?", "अकाउंट नहीं है?") : t("Already have an account?", "पहले से अकाउंट है?")}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); setRole('user'); setMasterKey(''); }} className="ml-2 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              {isLogin ? t("Sign Up", "साइन अप करें") : t("Log In", "लॉगिन करें")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}