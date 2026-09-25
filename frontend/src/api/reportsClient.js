import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const reportsApi = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

reportsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('sanjeevani_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Requests the consultation-summary .docx from the backend and triggers a
 * browser download. Patient identity comes from the logged-in session on
 * the server side — this only needs to send the consultation content.
 */
export const downloadConsultationReport = async ({
  conversationId,
  tier,
  flags = [],
  remedies = [],
  consultationSummary = '',
  format = 'docx',
}) => {
  const isPdf = format.toLowerCase() === 'pdf';
  const endpoint = isPdf ? '/reports/consultation-summary.pdf' : '/reports/consultation-summary';
  const res = await reportsApi.post(
    endpoint,
    {
      conversation_id: conversationId,
      tier,
      flags,
      remedies,
      consultation_summary: consultationSummary,
    },
    { responseType: 'blob' }
  );

  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sanjeevani_Consultation_${conversationId}.${isPdf ? 'pdf' : 'docx'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};