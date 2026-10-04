/**
 * Centralized API Configuration
 * Uses environment variables for local development and production
 */

const rawUrl = (import.meta.env.VITE_API_URL || '').trim();
const API_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

export default API_URL;
