import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { seedDemoUsers, seedDemoEmployees } from '@/lib/seed';

// Инициализация тестовых аккаунтов в localStorage
try {
  seedDemoUsers();
  seedDemoEmployees();
} catch (error) {
  console.warn('Failed to seed demo data:', error);
}

createRoot(document.getElementById("root")!).render(<App />);
