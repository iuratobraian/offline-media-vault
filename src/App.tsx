import React, { useState } from 'react';
import { MediaProvider, useMedia } from './context/MediaContext';
import { PlayerProvider } from './context/PlayerContext';
import { Navbar } from './components/navigation/Navbar';
import { BottomBar, NavTab } from './components/navigation/BottomBar';
import { Sidebar } from './components/navigation/Sidebar';
import { MiniPlayer } from './components/player/MiniPlayer';
import { VideoPlayerModal } from './components/player/VideoPlayerModal';
import { AddContentModal } from './components/modals/AddContentModal';
import { CategoryModal } from './components/modals/CategoryModal';
import { OnboardingModal } from './components/modals/OnboardingModal';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { LibraryPage } from './pages/LibraryPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { StoragePage } from './pages/StoragePage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { downloadTasks, storageBreakdown, setSelectedCategory } = useMedia();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const activeDownloadsCount = downloadTasks.filter(
    (t) => t.status === 'downloading' || t.status === 'preparing'
  ).length;

  const handleSelectCategoryFromCategoriesPage = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentTab('library');
  };

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardPage
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onNavigateToLibrary={() => setCurrentTab('library')}
            onNavigateToDownloads={() => setCurrentTab('downloads')}
            onNavigateToStorage={() => setCurrentTab('storage')}
          />
        );
      case 'library':
        return <LibraryPage onOpenAddModal={() => setIsAddModalOpen(true)} />;
      case 'downloads':
        return <DownloadsPage onNavigateToLibrary={() => setCurrentTab('library')} />;
      case 'favorites':
        return (
          <FavoritesPage
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onNavigateToLibrary={() => setCurrentTab('library')}
          />
        );
      case 'categories':
        return (
          <CategoriesPage
            onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
            onSelectCategory={handleSelectCategoryFromCategoriesPage}
          />
        );
      case 'storage':
        return <StoragePage />;
      case 'settings':
        return <SettingsPage onNavigateToStorage={() => setCurrentTab('storage')} />;
      default:
        return <DashboardPage onOpenAddModal={() => setIsAddModalOpen(true)} onNavigateToLibrary={() => setCurrentTab('library')} onNavigateToDownloads={() => setCurrentTab('downloads')} onNavigateToStorage={() => setCurrentTab('storage')} />;
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#090d16] text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Navbar */}
      <Navbar
        onOpenAddModal={() => setIsAddModalOpen(true)}
        activeDownloadsCount={activeDownloadsCount}
        onNavigateToDownloads={() => setCurrentTab('downloads')}
        onNavigateToStorage={() => setCurrentTab('storage')}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          activeDownloadsCount={activeDownloadsCount}
          storageBreakdown={storageBreakdown}
        />

        {/* Main Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-7xl">{renderActiveTab()}</div>
        </main>
      </div>

      {/* Persistent Audio Mini-Player (bottom dock) */}
      <MiniPlayer />

      {/* Mobile Bottom Navigation Bar */}
      <BottomBar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        activeDownloadsCount={activeDownloadsCount}
      />

      {/* Video Fullscreen/Theater Player Modal */}
      <VideoPlayerModal />

      {/* Add Content Modal */}
      <AddContentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDownloadStarted={() => setCurrentTab('downloads')}
      />

      {/* Categories Management Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      {/* First-Time Onboarding Welcome Modal */}
      <OnboardingModal onStart={() => setIsAddModalOpen(true)} />
    </div>
  );
};

export default function App() {
  return (
    <MediaProvider>
      <PlayerProvider>
        <AppContent />
      </PlayerProvider>
    </MediaProvider>
  );
}
