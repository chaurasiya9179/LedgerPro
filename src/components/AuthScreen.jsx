import React, { useState } from 'react';
import { Home, Mail, Lock, Key, X, User, Phone, CreditCard } from 'lucide-react'; // CreditCard icon for Aadhar
import { LanguageContext } from '../App';

// Supabase variables
const supabaseUrl = 'https://wvyklgrphhamhnpkahra.supabase.co';
const supabaseKey = 'sb_publishable_wOiUxxfvY7dlbwNrIRMBrg_N6oz1ZNf';

const isValidUUID = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export default function AuthScreen({ setSession, showAlert, onBack }) {
  const { t, lang, setLang } = React.useContext(LanguageContext);
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('user');
  
  // States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [aadharNo, setAadharNo] = useState(''); // NAYA: Aadhar state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = email.trim();

    // 1. Strict Validation Logic
    if (!isLogin) {
       if (!fullName.trim() || !phone.trim() || !aadharNo.trim()) { 
           setError("Sign up ke liye Naam, Mobile aur Aadhar Number zaroori hai."); 
           setLoading(false); 
           return; 
       }
       if (!/^\d{10}$/.test(phone.trim())) {
           setError("Mobile Number bilkul 10 digit ka hona chahiye."); 
           setLoading(false); 
           return; 
       }
       if (!/^\d{12}$/.test(aadharNo.trim())) {
           setError("Aadhar Number bilkul 12 digit ka hona chahiye."); 
           setLoading(false); 
           return; 
       }
       if (role === 'user') {
          if (!adminCode) { setError("User account ke liye Admin Code daalna zaroori hai."); setLoading(false); return; }
          if (!isValidUUID(adminCode.trim())) { setError("Admin Code ka format galat hai. Kripya valid code daalein."); setLoading(false); return; }
       }
    }

    try {
      const endpoint = isLogin ? 'token?grant_type=password' : 'signup';
      
      // Data ko Supabase ke secure 'user_metadata' mein bhej rahe hain
      const bodyPayload = isLogin 
        ? { email: cleanEmail, password } 
        : { 
            email: cleanEmail, 
            password, 
            data: { 
              role: role, 
              full_name: fullName.trim(), 
              phone: phone.trim(),
              aadhar_no: aadharNo.trim(),
              linked_admin_id: role === 'user' ? adminCode.trim() : null 
            } 
          };

      // 2. Supabase Auth Request
      const response = await fetch(`${supabaseUrl}/auth/v1/${endpoint}`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error_description || data.msg || 'Login/Signup fail ho gaya');

      // 3. MAGIC TRICK: Jab user successfully login ho jaye (Token mil jaye)
      if (data.access_token) {
         const userMeta = data.user.user_metadata || {};

         // Check karein ki is user ki profile pehle se hai ya nahi
         const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${data.user.id}`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${data.access_token}` }
         });
         const existingProfile = await profileRes.json();

         // Agar profile nahi hai (First time login), tab banayenge!
         if (!existingProfile || existingProfile.length === 0) {
            await fetch(`${supabaseUrl}/rest/v1/profiles`, {
               method: 'POST',
               headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${data.access_token}`, // Ab permission hai!
                  'Content-Type': 'application/json'
               },
               body: JSON.stringify({
                  user_id: data.user.id,
                  admin_id: userMeta.role === 'admin' ? data.user.id : (userMeta.linked_admin_id || null),
                  full_name: userMeta.full_name || fullName.trim(),
                  phone: userMeta.phone || phone.trim(),
                  aadhar_no: userMeta.aadhar_no || aadharNo.trim(),
                  kyc_status: 'Pending',
                  createdAt: Date.now()
               })
            });
         }

         // Login complete karein aur dashboard par bhejein
         localStorage.setItem('leaderpro_session', JSON.stringify(data));
         setSession(data);

      } else if (!isLogin && data.user) {
         // Agar user Sign Up kar raha hai par Email verify karna baaki hai
         showAlert("Success", "Account ban gaya hai! Kripya apna Email check karein aur verify karne ke baad Login karein.");
         setIsLogin(true);
         setPassword(''); setFullName(''); setPhone(''); setAadharNo('');
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
          <X className="h-4 w-4 mr-2" /> {t("Go Back", "Wapas Jayein")}
        </button>
      )}

      <div className="absolute top-6 right-6 z-20 bg-black/30 p-1 rounded-xl flex space-x-1 border border-white/10">
        <button onClick={() => setLang('en')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'en' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}>EN</button>
        <button onClick={() => setLang('hi')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'hi' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}>HI</button>
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.4)] mb-4">
            <Home className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">LeaderPro</h1>
          <p className="text-slate-400 mt-2 text-sm uppercase tracking-widest font-medium text-center">
            {isLogin ? t("Secure Gateway", "Surakshit Gateway") : t("Create New Account", "Naya Account Banayein")}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-6 text-center shadow-[0_0_10px_rgba(239,68,68,0.1)]">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && (
            <div className="bg-black/30 p-2 rounded-2xl flex space-x-2 border border-white/5 mb-6">
              <button type="button" onClick={() => setRole('user')} className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${role === 'user' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-md' : 'text-slate-400 hover:bg-white/5'}`}>
                {t("I am User", "Main User Hoon")}
              </button>
              <button type="button" onClick={() => setRole('admin')} className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${role === 'admin' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-md' : 'text-slate-400 hover:bg-white/5'}`}>
                {t("I am Admin", "Main Admin Hoon")}
              </button>
            </div>
          )}

          {!isLogin && (
             <div className="space-y-5 animate-in fade-in zoom-in duration-300">
                <div className="space-y-2 relative">
                  <User className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
                  <input type="text" placeholder={t("Full Name", "Poora Naam")} value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none" required={!isLogin} />
                </div>
                
                {/* Mobile Input with Fix logic */}
                <div className="space-y-2 relative">
                  <Phone className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
                  <input type="text" maxLength="10" placeholder={t("Mobile Number (10 Digits)", "Mobile Number (10 Ank)")} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className="w-full pl-12 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none font-mono" required={!isLogin} />
                </div>

                {/* Aadhar Input with Fix logic */}
                <div className="space-y-2 relative">
                  <CreditCard className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
                  <input type="text" maxLength="12" placeholder={t("Aadhar Number (12 Digits)", "Aadhar Number (12 Ank)")} value={aadharNo} onChange={(e) => setAadharNo(e.target.value.replace(/\D/g, ''))} className="w-full pl-12 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none font-mono tracking-widest" required={!isLogin} />
                </div>
             </div>
          )}

          <div className="space-y-2 relative">
            <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
            <input type="email" placeholder={t("Enter Email ID", "Email ID Darj Karein")} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none" required />
          </div>

          <div className="space-y-2 relative">
            <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-500" />
            <input type="password" placeholder={t("Enter Password", "Password Likhein")} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all outline-none" required />
          </div>

          {!isLogin && role === 'user' && (
             <div className="space-y-2 relative animate-in fade-in zoom-in duration-300">
               <Key className="absolute left-4 top-4 h-5 w-5 text-cyan-500" />
               <input type="text" placeholder={t("Enter Unique Admin Code", "Unique Admin Code Darj Karein")} value={adminCode} onChange={(e) => setAdminCode(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-cyan-950/20 border border-cyan-500/30 rounded-2xl text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all outline-none placeholder-cyan-700/50" required={!isLogin && role === 'user'} />
             </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 relative overflow-hidden bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-[0_0_30px_rgba(6,182,212,0.3)] transform hover:-translate-y-1 mt-4">
            {loading ? 'Processing...' : (isLogin ? t("Login", "Login Karein") : t("Create Account", "Account Banayein"))}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/10 pt-6">
          <p className="text-slate-400 text-sm">
            {isLogin ? t("Don't have an account?", "Account nahi hai?") : t("Already have an account?", "Pehle se account hai?")}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="ml-2 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              {isLogin ? t("Sign Up", "Sign Up karein") : t("Log In", "Log In karein")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}