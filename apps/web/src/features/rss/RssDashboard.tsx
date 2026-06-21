import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../config/api';
import { useToastStore } from '../../store/toastStore';
import socketService from '../../utils/socketService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  Rss,
  Plus,
  RefreshCw,
  Search,
  BookOpen,
  Bookmark,
  Heart,
  Archive,
  Share2,
  Folder,
  Clock,
  User,
  Calendar,
  Trash2,
  CheckCircle,
  Flame,
  WifiOff,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface FeedCategory {
  _id: string;
  name: string;
  userId?: string;
}

interface Feed {
  _id: string;
  title: string;
  url: string;
  description?: string;
  iconUrl?: string;
  categoryId: FeedCategory | string;
  enabled: boolean;
  refreshInterval: '15m' | '1h' | '1d';
  lastFetched?: string;
}

interface Collection {
  _id: string;
  name: string;
  feeds: Feed[];
}

interface Article {
  _id: string;
  feedId: Feed | string;
  title: string;
  guid: string;
  link: string;
  author?: string;
  source?: string;
  pubDate: string;
  thumbnailUrl?: string;
  description?: string;
  content?: string;
  readingTime: number;
  read: boolean;
  saved: boolean;
  isFavorite: boolean;
  isArchived: boolean;
}

interface Analytics {
  articlesRead: number;
  totalReadingTimeMinutes: number;
  favoriteSources: Array<{ sourceName: string; count: number; iconUrl?: string }>;
  readingStreak: number;
}

export default function RssDashboard() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'saved' | 'favorites' | 'archived'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isFetchingFullContent, setIsFetchingFullContent] = useState(false);
  
  const [isAddFeedOpen, setIsAddFeedOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddCollectionOpen, setIsAddCollectionOpen] = useState(false);

  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('');
  const [newFeedInterval, setNewFeedInterval] = useState<'15m' | '1h' | '1d'>('1h');
  const [newFeedTitle, setNewFeedTitle] = useState('');
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionFeedIds, setNewCollectionFeedIds] = useState<string[]>([]);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const readingStartRef = useRef<number | null>(null);
  const currentArticleIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast('Back online! Syncing data...', 'success');
      queryClient.invalidateQueries();
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast('Working offline. Accessing cached articles.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient, addToast]);

  useEffect(() => {
    socketService.connect();
    
    const handleRssUpdate = (data: any) => {
      addToast(data.message || `New articles found for "${data.feedTitle}"`, 'success');
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    };

    socketService.on('rss:update', handleRssUpdate);

    return () => {
      socketService.off('rss:update', handleRssUpdate);
    };
  }, [queryClient, addToast]);

  useEffect(() => {
    if (selectedArticle) {
      readingStartRef.current = Date.now();
      currentArticleIdRef.current = selectedArticle._id;
    }

    return () => {
      if (readingStartRef.current && currentArticleIdRef.current) {
        const elapsedSeconds = Math.round((Date.now() - readingStartRef.current) / 1000);
        if (elapsedSeconds >= 3) {
          api.post(`/rss/articles/${currentArticleIdRef.current}/read`, { readingTime: elapsedSeconds })
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['analytics'] });
              queryClient.invalidateQueries({ queryKey: ['articles'] });
            })
            .catch(err => console.error('Failed to update reading duration', err));
        }
      }
      readingStartRef.current = null;
      currentArticleIdRef.current = null;
    };
  }, [selectedArticle, queryClient]);

  useEffect(() => {
    if (!selectedArticle?._id || !isOnline) {
      setIsFetchingFullContent(false);
      return;
    }

    let isMounted = true;

    const hasFullContent = selectedArticle.content && 
                          selectedArticle.content.length > 1000 && 
                          selectedArticle.content.includes('<p>');
                          
    if (!hasFullContent) {
      setIsFetchingFullContent(true);
      
      api.get(`/rss/articles/${selectedArticle._id}`)
        .then(res => {
          if (isMounted && res.data?.data?.article) {
            const updatedArticle = res.data.data.article;
            setSelectedArticle(prev => prev?._id === updatedArticle._id ? updatedArticle : prev);
            
            const snapshots = JSON.parse(localStorage.getItem('rss_offline_snapshots') || '{}');
            snapshots[updatedArticle._id] = updatedArticle;
            localStorage.setItem('rss_offline_snapshots', JSON.stringify(snapshots));
            
            queryClient.invalidateQueries({ queryKey: ['articles'] });
          }
        })
        .catch(err => {
          console.error("Failed to load full article content", err);
        })
        .finally(() => {
          if (isMounted) {
            setIsFetchingFullContent(false);
          }
        });
    } else {
      setIsFetchingFullContent(false);
    }

    return () => {
      isMounted = false;
    };
  }, [selectedArticle?._id, isOnline, queryClient]);

  const { data: categoriesData } = useQuery<{ data: { categories: FeedCategory[] } }>({
    queryKey: ['categories'],
    queryFn: () => api.get('/rss/categories').then(res => res.data),
    enabled: isOnline,
  });

  const { data: feedsData } = useQuery<{ data: { feeds: Feed[] } }>({
    queryKey: ['feeds'],
    queryFn: () => api.get('/rss/feeds').then(res => res.data),
    enabled: isOnline,
  });

  const { data: collectionsData } = useQuery<{ data: { collections: Collection[] } }>({
    queryKey: ['collections'],
    queryFn: () => api.get('/rss/collections').then(res => res.data),
    enabled: isOnline,
  });

  const { data: articlesData, isLoading: isLoadingArticles } = useQuery<{ data: { articles: Article[], total: number } }>({
    queryKey: ['articles', activeTab, selectedFeedId, selectedCategoryId, selectedCollectionId, searchQuery],
    queryFn: () => {
      const params: any = { page: 1, limit: 50 };
      if (searchQuery) params.search = searchQuery;
      if (selectedFeedId) params.feedId = selectedFeedId;
      if (selectedCategoryId) params.categoryId = selectedCategoryId;
      if (selectedCollectionId) params.collectionId = selectedCollectionId;
      
      if (activeTab === 'unread') params.read = false;
      if (activeTab === 'saved') params.saved = true;
      if (activeTab === 'favorites') params.favorite = true;
      if (activeTab === 'archived') params.archived = true;

      return api.get('/rss/articles', { params }).then(res => {
        if (res.data?.data?.articles) {
          const snapshots = JSON.parse(localStorage.getItem('rss_offline_snapshots') || '{}');
          res.data.data.articles.forEach((art: Article) => {
            snapshots[art._id] = art;
          });
          localStorage.setItem('rss_offline_snapshots', JSON.stringify(snapshots));
        }
        return res.data;
      });
    },
    enabled: isOnline,
  });

  const { data: analyticsData } = useQuery<{ data: { analytics: Analytics } }>({
    queryKey: ['analytics'],
    queryFn: () => api.get('/rss/analytics').then(res => res.data),
    enabled: isOnline,
  });

  const getOfflineArticles = (): Article[] => {
    try {
      const snapshots = JSON.parse(localStorage.getItem('rss_offline_snapshots') || '{}');
      let list = Object.values(snapshots) as Article[];

      if (activeTab === 'saved') list = list.filter(a => a.saved);
      if (activeTab === 'favorites') list = list.filter(a => a.isFavorite);
      if (activeTab === 'archived') list = list.filter(a => a.isArchived);
      if (activeTab === 'unread') list = list.filter(a => !a.read);
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        list = list.filter(a => 
          a.title.toLowerCase().includes(query) || 
          a.description?.toLowerCase().includes(query) ||
          a.source?.toLowerCase().includes(query)
        );
      }
      return list.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    } catch (err) {
      return [];
    }
  };

  const categories = categoriesData?.data?.categories || [];
  const feeds = feedsData?.data?.feeds || [];
  const collections = collectionsData?.data?.collections || [];
  const articles = isOnline ? (articlesData?.data?.articles || []) : getOfflineArticles();
  const analytics = analyticsData?.data?.analytics || { articlesRead: 0, totalReadingTimeMinutes: 0, favoriteSources: [], readingStreak: 0 };

  const addFeedMutation = useMutation({
    mutationFn: (payload: any) => api.post('/rss/feeds', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setIsAddFeedOpen(false);
      setNewFeedUrl('');
      setNewFeedTitle('');
      addToast('Subscribed to feed successfully!', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to add RSS feed.', 'error');
    }
  });

  const addCategoryMutation = useMutation({
    mutationFn: (name: string) => api.post('/rss/categories', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsAddCategoryOpen(false);
      setNewCategoryName('');
      addToast('Category created successfully!', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to add category.', 'error');
    }
  });

  const addCollectionMutation = useMutation({
    mutationFn: (payload: any) => api.post('/rss/collections', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setIsAddCollectionOpen(false);
      setNewCollectionName('');
      setNewCollectionFeedIds([]);
      addToast('Collection created successfully!', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to create collection.', 'error');
    }
  });

  const deleteFeedMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/rss/feeds/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      if (selectedFeedId) setSelectedFeedId(null);
      setSelectedArticle(null);
      addToast('Feed subscription deleted.', 'success');
    }
  });

  const refreshFeedMutation = useMutation({
    mutationFn: (id: string) => api.post(`/rss/feeds/${id}/refresh`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      addToast(res.data?.message || 'Feed refreshed successfully', 'success');
    },
    onError: () => addToast('Failed to refresh feed.', 'error')
  });

  const toggleReadMutation = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => 
      api.post(`/rss/articles/${id}/${read ? 'read' : 'unread'}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      
      if (selectedArticle && selectedArticle._id === variables.id) {
        setSelectedArticle(prev => prev ? { ...prev, read: variables.read } : null);
      }
      
      try {
        const snapshots = JSON.parse(localStorage.getItem('rss_offline_snapshots') || '{}');
        if (snapshots[variables.id]) {
          snapshots[variables.id].read = variables.read;
          localStorage.setItem('rss_offline_snapshots', JSON.stringify(snapshots));
        }
      } catch (e) {}
    }
  });

  const toggleSaveMutation = useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) => 
      api.post(`/rss/articles/${id}/${saved ? 'save' : 'unsave'}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      
      if (selectedArticle && selectedArticle._id === variables.id) {
        setSelectedArticle(prev => prev ? { ...prev, saved: variables.saved } : null);
      }

      try {
        const snapshots = JSON.parse(localStorage.getItem('rss_offline_snapshots') || '{}');
        if (snapshots[variables.id]) {
          snapshots[variables.id].saved = variables.saved;
          localStorage.setItem('rss_offline_snapshots', JSON.stringify(snapshots));
        }
      } catch (e) {}
      addToast(variables.saved ? 'Saved for offline reading.' : 'Removed from bookmarks.', 'success');
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) => 
      api.post(`/rss/articles/${id}/favorite`, { favorite }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      
      if (selectedArticle && selectedArticle._id === variables.id) {
        setSelectedArticle(prev => prev ? { ...prev, isFavorite: variables.favorite } : null);
      }

      try {
        const snapshots = JSON.parse(localStorage.getItem('rss_offline_snapshots') || '{}');
        if (snapshots[variables.id]) {
          snapshots[variables.id].isFavorite = variables.favorite;
          localStorage.setItem('rss_offline_snapshots', JSON.stringify(snapshots));
        }
      } catch (e) {}
    }
  });

  const toggleArchiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => 
      api.post(`/rss/articles/${id}/archive`, { archived }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      
      if (selectedArticle && selectedArticle._id === variables.id) {
        setSelectedArticle(prev => prev ? { ...prev, isArchived: variables.archived } : null);
      }

      try {
        const snapshots = JSON.parse(localStorage.getItem('rss_offline_snapshots') || '{}');
        if (snapshots[variables.id]) {
          snapshots[variables.id].isArchived = variables.archived;
          localStorage.setItem('rss_offline_snapshots', JSON.stringify(snapshots));
        }
      } catch (e) {}
      addToast(variables.archived ? 'Article archived.' : 'Article unarchived.', 'success');
    }
  });

  const shareArticle = async (id: string) => {
    try {
      const res = await api.get(`/rss/articles/${id}/share`);
      const details = res.data.data.shareDetails;
      await navigator.clipboard.writeText(details.shareMessage);
      addToast('Share message copied to clipboard!', 'success');
    } catch (err) {
      addToast('Failed to copy share link.', 'error');
    }
  };


  const handleAddFeedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl || !newFeedCategory) return;
    addFeedMutation.mutate({
      url: newFeedUrl,
      categoryId: newFeedCategory,
      refreshInterval: newFeedInterval,
      title: newFeedTitle || undefined,
    });
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return;
    addCategoryMutation.mutate(newCategoryName);
  };

  const handleAddCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName) return;
    addCollectionMutation.mutate({
      name: newCollectionName,
      feedIds: newCollectionFeedIds,
    });
  };

  const clearSidebarFilters = () => {
    setSelectedCategoryId(null);
    setSelectedCollectionId(null);
    setSelectedFeedId(null);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl w-full mx-auto relative select-none">
      
      {!isOnline && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs font-semibold animate-pulse shadow-md backdrop-blur-xs">
          <WifiOff size={16} className="shrink-0" />
          <span>You are currently working offline. Feeds are loaded from cached snapshots, and refresh capabilities are disabled.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        <aside className="lg:col-span-1 flex flex-col gap-5 p-4 rounded-xl glass border border-border shadow-sm lg:sticky lg:top-24 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
          
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight flex items-center gap-2 text-foreground">
              <Rss size={16} className="text-primary" />
              Feed Subscriptions
            </h2>
            <Button
              size="sm"
              onClick={() => setIsAddFeedOpen(true)}
              disabled={!isOnline}
              className="p-1.5 h-7 w-7 rounded-md bg-secondary text-outline hover:text-foreground cursor-pointer border-border hover:bg-primary/40"
              title="Add Feed"
            >
              <Plus size={14} />
            </Button>
          </div>

          <div className="h-px bg-border/60" />

          <div className="flex flex-col gap-1 text-xs">
            <button
              onClick={clearSidebarFilters}
              className={cn(
                "flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-secondary/40 transition-colors text-left",
                !selectedCategoryId && !selectedCollectionId && !selectedFeedId ? "bg-secondary text-foreground font-bold" : "text-muted-foreground"
              )}
            >
              <span>All Subscriptions</span>
              <span className="text-[10px] bg-secondary border border-border px-1.5 py-0.2 rounded-full font-normal">
                {feeds.length}
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">
              <span>Collections</span>
              <button onClick={() => setIsAddCollectionOpen(true)} disabled={!isOnline} className="hover:text-foreground cursor-pointer">
                <Plus size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-1 text-xs pl-1">
              {collections.map(col => (
                <button
                  key={col._id}
                  onClick={() => {
                    setSelectedCollectionId(col._id);
                    setSelectedCategoryId(null);
                    setSelectedFeedId(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-secondary/40 transition-colors text-left truncate",
                    selectedCollectionId === col._id ? "bg-secondary text-foreground font-bold" : "text-muted-foreground"
                  )}
                >
                  <Folder size={12} className="text-violet-500 shrink-0" />
                  <span className="truncate">{col.name}</span>
                </button>
              ))}
              {collections.length === 0 && (
                <span className="text-[10px] text-muted-foreground/60 italic px-2">No custom collections</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">
              <span>Categories</span>
              <button onClick={() => setIsAddCategoryOpen(true)} disabled={!isOnline} className="hover:text-foreground cursor-pointer">
                <Plus size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-1 text-xs pl-1">
              {categories.map(cat => (
                <button
                  key={cat._id}
                  onClick={() => {
                    setSelectedCategoryId(cat._id);
                    setSelectedCollectionId(null);
                    setSelectedFeedId(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-secondary/40 transition-colors text-left truncate",
                    selectedCategoryId === cat._id ? "bg-secondary text-foreground font-bold" : "text-muted-foreground"
                  )}
                >
                  <ChevronRight size={12} className="text-muted-foreground/60 shrink-0" />
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">Feeds</span>
            <div className="flex flex-col gap-1 text-xs pl-1 max-h-48 overflow-y-auto">
              {feeds.map(feed => (
                <div key={feed._id} className="group flex items-center justify-between rounded-md px-2 hover:bg-secondary/30 transition-colors">
                  <button
                    onClick={() => {
                      setSelectedFeedId(feed._id);
                      setSelectedCategoryId(null);
                      setSelectedCollectionId(null);
                    }}
                    className={cn(
                      "flex items-center gap-2 py-1.5 flex-1 text-left truncate",
                      selectedFeedId === feed._id ? "text-foreground font-bold" : "text-muted-foreground"
                    )}
                  >
                    {feed.iconUrl ? (
                      <img src={feed.iconUrl} className="w-3.5 h-3.5 rounded shrink-0 object-cover border border-border" alt="" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    ) : (
                      <Rss size={11} className="text-primary shrink-0" />
                    )}
                    <span className="truncate">{feed.title}</span>
                  </button>

                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      onClick={() => refreshFeedMutation.mutate(feed._id)}
                      disabled={!isOnline}
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded cursor-pointer"
                      title="Sync Now"
                    >
                      <RefreshCw size={11} className={cn(refreshFeedMutation.isPending && "animate-spin")} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Unsubscribe from "${feed.title}"?`)) deleteFeedMutation.mutate(feed._id);
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer"
                      title="Unsubscribe"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
              {feeds.length === 0 && (
                <span className="text-[10px] text-muted-foreground/60 italic px-2">Subscribing to new RSS feeds...</span>
              )}
            </div>
          </div>
        </aside>

        <section className="lg:col-span-2 flex flex-col gap-4">
          
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-xl glass border border-border shadow-sm">
            <div className="relative w-full md:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search articles, sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/40 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-lg p-0.5 text-xs w-full md:w-auto overflow-x-auto">
              {(['all', 'unread', 'saved', 'favorites', 'archived'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1 rounded-md capitalize font-medium cursor-pointer transition-colors text-[11px] whitespace-nowrap",
                    activeTab === tab ? "bg-primary text-white shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 max-h-[calc(100vh-14rem)] overflow-y-auto pr-2 min-h-[400px]">
            {isLoadingArticles && isOnline ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 bg-card border border-border rounded-xl animate-pulse">
                  <div className="w-16 h-16 bg-muted rounded-lg shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="h-4 bg-muted rounded-md w-3/4" />
                    <div className="h-3 bg-muted rounded-md w-1/2" />
                    <div className="h-3 bg-muted rounded-md w-1/4" />
                  </div>
                </div>
              ))
            ) : articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-card border border-border rounded-xl text-center shadow-xs">
                <div className="w-12 h-12 bg-secondary border border-border rounded-full flex items-center justify-center text-muted-foreground mb-3">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No articles found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  {searchQuery ? 'Try modifying your search keywords.' : 'Add some RSS feeds or select another category filter.'}
                </p>
              </div>
            ) : (
              articles.map(article => (
                <article
                  key={article._id}
                  onClick={() => setSelectedArticle(article)}
                  className={cn(
                    "group flex gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none bg-card hover:border-border/80 hover:shadow-xs",
                    selectedArticle?._id === article._id ? "border-primary shadow-xs ring-1 ring-primary/20" : "border-border/50"
                  )}
                >
                  {article.thumbnailUrl && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0 bg-secondary/20 flex items-center justify-center">
                      <img src={article.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" alt="" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    </div>
                  )}

                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] bg-secondary border border-border px-1.5 py-0.2 rounded-md font-semibold text-foreground truncate max-w-[120px]">
                          {article.source}
                        </span>
                        {!article.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Unread" />
                        )}
                        {article.isFavorite && (
                          <Heart size={10} className="fill-red-500 text-red-500 shrink-0" />
                        )}
                        {article.saved && (
                          <Bookmark size={10} className="fill-amber-500 text-amber-500 shrink-0" />
                        )}
                      </div>

                      <h3 className="text-[13px] font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2 flex-wrap">
                      {article.author && (
                        <span className="flex items-center gap-1 truncate max-w-[100px]">
                          <User size={10} />
                          {article.author}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(article.pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {article.readingTime} min
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col justify-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReadMutation.mutate({ id: article._id, read: !article.read });
                      }}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                      title={article.read ? "Mark as unread" : "Mark as read"}
                    >
                      <CheckCircle size={13} className={cn(article.read && "text-emerald-500")} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaveMutation.mutate({ id: article._id, saved: !article.saved });
                      }}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Save for later"
                    >
                      <Bookmark size={13} className={cn(article.saved && "fill-amber-500 text-amber-500")} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="lg:col-span-1 flex flex-col gap-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto pr-1">
          
          {selectedArticle ? (
            <div className="flex flex-col p-5 rounded-xl bg-card border border-border shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3 mb-3">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate">
                  {selectedArticle.source}
                </span>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleReadMutation.mutate({ id: selectedArticle._id, read: !selectedArticle.read })}
                    className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                    title={selectedArticle.read ? "Mark Unread" : "Mark Read"}
                  >
                    <CheckCircle size={14} className={cn(selectedArticle.read && "text-emerald-500")} />
                  </button>
                  <button
                    onClick={() => toggleSaveMutation.mutate({ id: selectedArticle._id, saved: !selectedArticle.saved })}
                    className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Bookmark"
                  >
                    <Bookmark size={14} className={cn(selectedArticle.saved && "fill-amber-500 text-amber-500")} />
                  </button>
                  <button
                    onClick={() => toggleFavoriteMutation.mutate({ id: selectedArticle._id, favorite: !selectedArticle.isFavorite })}
                    className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Favorite"
                  >
                    <Heart size={14} className={cn(selectedArticle.isFavorite && "fill-red-500 text-red-500")} />
                  </button>
                  <button
                    onClick={() => toggleArchiveMutation.mutate({ id: selectedArticle._id, archived: !selectedArticle.isArchived })}
                    className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Archive"
                  >
                    <Archive size={14} className={cn(selectedArticle.isArchived && "text-purple-500")} />
                  </button>
                  <button
                    onClick={() => shareArticle(selectedArticle._id)}
                    className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Copy Share Link"
                  >
                    <Share2 size={14} />
                  </button>
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary cursor-pointer shrink-0 ml-1"
                  >
                    Close
                  </button>
                </div>
              </div>

              <h2 className="text-sm font-bold leading-snug text-foreground">
                {selectedArticle.title}
              </h2>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-3 pb-3 border-b border-border/40">
                <span className="truncate max-w-[120px]">{selectedArticle.author || 'Feed Author'}</span>
                <span>{new Date(selectedArticle.pubDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
              </div>

              {isFetchingFullContent && (
                <div className="flex items-center gap-2 text-[10px] text-primary/70 animate-pulse mt-4 bg-primary/5 border border-primary/10 rounded-lg p-2.5">
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Purifying article: stripping ads, trackers & extracting full text...</span>
                </div>
              )}

              <div 
                className="prose prose-sm dark:prose-invert max-w-full text-xs text-foreground/90 mt-4 leading-relaxed overflow-x-hidden font-sans select-text break-words"
                dangerouslySetInnerHTML={{ 
                  __html: selectedArticle.content || selectedArticle.description || '<p>No description provided.</p>' 
                }} 
              />

              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-center">
                <a
                  href={selectedArticle.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                >
                  Read original article
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl border border-border/40 bg-card text-center text-muted-foreground/60 italic text-xs">
              <BookOpen size={24} className="mb-2 text-muted-foreground/40" />
              Select an article to start reading
            </div>
          )}

          <div className="flex flex-col gap-4 p-5 rounded-xl glass border border-border shadow-sm">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Reading Dashboard</h3>
            
            <div className="grid grid-cols-2 gap-3">
              
              <div className="relative overflow-hidden flex flex-col gap-1 p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-orange-500/20 text-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wide">Streak</span>
                  <Flame size={14} className="text-orange-500 animate-[bounce_1.5s_infinite]" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">{analytics.readingStreak} days</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">Consecutive active days</span>
              </div>

              <div className="flex flex-col gap-1 p-3 rounded-lg bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Articles Read</span>
                <span className="text-xl font-bold tracking-tight text-foreground">{analytics.articlesRead}</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">All-time count</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Total Time</span>
                <span className="text-sm font-bold text-foreground mt-0.5">{analytics.totalReadingTimeMinutes} minutes</span>
              </div>
              <Clock size={16} className="text-muted-foreground/60" />
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Top Sources</span>
              <div className="flex flex-col gap-2">
                {analytics.favoriteSources.map((source, i) => {
                  const maxCount = analytics.favoriteSources[0]?.count || 1;
                  const percent = Math.max(8, Math.round((source.count / maxCount) * 100));
                  return (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate max-w-[120px] font-medium text-foreground">{source.sourceName}</span>
                        <span className="text-muted-foreground shrink-0 text-[10px]">{source.count} articles</span>
                      </div>
                      <div className="w-full bg-secondary border border-border/40 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            i === 0 ? "bg-primary" : i === 1 ? "bg-violet-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {analytics.favoriteSources.length === 0 && (
                  <span className="text-[10px] text-muted-foreground/60 italic text-center py-2">Start reading to log metrics</span>
                )}
              </div>
            </div>

          </div>

        </aside>

      </div>

      <Modal isOpen={isAddFeedOpen} onClose={() => setIsAddFeedOpen(false)} title="Subscribe to RSS Feed">
        <form onSubmit={handleAddFeedSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">RSS Feed URL</label>
            <Input
              type="url"
              placeholder="e.g. https://feeds.feedburner.com/TechCrunch"
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Custom Title (Optional)</label>
            <Input
              type="text"
              placeholder="e.g. TC Tech News"
              value={newFeedTitle}
              onChange={(e) => setNewFeedTitle(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Category Folder</label>
            <select
              value={newFeedCategory}
              onChange={(e) => setNewFeedCategory(e.target.value)}
              required
              className="w-full bg-card border border-border rounded-lg text-xs p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Refresh Schedule</label>
            <select
              value={newFeedInterval}
              onChange={(e) => setNewFeedInterval(e.target.value as any)}
              className="w-full bg-card border border-border rounded-lg text-xs p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="15m">Every 15 minutes</option>
              <option value="1h">Every hour</option>
              <option value="1d">Daily</option>
            </select>
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddFeedOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={addFeedMutation.isPending} className="cursor-pointer">
              Subscribe
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAddCategoryOpen} onClose={() => setIsAddCategoryOpen(false)} title="Create Custom Category Folder">
        <form onSubmit={handleAddCategorySubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Category Name</label>
            <Input
              type="text"
              placeholder="e.g. My Favorite Dev Blogs"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCategoryOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={addCategoryMutation.isPending} className="cursor-pointer">
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAddCollectionOpen} onClose={() => setIsAddCollectionOpen(false)} title="Create Feed Collection">
        <form onSubmit={handleAddCollectionSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Collection Name</label>
            <Input
              type="text"
              placeholder="e.g. AI Research"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Add Subscribed Feeds</label>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto border border-border/60 rounded-lg p-2 bg-secondary/10">
              {feeds.map(feed => (
                <label key={feed._id} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCollectionFeedIds.includes(feed._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewCollectionFeedIds(prev => [...prev, feed._id]);
                      } else {
                        setNewCollectionFeedIds(prev => prev.filter(id => id !== feed._id));
                      }
                    }}
                    className="rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>{feed.title}</span>
                </label>
              ))}
              {feeds.length === 0 && (
                <span className="text-[10px] text-muted-foreground/60 italic text-center py-2">No feeds to add. Subscribe first!</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCollectionOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={addCollectionMutation.isPending} className="cursor-pointer">
              Create Collection
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
