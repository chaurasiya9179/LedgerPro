import React, { useState } from 'react';
import { 
  Home, Shield, Zap, Check, Star, HelpCircle, Phone, Mail, MapPin, 
  MessageCircle, ChevronRight, Menu, X, ChevronDown, TrendingUp, Award 
} from 'lucide-react';
import { LanguageContext } from '../App';

export default function LandingPage({ onNavigate, session, onSubmitContact }) {
  const { t, lang, setLang } = React.useContext(LanguageContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null); // For interactive FAQ

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
      await fetch("https://formsubmit.co/ajax/mybusiness9179@gmail.com", {
          method: "POST",
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
              _subject: `LedgerPro Website Inquiry: ${contactName}`,
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
      alert(t("Error: Could not send message. Please try again.", "Error: मैसेज भेजने में समस्या आई। कृपया दोबारा कोशिश करें।"));
      setContactStatus('idle');
    }

    setTimeout(() => setContactStatus('idle'), 3000);
  };

  const faqs = [
    { 
      q: t("What is an Admin Code?", "एडमिन कोड क्या होता है?"), 
      a: t("An Admin Code is a secure ID provided by your agency when creating an account, linking your account to them.", "एडमिन कोड एक सुरक्षित आईडी होती है जो आपको अकाउंट बनाते समय आपकी संस्था (एजेंसी) से मिलती है, जिससे आपका अकाउंट उनसे लिंक हो जाता है।") 
    },
    { 
      q: t("Can I see my interest?", "क्या मैं अपना ब्याज (Interest) देख सकता हूँ?"), 
      a: t("Yes, on your Dashboard under 'My Loans', you can always see the live daily accrued interest and total net liability.", "हां, आपके डैशबोर्ड पर 'मेरे लोन' सेक्शन में दिन के हिसाब से लगा ब्याज और टोटल बाकी रकम हमेशा लाइव दिखाई देती है।") 
    },
    { 
      q: t("How do I repay the loan?", "लोन वापस कैसे करें (Repayment)?"), 
      a: t("Whatever amount you repay, your Admin will record it in the system and it will instantly be deducted from your account.", "आप जो भी रकम वापस करेंगे, वो आपका एडमिन सिस्टम में दर्ज करेगा और वो तुरंत आपके अकाउंट से कम (माइनस) हो जाएगी।") 
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 font-sans relative overflow-x-hidden selection:bg-cyan-500/30">
      
      {/* 🌟 PREMIUM BACKGROUND GLOWS 🌟 */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* --- NAVBAR --- */}
      <nav className="fixed w-full z-50 bg-[#050505]/70 backdrop-blur-2xl border-b border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => scrollTo('home')}>
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:scale-110 transition-transform">
              <Home className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors">LedgerPro</span>
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-bold text-slate-400">
            <button onClick={() => scrollTo('home')} className="hover:text-cyan-400 transition-colors uppercase tracking-widest text-[11px]">{t("Home", "होम")}</button>
            <button onClick={() => scrollTo('about')} className="hover:text-cyan-400 transition-colors uppercase tracking-widest text-[11px]">{t("About", "हमारे बारे में")}</button>
            <button onClick={() => scrollTo('reviews')} className="hover:text-cyan-400 transition-colors uppercase tracking-widest text-[11px]">{t("Reviews", "रिव्यू")}</button>
            <button onClick={() => scrollTo('faq')} className="hover:text-cyan-400 transition-colors uppercase tracking-widest text-[11px]">{t("FAQ", "प्रश्न")}</button>
            <button onClick={() => scrollTo('contact')} className="hover:text-cyan-400 transition-colors uppercase tracking-widest text-[11px]">{t("Contact", "संपर्क")}</button>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <div className="bg-black/50 p-1 rounded-xl flex space-x-1 border border-white/10 mr-2 shadow-inner">
              <button onClick={() => setLang('en')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${lang === 'en' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>EN</button>
              <button onClick={() => setLang('hi')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${lang === 'hi' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>HI</button>
            </div>
            {session ? (
              <button onClick={() => onNavigate('app')} className="bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-105 text-sm">
                {t("Dashboard", "डैशबोर्ड")}
              </button>
            ) : (
              <button onClick={() => onNavigate('auth')} className="bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-xl font-bold transition-all border border-white/10 hover:border-white/20 text-sm">
                {t("Login / Sign Up", "लॉगिन / साइन अप")}
              </button>
            )}
          </div>

          <button className="md:hidden text-slate-300 hover:text-white p-2 transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6"/> : <Menu className="h-6 w-6"/>}
          </button>
        </div>

        {/* MOBILE MENU */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10 p-6 flex flex-col space-y-4 shadow-2xl animate-in slide-in-from-top-4">
            <button onClick={() => scrollTo('home')} className="text-left text-white font-bold p-3 bg-white/5 rounded-xl">{t("Home", "होम")}</button>
            <button onClick={() => scrollTo('about')} className="text-left text-white font-bold p-3 bg-white/5 rounded-xl">{t("About Us", "हमारे बारे में")}</button>
            <button onClick={() => scrollTo('reviews')} className="text-left text-white font-bold p-3 bg-white/5 rounded-xl">{t("Reviews", "ग्राहकों की राय")}</button>
            <button onClick={() => scrollTo('faq')} className="text-left text-white font-bold p-3 bg-white/5 rounded-xl">{t("FAQ", "सामान्य प्रश्न")}</button>
            <button onClick={() => scrollTo('contact')} className="text-left text-white font-bold p-3 bg-white/5 rounded-xl">{t("Contact", "संपर्क करें")}</button>
            <div className="pt-4 border-t border-white/10">
              {session ? (
                <button onClick={() => onNavigate('app')} className="bg-gradient-to-r from-cyan-600 to-indigo-600 text-white px-4 py-4 rounded-xl font-black tracking-widest uppercase text-sm text-center w-full shadow-lg">{t("Go to Dashboard", "डैशबोर्ड पर जाएं")}</button>
              ) : (
                <button onClick={() => onNavigate('auth')} className="bg-white/10 border border-white/10 text-white px-4 py-4 rounded-xl font-black tracking-widest uppercase text-sm text-center w-full">{t("Login / Sign Up", "लॉगिन / साइन अप")}</button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION (Redesigned) --- */}
      <section id="home" className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center relative z-10 min-h-[95vh] justify-center gap-12">
        
        {/* Left Content */}
        <div className="flex-1 text-center lg:text-left animate-in slide-in-from-left-8 duration-700">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 px-5 py-2.5 rounded-full mb-8 shadow-inner">
            <Shield className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 tracking-widest uppercase">{t("100% Secure & Trusted", "100% सुरक्षित और विश्वसनीय")}</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
            {t("Give Wings to Your", "आपके सपनों को दे")} <br className="hidden lg:block"/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">{t("Dreams", "नई उड़ान")}</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed">
            {t("LedgerPro brings an easy and transparent loan process. Manage your account in just a few clicks with no hidden charges.", "लीडरप्रो लाया है आसान और पारदर्शी लोन प्रोसेस। बिना किसी छिपे हुए चार्ज के, सिर्फ कुछ ही क्लिक में अपना लोन अकाउंट मैनेज करें।")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full sm:w-auto">
            {session ? (
               <button onClick={() => onNavigate('app')} className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 flex items-center justify-center group">
                  {t("View Dashboard", "मेरा डैशबोर्ड देखें")} <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
               </button>
            ) : (
               <button onClick={() => onNavigate('auth')} className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 flex items-center justify-center group">
                  {t("Get Started Today", "आज ही शुरू करें")} <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
               </button>
            )}
            <button onClick={() => scrollTo('about')} className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-colors flex items-center justify-center">
              {t("Learn More", "और जानें")}
            </button>
          </div>
        </div>

        {/* Right Floating Graphic (Premium Vibe) */}
        <div className="flex-1 w-full max-w-lg relative hidden md:block animate-in fade-in zoom-in duration-1000 delay-300">
           <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 rounded-[3rem] blur-2xl transform rotate-3"></div>
           <div className="bg-[#0a0c10]/80 backdrop-blur-xl border border-white/10 p-8 rounded-[3rem] shadow-2xl relative transform -rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t("Live Status", "लाइव स्टेटस")}</p>
                  <p className="text-white font-black text-2xl flex items-center mt-1"><Check className="h-6 w-6 text-emerald-400 mr-2"/> {t("Approved", "पास हो गया")}</p>
                </div>
                <div className="bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20">
                  <TrendingUp className="h-8 w-8 text-cyan-400" />
                </div>
              </div>
              <div className="space-y-5">
                 <div className="bg-black/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                   <span className="text-slate-400 text-sm font-bold">{t("Principal", "मूलधन")}</span>
                   <span className="text-white font-black">₹50,000</span>
                 </div>
                 <div className="bg-black/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                   <span className="text-slate-400 text-sm font-bold">{t("Interest Rate", "ब्याज दर")}</span>
                   <span className="text-amber-400 font-black">12.5%</span>
                 </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-end">
                <span className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest">{t("Trust Score", "ट्रस्ट स्कोर")}</span>
                <span className="text-4xl font-black text-emerald-400 flex items-center"><Award className="h-8 w-8 mr-2"/> 98</span>
              </div>
           </div>
        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section id="about" className="py-24 px-6 bg-[#0a0a0a] border-y border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">{t("About Us", "हमारे बारे में")}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">{t("Why choose LedgerPro? Because we understand your needs.", "लीडरप्रो ही क्यों चुनें? क्योंकि हम समझते हैं आपकी जरूरतें।")}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-[#111318] to-[#0a0c10] p-8 rounded-[2.5rem] border border-white/5 shadow-xl hover:border-cyan-500/30 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-cyan-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8 text-cyan-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-3 tracking-wide">{t("Fast and Easy Process", "तेज़ और आसान प्रक्रिया")}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{t("The entire process is digital. No lengthy paperwork. Just enter the admin code and view your ledger.", "पूरी प्रक्रिया डिजिटल है। कोई लंबा पेपर-वर्क नहीं। बस एडमिन कोड डालें और अपना हिसाब देखें।")}</p>
            </div>
            
            <div className="bg-gradient-to-br from-[#111318] to-[#0a0c10] p-8 rounded-[2.5rem] border border-white/5 shadow-xl hover:border-indigo-500/30 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-indigo-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                <Shield className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-3 tracking-wide">{t("100% Transparent", "100% पारदर्शी")}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{t("No hidden fees. Your interest, total payment, and balance are crystal clear.", "कोई छिपी हुई फीस नहीं। आपका ब्याज, कुल भुगतान और बकाया सब कुछ आपके सामने बिल्कुल साफ़ है।")}</p>
            </div>
            
            <div className="bg-gradient-to-br from-[#111318] to-[#0a0c10] p-8 rounded-[2.5rem] border border-white/5 shadow-xl hover:border-purple-500/30 hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-purple-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Check className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-3 tracking-wide">{t("Flexible Repayment", "लचीली किस्तें")}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{t("Pay back on your own terms. Top-ups and repayments are automatically calculated in your app.", "अपने हिसाब से लोन चुकाएं। टॉप-अप और रीपेमेंट का सीधा हिसाब आपके ऐप में अपने आप जुड़ जाता है।")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- REVIEWS SECTION --- */}
      <section id="reviews" className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">{t("Customer Reviews", "ग्राहकों की राय")}</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">{t("See what people say about LedgerPro.", "देखिए लोग लीडरप्रो के बारे में क्या कहते हैं।")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111318] p-8 rounded-[2.5rem] border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="flex space-x-1 mb-6 text-amber-400"><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/></div>
            <p className="text-slate-300 mb-8 italic leading-relaxed">"{t("I needed instant funds for my business. My ledger on LedgerPro is so clear that I always know my exact interest.", "मुझे अपने व्यापार के लिए तुरंत फंड की जरूरत थी। लीडरप्रो पर मेरा लेज़र इतना क्लियर है कि मुझे ब्याज का पूरा अंदाजा रहता है।")}"</p>
            <div className="flex items-center space-x-4 border-t border-white/5 pt-6">
               <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center font-black text-xl text-cyan-400 border border-cyan-500/20">R</div>
               <div><p className="text-white font-bold">Ramesh Kumar</p><p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Delhi</p></div>
            </div>
          </div>
          
          <div className="bg-[#111318] p-8 rounded-[2.5rem] border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="flex space-x-1 mb-6 text-amber-400"><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/></div>
            <p className="text-slate-300 mb-8 italic leading-relaxed">"{t("The best part is no lengthy paperwork. The Admin gave me a code and my whole account was visible on my phone!", "सबसे अच्छी बात यह है कि इसमें कोई लंबा पेपर-वर्क नहीं है। एडमिन ने एक कोड दिया और मेरा सारा हिसाब मेरे फोन पर दिखने लगा!")}"</p>
            <div className="flex items-center space-x-4 border-t border-white/5 pt-6">
               <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center font-black text-xl text-indigo-400 border border-indigo-500/20">S</div>
               <div><p className="text-white font-bold">Sunita Sharma</p><p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Jaipur</p></div>
            </div>
          </div>

          <div className="bg-[#111318] p-8 rounded-[2.5rem] border border-white/5 shadow-lg relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="flex space-x-1 mb-6 text-amber-400"><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star className="h-5 w-5 text-slate-600"/></div>
            <p className="text-slate-300 mb-8 italic leading-relaxed">"{t("The top-up and recovery feature is really great. Whenever I repay, the 'Net Balance' is updated instantly.", "टॉप-अप और रिकवरी फीचर सच में बहुत बढ़िया है। मैं जब भी पैसे वापस करता हूं, तुरंत 'नेट बाकी' अपडेट हो जाता है।")}"</p>
            <div className="flex items-center space-x-4 border-t border-white/5 pt-6">
               <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center font-black text-xl text-purple-400 border border-purple-500/20">M</div>
               <div><p className="text-white font-bold">Mohit Verma</p><p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Mumbai</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* --- INTERACTIVE FAQ SECTION --- */}
      <section id="faq" className="py-24 px-6 bg-[#0a0a0a] border-y border-white/5 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">{t("Frequently Asked Questions", "अक्सर पूछे जाने वाले सवाल")}</h2>
            <p className="text-slate-400 text-lg">{t("Answers to all your questions are here.", "आपके सभी सवालों के जवाब यहां हैं।")}</p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className={`bg-[#111318] border transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer ${openFaq === idx ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'border-white/5 hover:border-white/10'}`}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <div className="p-6 flex items-center justify-between">
                  <h4 className="text-lg font-bold text-white flex items-center">
                    <HelpCircle className={`h-5 w-5 mr-4 transition-colors ${openFaq === idx ? 'text-cyan-400' : 'text-slate-500'}`}/> 
                    {faq.q}
                  </h4>
                  <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform duration-300 ${openFaq === idx ? 'rotate-180 text-cyan-400' : ''}`} />
                </div>
                
                {/* Accordion Content */}
                <div className={`px-6 transition-all duration-300 ease-in-out ${openFaq === idx ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                  <p className="text-slate-400 text-sm ml-9 leading-relaxed border-t border-white/5 pt-4">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CONTACT SECTION --- */}
      <section id="contact" className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <div className="bg-[#0a0c10] border border-white/10 rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row gap-12 items-center shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none"></div>

          <div className="flex-1 text-center md:text-left relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">{t("Contact Us", "संपर्क करें")}</h2>
            <p className="text-slate-400 text-lg mb-10 max-w-md leading-relaxed">{t("Facing an issue or need more info? Talk to our support team directly. We're here 24/7.", "कोई समस्या है या अधिक जानकारी चाहिए? हमारी सपोर्ट टीम से बात करें। हम 24/7 यहाँ हैं।")}</p>
            <div className="space-y-6">
              <div className="flex items-center justify-center md:justify-start space-x-5 group">
                <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 group-hover:scale-110 transition-transform"><Phone className="text-cyan-400 h-6 w-6"/></div>
                <span className="text-xl font-bold text-white">+91 98765 43210</span>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-5 group">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 group-hover:scale-110 transition-transform"><Mail className="text-indigo-400 h-6 w-6"/></div>
                <span className="text-lg font-bold text-white">support@ledgerpro.in</span>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-5 group">
                <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 group-hover:scale-110 transition-transform"><MapPin className="text-purple-400 h-6 w-6"/></div>
                <span className="text-lg font-bold text-white">Connaught Place, New Delhi</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full max-w-md bg-black/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10">
             <h3 className="text-xl font-black text-white mb-6 flex items-center tracking-wide"><MessageCircle className="h-6 w-6 mr-3 text-cyan-400"/> {t("Send a Message", "मैसेज भेजें")}</h3>
             
             <form onSubmit={handleContactSubmit} className="space-y-5">
                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1 group-focus-within:text-cyan-400 transition-colors">{t("Full Name", "पूरा नाम")}</label>
                  <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 px-5 py-4 rounded-2xl text-white outline-none focus:bg-white/[0.05] focus:border-cyan-500/50 transition-all font-medium" />
                </div>
                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1 group-focus-within:text-cyan-400 transition-colors">{t("Email Address", "ईमेल आईडी")}</label>
                  <input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 px-5 py-4 rounded-2xl text-white outline-none focus:bg-white/[0.05] focus:border-cyan-500/50 transition-all font-medium" />
                </div>
                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1 group-focus-within:text-cyan-400 transition-colors">{t("Message", "आपका संदेश")}</label>
                  <textarea required value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} rows="3" className="w-full bg-white/[0.03] border border-white/10 px-5 py-4 rounded-2xl text-white outline-none focus:bg-white/[0.05] focus:border-cyan-500/50 resize-none transition-all font-medium"></textarea>
                </div>
                <button type="submit" disabled={contactStatus === 'loading' || contactStatus === 'success'} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black tracking-widest uppercase text-sm py-4 rounded-2xl transition-all duration-300 disabled:opacity-80 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.3)] mt-2 hover:scale-[1.02]">
                  {contactStatus === 'loading' ? t("Sending...", "भेज रहे हैं...") : contactStatus === 'success' ? t("Message Sent! ✅", "मैसेज भेज दिया गया! ✅") : t("Send Message", "मैसेज भेजें")}
                </button>
             </form>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#050505] py-12 text-center border-t border-white/5 relative z-10">
        <div className="flex items-center justify-center space-x-3 mb-6 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => scrollTo('home')}>
           <Home className="h-6 w-6 text-white" />
           <span className="text-2xl font-black tracking-tight text-white">LedgerPro</span>
        </div>
        <div className="flex justify-center space-x-6 mb-8 text-[11px] font-bold tracking-widest uppercase text-slate-500">
           <span className="hover:text-cyan-400 cursor-pointer transition-colors">Privacy Policy</span>
           <span className="hover:text-cyan-400 cursor-pointer transition-colors">Terms of Service</span>
           <span className="hover:text-cyan-400 cursor-pointer transition-colors">Support</span>
        </div>
        <p className="text-slate-600 text-xs font-medium">{t("© 2026 LedgerPro Financial Systems. All rights reserved.", "© 2026 लीडरप्रो फाइनेंशियल सिस्टम्स। सभी अधिकार सुरक्षित हैं।")}</p>
      </footer>
    </div>
  );
}