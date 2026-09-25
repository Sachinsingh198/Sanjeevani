// ---------------------------------------------------------------------------
// Sanjeevani — minimal UI dictionary (Hindi / English)
// This is NOT a translation of AI replies (those already come bilingually
// from the backend / voice layer) — it only localizes static chrome text
// like buttons and labels, so rural users can flip the app into Hindi.
// ---------------------------------------------------------------------------
export const LANGS = { HI: 'hi', EN: 'en' };

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
  nav_screen: { hi: 'नेत्र जांच', en: 'Eye Screening' },
  nav_companion: { hi: 'साथी बातचीत', en: 'Saathi' },
  nav_wellness: { hi: 'योग व ध्यान', en: 'Wellness' },
  nav_dashboard: { hi: 'डैशबोर्ड', en: 'Dashboard' },
  nav_admin: { hi: 'एडमिन', en: 'Admin' },
  nav_asha: { hi: 'आशा पोर्टल', en: 'ASHA Portal' },
  nav_about: { hi: 'हमारे बारे में', en: 'About' },
  login: { hi: 'लॉग इन', en: 'Log In' },
  register: { hi: 'नया खाता', en: 'Register' },
  logout: { hi: 'लॉग आउट', en: 'Log Out' },
  emergency_call: { hi: '108 आपातकालीन कॉल', en: 'Call 108 Emergency' },
  doctor_summary_docx: { hi: 'डॉक्टर पर्चा (.docx)', en: 'Doctor Summary (.docx)' },
  doctor_summary_pdf: { hi: 'डॉक्टर पर्चा (PDF)', en: 'Doctor Summary (PDF)' },
  toggle_lang: { hi: 'भाषा बदलें', en: 'Change Language' },
};

export function t(key, lang = LANGS.HI) {
  return STRINGS[key]?.[lang] ?? STRINGS[key]?.hi ?? key;
}

export default STRINGS;
