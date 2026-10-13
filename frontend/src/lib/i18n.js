// ---------------------------------------------------------------------------
// Sanjeevani — Multi-Mode UI Localization & Transliteration Engine
// Supports 3 primary modes:
// 1. Pure English ('en'): 100% English vocabulary and Latin script
// 2. Pure Hindi ('hi'): 100% Devanagari script and Hindi vocabulary
// 3. Hinglish ('hinglish'): Hindi language written in English alphabet / Roman script
// STRICT RULE: All digits/numbers MUST ALWAYS be in standard English/Western Arabic
// format (0-9) across ALL modes. Devanagari numerals (०-९) are strictly converted.
// ---------------------------------------------------------------------------

export const LANGS = {
  HI: 'hi',
  EN: 'en',
  HINGLISH: 'hinglish',
  GARH: 'garh',
};

/**
 * toEnglishDigits — Guarantees numbers are always rendered in standard
 * English/Western Arabic digits (0-9). Converts any Devanagari numerals (०-९) to 0-9.
 */
export function toEnglishDigits(val) {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'string' && typeof val !== 'number') return val;
  const str = String(val);
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return str.replace(/[०-९]/g, (d) => {
    const idx = devanagariDigits.indexOf(d);
    return idx !== -1 ? String(idx) : d;
  });
}

/**
 * formatDate — Standardizes dates with Western Arabic numerals (0-9) in day-month-year format.
 */
export function formatDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Devanagari to Hinglish (Roman Script) Transliteration Engine & Dictionary
// ---------------------------------------------------------------------------

const HINGLISH_DICTIONARY = {
  // Navigation & Core Chrome
  'होम': 'Home',
  'डैशबोर्ड': 'Dashboard',
  'लॉग इन': 'Log In',
  'लॉगिन': 'Login',
  'लॉग आउट': 'Log Out',
  'नया खाता': 'Naya Khata',
  'पंजीकरण': 'Registration',
  'नियंत्रण केंद्र': 'Control Center',
  'आशा पोर्टल': 'ASHA Portal',
  'हमारे बारे में': 'Hamare Bare Mein',
  'स्वास्थ्य सलाह': 'Doctor Salah',
  'स्वास्थ्य जांच': 'Swasthya Jaanch',
  'चिकित्सक सहयोग': 'Doctor Paramarsh',
  'आरोग्य': 'Arogya',
  'साथी': 'Saathi',
  'पुराना पर्चा': 'Purana Parcha',
  'पुराने सत्र': 'Purane Sessions',
  'नया सत्र': 'Naya Session',
  'इतिहास': 'Itihas',
  'सत्र': 'Session',
  'भेजें': 'Bhejein',
  'रद्द': 'Radd Karein',
  'रद्द करें': 'Radd Karein',
  'सहेजें': 'Save Karein',
  'ताज़ा करें': 'Taaza Karein',
  'डाउनलोड': 'Download',
  'प्रिंट': 'Print',
  'शेयर': 'Share',
  'सुझाव': 'Sujhav',
  'प्रतिक्रिया': 'Feedback',
  'आपातकाल': 'Aapaatkaal',
  'आपातकालीन': 'Aapaatkalin',
  '108 आपातकालीन कॉल': '108 Aapaatkaal Call',
  '108 आपातकाल': '108 Aapaatkaal',
  '108 एम्बुलेंस': '108 Ambulance',
  '104 स्वास्थ्य सलाह': '104 Swasthya Salah',
  'धूप मोड': 'Dhoop Mode',
  'धूप मोड (हाई कंट्रास्ट)': 'Dhoop Mode (High Contrast)',
  'अक्षर आकार': 'Akshar Aakar',
  'ऑफ़लाइन': 'Offline',
  'ऑफ़लाइन डेमो मोड': 'Offline Demo Mode',
  'जुड़ा हुआ है': 'Connected Hai',

  // Clinical & Consultation
  'डॉक्टर पर्चा': 'Doctor Parcha',
  'डॉक्टर पर्चा (.docx)': 'Doctor Parcha (.docx)',
  'डॉक्टर पर्चा (PDF)': 'Doctor Parcha (PDF)',
  'उपचार पर्चा': 'Upchar Parcha',
  'उपचार पर्चा (PDF)': 'Upchar Parcha (PDF)',
  'उपचार पर्चा (.docx)': 'Upchar Parcha (.docx)',
  'पर्चा डाउनलोड करें': 'Parcha Download Karein',
  'पर्चा (PDF)': 'Parcha (PDF)',
  'पुराना पर्चा व जांच': 'Purana Parcha Aur Jaanch',
  'नया परामर्श शुरू करें': 'Naya Paramarsh Shuru Karein',
  'परामर्श लें': 'Paramarsh Lein',
  'परामर्श इतिहास': 'Paramarsh Itihas',
  'लक्षण': 'Lakshan',
  'दवा': 'Dawa',
  'काढ़ा': 'Kadha',
  'दवा व काढ़ा': 'Dawa Aur Kadha',
  'घरेलू नुस्खे': 'Gharelu Nuskhe',
  'घरेलू नुस्खे व खुराक समय': 'Gharelu Nuskhe Aur Khurak Samay',
  'नुस्खा जोड़ें': 'Nuskha Jodein',
  'नया नुस्खा जोड़ें': 'Naya Nuskha Jodein',
  'दिनचर्या': 'Dincharya',
  'दैनिक साधना': 'Dainik Sadhana',
  'पहाड़ी योगशाला': 'Pahadi Yogashala',
  'प्राणायाम व श्वास': 'Pranayama Aur Saans',
  'ध्वनि ध्यान': 'Dhwani Dhyan',
  'नेत्र जांच': 'Aankhon Ki Jaanch',
  'स्क्रीनिंग': 'Screening',
  'जांच': 'Jaanch',
  'जांच शुरू करें': 'Jaanch Shuru Karein',
  'पुनः प्रयास करें': 'Dobara Koshish Karein',
  'तस्वीर लें': 'Tasveer Lein',
  'कैमरा': 'Camera',
  'अस्पताल': 'Aspataal',
  'प्राथमिक उपचार': 'Prathmik Upchar',
  'मुख्य सेवा': 'Mukhya Seva',
  'नमस्ते': 'Namaste',
  'बोलकर बताएं': 'Bolkar Batayein',
  'निर्देश सुनें': 'Nirdesh Sunein',
  'सुन रहा हूँ…': 'Sun raha hoon…',
  'सोच रहा हूँ…': 'Soch raha hoon…',
  'जल्दी चुनें': 'Jaldi Chunein',
  'सुनें': 'Sunein',
  'रोकें': 'Rokein',
  'सुधार करें': 'Sudhar Karein',

  // Common phrases
  'अपने लक्षण यहाँ लिखें…': 'Apne lakshan yahan likhein…',
  'लक्षण लिखें या बोलें...': 'Lakshan likhein ya bolein...',
  'सुन रहा हूँ… 🎙️': 'Sun raha hoon… 🎙️',
  'क्या यह सलाह आपके काम आई?': 'Kya yeh salah aapke kaam aayi?',
  'हाँ, लाभ हुआ': 'Haan, laabh hua',
  'नहीं': 'Nahi',
  'धन्यवाद! आपकी प्रतिक्रिया से हम बेहतर बनेंगे।': 'Dhanyawad! Aapke feedback se hum behtar banenge.',
  'नीचे खींचकर ताज़ा करें': 'Neeche kheenchkar taaza karein',
};

// Devanagari character mapping tables
const DEV_VOWELS = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah',
};

const DEV_MATRAS = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', 'ः': 'h',
};

const DEV_CONSONANTS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f',
};

/**
 * transliterateDevanagariToHinglish — Converts Devanagari text into clean, readable
 * Roman script (English alphabet) Hindi.
 */
export function transliterateDevanagariToHinglish(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (HINGLISH_DICTIONARY[trimmed]) return HINGLISH_DICTIONARY[trimmed];

  // Quick check: if already Latin / contains no Devanagari, return as is
  if (!/[\u0900-\u097F]/.test(text)) {
    return text;
  }

  let result = '';
  const len = text.length;

  for (let i = 0; i < len; i++) {
    const char = text[i];
    const nextChar = i + 1 < len ? text[i + 1] : '';

    // Devanagari numerals to English digits
    if (char >= '०' && char <= '९') {
      result += String(char.charCodeAt(0) - '०'.charCodeAt(0));
      continue;
    }

    // Independent Vowels
    if (DEV_VOWELS[char]) {
      result += DEV_VOWELS[char];
      continue;
    }

    // Consonants
    if (DEV_CONSONANTS[char]) {
      const rom = DEV_CONSONANTS[char];
      // Check if followed by halant (virama) ्
      if (nextChar === '्') {
        result += rom;
        i++; // skip halant
      } else if (DEV_MATRAS[nextChar]) {
        // Followed by a vowel sign
        result += rom + DEV_MATRAS[nextChar];
        i++; // skip matra
      } else if (nextChar === ' ' || nextChar === '' || /[\s\.,!?:;\(\)\[\]"'\/\-—]/.test(nextChar)) {
        // Word ending consonant in modern Hindi usually drops inherent 'a' (schwa deletion)
        result += rom;
      } else if (DEV_CONSONANTS[nextChar] || DEV_VOWELS[nextChar]) {
        // Followed by another consonant -> keep inherent 'a'
        result += rom + 'a';
      } else {
        result += rom;
      }
      continue;
    }

    // Standalone matras (if any detached)
    if (DEV_MATRAS[char]) {
      result += DEV_MATRAS[char];
      continue;
    }

    // Halant alone
    if (char === '्') {
      continue;
    }

    // Pass punctuation, emojis, spaces, English chars untouched
    result += char;
  }

  // Capitalize first letter of sentences
  return result.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
}

/**
 * localText — Universal 3-way language selector:
 * @param {string} lang - 'en' | 'hi' | 'hinglish' (or 'garh')
 * @param {string} hi - Pure Devanagari Hindi text
 * @param {string} en - Pure English text (no Hindi words)
 * @param {string} hinglish - Hindi language written in English alphabet
 * Returns text with English digits (0-9) strictly enforced.
 */
export function localText(lang, hi, en, hinglish) {
  if (lang === 'en') {
    return toEnglishDigits(en != null ? en : (hi ?? ''));
  }

  if (lang === 'hinglish') {
    if (hinglish != null && hinglish !== '') {
      return toEnglishDigits(hinglish);
    }
    if (typeof hi === 'string') {
      const transliterated = transliterateDevanagariToHinglish(hi);
      return toEnglishDigits(transliterated || en || hi || '');
    }
    return toEnglishDigits(en != null ? en : (hi ?? ''));
  }

  if (lang === 'garh' || lang === 'garhwali') {
    return toEnglishDigits(hi != null ? hi : (en ?? ''));
  }

  // Default: Pure Devanagari Hindi with English digits (0-9)
  return toEnglishDigits(hi != null ? hi : (en ?? ''));
}

// ---------------------------------------------------------------------------
// Standard Dictionary for UI Chrome & Static Keys
// ---------------------------------------------------------------------------
const STRINGS = {
  chat_title: {
    hi: 'डॉ. संजीवनी',
    en: 'Dr. Sanjeevani',
    hinglish: 'Dr. Sanjeevani',
  },
  chat_subtitle: {
    hi: 'आपकी शांत स्वास्थ्य साथी',
    en: 'Your calm clinical health companion',
    hinglish: 'Aapki shaant swasthya sahayak',
  },
  new_session: {
    hi: 'नया सत्र',
    en: 'New Session',
    hinglish: 'Naya Session',
  },
  history: {
    hi: 'पुराने सत्र',
    en: 'History',
    hinglish: 'Purana Itihas',
  },
  placeholder: {
    hi: 'अपने लक्षण यहाँ लिखें…',
    en: 'Describe your symptoms here…',
    hinglish: 'Apne lakshan yahan likhein…',
  },
  send: {
    hi: 'भेजें',
    en: 'Send',
    hinglish: 'Bhejein',
  },
  listening: {
    hi: 'सुन रहा हूँ…',
    en: 'Listening…',
    hinglish: 'Sun raha hoon…',
  },
  thinking: {
    hi: 'सोच रहा हूँ…',
    en: 'Thinking…',
    hinglish: 'Soch raha hoon…',
  },
  tags: {
    hi: 'स्वास्थ्य टैग:',
    en: 'Health Tags:',
    hinglish: 'Swasthya Tags:',
  },
  quick_symptoms: {
    hi: 'जल्दी चुनें',
    en: 'Quick Pick',
    hinglish: 'Jaldi Chunein',
  },
  read_aloud: {
    hi: 'सुनें',
    en: 'Listen',
    hinglish: 'Sunein',
  },
  text_size: {
    hi: 'अक्षर आकार',
    en: 'Text Size',
    hinglish: 'Font Size',
  },
  offline_banner: {
    hi: 'ऑफ़लाइन डेमो मोड',
    en: 'Offline Demo Mode',
    hinglish: 'Offline Demo Mode',
  },
  online_banner: {
    hi: 'जुड़ा हुआ है',
    en: 'Connected',
    hinglish: 'Connected Hai',
  },
  nav_home: {
    hi: 'होम',
    en: 'Home',
    hinglish: 'Home',
  },
  nav_doctor: {
    hi: 'स्वास्थ्य सलाह',
    en: 'Doctor Consultation',
    hinglish: 'Doctor Salah',
  },
  nav_screen: {
    hi: 'स्वास्थ्य जांच',
    en: 'Health Screening',
    hinglish: 'Swasthya Jaanch',
  },
  nav_companion: {
    hi: 'साथी',
    en: 'Companion',
    hinglish: 'Saathi',
  },
  nav_wellness: {
    hi: 'आरोग्य',
    en: 'Wellness',
    hinglish: 'Arogya',
  },
  nav_dashboard: {
    hi: 'डैशबोर्ड',
    en: 'Dashboard',
    hinglish: 'Dashboard',
  },
  nav_admin: {
    hi: 'नियंत्रण केंद्र',
    en: 'Control Center',
    hinglish: 'Control Center',
  },
  nav_asha: {
    hi: 'आशा पोर्टल',
    en: 'ASHA Portal',
    hinglish: 'ASHA Portal',
  },
  nav_about: {
    hi: 'हमारे बारे में',
    en: 'About Us',
    hinglish: 'Hamare Bare Mein',
  },
  login: {
    hi: 'लॉग इन',
    en: 'Log In',
    hinglish: 'Log In',
  },
  register: {
    hi: 'नया खाता',
    en: 'Register',
    hinglish: 'Naya Khata',
  },
  logout: {
    hi: 'लॉग आउट',
    en: 'Log Out',
    hinglish: 'Log Out',
  },
  emergency_call: {
    hi: '108 आपातकालीन कॉल',
    en: 'Call 108 Emergency',
    hinglish: '108 Aapaatkaal Call',
  },
  emergency_108: {
    hi: '108 आपातकाल',
    en: '108 Emergency',
    hinglish: '108 Aapaatkaal',
  },
  doctor_summary_docx: {
    hi: 'डॉक्टर पर्चा (.docx)',
    en: 'Doctor Prescription (.docx)',
    hinglish: 'Doctor Parcha (.docx)',
  },
  doctor_summary_pdf: {
    hi: 'डॉक्टर पर्चा (PDF)',
    en: 'Doctor Prescription (PDF)',
    hinglish: 'Doctor Parcha (PDF)',
  },
  toggle_lang: {
    hi: 'भाषा बदलें',
    en: 'Change Language',
    hinglish: 'Bhasha Badlein',
  },
  parcha_history: {
    hi: 'पुराना पर्चा व जांच',
    en: 'Prescription & Records',
    hinglish: 'Purana Parcha Aur Jaanch',
  },
  download_parcha: {
    hi: 'पर्चा डाउनलोड करें',
    en: 'Download Prescription',
    hinglish: 'Parcha Download Karein',
  },
  start_new_chat: {
    hi: 'नया परामर्श शुरू करें',
    en: 'Start Consultation',
    hinglish: 'Naya Paramarsh Shuru Karein',
  },
  refresh: {
    hi: 'ताज़ा करें',
    en: 'Refresh',
    hinglish: 'Taaza Karein',
  },
  high_contrast: {
    hi: 'धूप मोड (हाई कंट्रास्ट)',
    en: 'High Contrast (Sunlight)',
    hinglish: 'Dhoop Mode (High Contrast)',
  },
  ayush_routine: {
    hi: 'घरेलू नुस्खे व खुराक समय',
    en: 'Home Remedies & Routine',
    hinglish: 'Gharelu Nuskhe Aur Khurak Samay',
  },
  add_remedy: {
    hi: 'नुस्खा जोड़ें',
    en: 'Add Remedy',
    hinglish: 'Nuskha Jodein',
  },
  wellness_flow: {
    hi: 'दैनिक साधना',
    en: 'Daily Wellness Flow',
    hinglish: 'Dainik Sadhana',
  },
  wellness_yoga: {
    hi: 'पहाड़ी योगशाला',
    en: 'Himalayan Yoga',
    hinglish: 'Pahadi Yogashala',
  },
  wellness_pranayam: {
    hi: 'प्राणायाम व श्वास',
    en: 'Pranayama & Breathwork',
    hinglish: 'Pranayama Aur Saans',
  },
  wellness_dhyan: {
    hi: 'ध्वनि ध्यान',
    en: 'Singing Bowls & Meditation',
    hinglish: 'Dhwani Dhyan',
  },
  saathi_headline: {
    hi: 'संजीवनी साथी — मन का हाल',
    en: 'Sanjeevani Saathi — Heart to Heart',
    hinglish: 'Sanjeevani Saathi — Dil Ki Baat',
  },
  feedback_helpful: {
    hi: 'क्या यह सलाह आपके काम आई?',
    en: 'Was this advice helpful?',
    hinglish: 'Kya yeh salah aapke kaam aayi?',
  },
  feedback_yes: {
    hi: 'हाँ, लाभ हुआ',
    en: 'Yes, it helped',
    hinglish: 'Haan, fayda hua',
  },
  feedback_no: {
    hi: 'नहीं',
    en: 'No',
    hinglish: 'Nahi',
  },
  feedback_thanks: {
    hi: 'धन्यवाद! आपकी प्रतिक्रिया से हम बेहतर बनेंगे।',
    en: 'Thank you! Your feedback helps us improve.',
    hinglish: 'Dhanyawad! Aapke feedback se hum behtar banenge.',
  },
  disclaimer_ai: {
    hi: '⚠️ यह एक AI स्वास्थ्य सहायक है, डॉक्टर नहीं। आपातकालीन स्थिति में तुरंत 108 पर संपर्क करें।',
    en: '⚠️ AI Health Assistant for guidance only, not a doctor. In emergency call 108 immediately.',
    hinglish: '⚠️ Yeh ek AI swasthya sahayak hai, doctor nahi. Aapaatkaal me turant 108 par call karein.',
  },
  triage_green: {
    hi: 'सामान्य (घरेलू देखभाल)',
    en: 'Green — Self Care & Home Remedies',
    hinglish: 'Green — Gharelu Dekhbhal',
  },
  triage_yellow: {
    hi: 'मध्यम (क्लिनिक परामर्श)',
    en: 'Yellow — Clinic Consultation',
    hinglish: 'Yellow — Clinic Paramarsh',
  },
  triage_red: {
    hi: 'गंभीर (तत्काल अस्पताल)',
    en: 'Red — Urgent Hospital Referral',
    hinglish: 'Red — Turant Aspataal Referral',
  },
  pull_to_refresh: {
    hi: 'नीचे खींचकर ताज़ा करें',
    en: 'Pull down to refresh',
    hinglish: 'Neeche kheenchkar taaza karein',
  },
};

export function t(key, lang = LANGS.HI) {
  const item = STRINGS[key];
  if (!item) return toEnglishDigits(key);
  let text = item[lang];
  if (!text) {
    if (lang === 'hinglish') {
      text = item.hinglish || transliterateDevanagariToHinglish(item.hi) || item.en;
    } else if (lang === 'en') {
      text = item.en || item.hi;
    } else {
      text = item.hi || item.en;
    }
  }
  return toEnglishDigits(text);
}

export default STRINGS;
