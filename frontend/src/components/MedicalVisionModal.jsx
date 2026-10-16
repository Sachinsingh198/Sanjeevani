import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Pill, Stethoscope, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { scanMedicalImage } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

export default function MedicalVisionModal({
  isOpen,
  onClose,
  conversationId,
  onScanComplete,
}) {
  const { lang, l } = useLanguage();
  const [scanType, setScanType] = useState('prescription_medicine');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error(l('कृपया एक वैध फोटो चुनें', 'Please choose a valid image file', 'Kripya ek valid photo chunein'));
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error(l('कृपया पहले फोटो चुनें या लें', 'Please select or capture a photo first', 'Kripya pehle photo select karein ya lein'));
      return;
    }

    setAnalyzing(true);
    try {
      const result = await scanMedicalImage(selectedFile, scanType, lang, conversationId);
      toast.success(l('विश्लेषण पूर्ण हुआ', 'Analysis complete', 'Analysis complete ho gaya'));
      onScanComplete(result);
      onClose();
    } catch (err) {
      console.error('[Vision Scan Error]', err);
      toast.error(l('विश्लेषण विफल रहा, कृपया दोबारा प्रयास करें', 'Scan failed, please try again', 'Scan fail ho gaya, kripya dobara try karein'));
    } finally {
      setAnalyzing(false);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-warm-indigo rounded-3xl shadow-2xl border border-sage/20 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-sage/10 dark:border-gray-800 flex items-center justify-between bg-sage/5 dark:bg-gray-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sage/10 dark:bg-booti-glow/10 text-sage dark:text-booti-glow rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary dark:text-cream">
                {l('मेडिकल विज़न स्कैनर', 'Medical Vision Scanner', 'Medical Vision Scanner')}
              </h3>
              <p className="text-xs text-muted dark:text-gray-400">
                {l('दवा पर्ची, स्ट्रिप या चकत्ते की फोटो स्कैन करें', 'Scan Rx, medicine strip or skin rash', 'Dawa parchi, strip ya rash ki photo scan karein')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Scan Mode Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              {l('स्कैन का प्रकार चुनें', 'Select Scan Mode', 'Scan Ka Type Chunein')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScanType('prescription_medicine')}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  scanType === 'prescription_medicine'
                    ? 'border-sage bg-sage/10 dark:bg-booti-glow/10 text-sage dark:text-booti-glow shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-sage/40'
                }`}
              >
                <Pill className="w-4 h-4 shrink-0" />
                <span className="truncate">{l('दवा / पर्ची (Rx)', 'Medicine / Strip', 'Dawa / Parchi')}</span>
              </button>

              <button
                type="button"
                onClick={() => setScanType('symptom_skin')}
                className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                  scanType === 'symptom_skin'
                    ? 'border-sage bg-sage/10 dark:bg-booti-glow/10 text-sage dark:text-booti-glow shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-sage/40'
                }`}
              >
                <Stethoscope className="w-4 h-4 shrink-0" />
                <span className="truncate">{l('त्वचा / लक्षण', 'Skin / Rash', 'Skin / Lakshan')}</span>
              </button>
            </div>
          </div>

          {/* Upload or Capture Preview Area */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-sage/30 hover:border-sage dark:border-gray-700 rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all bg-sage/5 dark:bg-gray-800/30 hover:bg-sage/10"
              >
                <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-md text-sage dark:text-booti-glow mb-3">
                  <Camera className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-primary dark:text-cream">
                  {l('कैमरा से फोटो लें या गैलरी से चुनें', 'Take a photo or choose from gallery', 'Camera se photo lein ya gallery se chunein')}
                </p>
                <p className="text-xs text-muted dark:text-gray-400 mt-1">
                  {l('PNG, JPG या WEBP (स्पष्ट और अच्छी रोशनी में)', 'PNG, JPG or WEBP (Clear & well lit)', 'PNG, JPG ya WEBP (Saaf roshni mein)')}
                </p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-sage/20 dark:border-gray-700 bg-black/5 dark:bg-black/30">
                <img
                  src={previewUrl}
                  alt="Medical scan preview"
                  className="w-full max-h-60 object-contain mx-auto"
                />
                <button
                  onClick={resetSelection}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Clinical Guidance note */}
          <div className="flex items-start gap-2 p-3 bg-gold-warm/10 border border-gold-warm/20 rounded-2xl text-[11px] text-primary dark:text-gray-300">
            <AlertCircle className="w-4 h-4 text-gold-warm shrink-0 mt-0.5" />
            <p>
              {scanType === 'prescription_medicine'
                ? l('दवा का नाम (उदा. Paracetamol 500mg, Amoxicillin आदि) और खुराक वाली साइड साफ रोशनी में स्कैन करें। डॉ. संजीवनी दवा का पूरा विवरण, डॉक्टर की अनुशंसित खुराक, समय और काढ़े के साथ इंटरेक्शन बताएंगी।', 'Scan the side with printed medicine name (e.g. Paracetamol 500mg, Amoxicillin) and dosage. Dr. Sanjeevani will identify what the medicine is for, doctor dosage recommendations, timings, and Ayurvedic interactions.', 'Dawa ka naam aur mg wali printed side scan karein. Dr. Sanjeevani dawa ka upyog, doctor ki dosage salah aur kadhe ke sath interaction batayengi.')
                : l('प्रभावित त्वचा या चकत्ते को प्राकृतिक रोशनी में केंद्र में रखकर फोटो लें। संजीवनी का कंप्यूटर विज़न एरिथेमा (लालिमा) और खुरदरेपन की जांच कर प्राथमिक फर्स्ट-एड व सलाह देगा।', 'Center the affected skin rash or lesion in clear daylight. Sanjeevani computer vision will evaluate erythema index (redness) and border scaling for triage.', 'Twacha ke rash ko roshni me center karke photo lein. Sanjeevani computer vision laalima aur sujan scan karegi.')}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sage/10 dark:border-gray-800 flex items-center justify-end gap-2 bg-sage/5 dark:bg-gray-800/40">
          <button
            type="button"
            onClick={onClose}
            disabled={analyzing}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {l('रद्द करें', 'Cancel', 'Cancel')}
          </button>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!selectedFile || analyzing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              !selectedFile || analyzing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700'
                : 'bg-sage hover:bg-sage/90 text-white cursor-pointer active:scale-95'
            }`}
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{l('विश्लेषण हो रहा है...', 'Analyzing...', 'Analyze ho raha hai...')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{l('स्कैन और विश्लेषण करें', 'Scan & Analyze', 'Scan & Analyze Karein')}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
