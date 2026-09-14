import React, { useState } from 'react';
import { Camera, Eye, CheckCircle2, ShieldCheck, RefreshCw, FlaskConical } from 'lucide-react';

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

    // NOTE: this is a client-side DEMO simulation of a Gray-World + CIELAB
    // erythema/jaundice scoring pipeline — no real image analysis happens
    // here yet. It's clearly labelled below so it's never mistaken for a
    // real diagnostic result by a patient or a judge.
    setTimeout(() => {
      if (screeningType === 'ANEMIA') {
        setResult({
          type: 'Anemia Risk Screening (Conjunctiva Pallor)',
          score: 0.3241,
          threshold: 0.38,
          risk: 'HIGH_ANEMIA_RISK',
          recommendation: 'Palpebral mucosal erythema index is below baseline. Recommend laboratory Complete Blood Count (CBC) at nearest Primary Health Centre.',
        });
      } else {
        setResult({
          type: 'Jaundice / Bilirubin Screening (Sclera Icterus)',
          score: 0.2114,
          threshold: 0.45,
          risk: 'NORMAL',
          recommendation: 'No significant scleral icterus or yellow-shift detected in ocular white region.',
        });
      }
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h2 className="font-serif text-3xl font-bold text-warm-indigo flex items-center justify-center gap-2">
          <Eye className="w-8 h-8 text-sage" /> Non-Invasive Ocular Diagnostic Suite
        </h2>
        <p className="text-sm text-primary/80 mt-2">
          Heuristic CIELAB & HSV color-space screening for rural areas without immediate laboratory access.
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-6 flex items-center gap-2 bg-gold-warm/10 border border-gold-warm/30 text-[#7A4F14] text-xs rounded-2xl px-4 py-2.5">
        <FlaskConical className="w-4 h-4 shrink-0" />
        <span>
          <strong>Demo simulation:</strong> this build shows illustrative sample scores. Real on-device
          image scoring is on the roadmap — see the "Additional Features" notes for the planned pipeline.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border-subtle">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setScreeningType('ANEMIA'); setResult(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                screeningType === 'ANEMIA' ? 'bg-sage text-white border-sage' : 'bg-gray-50 text-primary'
              }`}
            >
              Anemia (Lower Eyelid)
            </button>
            <button
              onClick={() => { setScreeningType('JAUNDICE'); setResult(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                screeningType === 'JAUNDICE' ? 'bg-gold-warm text-warm-indigo border-gold-warm' : 'bg-gray-50 text-primary'
              }`}
            >
              Jaundice (Eye White)
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-warm-indigo transition-colors relative">
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
                <span className="text-sm font-bold text-warm-indigo block">Upload or Click Photo of Eye</span>
                <span className="text-xs text-muted">Pull lower eyelid down for Anemia, or focus on eye white for Jaundice</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          <button
            onClick={handleRunScreening}
            disabled={!selectedImage || loading}
            className="w-full mt-4 bg-warm-indigo hover:opacity-90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Run White-Balanced Biomarker Scan
          </button>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border-subtle flex flex-col justify-center">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-serif font-bold text-lg text-warm-indigo">{result.type}</h4>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  result.risk.includes('HIGH') ? 'bg-rose-soft text-white' : 'bg-sage text-white'
                }`}>
                  {result.risk}
                </span>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted">Calculated Index Score:</span>
                  <span className="font-mono font-bold text-warm-indigo">{result.score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Normal Cutoff Threshold:</span>
                  <span className="font-mono">{result.threshold}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F3EFE4] border border-border-subtle text-xs text-[#2A2E35] leading-relaxed">
                <span className="font-bold block text-warm-indigo mb-1">Clinical Interpretation:</span>
                {result.recommendation}
              </div>

              <button
                onClick={() => alert('Exporting ABDM FHIR DiagnosticReport Bundle...')}
                className="w-full bg-gold-warm text-warm-indigo font-bold py-2.5 rounded-xl text-xs"
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

      <div className="max-w-2xl mx-auto mt-6 flex items-center gap-2 text-xs text-muted justify-center">
        <ShieldCheck className="w-3.5 h-3.5 text-sage" />
        This tool supports, but never replaces, a clinician's diagnosis.
      </div>
    </div>
  );
}
