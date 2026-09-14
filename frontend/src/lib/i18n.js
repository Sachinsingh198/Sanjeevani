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
};

export function t(key, lang = LANGS.HI) {
  return STRINGS[key]?.[lang] ?? STRINGS[key]?.hi ?? key;
}

export default STRINGS;
