// src/components/LandingPage.jsx
import React, { useState, useContext } from 'react';
import { Home, Shield, ChevronRight, Zap, Check, Star, HelpCircle, Phone, Mail, MapPin, MessageCircle, Menu, X } from 'lucide-react';
import { LanguageContext } from '../App';

export default function LandingPage({ onNavigate, session, onSubmitContact }) {
  const { t, lang, setLang } = useContext(LanguageContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState('idle'); 

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

 const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) return;
    
    setContactStatus('loading');
    
    try {
      // --- NAYA FIX: Yahan aapka naya email ID daal diya hai ---
      await fetch("https://formsubmit.co/ajax/LedgerPro.mm@gmail.com", {
          method: "POST",
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
              _subject: `LeaderPro Website Inquiry: ${contactName}`,
              Naam: contactName,
              Email: contactEmail,
              Sandesh: contactMessage
          })
      });

      try {
         await onSubmitContact(contactName, contactEmail, contactMessage);
      } catch (dbError) {
         console.log("Database save failed, but email was sent.");
      }

      setContactStatus('success');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch (error) {
      alert("Error: Message bhejne mein samasya aayi. Kripya dubara koshish karein.");
      setContactStatus('idle');
    }

    setTimeout(() => setContactStatus('idle'), 3000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans relative overflow-x-hidden selection:bg-cyan-500/30">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-cyan-600/10 rounded-full blur-[150px]"></div>
      </div>

      <nav className="fixed w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => scrollTo('home')}>
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <Home className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">LeaderPro</span>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
            <button onClick={() => scrollTo('home')} className="hover:text-cyan-400 transition-colors">Home</button>
            <button onClick={() => scrollTo('about')} className="hover:text-cyan-400 transition-colors">About Us</button>
            <button onClick={() => scrollTo('reviews')} className="hover:text-cyan-400 transition-colors">Reviews</button>
            <button onClick={() => scrollTo('faq')} className="hover:text-cyan-400 transition-colors">FAQ</button>
            <button onClick={() => scrollTo('contact')} className="hover:text-cyan-400 transition-colors">Contact</button>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <div className="bg-black/30 p-1 rounded-xl flex space-x-1 border border-white/10 mr-2">
              <button onClick={() => setLang('en')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'en' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}>EN</button>
              <button onClick={() => setLang('hi')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'hi' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}>HI</button>
            </div>
            {session ? (
              <button onClick={() => onNavigate('app')} className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                {t("Go to Dashboard", "Dashboard Par Jayein")}
              </button>
            ) : (
              <button onClick={() => onNavigate('auth')} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-bold transition-all border border-white/5">
                {t("Login / Sign Up", "Login / Sign Up")}
              </button>
            )}
          </div>

          <button className="md:hidden text-white p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-[#111318] border-b border-white/10 p-4 flex flex-col space-y-4 shadow-2xl">
            <button onClick={() => scrollTo('home')} className="text-left text-white font-medium p-2">Home</button>
            <button onClick={() => scrollTo('about')} className="text-left text-white font-medium p-2">About Us</button>
            <button onClick={() => scrollTo('reviews')} className="text-left text-white font-medium p-2">Reviews</button>
            <button onClick={() => scrollTo('faq')} className="text-left text-white font-medium p-2">FAQ</button>
            <button onClick={() => scrollTo('contact')} className="text-left text-white font-medium p-2">Contact</button>
            {session ? (
              <button onClick={() => onNavigate('app')} className="bg-cyan-600 text-white px-4 py-3 rounded-xl font-bold text-center w-full">Dashboard Par Jayein</button>
            ) : (
              <button onClick={() => onNavigate('auth')} className="bg-white/10 text-white px-4 py-3 rounded-xl font-bold text-center w-full">Login / Sign Up</button>
            )}
          </div>
        )}
      </nav>

      <section id="home" className="pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center relative z-10 min-h-[90vh] justify-center">
        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full mb-8">
          <Shield className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-bold text-indigo-300 tracking-widest uppercase">{t("100% Secure & Trusted", "100% Surakshit & Trusted")}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight mb-6">
          {t("Give Wings to Your", "Aapke Sapno Ko De")} <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">{t("Dreams", "Nayi Udaan")}</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          {t("LeaderPro brings an easy and transparent loan process. Manage your account in just a few clicks with no hidden charges.", "LeaderPro laya hai aasan aur transparent loan process. Bina kisi chhipe hue charges ke, sirf kuch hi clicks mein apna loan account manage karein.")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {session ? (
             <button onClick={() => onNavigate('app')} className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center">
                {t("View Dashboard", "Mera Dashboard Dekhein")} <ChevronRight className="ml-2 h-5 w-5" />
             </button>
          ) : (
             <button onClick={() => onNavigate('auth')} className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center">
                {t("Get Started Today", "Aaj Hi Shuru Karein")} <ChevronRight className="ml-2 h-5 w-5" />
             </button>
          )}
          <button onClick={() => scrollTo('about')} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center">
            {t("Learn More", "Aur Jannein")}
          </button>
        </div>
      </section>

      <section id="about" className="py-24 px-6 bg-[#0a0c10] border-y border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Hamare Baare Mein</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Kyu chunein LeaderPro? Kyunki hum samajhte hain aapki zaruratein.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#111318] p-8 rounded-3xl border border-white/[0.04] shadow-xl hover:border-cyan-500/30 transition-colors">
              <div className="bg-cyan-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Tez aur Aasan Process</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Puri prakriya digital hai. Koi lamba paper-work nahi. Bas admin code dalein aur apna ledger dekhein.</p>
            </div>
            <div className="bg-[#111318] p-8 rounded-3xl border border-white/[0.04] shadow-xl hover:border-indigo-500/30 transition-colors">
              <div className="bg-indigo-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="h-7 w-7 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">100% Transparent</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Koi hidden fees nahi. Aapka byaj (interest), total payment aur bakaya sab kuch aapke samne bilkul clear hai.</p>
            </div>
            <div className="bg-[#111318] p-8 rounded-3xl border border-white/[0.04] shadow-xl hover:border-purple-500/30 transition-colors">
              <div className="bg-purple-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <Check className="h-7 w-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Lacheeli (Flexible) Kistein</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Apne hisaab se loan chukayein. Top-up aur repayment ka seedha hisaab aapke app mein automatically judta hai.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="reviews" className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Grahakon Ki Ray</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Dekhiye log LeaderPro ke baare mein kya kehte hain.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111318] p-8 rounded-3xl border border-white/[0.04]">
            <div className="flex space-x-1 mb-4 text-amber-400"><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/></div>
            <p className="text-slate-300 mb-6 italic">"Mujhe apne vyapar ke liye turant fund ki zaroorat thi. LeaderPro par mera ledger itna clear hai ki mujhe interest ka pura andaza rehta hai."</p>
            <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-cyan-900 rounded-full flex items-center justify-center font-bold text-cyan-400">R</div>
               <div><p className="text-white font-bold text-sm">Ramesh Kumar</p><p className="text-slate-500 text-xs">Delhi</p></div>
            </div>
          </div>
          <div className="bg-[#111318] p-8 rounded-3xl border border-white/[0.04]">
            <div className="flex space-x-1 mb-4 text-amber-400"><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/></div>
            <p className="text-slate-300 mb-6 italic">"Sabse achhi baat ye hai ki isme koi lamba paper-work nahi hai. Admin ne ek code diya aur mera sara hisaab mere phone par dikhne laga!"</p>
            <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-indigo-900 rounded-full flex items-center justify-center font-bold text-indigo-400">S</div>
               <div><p className="text-white font-bold text-sm">Sunita Sharma</p><p className="text-slate-500 text-xs">Jaipur</p></div>
            </div>
          </div>
          <div className="bg-[#111318] p-8 rounded-3xl border border-white/[0.04]">
            <div className="flex space-x-1 mb-4 text-amber-400"><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star className="h-5 w-5 text-slate-600"/></div>
            <p className="text-slate-300 mb-6 italic">"Top-up aur recovery feature sach mein bahut badiya hai. Main jab bhi paise wapas karta hoon, turant 'Net Baki' update ho jata hai."</p>
            <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-purple-900 rounded-full flex items-center justify-center font-bold text-purple-400">M</div>
               <div><p className="text-white font-bold text-sm">Mohit Verma</p><p className="text-slate-500 text-xs">Mumbai</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 px-6 bg-[#0a0c10] border-y border-white/5 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Aksar Pooche Jane Wale Sawal</h2>
            <p className="text-slate-400">Aapke sabhi sawalon ke jawab yahan hain.</p>
          </div>
          <div className="space-y-4">
            <div className="bg-[#111318] border border-white/[0.04] p-6 rounded-2xl">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center"><HelpCircle className="h-5 w-5 mr-3 text-cyan-400"/> Admin Code kya hota hai?</h4>
              <p className="text-slate-400 text-sm ml-8 leading-relaxed">Admin code ek surakshit ID hoti hai jo aapko account banate samay aapke sanstha (agency) se milti hai, jisse aapka account unse link ho jata hai.</p>
            </div>
            <div className="bg-[#111318] border border-white/[0.04] p-6 rounded-2xl">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center"><HelpCircle className="h-5 w-5 mr-3 text-cyan-400"/> Kya main apna byaj (interest) dekh sakta hoon?</h4>
              <p className="text-slate-400 text-sm ml-8 leading-relaxed">Haan, aapke Dashboard par 'Mere Loans' section mein din ke hisaab se laga byaj aur total baki rakam (Net Liability) hamesha live dikhai deti hai.</p>
            </div>
            <div className="bg-[#111318] border border-white/[0.04] p-6 rounded-2xl">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center"><HelpCircle className="h-5 w-5 mr-3 text-cyan-400"/> Loan wapas kaise karein (Repayment)?</h4>
              <p className="text-slate-400 text-sm ml-8 leading-relaxed">Aap jo bhi rakam wapas karenge, wo aapka Admin system mein darj karega aur wo turant aapke account se kam (minus) ho jayegi.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <div className="bg-gradient-to-br from-cyan-900/20 to-indigo-900/20 border border-white/10 rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row gap-12 items-center shadow-2xl">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Sampark Karein</h2>
            <p className="text-slate-300 text-lg mb-8 max-w-md">Koi samasya hai ya adhik jankari chahiye? Hamari support team se baat karein.</p>
            <div className="space-y-4">
              <div className="flex items-center justify-center md:justify-start space-x-4"><Phone className="text-cyan-400 h-6 w-6"/> <span className="text-xl font-semibold text-white">+91 98765 43210</span></div>
              <div className="flex items-center justify-center md:justify-start space-x-4"><Mail className="text-indigo-400 h-6 w-6"/> <span className="text-lg text-white">support@leaderpro.in</span></div>
              <div className="flex items-center justify-center md:justify-start space-x-4"><MapPin className="text-purple-400 h-6 w-6"/> <span className="text-white">Sector 38, Gurugram, Haryana, India</span></div>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md bg-[#111318] p-8 rounded-3xl border border-white/10 shadow-2xl">
             <h3 className="text-xl font-bold text-white mb-6 flex items-center"><MessageCircle className="h-5 w-5 mr-2 text-cyan-400"/> Message Bhejein</h3>
             
             <form onSubmit={handleContactSubmit} className="space-y-4">
                <input 
                  type="text" 
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={t("Your Name", "Aapka Naam")} 
                  className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-cyan-500 transition-colors" 
                />
                <input 
                  type="email" 
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={t("Email ID", "Email ID")} 
                  className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-cyan-500 transition-colors" 
                />
                <textarea 
                  required
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder={t("How can we help?", "Kya Madad Chahiye?")} 
                  rows="4" 
                  className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-cyan-500 resize-none transition-colors"
                ></textarea>
                <button 
                  type="submit" 
                  disabled={contactStatus === 'loading' || contactStatus === 'success'}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-80 disabled:cursor-not-allowed"
                >
                  {contactStatus === 'loading' ? t("Sending...", "Bhej rahe hain...") : 
                   contactStatus === 'success' ? t("Message Sent! ✅", "Message Bhej Diya Gaya! ✅") : 
                   t("Send (Submit)", "Bhejein (Submit)")}
                </button>
             </form>
          </div>
        </div>
      </section>

      <footer className="bg-black py-10 text-center border-t border-white/5 relative z-10">
        <div className="flex items-center justify-center space-x-2 mb-4 opacity-50">
           <Home className="h-5 w-5 text-white" />
           <span className="text-xl font-bold text-white">LeaderPro</span>
        </div>
        <p className="text-slate-600 text-sm">© 2026 LeaderPro Financial Systems. All rights reserved.</p>
      </footer>
    </div>
  );
}