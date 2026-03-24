// src/utils.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Naya tareeka

export const supabaseUrl = 'https://wvyklgrphhamhnpkahra.supabase.co';
export const supabaseKey = 'sb_publishable_wOiUxxfvY7dlbwNrIRMBrg_N6oz1ZNf';
export const GEMINI_API_KEY = 'AIzaSyBq258KhQtXAKoSQf0ixU1DJ5IqnP4Cr8w'; 

export const isValidUUID = (id) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export const calculateEMI = (principal, annualRate, tenureMonths) => {
  if (!principal || !annualRate || !tenureMonths) return 0;
  const r = annualRate / 12 / 100; 
  const n = tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
};

export const calculateAccruedInterest = (principal, annualRate, createdAtTimestamp) => {
  if (!principal || !annualRate || !createdAtTimestamp) return 0;
  const now = Date.now();
  const daysElapsed = Math.max(0, (now - createdAtTimestamp) / (1000 * 60 * 60 * 24));
  const yearsElapsed = daysElapsed / 365;
  const interest = principal * (annualRate / 100) * yearsElapsed;
  return Math.round(interest);
};

export const callGeminiAI = async (promptText, systemInstruction) => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${GEMINI_API_KEY}`;
    
    const combinedPrompt = `[SYSTEM INSTRUCTION]\n${systemInstruction}\n\n[USER REQUEST]\n${promptText}`;

    const payload = {
      contents: [{ parts: [{ text: combinedPrompt }] }],
      generationConfig: {
         temperature: 0.3,
         maxOutputTokens: 600,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        console.error("Gemini Response Error:", await response.text());
        throw new Error("Gemini API Error");
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
    
  } catch (error) {
    console.error("AI Setup Error:", error);
    throw error;
  }
};

// --- NAYA: MODERN AUTO PDF GENERATOR ---

export const generateLoanPDF = (loan, profile) => {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const accruedInterest = calculateAccruedInterest(loan.amount, loan.interestRate, loan.createdAt);
  const netBaki = Number(loan.amount) + accruedInterest - Number(loan.recoveredAmount || 0);

  // 1. --- STYLISH HEADER ---
  doc.setFillColor(14, 165, 233); // Modern Cyan Color
  doc.rect(0, 0, pageWidth, 80, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("LeaderPro Financial", 40, 45);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Official Loan Statement & Ledger", 40, 65);

  // 2. --- BORROWER DETAILS CARD ---
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252); // Light Gray Background
  doc.roundedRect(40, 100, pageWidth - 80, 95, 6, 6, 'FD'); // Rounded Box

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Borrower Details", 50, 125);

  // Profile Data Fetching
  const fullName = profile?.full_name || 'N/A';
  const fatherName = profile?.father_name ? `(S/O ${profile.father_name})` : '';
  const mobile = profile?.phone || 'N/A';
  const address = profile?.address || 'N/A';

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Name: ${fullName} ${fatherName}`, 50, 145);
  doc.text(`Mobile: ${mobile}`, 50, 160);
  doc.text(`Address: ${address}`, 50, 175);

  // Loan Details Right Side
  doc.setFont("helvetica", "bold");
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 200, 145);
  doc.text(`Loan ID: ${loan.id.substring(0,8).toUpperCase()}`, pageWidth - 200, 160);
  doc.setTextColor(16, 185, 129); // Green Status
  doc.text(`Status: ${loan.status.toUpperCase()}`, pageWidth - 200, 175);

  // 3. --- LOAN SUMMARY TABLE ---
  autoTable(doc, {
    startY: 215,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }, // Indigo Header
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 10, cellPadding: 8 },
    head: [['Principal Amount', 'Interest Rate', 'Total Interest', 'Amount Paid', 'Net Liability']],
    body: [[
      `Rs. ${Number(loan.amount).toLocaleString('en-IN')}`,
      `${loan.interestRate}% P.A.`,
      `Rs. ${accruedInterest.toLocaleString('en-IN')}`,
      `Rs. ${Number(loan.recoveredAmount || 0).toLocaleString('en-IN')}`,
      `Rs. ${netBaki.toLocaleString('en-IN')}`
    ]],
  });

  // 4. --- TRANSACTION HISTORY TABLE ---
  let finalY = doc.lastAutoTable.finalY + 25;

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Transaction History", 40, finalY);

  if (loan.transactions && loan.transactions.length > 0) {
    const txRows = loan.transactions.map(tx => [
      new Date(tx.date).toLocaleString('en-IN'),
      tx.topup > 0 ? `+ Rs. ${Number(tx.topup).toLocaleString('en-IN')}` : '-',
      tx.repay > 0 ? `- Rs. ${Number(tx.repay).toLocaleString('en-IN')}` : '-'
    ]);

    autoTable(doc, {
      startY: finalY + 15,
      theme: 'striped',
      headStyles: { fillColor: [14, 165, 233], textColor: 255 }, // Cyan Header
      styles: { fontSize: 10, cellPadding: 6 },
      head: [['Date & Time', 'Top-up (Added Amount)', 'Repayment (Amount Paid)']],
      body: txRows,
    });
  } else {
     doc.setFontSize(10);
     doc.setFont("helvetica", "italic");
     doc.setTextColor(148, 163, 184);
     doc.text("No transactions recorded yet.", 40, finalY + 20);
  }

  // 5. --- FOOTER ---
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("This is a computer-generated document and does not require a physical signature.", pageWidth / 2, pageHeight - 35, { align: 'center' });
  doc.text("Generated securely via LeaderPro Financial Systems", pageWidth / 2, pageHeight - 25, { align: 'center' });

  // Download Trigger
  doc.save(`LeaderPro_Statement_${loan.id.substring(0,8)}.pdf`);
};

// --- NAYA: TRUST SCORE (INTERNAL CIBIL) LOGIC ---
export const calculateTrustScore = (loans) => {
  if (!loans || loans.length === 0) return 500; // Default Starting Score

  const activeLoans = loans.filter(l => l.status === 'active');
  if (activeLoans.length === 0) return 500;

  let totalDisbursed = 0;
  let totalRecovered = 0;

  activeLoans.forEach(l => {
    totalDisbursed += Number(l.amount || 0);
    totalRecovered += Number(l.recoveredAmount || 0);
  });

  // Basic Logic: (Recovery Percentage * 5) + Base 400
  // Example: 100% Recovery = 500 + 400 = 900 Score
  const recoveryRate = (totalRecovered / totalDisbursed) * 100;
  let score = Math.round(400 + (recoveryRate * 5));

  // Limit score between 300 and 900
  return Math.min(Math.max(score, 300), 900);
};

export const getScoreRating = (score) => {
  if (score >= 800) return { label: "Elite", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  if (score >= 700) return { label: "Good", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" };
  if (score >= 500) return { label: "Average", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
  return { label: "Risky", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
};