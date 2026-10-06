import React, { useState, useCallback } from 'react';
import { MediaProvider, useMedia } from './context/MediaContext';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { Navbar } from './components/navigation/Navbar';
import { BottomBar, NavTab } from './components/navigation/BottomBar';
import { Sidebar } from './components/navigation/Sidebar';
import { MiniPlayer } from './components/player/MiniPlayer';
import { VideoPlayerModal } from './components/player/VideoPlayerModal';
import { FullAudioPlayerModal } from './components/player/FullAudioPlayerModal';
import { AddContentModal } from './components/modals/AddContentModal';
import { CategoryModal } from './components/modals/CategoryModal';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { FolderScanModal } from './components/modals/FolderScanModal';
import { ClipboardPromptModal } from './components/modals/ClipboardPromptModal';
import { YouTubePlaylistModal } from './components/modals/YouTubePlaylistModal';
import { PlaylistModal } from './components/modals/PlaylistModal';
import { EqualizerModal } from './components/modals/EqualizerModal';
import { ShareModal } from './components/modals/ShareModal';
import { VaultModal } from './components/modals/VaultModal';
import { DuplicatesModal } from './components/modals/DuplicatesModal';
import { useClipboardWatcher } from './hooks/useClipboardWatcher';
import { MediaItem } from './types/media';

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
  const { isEqualizerModalOpen, closeEqualizerModal } = usePlayer();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialAddUrl, setInitialAddUrl] = useState('');
  const [isFolderScanModalOpen, setIsFolderScanModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Clipboard & YouTube Playlist state
  const [clipboardPromptData, setClipboardPromptData] = useState<{ url: string; isPlaylist: boolean } | null>(null);
  const [playlistModalUrl, setPlaylistModalUrl] = useState('');
  const [isYouTubePlaylistModalOpen, setIsYouTubePlaylistModalOpen] = useState(false);

  // Player & Custom Playlists modals
  const [isFullAudioPlayerModalOpen, setIsFullAudioPlayerModalOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlistTargetItem, setPlaylistTargetItem] = useState<MediaItem | null>(null);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  // New Features: Share, Vault, Duplicates modals
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTargetItem, setShareTargetItem] = useState<MediaItem | null>(null);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);

  // Clipboard auto-watcher for YouTube links
  useClipboardWatcher(
    useCallback((url: string, isPlaylist: boolean) => {
      setClipboardPromptData({ url, isPlaylist });
    }, [])
  );

  const activeDownloadsCount = downloadTasks.filter(
    (t) => t.status === 'downloading' || t.status === 'preparing'
  ).length;

  const handleSelectCategoryFromCategoriesPage = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentTab('library');
  };

  const handleConfirmClipboard = () => {
    if (!clipboardPromptData) return;
    const { url, isPlaylist } = clipboardPromptData;
    setClipboardPromptData(null);

    if (isPlaylist) {
      setPlaylistModalUrl(url);
      setIsYouTubePlaylistModalOpen(true);
    } else {
      setInitialAddUrl(url);
      setIsAddModalOpen(true);
    }
  };

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardPage
            onOpenAddModal={() => {
              setInitialAddUrl('');
              setIsAddModalOpen(true);
            }}
            onOpenFolderScanModal={() => setIsFolderScanModalOpen(true)}
            onOpenPlaylistModal={(item) => {
              setPlaylistTargetItem(item || null);
              setIsPlaylistModalOpen(true);
            }}
            onOpenOnboardingModal={() => setIsOnboardingModalOpen(true)}
            onNavigateToLibrary={() => setCurrentTab('library')}
            onNavigateToDownloads={() => setCurrentTab('downloads')}
            onNavigateToStorage={() => setCurrentTab('storage')}
          />
        );
      case 'library':
        return (
          <LibraryPage
            onOpenAddModal={() => {
              setInitialAddUrl('');
              setIsAddModalOpen(true);
            }}
            onOpenFolderScanModal={() => setIsFolderScanModalOpen(true)}
          />
        );
      case 'downloads':
        return <DownloadsPage onNavigateToLibrary={() => setCurrentTab('library')} />;
      case 'favorites':
        return (
          <FavoritesPage
            onOpenAddModal={() => {
              setInitialAddUrl('');
              setIsAddModalOpen(true);
            }}
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
        return <StoragePage onOpenDuplicatesModal={() => setIsDuplicatesModalOpen(true)} />;
      case 'settings':
        return (
          <SettingsPage
            onNavigateToStorage={() => setCurrentTab('storage')}
            onOpenOnboardingModal={() => setIsOnboardingModalOpen(true)}
          />
        );
      default:
        return (
          <DashboardPage
            onOpenAddModal={() => {
              setInitialAddUrl('');
              setIsAddModalOpen(true);
            }}
            onOpenFolderScanModal={() => setIsFolderScanModalOpen(true)}
            onOpenPlaylistModal={(item) => {
              setPlaylistTargetItem(item || null);
              setIsPlaylistModalOpen(true);
            }}
            onOpenOnboardingModal={() => setIsOnboardingModalOpen(true)}
            onNavigateToLibrary={() => setCurrentTab('library')}
            onNavigateToDownloads={() => setCurrentTab('downloads')}
            onNavigateToStorage={() => setCurrentTab('storage')}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#070b14] text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300 overflow-hidden">
      {/* Top Navbar */}
      <Navbar
        onOpenAddModal={() => {
          setInitialAddUrl('');
          setIsAddModalOpen(true);
        }}
        onOpenFolderScanModal={() => setIsFolderScanModalOpen(true)}
        activeDownloadsCount={activeDownloadsCount}
        onNavigateToDownloads={() => setCurrentTab('downloads')}
        onNavigateToStorage={() => setCurrentTab('storage')}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onOpenAddModal={() => {
            setInitialAddUrl('');
            setIsAddModalOpen(true);
          }}
          onOpenFolderScanModal={() => setIsFolderScanModalOpen(true)}
          onOpenVaultModal={() => setIsVaultModalOpen(true)}
          activeDownloadsCount={activeDownloadsCount}
          storageBreakdown={storageBreakdown}
        />

        {/* Main Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
          <div className="mx-auto max-w-7xl">{renderActiveTab()}</div>
        </main>
      </div>

      {/* Persistent Audio Mini-Player (bottom dock) */}
      <MiniPlayer onOpenFullPlayer={() => setIsFullAudioPlayerModalOpen(true)} />

      {/* Mobile Bottom Navigation Bar */}
      <BottomBar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenAddModal={() => {
          setInitialAddUrl('');
          setIsAddModalOpen(true);
        }}
        activeDownloadsCount={activeDownloadsCount}
      />

      {/* Full Screen Audio Player Modal */}
      <FullAudioPlayerModal
        isOpen={isFullAudioPlayerModalOpen}
        onClose={() => setIsFullAudioPlayerModalOpen(false)}
        onOpenPlaylistModal={() => setIsPlaylistModalOpen(true)}
      />

      {/* Video Fullscreen/Theater Player Modal */}
      <VideoPlayerModal />

      {/* Custom User Playlists Modal */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => {
          setIsPlaylistModalOpen(false);
          setPlaylistTargetItem(null);
        }}
        targetMediaItem={playlistTargetItem}
      />

      {/* Clipboard YouTube URL Detected Prompt */}
      {clipboardPromptData && (
        <ClipboardPromptModal
          url={clipboardPromptData.url}
          isPlaylist={clipboardPromptData.isPlaylist}
          onConfirm={handleConfirmClipboard}
          onDismiss={() => setClipboardPromptData(null)}
        />
      )}

      {/* YouTube Playlist Batch Downloader Modal */}
      <YouTubePlaylistModal
        isOpen={isYouTubePlaylistModalOpen}
        playlistUrl={playlistModalUrl}
        onClose={() => {
          setIsYouTubePlaylistModalOpen(false);
          setPlaylistModalUrl('');
        }}
        onDownloadStarted={() => setCurrentTab('downloads')}
      />

      {/* Add Content Modal */}
      <AddContentModal
        isOpen={isAddModalOpen}
        initialUrl={initialAddUrl}
        onClose={() => {
          setIsAddModalOpen(false);
          setInitialAddUrl('');
        }}
        onOpenFolderScanModal={() => setIsFolderScanModalOpen(true)}
        onDownloadStarted={() => setCurrentTab('downloads')}
      />

      {/* Folder Scanner Modal */}
      <FolderScanModal
        isOpen={isFolderScanModalOpen}
        onClose={() => setIsFolderScanModalOpen(false)}
      />

      {/* Categories Management Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      {/* Equalizer & Audio Processor Modal */}
      <EqualizerModal
        isOpen={isEqualizerModalOpen}
        onClose={closeEqualizerModal}
      />

      {/* Share & LAN QR Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        item={shareTargetItem}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareTargetItem(null);
        }}
      />

      {/* Private Encrypted Vault Modal */}
      <VaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        onUnlocked={() => {
          setIsVaultModalOpen(false);
        }}
      />

      {/* Duplicates Cleaner Modal */}
      <DuplicatesModal
        isOpen={isDuplicatesModalOpen}
        onClose={() => setIsDuplicatesModalOpen(false)}
      />

      {/* First-Time Onboarding Welcome Modal */}
      <OnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        onStart={() => setIsAddModalOpen(true)}
      />
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
