import React, { useState, useMemo } from 'react';
import {
  Pill, Search, Calculator, MapPin, PhoneCall, Navigation,
  TrendingDown, CheckCircle2, ExternalLink, Sparkles, Building2, ShieldCheck, ChevronRight
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ESSENTIAL_GENERICS = [
  {
    id: 'pcm650',
    category: 'fever',
    molecule: 'Paracetamol 650 mg',
    brandName: 'Dolo 650 / Calpol',
    form: '15 Tablets Strip',
    brandPrice: 34,
    janAushadhiPrice: 7,
    use: 'Bukhar aur sharir dard (Fever & Body pain)',
  },
  {
    id: 'amoxclav',
    category: 'antibiotic',
    molecule: 'Amoxicillin + Potassium Clavulanate 625 mg',
    brandName: 'Augmentin 625 / Moxikind-CV',
    form: '10 Tablets Strip',
    brandPrice: 215,
    janAushadhiPrice: 58,
    use: 'Severe bacterial infection / Chest congestion',
  },
  {
    id: 'azithro',
    category: 'antibiotic',
    molecule: 'Azithromycin 500 mg',
    brandName: 'Azithral 500 / Azee',
    form: '5 Tablets Strip',
    brandPrice: 128,
    janAushadhiPrice: 24,
    use: 'Gale mein kharash aur shwas sankraman (Throat & Chest infection)',
  },
  {
    id: 'panto40',
    category: 'digestion',
    molecule: 'Pantoprazole 40 mg',
    brandName: 'Pan 40 / Pantocid',
    form: '10 Tablets Strip',
    brandPrice: 118,
    janAushadhiPrice: 19,
    use: 'Acidity, seene mein jalan, gas (Acid reflux)',
  },
  {
    id: 'cetri',
    category: 'allergy',
    molecule: 'Cetirizine 10 mg',
    brandName: 'Cetzine / Okacet',
    form: '10 Tablets Strip',
    brandPrice: 44,
    janAushadhiPrice: 6,
    use: 'Jukam, naak behna, allergy (Cold & Sneezing)',
  },
  {
    id: 'ors',
    category: 'digestion',
    molecule: 'Oral Rehydration Salts (WHO Formula)',
    brandName: 'Electral Sachet',
    form: '21.8g Sachet',
    brandPrice: 23,
    janAushadhiPrice: 4.5,
    use: 'Dast aur dehydration mein jeevan rakshak ghol (Dehydration)',
  },
  {
    id: 'metformin',
    category: 'chronic',
    molecule: 'Metformin Hydrochloride 500 mg SR',
    brandName: 'Glycomet 500',
    form: '20 Tablets Strip',
    brandPrice: 52,
    janAushadhiPrice: 11,
    use: 'Sugar / Diabetes niyantran (Blood sugar control)',
  },
  {
    id: 'amlo5',
    category: 'chronic',
    molecule: 'Amlodipine 5 mg',
    brandName: 'Amlong 5 / Stamlo',
    form: '15 Tablets Strip',
    brandPrice: 42,
    janAushadhiPrice: 7,
    use: 'High Blood Pressure (BP niyantran)',
  },
  {
    id: 'cough',
    category: 'fever',
    molecule: 'Dextromethorphan + Chlorpheniramine Syrup',
    brandName: 'Benadryl / Ascoril-D',
    form: '100 ml Bottle',
    brandPrice: 110,
    janAushadhiPrice: 28,
    use: 'Sookhi khansi aur gale ki jalan (Dry Cough)',
  },
  {
    id: 'diclogel',
    category: 'fever',
    molecule: 'Diclofenac Diethylamine Gel 1.16%',
    brandName: 'Volini / Moov Gel',
    form: '30 g Tube',
    brandPrice: 92,
    janAushadhiPrice: 20,
    use: 'Jodon ka dard, moch (Joint & Muscle Pain)',
  },
];

const LOCAL_KENDRA_CENTERS = [
  {
    id: 'kendra-gopeshwar',
    name: 'PMBJK District Hospital Gopeshwar',
    location: 'Near District Hospital Gate, Gopeshwar, Chamoli',
    phone: '01372-252110',
    distance: 'District Center',
    timings: '09:00 AM - 07:00 PM',
  },
  {
    id: 'kendra-joshimath',
    name: 'PMBJK Main Market Joshimath',
    location: 'Badrinath Marg, Near CHC Hospital, Joshimath',
    phone: '01389-222123',
    distance: 'Hill CHC Link',
    timings: '09:00 AM - 06:30 PM',
  },
  {
    id: 'kendra-karnaprayag',
    name: 'PMBJK Sub-District Hospital Karnaprayag',
    location: 'Main Highway, Near SDH Complex, Karnaprayag',
    phone: '01363-244220',
    distance: 'Sangam Hub',
    timings: '08:30 AM - 07:30 PM',
  },
  {
    id: 'kendra-rudraprayag',
    name: 'PMBJK District Hospital Rudraprayag',
    location: 'Near Collectorate & Hospital, Rudraprayag',
    phone: '01364-233150',
    distance: 'Valley Center',
    timings: '09:00 AM - 07:00 PM',
  },
];

export default function JanAushadhiCard({ initialSearch = '', compact = false }) {
  const { l, toEnglishDigits } = useLanguage();
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedQty, setSelectedQty] = useState({ pcm650: 1, panto40: 1 });

  const filteredMedicines = useMemo(() => {
    return ESSENTIAL_GENERICS.filter((med) => {
      const matchSearch =
        med.molecule.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.use.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = activeCategory === 'all' || med.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [searchTerm, activeCategory]);

  const handleOpenGpsLocator = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          window.open(
            `https://www.google.com/maps/search/Pradhan+Mantri+Jan+Aushadhi+Kendra/@${latitude},${longitude},13z`,
            '_blank',
            'noopener,noreferrer'
          );
        },
        () => {
          window.open(
            'https://www.google.com/maps/search/Pradhan+Mantri+Jan+Aushadhi+Kendra+near+me',
            '_blank',
            'noopener,noreferrer'
          );
        }
      );
    } else {
      window.open(
        'https://www.google.com/maps/search/Pradhan+Mantri+Jan+Aushadhi+Kendra+near+me',
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  return (
    <div className="bg-white dark:bg-card rounded-3xl border border-sage/20 dark:border-gray-800 shadow-sm overflow-hidden space-y-4">
      {/* ── Top Header Banner ── */}
      <div className="bg-gradient-to-r from-sage/15 via-emerald-600/10 to-teal-500/15 dark:from-warm-indigo dark:to-gray-800 p-4 sm:p-5 border-b border-sage/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-sage text-white flex items-center justify-center shrink-0 shadow-xs">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                PMBJP Kendra
              </span>
              <span className="text-[11px] font-bold text-sage dark:text-booti-glow flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>{l('50% से 90% तक की भारी बचत', 'Save 50% to 90% on Prescriptions', '50% se 90% tak ki bachat')}</span>
              </span>
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-primary mt-0.5">
              {l(
                'प्रधानमंत्री भारतीय जन औषधि केंद्र (PMBJP) - जेनेरिक दवा विकल्प',
                'Jan Aushadhi Kendra — Generic Medicine Cost Estimator',
                'Pradhan Mantri Jan Aushadhi Kendra — Sasti Generic Dawa Calculator'
              )}
            </h3>
            <p className="text-xs text-muted dark:text-muted mt-0.5">
              {l(
                'ब्रांडेड कंपनियों की महंगी दवाओं के स्थान पर समान साल्ट वाली सरकारी गुणवत्ता-प्रमाणित जेनेरिक दवाएं।',
                'Government-certified generic alternatives with identical chemical salts at a fraction of brand costs.',
                'Mehengi branded dawaon ki jagah same salt wali sarkari generic dawayein.'
              )}
            </p>
          </div>
        </div>

        {/* GPS Locator Button */}
        <button
          type="button"
          onClick={handleOpenGpsLocator}
          className="shrink-0 touch-target inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-sage hover:bg-sage/90 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>{l('नज़दीकी केंद्र खोजें', 'Locate Nearest Kendra', 'Paas Ka Kendra Khojein')}</span>
        </button>
      </div>

      <div className="px-4 sm:px-6 space-y-4">
        {/* Search and Category Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={l(
                'दवा, साल्ट या बीमारी खोजें (उदा. Paracetamol, Dolo, Gas, BP)...',
                'Search medicine, brand or symptom (e.g. Paracetamol, Dolo, BP, Gas)...',
                'Dawa, brand ya lakshan search karein (e.g. Paracetamol, Dolo, BP)...'
              )}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-mist/50 dark:bg-card text-primary focus:outline-none focus:ring-1 focus:ring-sage"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: l('सभी', 'All', 'Sabhi') },
              { id: 'fever', label: l('बुखार व दर्द', 'Fever & Pain', 'Bukhar & Dard') },
              { id: 'antibiotic', label: l('एंटीबायोटिक', 'Antibiotics', 'Antibiotics') },
              { id: 'digestion', label: l('गैस व पाचन', 'Acidity / Digestion', 'Gas & Pachan') },
              { id: 'chronic', label: l('बीपी व शुगर', 'BP & Sugar', 'BP & Sugar') },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all shrink-0 cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-sage text-white border-sage'
                    : 'bg-white dark:bg-card text-primary border-gray-200 dark:border-gray-700 hover:border-sage/40'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Medicine Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
          {filteredMedicines.map((med) => {
            const savingsRs = med.brandPrice - med.janAushadhiPrice;
            const savingsPercent = Math.round((savingsRs / med.brandPrice) * 100);

            return (
              <div
                key={med.id}
                className="p-3.5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/70 dark:bg-card/70 hover:border-sage/40 transition-all flex flex-col justify-between gap-2 shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-primary leading-snug">
                        {med.molecule}
                      </h4>
                      <p className="text-[11px] text-muted font-medium mt-0.5">
                        {l('ब्रांडेड नाम', 'Branded Alternative', 'Brand Name')}: <span className="font-bold text-gray-700 dark:text-gray-300">{med.brandName}</span> ({med.form})
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-600/30">
                      {toEnglishDigits(savingsPercent)}% {l('बचत', 'Saved', 'Bachat')}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted dark:text-gray-400 mt-1 italic">
                    {med.use}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] text-muted line-through">
                      ₹{toEnglishDigits(med.brandPrice)}
                    </span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{toEnglishDigits(med.janAushadhiPrice)}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      ({l('जन औषधि दर', 'Jan Aushadhi Price', 'Jan Aushadhi Rate')})
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-sage dark:text-booti-glow">
                    {l('सीधी बचत: ₹', 'Save: ₹', 'Bachat: ₹')}{toEnglishDigits(savingsRs)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Verified Chamoli & Uttarakhand Centers ── */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-serif font-bold text-xs sm:text-sm text-primary flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sage" />
              <span>{l('सत्यापित जन औषधि केंद्र (गढ़वाल / चमोली क्षेत्र)', 'Verified Kendras (Chamoli & Garhwal Region)', 'Verified Jan Aushadhi Kendras')}</span>
            </h4>
            <a
              href="https://janaushadhi.gov.in"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-sage dark:text-booti-glow hover:underline inline-flex items-center gap-1"
            >
              <span>janaushadhi.gov.in</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {LOCAL_KENDRA_CENTERS.map((kendra) => (
              <div
                key={kendra.id}
                className="p-3 rounded-2xl bg-mist/60 dark:bg-card border border-gray-200/80 dark:border-gray-800 flex flex-col justify-between gap-1.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-primary truncate max-w-[200px]">
                      {kendra.name}
                    </h5>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sage/10 text-sage dark:text-booti-glow">
                      {kendra.distance}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted flex items-start gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-sage shrink-0 mt-0.5" />
                    <span>{kendra.location}</span>
                  </p>
                </div>

                <div className="pt-1.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-[10px] text-muted font-medium">
                    {kendra.timings}
                  </span>
                  <div className="flex gap-1.5">
                    <a
                      href={`tel:${kendra.phone}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 shadow-2xs"
                      title={l('कॉल करें', 'Call Kendra', 'Call Karein')}
                    >
                      <PhoneCall className="w-2.5 h-2.5" />
                      <span>{l('कॉल', 'Call', 'Call')}</span>
                    </a>
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(kendra.name + ' ' + kendra.location)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sage text-white text-[10px] font-bold hover:bg-sage/90 shadow-2xs"
                      title={l('दिशा देखें (Google Maps)', 'Directions', 'Rasta Dekhein')}
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      <span>{l('रास्ता', 'Map', 'Rasta')}</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="p-3 bg-mist/50 dark:bg-card/90 text-center text-[10px] text-muted border-t border-gray-100 dark:border-gray-800">
        {l(
          '💡 टिप: डॉक्टर के पर्चे पर हमेशा जेनेरिक साल्ट (Generic Name) लिखने का अनुरोध करें ताकि जन औषधि केंद्र से 90% तक कम खर्च में दवा मिल सके।',
          '💡 Tip: Request your PHC doctor to mention the generic molecule name on the prescription to purchase medicines at Jan Aushadhi prices.',
          '💡 Tip: Doctor se prescription par generic name likhne ko kahein taaki Jan Aushadhi se sasti dawa mil sake.'
        )}
      </div>
    </div>
  );
}
