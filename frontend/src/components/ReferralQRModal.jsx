import React, { useState } from 'react';
import {
  X, QrCode, Download, Printer, ShieldCheck, Stethoscope,
  Copy, Check, Share2, AlertCircle, PhoneCall
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * ReferralQRModal — Generates an official PHC / CHC Doctor Referral QR Code
 * containing consultation token, triage tier, and clinical summary for instant
 * front-desk scanning at Uttarakhand government clinics.
 */
export default function ReferralQRModal({
  isOpen,
  onClose,
  consultation = {},
  patientName = 'Sanjeevani Patient'
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const convId = consultation.conversationId || 'demo-session';
  const tier = consultation.tier || 'Green';
  const summary = consultation.summary || 'Clinical Triage Assessment';
  const dateStr = consultation.updatedAt
    ? new Date(consultation.updatedAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('hi-IN');

  const referralPayload = JSON.stringify({
    app: 'Sanjeevani-2.0',
    type: 'PHC_REFERRAL',
    id: convId,
    tier: tier,
    patient: patientName,
    date: dateStr,
    summary: summary,
    protocol: 'MTS-India',
  });

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(referralPayload)}`;

  const handleCopyToken = () => {
    navigator.clipboard?.writeText(convId);
    setCopied(true);
    toast.success('Session Token copy hua!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isRed = tier === 'Red';
  const isYellow = tier === 'Yellow';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn select-text">
      <div className="relative w-full max-w-md bg-white dark:bg-[#131E2B] rounded-3xl shadow-2xl border border-sage/20 dark:border-gray-800 overflow-hidden">
        
        {/* Header Strip */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isRed ? 'bg-rose-soft/15 border-rose-soft/30' :
          isYellow ? 'bg-gold-warm/15 border-gold-warm/30' :
          'bg-sage/15 border-sage/25'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs ${
              isRed ? 'bg-rose-soft' : isYellow ? 'bg-gold-warm text-primary' : 'bg-sage'
            }`}>
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-primary">
                PHC Doctor Referral Pass
              </h3>
              <p className="text-[10px] text-muted dark:text-muted">
                Uttarakhand Health Informatics • Gopeshwar CHC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-primary transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 text-center">
          
          {/* Triage Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-2xs"
            style={{
              backgroundColor: isRed ? '#B8504215' : isYellow ? '#D4A35920' : '#4A684515',
              color: isRed ? '#B85042' : isYellow ? '#A27020' : '#4A6845',
              border: `1px solid ${isRed ? '#B8504240' : isYellow ? '#D4A35950' : '#4A684540'}`
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Triage Tier: {tier} • {isRed ? 'तत्काल रेफरल' : isYellow ? 'आशा/क्लिनिक जांच' : 'सामान्य परामर्श'}</span>
          </div>

          {/* QR Code Container */}
          <div className="flex justify-center my-2">
            <div className="p-3 bg-white rounded-2xl border-2 border-sage/30 shadow-md inline-block">
              <img
                src={qrImageUrl}
                alt="Doctor Referral QR Code"
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
                loading="eager"
              />
            </div>
          </div>

          <p className="text-xs text-muted dark:text-muted max-w-xs mx-auto">
            पीएचसी या अस्पताल काउंटर पर डॉक्टर या आशा कार्यकर्ता को यह कोड स्कैन कराएं।
          </p>

          {/* Clinical Summary Snippet */}
          <div className="p-3 bg-mist dark:bg-card/70 rounded-xl text-left border border-gray-200/80 dark:border-gray-800 space-y-1 text-xs">
            <div className="flex justify-between items-center text-[10px] text-muted dark:text-muted">
              <span>मरीज (Patient): <strong>{patientName}</strong></span>
              <span>दिनांक: {dateStr}</span>
            </div>
            <p className="font-semibold text-primary line-clamp-2">
              {summary}
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px] text-gray-400 font-mono">
              <span className="truncate max-w-[200px]">ID: {convId}</span>
              <button
                type="button"
                onClick={handleCopyToken}
                className="inline-flex items-center gap-1 text-sage hover:underline cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy ID'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handlePrint}
              className="touch-target flex-1 py-2.5 px-3 rounded-xl border border-gray-300 dark:border-gray-700 text-primary dark:text-gray-200 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pass</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="touch-target flex-1 py-2.5 px-3 rounded-xl bg-sage hover:bg-sage/90 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Band Karein (Done)
            </button>
          </div>

          {isRed && (
            <div className="pt-1 text-[11px] text-rose-soft font-bold flex items-center justify-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
              <span>आपातकालीन स्थिति में तुरंत 108 पर कॉल करें</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
