// API Configuration
export const API_CONFIG = {
  // Base URL for API calls - в режиме разработки всегда используем localhost:3000
  baseURL: import.meta.env.DEV ? 'http://localhost:3000' : (import.meta.env.VITE_API_URL || 'http://localhost:3000'),
  
  // OpenAI API endpoint
  openaiEndpoint: '/api/openai',
  
  // Full OpenAI API URL
  get openaiURL() {
    return `${this.baseURL}${this.openaiEndpoint}`;
  }
};

// Environment variables
export const ENV = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  apiUrl: import.meta.env.VITE_API_URL,
  openaiModel: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'
};

// Debug logging
console.log('API Configuration loaded:');
console.log('Environment:', ENV.isDevelopment ? 'Development' : 'Production');
console.log('Base URL:', API_CONFIG.baseURL);
console.log('OpenAI URL:', API_CONFIG.openaiURL);
console.log('OpenAI Model:', ENV.openaiModel);
