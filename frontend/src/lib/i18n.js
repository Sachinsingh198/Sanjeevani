// ---------------------------------------------------------------------------
// Sanjeevani — minimal UI dictionary (Hindi / English)
// This is NOT a translation of AI replies (those already come bilingually
// from the backend / voice layer) — it only localizes static chrome text
// like buttons and labels, so rural users can flip the app into Hindi.
// ---------------------------------------------------------------------------
export const LANGS = { HI: 'hi', EN: 'en', GARH: 'garh' };

/**
 * toEnglishDigits — Ensures numbers are always in standard English/Western Arabic digits (0-9).
 * Converts any Devanagari numerals (०-९) to 0-9.
 */
export function toEnglishDigits(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return str.replace(/[०-९]/g, (d) => {
    const idx = devanagariDigits.indexOf(d);
    return idx !== -1 ? String(idx) : d;
  });
}

/**
 * formatDate — Standardizes dates with Western Arabic numerals (0-9).
 */
export function formatDate(dateVal, lang = 'hi') {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  // Force English/Latin digits (0-9)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * localText — returns single-language text without dual Hindi/English clutter
 */
export function localText(lang, hi, en, garh) {
  if (lang === 'en') return en ?? hi;
  if (lang === 'garh' || lang === 'garhwali') return garh ?? hi;
  return hi ?? en;
}

const STRINGS = {
  chat_title: { hi: 'डॉ. संजीवनी', en: 'Dr. Sanjeevani' },
  chat_subtitle: { hi: 'आपकी शांत स्वास्थ्य साथी', en: 'Your calm health companion' },
  new_session: { hi: 'नया सत्र', en: 'New Session' },
  history: { hi: 'पुराने सत्र', en: 'History' },
  placeholder: { hi: 'अपने लक्षण यहाँ लिखें…', en: 'Describe how you feel…' },
  send: { hi: 'भेजें', en: 'Send' },
  listening: { hi: 'सुन रहा हूँ…', en: 'Listening…' },
  thinking: { hi: 'सोच रहा हूँ…', en: 'Thinking…' },
  tags: { hi: 'स्वास्थ्य टैग:', en: 'Patient Tags:' },
  quick_symptoms: { hi: 'जल्दी चुनें', en: 'Quick pick' },
  read_aloud: { hi: 'सुनें', en: 'Listen' },
  text_size: { hi: 'अक्षर आकार', en: 'Text size' },
  offline_banner: { hi: 'ऑफ़लाइन डेमो मोड', en: 'Offline demo mode' },
  online_banner: { hi: 'जुड़ा हुआ है', en: 'Connected' },
  nav_home: { hi: 'होम', en: 'Home' },
  nav_doctor: { hi: 'स्वास्थ्य सलाह', en: 'Consultation' },
  nav_screen: { hi: 'स्वास्थ्य जांच', en: 'Health Screening' },
  nav_companion: { hi: 'साथी', en: 'Saathi' },
  nav_wellness: { hi: 'आरोग्य', en: 'Wellness' },
  nav_dashboard: { hi: 'डैशबोर्ड', en: 'Dashboard' },
  nav_admin: { hi: 'नियंत्रण केंद्र', en: 'Admin Center' },
  nav_asha: { hi: 'आशा पोर्टल', en: 'ASHA Portal' },
  nav_about: { hi: 'हमारे बारे में', en: 'About' },
  login: { hi: 'लॉग इन', en: 'Log In' },
  register: { hi: 'नया खाता', en: 'Register' },
  logout: { hi: 'लॉग आउट', en: 'Log Out' },
  emergency_call: { hi: '108 आपातकालीन कॉल', en: 'Call 108 Emergency' },
  emergency_108: { hi: '108 आपातकाल', en: '108 Emergency' },
  doctor_summary_docx: { hi: 'डॉक्टर पर्चा (.docx)', en: 'Doctor Summary (.docx)' },
  doctor_summary_pdf: { hi: 'डॉक्टर पर्चा (PDF)', en: 'Doctor Summary (PDF)' },
  toggle_lang: { hi: 'भाषा बदलें', en: 'Change Language' },
  parcha_history: { hi: 'पुराना पर्चा व जांच', en: 'Consultation Records' },
  download_parcha: { hi: 'पर्चा डाउनलोड करें', en: 'Download Record' },
  start_new_chat: { hi: 'नया परामर्श शुरू करें', en: 'Start Consultation' },
  refresh: { hi: 'ताज़ा करें', en: 'Refresh' },
  high_contrast: { hi: 'धूप मोड (हाई कंट्रास्ट)', en: 'High Contrast (Sunlight)' },
  ayush_routine: { hi: 'घरेलू नुस्खे व खुराक समय', en: 'AYUSH Remedies & Routine' },
  add_remedy: { hi: 'नुस्खा जोड़ें', en: 'Add Remedy' },
  wellness_flow: { hi: 'दैनिक साधना', en: 'Daily Sadhana' },
  wellness_yoga: { hi: 'पहाड़ी योगशाला', en: 'Himalayan Yoga' },
  wellness_pranayam: { hi: 'प्राणायाम व श्वास', en: 'Pranayama & Breath' },
  wellness_dhyan: { hi: 'ध्वनि ध्यान', en: 'Singing Bowls & Meditation' },
  saathi_headline: { hi: 'संजीवनी साथी — मन का हाल', en: 'Sanjeevani Saathi — Heart to Heart' },
  feedback_helpful: { hi: 'क्या यह सलाह आपके काम आई?', en: 'Was this advice helpful?' },
  feedback_yes: { hi: 'हाँ, लाभ हुआ', en: 'Yes, helpful' },
  feedback_no: { hi: 'नहीं', en: 'Not helpful' },
  feedback_thanks: { hi: 'धन्यवाद! आपकी प्रतिक्रिया से हम बेहतर बनेंगे।', en: 'Thank you! Your feedback helps us improve.' },
  disclaimer_ai: { hi: '⚠️ यह एक AI स्वास्थ्य सहायक है, डॉक्टर नहीं। आपातकालीन स्थिति में तुरंत 108 पर संपर्क करें।', en: '⚠️ AI Health Assistant for guidance only, not a doctor. In emergency call 108 immediately.' },
  triage_green: { hi: 'सामान्य (घरेलू देखभाल)', en: 'Green — Self Care & Ayush' },
  triage_yellow: { hi: 'मध्यम (क्लिनिक परामर्श)', en: 'Yellow — ASHA / Clinic Review' },
  triage_red: { hi: 'गंभीर (तत्काल अस्पताल)', en: 'Red — Urgent Hospital Referral' },
  pull_to_refresh: { hi: 'नीचे खींचकर ताज़ा करें', en: 'Pull to refresh' },
};

export function t(key, lang = LANGS.HI) {
  return STRINGS[key]?.[lang] ?? STRINGS[key]?.hi ?? key;
}

export default STRINGS;
