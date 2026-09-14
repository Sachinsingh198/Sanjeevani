import React, { useState } from 'react';
import { Camera, Eye, Upload, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

export default function Screening() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [screeningType, setScreeningType] = useState('ANEMIA');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleRunScreening = () => {
    if (!selectedImage) return;
    setLoading(true);

    // Simulate Gray-World + CIELAB Erythema / Jaundice scoring
    setTimeout(() => {
      if (screeningType === 'ANEMIA') {
        setResult({
          type: 'Anemia Risk Screening (Conjunctiva Pallor)',
          score: 0.3241,
          threshold: 0.38,
          risk: 'HIGH_ANEMIA_RISK',
          recommendation: 'Palpebral mucosal erythema index is below baseline. Recommend laboratory Complete Blood Count (CBC) at nearest Primary Health Centre.'
        });
      } else {
        setResult({
          type: 'Jaundice / Bilirubin Screening (Sclera Icterus)',
          score: 0.2114,
          threshold: 0.45,
          risk: 'NORMAL',
          recommendation: 'No significant scleral icterus or yellow-shift detected in ocular white region.'
        });
      }
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="font-serif text-3xl font-bold text-[#1C2B4A] flex items-center justify-center gap-2">
          <Eye className="w-8 h-8 text-[#5F7A52]" /> Non-Invasive Ocular Diagnostic Suite
        </h2>
        <p className="text-sm text-[#2A2E35]/80 mt-2">
          Heuristic CIELAB & HSV color-space screening for rural areas without immediate laboratory access.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left: Image Capture & Mode Selector */}
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border-subtle">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setScreeningType('ANEMIA'); setResult(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                screeningType === 'ANEMIA' ? 'bg-[#5F7A52] text-white border-[#5F7A52]' : 'bg-gray-50 text-primary'
              }`}
            >
              Anemia (Lower Eyelid)
            </button>
            <button
              onClick={() => { setScreeningType('JAUNDICE'); setResult(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                screeningType === 'JAUNDICE' ? 'bg-[#E8A33D] text-[#1C2B4A] border-[#E8A33D]' : 'bg-gray-50 text-primary'
              }`}
            >
              Jaundice (Eye White)
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#1C2B4A] transition-colors relative">
            {selectedImage ? (
              <div className="space-y-3">
                <img src={selectedImage} alt="Ocular preview" className="max-h-56 mx-auto rounded-lg object-contain" />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-xs text-red-600 underline"
                >
                  Remove & Take Another Photo
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <Camera className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <span className="text-sm font-bold text-[#1C2B4A] block">Upload or Click Photo of Eye</span>
                <span className="text-xs text-muted">Pull lower eyelid down for Anemia, or focus on eye white for Jaundice</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          <button
            onClick={handleRunScreening}
            disabled={!selectedImage || loading}
            className="w-full mt-4 bg-[#1C2B4A] hover:bg-[#121c30] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Run White-Balanced Biomarker Scan
          </button>
        </div>

        {/* Right: Results & Guidance */}
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border-subtle flex flex-col justify-center">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-serif font-bold text-lg text-[#1C2B4A]">{result.type}</h4>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  result.risk.includes('HIGH') ? 'bg-[#A83A32] text-white' : 'bg-[#5F7A52] text-white'
                }`}>
                  {result.risk}
                </span>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted">Calculated Index Score:</span>
                  <span className="font-mono font-bold text-[#1C2B4A]">{result.score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Normal Cutoff Threshold:</span>
                  <span className="font-mono">{result.threshold}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F3EFE4] border border-border-subtle text-xs text-[#2A2E35] leading-relaxed">
                <span className="font-bold block text-[#1C2B4A] mb-1">Clinical Interpretation:</span>
                {result.recommendation}
              </div>

              <button
                onClick={() => alert('Exporting ABDM FHIR DiagnosticReport Bundle...')}
                className="w-full bg-[#E8A33D] text-[#1C2B4A] font-bold py-2.5 rounded-xl text-xs"
              >
                Generate PHC Diagnostic Referral
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <Eye className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Upload an image to see color-calibrated erythema & icterus biomarkers.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}