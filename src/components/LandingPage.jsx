import React, { useState } from 'react';
import { Home, Shield, Zap, Check, Star, HelpCircle, Phone, Mail, MapPin, MessageCircle, ChevronRight, Menu, X } from 'lucide-react';
import { LanguageContext } from '../App'; // Ensure your path is correct depending on your structure

export default function LandingPage({ onNavigate, session, onSubmitContact }) {
  const { t, lang, setLang } = React.useContext(LanguageContext);
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
      await fetch("https://formsubmit.co/ajax/mybusiness9179@gmail.com", {
          method: "POST",
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          },
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
      alert(t("Error: Could not send message. Please try again.", "Error: मैसेज भेजने में समस्या आई। कृपया दोबारा कोशिश करें।"));
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

      {/* --- NAVBAR --- */}
      <nav className="fixed w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => scrollTo('home')}>
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <Home className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">LeaderPro</span>
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
            <button onClick={() => scrollTo('home')} className="hover:text-cyan-400 transition-colors">{t("Home", "होम")}</button>
            <button onClick={() => scrollTo('about')} className="hover:text-cyan-400 transition-colors">{t("About Us", "हमारे बारे में")}</button>
            <button onClick={() => scrollTo('reviews')} className="hover:text-cyan-400 transition-colors">{t("Reviews", "ग्राहकों की राय")}</button>
            <button onClick={() => scrollTo('faq')} className="hover:text-cyan-400 transition-colors">{t("FAQ", "सामान्य प्रश्न")}</button>
            <button onClick={() => scrollTo('contact')} className="hover:text-cyan-400 transition-colors">{t("Contact", "संपर्क करें")}</button>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <div className="bg-black/30 p-1 rounded-xl flex space-x-1 border border-white/10 mr-2">
              <button onClick={() => setLang('en')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'en' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}>EN</button>
              <button onClick={() => setLang('hi')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'hi' ? 'bg-cyan-500 text-black shadow-sm' : 'text-slate-400 hover:text-white'}`}>HI</button>
            </div>
            {session ? (
              <button onClick={() => onNavigate('app')} className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                {t("Go to Dashboard", "डैशबोर्ड पर जाएं")}
              </button>
            ) : (
              <button onClick={() => onNavigate('auth')} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-bold transition-all border border-white/5">
                {t("Login / Sign Up", "लॉगिन / साइन अप")}
              </button>
            )}
          </div>

          <button className="md:hidden text-white p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* MOBILE MENU */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-[#111318] border-b border-white/10 p-4 flex flex-col space-y-4 shadow-2xl">
            <button onClick={() => scrollTo('home')} className="text-left text-white font-medium p-2">{t("Home", "होम")}</button>
            <button onClick={() => scrollTo('about')} className="text-left text-white font-medium p-2">{t("About Us", "हमारे बारे में")}</button>
            <button onClick={() => scrollTo('reviews')} className="text-left text-white font-medium p-2">{t("Reviews", "ग्राहकों की राय")}</button>
            <button onClick={() => scrollTo('faq')} className="text-left text-white font-medium p-2">{t("FAQ", "सामान्य प्रश्न")}</button>
            <button onClick={() => scrollTo('contact')} className="text-left text-white font-medium p-2">{t("Contact", "संपर्क करें")}</button>
            {session ? (
              <button onClick={() => onNavigate('app')} className="bg-cyan-600 text-white px-4 py-3 rounded-xl font-bold text-center w-full">{t("Go to Dashboard", "डैशबोर्ड पर जाएं")}</button>
            ) : (
              <button onClick={() => onNavigate('auth')} className="bg-white/10 text-white px-4 py-3 rounded-xl font-bold text-center w-full">{t("Login / Sign Up", "लॉगिन / साइन अप")}</button>
            )}
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section id="home" className="pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center relative z-10 min-h-[90vh] justify-center">
        <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full mb-8">
          <Shield className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-bold text-indigo-300 tracking-widest uppercase">{t("100% Secure & Trusted", "100% सुरक्षित और विश्वसनीय")}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight mb-6">
          {t("Give Wings to Your", "आपके सपनों को दे")} <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">{t("Dreams", "नई उड़ान")}</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          {t("LeaderPro brings an easy and transparent loan process. Manage your account in just a few clicks with no hidden charges.", "लीडरप्रो लाया है आसान और पारदर्शी लोन प्रोसेस। बिना किसी छिपे हुए चार्ज के, सिर्फ कुछ ही क्लिक में अपना लोन अकाउंट मैनेज करें।")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {session ? (
             <button onClick={() => onNavigate('app')} className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center">
                {t("View Dashboard", "मेरा डैशबोर्ड देखें")} <ChevronRight className="ml-2 h-5 w-5" />
             </button>
          ) : (
             <button onClick={() => onNavigate('auth')} className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center">
                {t("Get Started Today", "आज ही शुरू करें")} <ChevronRight className="ml-2 h-5 w-5" />
             </button>
          )}
          <button onClick={() => scrollTo('about')} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center">
            {t("Learn More", "और जानें")}
          </button>
        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section id="about" className="py-24 px-6 bg-[#0a0c10] border-y border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">{t("About Us", "हमारे बारे में")}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">{t("Why choose LeaderPro? Because we understand your needs.", "लीडरप्रो ही क्यों चुनें? क्योंकि हम समझते हैं आपकी जरूरतें।")}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#111318] p-8 rounded-3xl border border-white/[0.04] shadow-xl hover:border-cyan-500/30 transition-colors">
              <div className="bg-cyan-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t("Fast and Easy Process", "तेज़ और आसान प्रक्रिया")}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{t("The entire process is digital. No lengthy paperwork. Just enter the admin code and view your ledger.", "पूरी प्रक्रिया डिजिटल है। कोई लंबा पेपर-वर्क नहीं। बस एडमिन कोड डालें और अपना हिसाब देखें।")}</p>
            </div>
            <div className="bg-[#111318] p-8 rounded-3xl border border-white/[0.04] shadow-xl hover:border-indigo-500/30 transition-colors">
              <div className="bg-indigo-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="h-7 w-7 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t("100% Transparent", "100% पारदर्शी")}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{t("No hidden fees. Your interest, total payment, and balance are crystal clear.", "कोई छिपी हुई फीस नहीं। आपका ब्याज, कुल भुगतान और बकाया सब कुछ आपके सामने बिल्कुल साफ़ है।")}</p>
            </div>
            <div className="bg-[#111318] p-8 rounded-3xl border border-white/[0.04] shadow-xl hover:border-purple-500/30 transition-colors">
              <div className="bg-purple-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <Check className="h-7 w-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{t("Flexible Repayment", "लचीली किस्तें")}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{t("Pay back on your own terms. Top-ups and repayments are automatically calculated in your app.", "अपने हिसाब से लोन चुकाएं। टॉप-अप और रीपेमेंट का सीधा हिसाब आपके ऐप में अपने आप जुड़ जाता है।")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- REVIEWS SECTION --- */}
      <section id="reviews" className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">{t("Customer Reviews", "ग्राहकों की राय")}</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">{t("See what people say about LeaderPro.", "देखिए लोग लीडरप्रो के बारे में क्या कहते हैं।")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111318] p-8 rounded-3xl border border-white/[0.04]">
            <div className="flex space-x-1 mb-4 text-amber-400"><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/></div>
            <p className="text-slate-300 mb-6 italic">"{t("I needed instant funds for my business. My ledger on LeaderPro is so clear that I always know my exact interest.", "मुझे अपने व्यापार के लिए तुरंत फंड की जरूरत थी। लीडरप्रो पर मेरा लेज़र इतना क्लियर है कि मुझे ब्याज का पूरा अंदाजा रहता है।")}"</p>
            <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-cyan-900 rounded-full flex items-center justify-center font-bold text-cyan-400">R</div>
               <div><p className="text-white font-bold text-sm">Ramesh Kumar</p><p className="text-slate-500 text-xs">Delhi</p></div>
            </div>
          </div>
          <div className="bg-[#111318] p-8 rounded-3xl border border-white/[0.04]">
            <div className="flex space-x-1 mb-4 text-amber-400"><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/></div>
            <p className="text-slate-300 mb-6 italic">"{t("The best part is no lengthy paperwork. The Admin gave me a code and my whole account was visible on my phone!", "सबसे अच्छी बात यह है कि इसमें कोई लंबा पेपर-वर्क नहीं है। एडमिन ने एक कोड दिया और मेरा सारा हिसाब मेरे फोन पर दिखने लगा!")}"</p>
            <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-indigo-900 rounded-full flex items-center justify-center font-bold text-indigo-400">S</div>
               <div><p className="text-white font-bold text-sm">Sunita Sharma</p><p className="text-slate-500 text-xs">Jaipur</p></div>
            </div>
          </div>
          <div className="bg-[#111318] p-8 rounded-3xl border border-white/[0.04]">
            <div className="flex space-x-1 mb-4 text-amber-400"><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star fill="currentColor" className="h-5 w-5"/><Star className="h-5 w-5 text-slate-600"/></div>
            <p className="text-slate-300 mb-6 italic">"{t("The top-up and recovery feature is really great. Whenever I repay, the 'Net Balance' is updated instantly.", "टॉप-अप और रिकवरी फीचर सच में बहुत बढ़िया है। मैं जब भी पैसे वापस करता हूं, तुरंत 'नेट बाकी' अपडेट हो जाता है।")}"</p>
            <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-purple-900 rounded-full flex items-center justify-center font-bold text-purple-400">M</div>
               <div><p className="text-white font-bold text-sm">Mohit Verma</p><p className="text-slate-500 text-xs">Mumbai</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="faq" className="py-24 px-6 bg-[#0a0c10] border-y border-white/5 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">{t("Frequently Asked Questions", "अक्सर पूछे जाने वाले सवाल")}</h2>
            <p className="text-slate-400">{t("Answers to all your questions are here.", "आपके सभी सवालों के जवाब यहां हैं।")}</p>
          </div>
          <div className="space-y-4">
            <div className="bg-[#111318] border border-white/[0.04] p-6 rounded-2xl">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center"><HelpCircle className="h-5 w-5 mr-3 text-cyan-400"/> {t("What is an Admin Code?", "एडमिन कोड क्या होता है?")}</h4>
              <p className="text-slate-400 text-sm ml-8 leading-relaxed">{t("An Admin Code is a secure ID provided by your agency when creating an account, linking your account to them.", "एडमिन कोड एक सुरक्षित आईडी होती है जो आपको अकाउंट बनाते समय आपकी संस्था (एजेंसी) से मिलती है, जिससे आपका अकाउंट उनसे लिंक हो जाता है।")}</p>
            </div>
            <div className="bg-[#111318] border border-white/[0.04] p-6 rounded-2xl">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center"><HelpCircle className="h-5 w-5 mr-3 text-cyan-400"/> {t("Can I see my interest?", "क्या मैं अपना ब्याज (Interest) देख सकता हूँ?")}</h4>
              <p className="text-slate-400 text-sm ml-8 leading-relaxed">{t("Yes, on your Dashboard under 'My Loans', you can always see the live daily accrued interest and total net liability.", "हां, आपके डैशबोर्ड पर 'मेरे लोन' सेक्शन में दिन के हिसाब से लगा ब्याज और टोटल बाकी रकम हमेशा लाइव दिखाई देती है।")}</p>
            </div>
            <div className="bg-[#111318] border border-white/[0.04] p-6 rounded-2xl">
              <h4 className="text-lg font-bold text-white mb-2 flex items-center"><HelpCircle className="h-5 w-5 mr-3 text-cyan-400"/> {t("How do I repay the loan?", "लोन वापस कैसे करें (Repayment)?")}</h4>
              <p className="text-slate-400 text-sm ml-8 leading-relaxed">{t("Whatever amount you repay, your Admin will record it in the system and it will instantly be deducted from your account.", "आप जो भी रकम वापस करेंगे, वो आपका एडमिन सिस्टम में दर्ज करेगा और वो तुरंत आपके अकाउंट से कम (माइनस) हो जाएगी।")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTACT SECTION --- */}
      <section id="contact" className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <div className="bg-gradient-to-br from-cyan-900/20 to-indigo-900/20 border border-white/10 rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row gap-12 items-center shadow-2xl">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">{t("Contact Us", "संपर्क करें")}</h2>
            <p className="text-slate-300 text-lg mb-8 max-w-md">{t("Facing an issue or need more info? Talk to our support team.", "कोई समस्या है या अधिक जानकारी चाहिए? हमारी सपोर्ट टीम से बात करें।")}</p>
            <div className="space-y-4">
              <div className="flex items-center justify-center md:justify-start space-x-4"><Phone className="text-cyan-400 h-6 w-6"/> <span className="text-xl font-semibold text-white">+91 98765 43210</span></div>
              <div className="flex items-center justify-center md:justify-start space-x-4"><Mail className="text-indigo-400 h-6 w-6"/> <span className="text-lg text-white">support@leaderpro.in</span></div>
              <div className="flex items-center justify-center md:justify-start space-x-4"><MapPin className="text-purple-400 h-6 w-6"/> <span className="text-white">Connaught Place, New Delhi, India</span></div>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md bg-[#111318] p-8 rounded-3xl border border-white/10 shadow-2xl">
             <h3 className="text-xl font-bold text-white mb-6 flex items-center"><MessageCircle className="h-5 w-5 mr-2 text-cyan-400"/> {t("Send a Message", "मैसेज भेजें")}</h3>
             
             <form onSubmit={handleContactSubmit} className="space-y-4">
                <input 
                  type="text" 
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={t("Your Name", "आपका नाम")} 
                  className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-cyan-500 transition-colors" 
                />
                <input 
                  type="email" 
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={t("Email ID", "ईमेल आईडी")} 
                  className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-cyan-500 transition-colors" 
                />
                <textarea 
                  required
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder={t("How can we help?", "हम आपकी क्या मदद कर सकते हैं?")} 
                  rows="4" 
                  className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-cyan-500 resize-none transition-colors"
                ></textarea>
                <button 
                  type="submit" 
                  disabled={contactStatus === 'loading' || contactStatus === 'success'}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-80 disabled:cursor-not-allowed"
                >
                  {contactStatus === 'loading' ? t("Sending...", "भेज रहे हैं...") : 
                   contactStatus === 'success' ? t("Message Sent! ✅", "मैसेज भेज दिया गया! ✅") : 
                   t("Send Message", "मैसेज भेजें")}
                </button>
             </form>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-black py-10 text-center border-t border-white/5 relative z-10">
        <div className="flex items-center justify-center space-x-2 mb-4 opacity-50">
           <Home className="h-5 w-5 text-white" />
           <span className="text-xl font-bold text-white">LeaderPro</span>
        </div>
        <p className="text-slate-600 text-sm">{t("© 2026 LeaderPro Financial Systems. All rights reserved.", "© 2026 लीडरप्रो फाइनेंशियल सिस्टम्स। सभी अधिकार सुरक्षित हैं।")}</p>
      </footer>
    </div>
  );
}