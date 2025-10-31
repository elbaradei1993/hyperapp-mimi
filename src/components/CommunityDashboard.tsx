import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner, EmptyState, CircularProgress, MultiSegmentCircularProgress } from './shared';
import { clusterReports, formatDistance, analyzeClusterVibes, calculateDistance, type LocationCluster } from '../lib/clustering';
import { reportsService } from '../services/reports';
import { reverseGeocode } from '../lib/geocoding';
import { VIBE_CONFIG, VibeType } from '../constants/vibes';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Vibe, Report } from '../types';

// Modern CSS-in-JS styles with mobile-first approach
const styles = {
  // CSS Custom Properties (Design Tokens)
  primary: '#2563eb',
  'primary-dark': '#1d4ed8',
  'primary-light': '#3b82f6',
  surface: '#ffffff',
  'surface-secondary': '#f8fafc',
  'surface-elevated': '#ffffff',
  'text-primary': '#0f172a',
  'text-secondary': '#475569',
  'text-muted': '#64748b',
  border: '#e2e8f0',
  'border-light': '#f1f5f9',
  'accent-green': '#10b981',
  'accent-blue': '#3b82f6',
  'accent-amber': '#f59e0b',
  'accent-purple': '#8b5cf6',
  'accent-red': '#ef4444',
  'accent-cyan': '#06b6d4',
  'shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  'shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  'shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  'radius-sm': '6px',
  radius: '8px',
  'radius-md': '12px',
  'radius-lg': '16px',
  'radius-xl': '20px',

  // Base styles
  container: {
    height: '100vh',
    width: '100vw',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    minHeight: '100vh',
    color: '#0f172a',
    lineHeight: '1.6',
    paddingBottom: 'env(safe-area-inset-bottom)',
    WebkitTapHighlightColor: 'transparent',
  },

  // Header styles
  dashboardHeader: {
    marginBottom: '32px',
    position: 'relative' as const,
  },
  dashboardTitle: {
    fontSize: '2rem',
    fontWeight: '800' as const,
    background: 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
    marginBottom: '8px',
    letterSpacing: '-0.025em',
    lineHeight: '1.2',
  },
  dashboardSubtitle: {
    fontSize: '1rem',
    color: '#475569',
    fontWeight: '500' as const,
    lineHeight: '1.4',
  },

  // Main Grid - Mobile First
  dashboardGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '32px',
  },

  // Location Card
  locationCard: {
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #f1f5f9',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  locationCardGradient: {
    position: 'absolute' as const,
    top: '0',
    left: '0',
    right: '0',
    height: '4px',
    background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #1d4ed8 100%)',
  },
  locationCardContent: {
    padding: '24px 20px',
  },
  locationHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    gap: '16px',
    marginBottom: '24px',
  },
  locationIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1), 0 2px 4px -1px rgba(37, 99, 235, 0.06)',
    flexShrink: 0,
  },
  locationInfo: {
    width: '100%',
  },
  locationAddress: {
    fontSize: '1.5rem',
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: '12px',
    lineHeight: '1.3',
  },
  locationMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#64748b',
    fontSize: '0.875rem',
    fontWeight: '500' as const,
    padding: '6px 12px',
    background: '#f8fafc',
    borderRadius: '8px',
  },

  // Vibe Analysis
  vibeAnalysis: {
    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.02) 0%, rgba(37, 99, 235, 0.01) 100%)',
    border: '1px solid rgba(37, 99, 235, 0.08)',
    borderRadius: '16px',
    padding: '24px 20px',
    marginTop: '20px',
  },
  vibeAnalysisHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '20px',
  },
  vibeTitle: {
    fontSize: '1.25rem',
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  vibeCount: {
    color: '#64748b',
    fontSize: '0.875rem',
    fontWeight: '600' as const,
    background: '#f8fafc',
    padding: '6px 12px',
    borderRadius: '8px',
    alignSelf: 'flex-start' as const,
  },
  vibeContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  vibeVisual: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
    textAlign: 'center' as const,
  },
  vibeIconContainer: {
    position: 'relative' as const,
  },
  vibeIcon: {
    width: '70px',
    height: '70px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.1), 0 2px 4px -1px rgba(16, 185, 129, 0.06)',
    position: 'relative' as const,
    zIndex: 2,
  },
  vibeIconGlow: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90px',
    height: '90px',
    background: '#10b981',
    borderRadius: '50%',
    filter: 'blur(15px)',
    opacity: 0.3,
    zIndex: 1,
  },
  vibeStats: {
    textAlign: 'center' as const,
  },
  vibePercentage: {
    fontSize: '2.25rem',
    fontWeight: '900' as const,
    color: '#10b981',
    lineHeight: 1,
    marginBottom: '4px',
  },
  vibeLabel: {
    fontSize: '0.875rem',
    fontWeight: '700' as const,
    color: '#475569',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
  vibeDescription: {
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center' as const,
  },
  vibeType: {
    fontSize: '1.375rem',
    fontWeight: '800' as const,
    color: '#10b981',
    marginBottom: '8px',
  },
  vibeSubtitle: {
    color: '#64748b',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },

  // Charts Grid
  chartsGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    marginTop: '24px',
  },
  chartCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f1f5f9',
    position: 'relative' as const,
  },
  chartHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginBottom: '16px',
  },
  chartTitle: {
    fontSize: '1.125rem',
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  chartInstruction: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontStyle: 'italic' as const,
  },
  chartContainer: {
    position: 'relative' as const,
    height: '180px',
  },

  // Sidebar
  sidebar: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },

  // Stats Cards
  statsCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px 20px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f1f5f9',
  },
  statsHeader: {
    marginBottom: '20px',
  },
  statsTitle: {
    fontSize: '1.25rem',
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '16px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease',
    minHeight: '72px',
  },
  statIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0,
    fontSize: '1rem',
  },
  statContent: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    fontSize: '1.375rem',
    fontWeight: '800' as const,
    color: '#0f172a',
    lineHeight: 1,
    marginBottom: '2px',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: '500' as const,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  statTrend: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.875rem',
    fontWeight: '700' as const,
    color: '#10b981',
    flexShrink: 0,
  },

  // Activity Feed
  activityCard: {
    background: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f1f5f9',
    overflow: 'hidden',
  },
  activityHeader: {
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
  },
  activityTitle: {
    fontSize: '1.25rem',
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  activityContent: {
    padding: '0',
    maxHeight: '400px',
    overflowY: 'auto' as const,
    WebkitOverflowScrolling: 'touch' as any,
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.2s ease',
    position: 'relative' as const,
  },
  activityAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '600' as const,
    fontSize: '0.875rem',
    flexShrink: 0,
  },
  activityMessage: {
    color: '#0f172a',
    fontWeight: '600' as const,
    marginBottom: '6px',
    lineHeight: '1.4',
    fontSize: '0.9rem',
  },
  activityMeta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.75rem',
    color: '#64748b',
  },

  // Badge styles
  badgeSafe: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    flexShrink: 0,
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  badgeCalm: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    flexShrink: 0,
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.2)',
  },
  badgeLively: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    flexShrink: 0,
    background: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  badgeFestive: {
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    flexShrink: 0,
    background: 'rgba(139, 92, 246, 0.1)',
    color: '#8b5cf6',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },

  // Loading and empty states
  loadingContainer: {
    height: '100vh',
    width: '100vw',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column' as const,
  },
  loadingText: {
    color: '#64748b',
    marginTop: '16px',
  },
  emptyStateContainer: {
    height: '100vh',
    width: '100vw',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  retryButton: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    marginTop: '16px',
  },

  // Responsive breakpoints
  '@media (min-width: 768px)': {
    dashboard: {
      padding: '24px',
      maxWidth: '100%',
    },
    dashboardTitle: {
      fontSize: '2.5rem',
    },
    dashboardSubtitle: {
      fontSize: '1.125rem',
    },
    dashboardGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 380px',
      gap: '32px',
    },
    locationHeader: {
      flexDirection: 'row' as const,
      textAlign: 'left' as const,
      alignItems: 'flex-start',
    },
    locationMeta: {
      flexDirection: 'row' as const,
      justifyContent: 'flex-start',
    },
    vibeAnalysisHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    vibeContent: {
      flexDirection: 'row' as const,
      alignItems: 'center',
    },
    vibeVisual: {
      flexDirection: 'row' as const,
      textAlign: 'left' as const,
    },
    vibeDescription: {
      paddingTop: '0',
      paddingLeft: '24px',
      borderTop: 'none',
      borderLeft: '1px solid #e2e8f0',
      textAlign: 'left' as const,
    },
    chartsGrid: {
      gridTemplateColumns: '1fr 1fr',
      display: 'grid',
    },
    statsGrid: {
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
    },
    activityContent: {
      maxHeight: '500px',
    },
  },

  '@media (min-width: 1024px)': {
    dashboard: {
      padding: '32px',
    },
    locationCardContent: {
      padding: '32px',
    },
    statsGrid: {
      gridTemplateColumns: '1fr',
    },
    chartContainer: {
      height: '200px',
    },
  },

  '@media (min-width: 1440px)': {
    dashboard: {
      maxWidth: '1400px',
      margin: '0 auto',
    },
    statsGrid: {
      gridTemplateColumns: '1fr 1fr',
    },
  },

  // Touch improvements
  '@media (hover: none) and (pointer: coarse)': {
    statItem: {
      transition: 'none',
    },
    activityItem: {
      transition: 'none',
    },
  },

  // Prevent zoom on input
  '@media screen and (max-width: 768px)': {
    input: {
      fontSize: '16px',
    },
    select: {
      fontSize: '16px',
    },
    textarea: {
      fontSize: '16px',
    },
  },
};

interface CommunityDashboardProps {
  vibes: Vibe[];
  userLocation: [number, number] | null;
  isLoading?: boolean;
  onNewReport?: () => void;
}

const CommunityDashboard: React.FC<CommunityDashboardProps> = ({
  vibes,
  userLocation,
  isLoading = false,
  onNewReport
}) => {
  const { t } = useTranslation();
  const [clusters, setClusters] = useState<LocationCluster[]>([]);
  const [currentLocationAddress, setCurrentLocationAddress] = useState<string>('');
  const [currentLocationVibe, setCurrentLocationVibe] = useState<{
    type: string;
    percentage: number;
    count: number;
  } | null>(null);
  const [currentLocationVibeDistribution, setCurrentLocationVibeDistribution] = useState<Array<{
    type: string;
    percentage: number;
    count: number;
    color: string;
  }>>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for subscription cleanup
  const subscriptionsRef = useRef<{ reports?: any; votes?: any }>({});

  // Memoize vibe color and icon maps for performance
  const vibeColorMap = useMemo(() => VIBE_CONFIG, []);
  const vibeIconMap = useMemo(() => {
    const iconMap: Record<VibeType, string> = {
      safe: '🛡️',
      calm: '😌',
      lively: '🎉',
      festive: '🎊',
      crowded: '👥',
      suspicious: '⚠️',
      dangerous: '🚨',
      noisy: '🔊',
      quiet: '🤫',
      unknown: '❓'
    };
    return iconMap;
  }, []);

  // Performance optimized functions using useCallback
  const getVibeColor = useCallback((vibeType: string): string => {
    return vibeColorMap[vibeType as VibeType]?.color || '#6b7280';
  }, [vibeColorMap]);

  const getVibeIcon = useCallback((vibeType: string): string => {
    return vibeIconMap[vibeType as VibeType] || '❓';
  }, [vibeIconMap]);

  // Extract vibe analysis logic
  const analyzeNearbyVibes = useCallback((location: [number, number], vibes: Vibe[]) => {
    const nearbyReports = vibes.filter((vibe: Vibe) => {
      if (vibe.latitude == null || vibe.longitude == null) return false;
      const distance = calculateDistance(
        location[0],
        location[1],
        vibe.latitude!,
        vibe.longitude!
      );
      return distance <= 1;
    });

    if (nearbyReports.length === 0) {
      return { dominantVibe: null, distribution: [] };
    }

    const vibeAnalysis = analyzeClusterVibes(nearbyReports);

    // Calculate distribution
    const vibeCounts: Record<string, number> = {};
    nearbyReports.forEach(report => {
      vibeCounts[report.vibe_type] = (vibeCounts[report.vibe_type] || 0) + 1;
    });

    const totalReports = nearbyReports.length;
    const distribution = Object.entries(vibeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / totalReports) * 100),
        color: getVibeColor(type)
      }))
      .sort((a, b) => b.percentage - a.percentage);

    return { dominantVibe: vibeAnalysis.dominantVibe, distribution };
  }, [getVibeColor]);

  // Retry functionality
  const handleRetry = useCallback(() => {
    setError(null);
    // Trigger re-fetch by updating dependencies or using a ref
  }, []);

  // Memoize processed clusters to avoid re-computation on every render
  const processedClusters = useMemo(() => {
    if (vibes.length === 0) {
      return [];
    }

    const processedClusters = clusterReports(vibes, userLocation, 1); // 1km radius
    // Filter out clusters without valid location names
    return processedClusters.filter(cluster =>
      cluster.locationName && cluster.locationName.trim() !== ''
    );
  }, [vibes, userLocation]);

  // Update clusters when processedClusters changes
  useEffect(() => {
    setClusters(processedClusters);
  }, [processedClusters]);

  // Geocode user location and calculate local vibe
  useEffect(() => {
    if (!userLocation || vibes.length === 0) {
      setCurrentLocationAddress('');
      setCurrentLocationVibe(null);
      setCurrentLocationVibeDistribution([]);
      return;
    }

    let cancelled = false;

    const geocodeAndAnalyze = async () => {
      setIsGeocoding(true);
      setError(null);
      try {
        const [address, vibeAnalysis] = await Promise.all([
          reverseGeocode(userLocation[0], userLocation[1]),
          analyzeNearbyVibes(userLocation, vibes)
        ]);

        if (!cancelled) {
          setCurrentLocationAddress(address);
          setCurrentLocationVibe(vibeAnalysis.dominantVibe);
          setCurrentLocationVibeDistribution(vibeAnalysis.distribution);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error processing location data:', error);
          setError('Failed to load location data');
          setCurrentLocationAddress('');
          setCurrentLocationVibe(null);
          setCurrentLocationVibeDistribution([]);
        }
      } finally {
        if (!cancelled) setIsGeocoding(false);
      }
    };

    geocodeAndAnalyze();

    return () => {
      cancelled = true;
    };
  }, [userLocation, vibes, analyzeNearbyVibes]);

  // Calculate community metrics - always called before any conditional returns
  const communityMetrics = useMemo(() => {
    const totalReports = vibes.length;
    const uniqueUsers = new Set(vibes.map(v => v.user_id)).size;
    const safetyScore = currentLocationVibe ? Math.round((currentLocationVibe.percentage / 100) * 94) : 85;
    const liveReports = Math.floor(totalReports * 0.1); // Estimate live reports

    return {
      activeMembers: uniqueUsers,
      areasMonitored: Math.max(1, Math.floor(totalReports / 10)),
      safetyScore,
      liveReports
    };
  }, [vibes, currentLocationVibe]);

  // Generate sample activity feed - always called before any conditional returns
  const activityFeed = useMemo(() => {
    const recentReports = vibes
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);

    return recentReports.map(report => ({
      id: report.id,
      user: report.user_id.substring(0, 2).toUpperCase(),
      message: `Reported ${report.vibe_type} atmosphere ${report.notes ? ` - ${report.notes.substring(0, 50)}` : ''}`,
      time: new Date(report.created_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      type: report.emergency ? 'safe' : report.vibe_type
    }));
  }, [vibes]);

  // Set up real-time subscriptions
  useEffect(() => {
    subscriptionsRef.current.reports = reportsService.subscribeToReports((newReport) => {
      if (!newReport.emergency) {
        console.log('New vibe report received:', newReport.id);
      }
    });

    subscriptionsRef.current.votes = reportsService.subscribeToVotes((update) => {
      console.log('Vote update received:', update.reportId);
    });

    return () => {
      Object.values(subscriptionsRef.current).forEach(subscription => {
        subscription?.unsubscribe();
      });
      subscriptionsRef.current = {};
    };
  }, []);

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <LoadingSpinner size="lg" />
        <p style={styles.loadingText}>
          {t('app.loadingCommunityData', 'Loading community data...')}
        </p>
      </div>
    );
  }

  if (clusters.length === 0 && !isLoading) {
    return (
      <div style={styles.emptyStateContainer}>
        <EmptyState
          icon={<i className="fas fa-users" style={{ fontSize: '48px' }}></i>}
          title={t('community.noData', 'No Community Data')}
          description={t('community.noDataDesc', 'Community vibe data will appear here as reports are submitted in your area.')}
          action={
            onNewReport && (
              <button
                onClick={onNewReport}
                style={styles.retryButton}
              >
                <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                {t('app.submitFirstReport', 'Submit First Report')}
              </button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.dashboardHeader}>
        <h1 style={styles.dashboardTitle}>Community Intelligence</h1>
        <p style={styles.dashboardSubtitle}>Real-time insights and sentiment analysis for your local area</p>
      </div>

      {/* Main Grid */}
      <div style={styles.dashboardGrid}>
        {/* Main Content */}
        <div style={styles.mainContent}>
          {/* Location Card */}
          {userLocation && currentLocationAddress ? (
            <div style={styles.locationCard}>
              <div style={styles.locationCardGradient}></div>
              <div style={styles.locationCardContent}>
                <div style={styles.locationHeader}>
                  <div style={styles.locationIcon}>
                    <i className="fas fa-location-dot"></i>
                  </div>
                  <div style={styles.locationInfo}>
                    <div style={styles.locationAddress}>{currentLocationAddress}</div>
                    <div style={styles.locationMeta}>
                      <div style={styles.metaItem}>
                        <i className="fas fa-map-marker-alt"></i>
                        Your Current Location
                      </div>
                      <div style={styles.metaItem}>
                        <i className="fas fa-clock"></i>
                        Updated 2 min ago
                      </div>
                      <div style={styles.metaItem}>
                        <i className="fas fa-signal"></i>
                        Strong Signal
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vibe Analysis */}
                {currentLocationVibe ? (
                  <div style={styles.vibeAnalysis}>
                    <div style={styles.vibeAnalysisHeader}>
                      <div style={styles.vibeTitle}>Area Sentiment Analysis</div>
                      <div style={styles.vibeCount}>{currentLocationVibe.count} Active Reports</div>
                    </div>

                    <div style={styles.vibeContent}>
                      <div style={styles.vibeVisual}>
                        <div style={styles.vibeIconContainer}>
                          <div style={styles.vibeIcon}>
                            {getVibeIcon(currentLocationVibe.type)}
                          </div>
                          <div style={styles.vibeIconGlow}></div>
                        </div>
                        <div style={styles.vibeStats}>
                          <div style={styles.vibePercentage}>{currentLocationVibe.percentage}%</div>
                          <div style={styles.vibeLabel}>Dominant</div>
                        </div>
                      </div>

                      <div style={styles.vibeDescription}>
                        <div style={styles.vibeType}>{t(`vibes.${currentLocationVibe.type}`, currentLocationVibe.type)}</div>
                        <div style={styles.vibeSubtitle}>
                          The area is currently experiencing {currentLocationVibe.type.toLowerCase()} conditions.
                          {currentLocationVibe.type === 'calm' && ' Ideal for focused work and relaxed social interactions. Safety metrics remain consistently high.'}
                          {currentLocationVibe.type === 'safe' && ' High safety metrics with visible security presence and community trust.'}
                          {currentLocationVibe.type === 'lively' && ' Energetic environment with moderate social activity and engagement.'}
                          {currentLocationVibe.type === 'festive' && ' Celebratory mood with events and gatherings creating positive energy.'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '32px',
                    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    textAlign: 'center'
                  }}>
                    <i className="fas fa-chart-bar" style={{ fontSize: '24px', color: '#9ca3af', marginBottom: '8px' }}></i>
                    <div style={{ color: '#6b7280', fontSize: '16px', fontWeight: '500' }}>
                      No Community Reports In Your Area Yet
                    </div>
                  </div>
                )}

                {/* Charts */}
                <div style={styles.chartsGrid}>
                  {/* Vibe Distribution Chart */}
                  <div style={styles.chartCard}>
                    <div style={styles.chartHeader}>
                      <div style={styles.chartTitle}>Vibe Distribution</div>
                      <div style={styles.chartInstruction}>Tap segments for details</div>
                    </div>
                    <div style={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={currentLocationVibeDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="percentage"
                          >
                            {currentLocationVibeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [`${value}%`, 'Percentage']}
                            labelFormatter={(label) => `${label} Vibe`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Activity Trends Chart */}
                  <div style={styles.chartCard}>
                    <div style={styles.chartHeader}>
                      <div style={styles.chartTitle}>Activity Trends</div>
                    </div>
                    <div style={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { day: 'Mon', reports: 65 },
                          { day: 'Tue', reports: 59 },
                          { day: 'Wed', reports: 80 },
                          { day: 'Thu', reports: 81 },
                          { day: 'Fri', reports: 76 },
                          { day: 'Sat', reports: 75 },
                          { day: 'Sun', reports: 90 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="reports"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '40px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              textAlign: 'center'
            }}>
              <i className="fas fa-location-slash" style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }}></i>
              <div style={{ color: '#6b7280', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Location Not Available
              </div>
              <div style={{ color: '#9ca3af', fontSize: '14px' }}>
                Please enable location services to see your area's community vibe
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          {/* Stats Card */}
          <div style={styles.statsCard}>
            <div style={styles.statsHeader}>
              <div style={styles.statsTitle}>Community Metrics</div>
            </div>
            <div style={styles.statsGrid}>
              <div style={styles.statItem}>
                <div style={styles.statIcon}>
                  <i className="fas fa-users"></i>
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statValue}>{communityMetrics.activeMembers}</div>
                  <div style={styles.statLabel}>Active Members</div>
                </div>
                <div style={styles.statTrend}>
                  <i className="fas fa-arrow-up"></i>
                  12%
                </div>
              </div>

              <div style={styles.statItem}>
                <div style={styles.statIcon}>
                  <i className="fas fa-map-marked-alt"></i>
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statValue}>{communityMetrics.areasMonitored}</div>
                  <div style={styles.statLabel}>Areas Monitored</div>
                </div>
                <div style={styles.statTrend}>
                  <i className="fas fa-arrow-up"></i>
                  8%
                </div>
              </div>

              <div style={styles.statItem}>
                <div style={styles.statIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statValue}>{communityMetrics.safetyScore}%</div>
                  <div style={styles.statLabel}>Safety Score</div>
                </div>
                <div style={styles.statTrend}>
                  <i className="fas fa-arrow-up"></i>
                  5%
                </div>
              </div>

              <div style={styles.statItem}>
                <div style={styles.statIcon}>
                  <i className="fas fa-bolt"></i>
                </div>
                <div style={styles.statContent}>
                  <div style={styles.statValue}>{communityMetrics.liveReports}</div>
                  <div style={styles.statLabel}>Live Reports</div>
                </div>
                <div style={styles.statTrend}>
                  <i className="fas fa-arrow-up"></i>
                  15%
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div style={styles.activityCard}>
            <div style={styles.activityHeader}>
              <div style={styles.activityTitle}>Recent Activity</div>
            </div>
            <div style={styles.activityContent}>
              {activityFeed.map((activity, index) => (
                <div key={activity.id} style={styles.activityItem}>
                  <div style={styles.activityAvatar}>{activity.user}</div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.activityMessage}>{activity.message}</div>
                    <div style={styles.activityMeta}>
                      <span>{activity.time}</span>
                      <span style={
                        activity.type === 'safe' ? styles.badgeSafe :
                        activity.type === 'calm' ? styles.badgeCalm :
                        activity.type === 'lively' ? styles.badgeLively :
                        styles.badgeFestive
                      }>
                        {activity.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual cluster card component
interface ClusterCardProps {
  cluster: LocationCluster;
  getVibeColor: (vibeType: string) => string;
  getVibeIcon: (vibeType: string) => string;
  t: any;
}

const ClusterCard: React.FC<ClusterCardProps> = ({
  cluster,
  getVibeColor,
  getVibeIcon,
  t
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle gradient background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: `linear-gradient(90deg, ${getVibeColor(cluster.dominantVibe.type)} 0%, ${getVibeColor(cluster.dominantVibe.type)}88 100%)`
      }}></div>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            color: '#1f2937',
            fontSize: '18px',
            fontWeight: '700',
            margin: '0 0 6px 0',
            lineHeight: '1.3'
          }}>
            {cluster.locationName}
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13px',
            color: '#6b7280'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fas fa-map-marker-alt" style={{ color: '#3b82f6' }}></i>
              <span>{formatDistance(cluster.distance)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fas fa-chart-bar" style={{ color: '#10b981' }}></i>
              <span>{cluster.reportCount} {t('community.reports', 'reports')}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse details' : 'Expand details'}
          style={{
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
            border: 'none',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: '14px' }}></i>
        </button>
      </div>

      {/* Dominant Vibe - Enhanced */}
      <div style={{
        background: `linear-gradient(135deg, ${getVibeColor(cluster.dominantVibe.type)}15 0%, ${getVibeColor(cluster.dominantVibe.type)}08 100%)`,
        border: `1px solid ${getVibeColor(cluster.dominantVibe.type)}30`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${getVibeColor(cluster.dominantVibe.type)} 0%, ${getVibeColor(cluster.dominantVibe.type)}cc 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: `0 4px 12px ${getVibeColor(cluster.dominantVibe.type)}40`
        }}>
          {getVibeIcon(cluster.dominantVibe.type)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            color: getVibeColor(cluster.dominantVibe.type),
            fontWeight: '700',
            fontSize: '18px',
            marginBottom: '2px'
          }}>
            {t(`vibes.${cluster.dominantVibe.type}`, cluster.dominantVibe.type)}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '800',
              color: getVibeColor(cluster.dominantVibe.type)
            }}>
              {cluster.dominantVibe.percentage}%
            </div>
            <div style={{
              color: '#6b7280',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {t('community.dominant', 'Dominant Vibe')}
            </div>
          </div>
        </div>
      </div>

      {/* Top Vibes (when expanded) */}
      {isExpanded && cluster.topVibes.length > 0 && (
        <div style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '16px',
          marginTop: '16px',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <h4 style={{
            color: '#374151',
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-chart-pie" style={{ color: '#6b7280' }}></i>
            {t('community.otherVibes', 'Other vibes in this area')}
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '8px'
          }}>
            {cluster.topVibes.map((vibe, index) => (
              <div
                key={index}
                style={{
                  background: `linear-gradient(135deg, ${getVibeColor(vibe.type)}10 0%, ${getVibeColor(vibe.type)}05 100%)`,
                  border: `1px solid ${getVibeColor(vibe.type)}20`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '16px' }}>{getVibeIcon(vibe.type)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    color: getVibeColor(vibe.type),
                    fontWeight: '600',
                    fontSize: '13px',
                    lineHeight: '1.2'
                  }}>
                    {t(`vibes.${vibe.type}`, vibe.type)}
                  </div>
                  <div style={{
                    color: '#6b7280',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {vibe.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add CSS animation */}
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default CommunityDashboard;
