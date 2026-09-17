import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

/**
 * Performs non-invasive edge diagnostic screening against Sanjeevani's computer vision pipeline.
 * @param {'ANEMIA' | 'JAUNDICE' | 'ORAL' | 'SKIN'} type - The diagnostic screening modality.
 * @param {File | Blob} fileOrBlob - The uploaded image or webcam capture blob.
 * @returns {Promise<Object>} The diagnostic result including biomarkers, estimated metrics, risk, and annotated image.
 */
export const runEdgeDiagnosticScreening = async (type, fileOrBlob) => {
  const endpointMap = {
    ANEMIA: '/screen/anemia',
    JAUNDICE: '/screen/jaundice',
    ORAL: '/screen/oral',
    SKIN: '/screen/skin',
  };

  const endpoint = endpointMap[type] || '/screen/anemia';
  const formData = new FormData();
  formData.append('file', fileOrBlob, 'screening_sample.jpg');

  const response = await api.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

/**
 * Generates and downloads a standardized ABDM-compliant FHIR DiagnosticReport JSON file.
 * @param {Object} reportData - The FHIR JSON report bundle from the backend.
 * @param {string} patientName - Optional patient identifier.
 */
export const downloadAbdmFhirBundle = (reportData, patientName = 'Patient') => {
  const fhirPayload = {
    ...reportData,
    subject: {
      display: patientName,
      reference: 'Patient/SANJ-PAT-DEMO',
    },
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord'],
      versionId: '1',
      lastUpdated: new Date().toISOString(),
    },
  };

  const jsonStr = JSON.stringify(fhirPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${reportData.id || 'ABDM_DiagnosticReport'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
