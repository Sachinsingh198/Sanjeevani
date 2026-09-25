import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const companionApi = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

companionApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('sanjeevani_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getStories = async () => {
  const res = await companionApi.get('/companion/stories');
  return res.data;
};

export const getDailyThought = async () => {
  const res = await companionApi.get('/companion/daily-thought');
  return res.data;
};

export const sendCompanionMessage = async (payload) => {
  const res = await companionApi.post('/companion/chat', payload);
  return res.data;
};

export default companionApi;
