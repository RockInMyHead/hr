import { useState, useEffect } from "react";
import { STORAGE_KEYS } from "@/constants/storage";
import { saveLastVisit } from "@/lib/session";
import { useNavigate } from "react-router-dom";

import HRCall from "@/components/HRCall";
import { AuthForm } from "@/components/AuthForm";
import { UserProfile } from "@/components/UserProfile";
import HRChat from "@/components/HRChat";
import RAGChatInterface from "@/components/RAGChatInterface";

import { AIAssessmentDialog } from "@/components/AIAssessmentDialog";
import { MANAGER_CHECKLIST, SELF_CHECKLIST, SUBORDINATE_CHECKLIST } from "@/constants/checklists";
import Employees from "@/components/Employees";
import { HRSupervisor } from "@/components/HRSupervisor";
import { CompetencyProfile } from "@/components/CompetencyProfile";
import { ManagerDashboard } from "@/components/ManagerDashboard";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { InteractiveOrgChart } from "@/components/InteractiveOrgChart";
import { BulkInvitationSystem } from "@/components/BulkInvitationSystem";
import { UnifiedAIInterview } from "@/components/UnifiedAIInterview";
import type { AppUser } from "@/types/profile";

type User = AppUser;

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<"auth" | "profile" | "chat" | "rag-chat" | "call" | "ai-assessment" | "employees" | "hr-supervisor" | "competency-profile" | "manager-dashboard" | "analytics-dashboard" | "org-chart" | "bulk-invitations" | "unified-ai-interview">("auth");
  const [assessmentType, setAssessmentType] = useState<'manager' | 'self' | 'subordinate' | null>(null);

  // Загрузка сохраненного пользователя при инициализации
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.user);
    if (savedUser) {
      try {
        const userData: User = JSON.parse(savedUser);
        setUser(userData);
        // Восстанавливаем последний экран, иначе профиль
        const savedView = (localStorage.getItem(STORAGE_KEYS.view) as typeof currentView | null) ?? 'profile';
        setCurrentView(savedView);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.view);
      }
    }
  }, []);

  // Сохраняем время последнего визита при закрытии вкладки/обновлении
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        saveLastVisit();
      } catch (error) {
        console.warn('Failed to save last visit:', error);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setCurrentView("profile");
    // Сохраняем пользователя и представление в localStorage
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData));
    localStorage.setItem(STORAGE_KEYS.view, 'profile');
  };

  const handleLogout = () => {
    // Удаляем пользователя и представление из localStorage
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.view);
    
    // Принудительно обновляем состояние
    setUser(null);
    setCurrentView("auth");
    
    // Принудительно перезагружаем страницу для полного сброса состояния
    window.location.reload();
  };



  // competency module removed

  const handleStartCall = () => {
    setCurrentView("call");
    localStorage.setItem(STORAGE_KEYS.view, 'call');
  };

  const handleBackToProfile = () => {
    setCurrentView("profile");
    localStorage.setItem(STORAGE_KEYS.view, 'profile');
  };

  // RAG Chat для всех пользователей
  const handleStartChat = () => {
    setCurrentView("rag-chat");
    localStorage.setItem(STORAGE_KEYS.view, 'rag-chat');
  };



  const handleStartAIAssessment = (type: 'manager' | 'self' | 'subordinate' = 'manager') => {
    setAssessmentType(type);
    setCurrentView("ai-assessment");
    localStorage.setItem(STORAGE_KEYS.view, 'ai-assessment');
  };

  const handleOpenEmployees = () => {
    setCurrentView("employees");
    localStorage.setItem(STORAGE_KEYS.view, 'employees');
  };

  // Полный RAG только для администраторов
  const handleStartRAGInterview = () => {
    navigate('/rag-interview');
  };

  const handleOpenHRSupervisor = () => {
    setCurrentView("hr-supervisor");
    localStorage.setItem(STORAGE_KEYS.view, 'hr-supervisor');
  };

  const handleOpenCompetencyProfile = () => {
    setCurrentView("competency-profile");
    localStorage.setItem(STORAGE_KEYS.view, 'competency-profile');
  };

  const handleOpenManagerDashboard = () => {
    setCurrentView("manager-dashboard");
    localStorage.setItem(STORAGE_KEYS.view, 'manager-dashboard');
  };

  const handleOpenAnalyticsDashboard = () => {
    setCurrentView("analytics-dashboard");
    localStorage.setItem(STORAGE_KEYS.view, 'analytics-dashboard');
  };




  const handleOpenOrgChart = () => {
    setCurrentView("org-chart");
    localStorage.setItem(STORAGE_KEYS.view, 'org-chart');
  };

  const handleOpenBulkInvitations = () => {
    setCurrentView("bulk-invitations");
    localStorage.setItem(STORAGE_KEYS.view, 'bulk-invitations');
  };


  const handleOpenUnifiedAIInterview = () => {
    setCurrentView("unified-ai-interview");
    localStorage.setItem(STORAGE_KEYS.view, 'unified-ai-interview');
  };

  if (currentView === "auth") {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  if (currentView === "profile" && user) {
    return (
      <UserProfile
        user={user}
        onLogout={handleLogout}
        onStartCompetency={() => {}}
        onStartCall={handleStartCall}
        onStartAIAssessment={() => handleStartAIAssessment('manager')}
        onStartSelfAssessment={() => handleStartAIAssessment('self')}
        onStartSubordinateAssessment={() => handleStartAIAssessment('subordinate')}
        onOpenEmployees={handleOpenEmployees}
        onStartRAGInterview={handleStartRAGInterview}
        onOpenHRSupervisor={handleOpenHRSupervisor}
        onOpenCompetencyProfile={handleOpenCompetencyProfile}
        onOpenManagerDashboard={handleOpenManagerDashboard}
        onOpenAnalyticsDashboard={handleOpenAnalyticsDashboard}
        onOpenOrgChart={handleOpenOrgChart}
        onOpenBulkInvitations={handleOpenBulkInvitations}
        onOpenUnifiedAIInterview={handleOpenUnifiedAIInterview}
      />
    );
  }

  // RAG Chat Interface для всех пользователей
  if (currentView === "rag-chat" && user) {
    return (
      <RAGChatInterface 
        user={user} 
        onBack={handleBackToProfile} 
      />
    );
  }

  // Старый HR Chat теперь не используется
  if (currentView === "chat" && user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <HRChat onExit={handleBackToProfile} user={user} />
      </div>
    );
  }



  // competency route removed

  if (currentView === "call" && user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <HRCall />
      </div>
    );
  }



  if (currentView === "ai-assessment" && user) {
    return (
      <AIAssessmentDialog
        user={user}
        onBack={handleBackToProfile}
        checklist={assessmentType === 'self' ? SELF_CHECKLIST : assessmentType === 'subordinate' ? SUBORDINATE_CHECKLIST : MANAGER_CHECKLIST}
      />
    );
  }

  if (currentView === "employees" && user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Employees user={user} onBack={handleBackToProfile} />
      </div>
    );
  }

  if (currentView === "hr-supervisor" && user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <HRSupervisor user={user} onBack={handleBackToProfile} />
      </div>
    );
  }

  if (currentView === "competency-profile" && user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <CompetencyProfile user={user} onBack={handleBackToProfile} />
      </div>
    );
  }

  if (currentView === "manager-dashboard" && user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <ManagerDashboard user={user} onBack={handleBackToProfile} />
      </div>
    );
  }

  if (currentView === "analytics-dashboard" && user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <AnalyticsDashboard user={user} onBack={handleBackToProfile} />
      </div>
    );
  }




  if (currentView === "org-chart" && user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <InteractiveOrgChart user={user} onBack={handleBackToProfile} />
      </div>
    );
  }

  if (currentView === "bulk-invitations" && user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <BulkInvitationSystem user={user} onBack={handleBackToProfile} />
      </div>
    );
  }


  if (currentView === "unified-ai-interview" && user) {
    return (
      <UnifiedAIInterview 
        user={user} 
        onBack={handleBackToProfile}
        onComplete={(session) => {
          console.log('Unified interview completed:', session);
          handleBackToProfile();
        }}
      />
    );
  }

  return <AuthForm onAuthSuccess={handleAuthSuccess} />;
};

export default Index;
