import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner, EmptyState, CircularProgress, MultiSegmentCircularProgress } from './shared';
import { clusterReports, formatDistance, analyzeClusterVibes, calculateDistance, type LocationCluster } from '../lib/clustering';
import { reportsService } from '../services/reports';
import { reverseGeocode } from '../lib/geocoding';
import { VIBE_CONFIG, VibeType } from '../constants/vibes';
import { useVibe } from '../contexts/VibeContext';
import { useAuth } from '../contexts/AuthContext';
import { IconButton } from '@chakra-ui/react';
import BreakingNewsBanner from './BreakingNewsBanner';
import type { Vibe, Report } from '../types';

// Lazy load heavy chart components for better performance
const PieChart = lazy(() => import('recharts').then(module => ({ default: module.PieChart })));
const Pie = lazy(() => import('recharts').then(module => ({ default: module.Pie })));
const Cell = lazy(() => import('recharts').then(module => ({ default: module.Cell })));
const LineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
const Line = lazy(() => import('recharts').then(module => ({ default: module.Line })));
const XAxis = lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
const YAxis = lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));

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
    background: 'var(--bg-secondary)',
    minHeight: '100vh',
    color: 'var(--text-primary)',
    lineHeight: '1.6',
    paddingBottom: 'env(safe-area-inset-bottom)',
    WebkitTapHighlightColor: 'transparent',
  },

  // Header styles
  dashboardHeader: {
    marginBottom: '24px',
    position: 'relative' as const,
    padding: '0 20px',
  },
  dashboardTitle: {
    fontSize: '1.25rem',
    fontWeight: '800' as const,
    background: 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
    marginBottom: '6px',
    letterSpacing: '-0.025em',
    lineHeight: '1.3',
  },
  dashboardSubtitle: {
    fontSize: '0.9rem',
    color: '#475569',
    fontWeight: '500' as const,
    lineHeight: '1.5',
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
    background: 'var(--bg-primary)',
    borderRadius: '20px',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-color)',
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
    padding: '20px 16px',
  },
  locationHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    gap: '12px',
    marginBottom: '20px',
  },
  locationIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
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
    fontSize: '1.125rem',
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: '8px',
    lineHeight: '1.4',
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
    fontSize: '0.8rem',
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
    padding: '20px 16px',
    marginTop: '16px',
  },
  vibeAnalysisHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '20px',
  },
  vibeTitle: {
    fontSize: '1.125rem',
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  vibeCount: {
    color: '#64748b',
    fontSize: '0.8rem',
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
    fontSize: '1.875rem',
    fontWeight: '900' as const,
    color: '#10b981',
    lineHeight: 1,
    marginBottom: '4px',
  },
  vibeLabel: {
    fontSize: '0.75rem',
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
    fontSize: '1.25rem',
    fontWeight: '800' as const,
    color: '#10b981',
    marginBottom: '8px',
  },
  vibeSubtitle: {
    color: '#64748b',
    fontSize: '0.875rem',
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
    width: '100%',
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
    fontSize: '1.25rem',
    fontWeight: '800' as const,
    color: '#0f172a',
    lineHeight: 1,
    marginBottom: '2px',
  },
  statLabel: {
    fontSize: '0.8rem',
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
    fontSize: '0.8rem',
    fontWeight: '700' as const,
    color: '#10b981',
    flexShrink: 0,
  },

  // Activity Feed
  activityCard: {
    background: 'var(--bg-primary)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
  },
  activityHeader: {
    padding: '16px',
    borderBottom: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
  },
  activityTitle: {
    fontSize: '1.125rem',
    fontWeight: '700' as const,
    color: 'var(--text-primary)',
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
    padding: '16px',
    borderBottom: '1px solid var(--border-color)',
    transition: 'background 0.2s ease',
    position: 'relative' as const,
    minHeight: '80px',
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
    fontSize: '0.85rem',
  },
  activityMeta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.7rem',
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
  onNavigateToMap?: (latitude: number, longitude: number) => void;
  onNavigateToProfile?: (userId: string) => void;
}

interface ReportWithVote extends Report {
  user_vote?: 'upvote' | 'downvote' | null;
}

const CommunityDashboard: React.FC<CommunityDashboardProps> = ({
  vibes,
  userLocation,
  isLoading = false,
  onNewReport,
  onNavigateToMap,
  onNavigateToProfile
}) => {
  const { t } = useTranslation();
  const { setCurrentLocationVibe } = useVibe();
  const { user } = useAuth();
  const [clusters, setClusters] = useState<LocationCluster[]>([]);
  const [currentLocationAddress, setCurrentLocationAddress] = useState<string>('');
  const [localCurrentLocationVibe, setLocalCurrentLocationVibe] = useState<{
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
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [userReportsLoading, setUserReportsLoading] = useState(false);
  const [nearbyReports, setNearbyReports] = useState<ReportWithVote[]>([]);
  const [nearbyReportsLoading, setNearbyReportsLoading] = useState(false);
  const [isVibeBreakdownExpanded, setIsVibeBreakdownExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

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

    // Calculate distribution - include all vibes from VIBE_CONFIG
    const vibeCounts: Record<string, number> = {};
    nearbyReports.forEach(report => {
      vibeCounts[report.vibe_type] = (vibeCounts[report.vibe_type] || 0) + 1;
    });

    const totalReports = nearbyReports.length;
    const distribution = Object.keys(VIBE_CONFIG)
      .map((type) => {
        const count = vibeCounts[type] || 0;
        const percentage = count > 0 ? Math.round((count / totalReports) * 100) : 0;
        const color = count > 0 ? getVibeColor(type) : '#ffffff'; // White for vibes with no reports
        return {
          type,
          count,
          percentage,
          color
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    return { dominantVibe: vibeAnalysis.dominantVibe, distribution };
  }, [getVibeColor]);

  // Retry functionality
  const handleRetry = useCallback(() => {
    setError(null);
    // Trigger re-fetch by updating dependencies or using a ref
  }, []);

  // Load user reports for recent activity
  const loadUserReports = useCallback(async (): Promise<Report[]> => {
    try {
      setUserReportsLoading(true);
      // For now, load recent reports from database
      // In a full implementation, this would filter by current user
      const reports = await reportsService.getReports({ limit: 10 });
      return reports;
    } catch (error) {
      console.error("Error loading user reports:", error);
      return [];
    } finally {
      setUserReportsLoading(false);
    }
  }, []);

  // Load nearby reports for community activity
  const loadNearbyReports = useCallback(async (): Promise<Report[]> => {
    try {
      setNearbyReportsLoading(true);
      // For now, load recent reports from database
      // In a full implementation, this would filter by location
      const reports = await reportsService.getReports({ limit: 10 });

      // Add user vote information for each report
      const reportsWithVotes = await Promise.all(
        reports.map(async (report) => {
          try {
            const voteType = await reportsService.getUserVote(report.id, user!.id);
            return {
              ...report,
              user_vote: voteType
            };
          } catch (error) {
            return {
              ...report,
              user_vote: null
            };
          }
        })
      );

      return reportsWithVotes;
    } catch (error) {
      console.error("Error loading nearby reports:", error);
      return [];
    } finally {
      setNearbyReportsLoading(false);
    }
  }, [user]);

  // Refresh community data functionality
  const refreshCommunityData = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Refresh all community data sources
      const [userReports, nearbyReports] = await Promise.all([
        loadUserReports(),
        loadNearbyReports()
      ]);

      // Update state with fresh data
      setUserReports(userReports);
      setNearbyReports(nearbyReports as ReportWithVote[]);

      // Update refresh timestamp
      setLastRefreshTime(new Date());

      // Trigger location data refresh if user location exists
      if (userLocation && vibes.length > 0) {
        const geocodeAndAnalyze = async () => {
          try {
            const [address, vibeAnalysis] = await Promise.all([
              reverseGeocode(userLocation[0], userLocation[1]),
              analyzeNearbyVibes(userLocation, vibes)
            ]);

            setCurrentLocationAddress(address);
            setLocalCurrentLocationVibe(vibeAnalysis.dominantVibe);
            setCurrentLocationVibeDistribution(vibeAnalysis.distribution);

            if (vibeAnalysis.dominantVibe) {
              setCurrentLocationVibe({
                type: vibeAnalysis.dominantVibe.type,
                percentage: vibeAnalysis.dominantVibe.percentage,
                count: vibeAnalysis.dominantVibe.count,
                color: getVibeColor(vibeAnalysis.dominantVibe.type)
              });
            }
          } catch (error) {
            console.error('Error refreshing location data:', error);
          }
        };
        geocodeAndAnalyze();
      }
    } catch (error) {
      console.error('Error refreshing community data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadUserReports, loadNearbyReports, userLocation, vibes, analyzeNearbyVibes, getVibeColor]);

  // Vote on report
  const voteOnReport = useCallback(async (reportId: number, voteType: 'upvote' | 'downvote') => {
    if (!user) return;

    try {
      await reportsService.vote(reportId, user.id, voteType);

      // Update local state optimistically
      setNearbyReports(prevReports =>
        prevReports.map(report => {
          if (report.id === reportId) {
            const currentVote = report.user_vote;
            let newUpvotes = report.upvotes || 0;
            let newDownvotes = report.downvotes || 0;

            // Remove previous vote if exists
            if (currentVote === 'upvote') {
              newUpvotes--;
            } else if (currentVote === 'downvote') {
              newDownvotes--;
            }

            // Add new vote
            if (voteType === 'upvote') {
              newUpvotes++;
            } else {
              newDownvotes++;
            }

            return {
              ...report,
              upvotes: newUpvotes,
              downvotes: newDownvotes,
              user_vote: voteType
            };
          }
          return report;
        })
      );

    } catch (error) {
      console.error("Error voting on report:", error);
    }
  }, [user]);

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
      setLocalCurrentLocationVibe(null);
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
          setLocalCurrentLocationVibe(vibeAnalysis.dominantVibe);
          setCurrentLocationVibeDistribution(vibeAnalysis.distribution);

          // Update the global context with the current location vibe
          if (vibeAnalysis.dominantVibe) {
            setCurrentLocationVibe({
              type: vibeAnalysis.dominantVibe.type,
              percentage: vibeAnalysis.dominantVibe.percentage,
              count: vibeAnalysis.dominantVibe.count,
              color: getVibeColor(vibeAnalysis.dominantVibe.type)
            });
          } else {
            setCurrentLocationVibe(null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error processing location data:', error);
          setError('Failed to load location data');
          setCurrentLocationAddress('');
          setLocalCurrentLocationVibe(null);
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
    const safetyScore = localCurrentLocationVibe ? Math.round((localCurrentLocationVibe.percentage / 100) * 94) : 85;
    const liveReports = Math.floor(totalReports * 0.1); // Estimate live reports

    return {
      activeMembers: uniqueUsers,
      areasMonitored: Math.max(1, Math.floor(totalReports / 10)),
      safetyScore,
      liveReports
    };
  }, [vibes, localCurrentLocationVibe]);

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

  // Load user reports on component mount
  useEffect(() => {
    const loadReports = async () => {
      const reports = await loadUserReports();
      setUserReports(reports);
    };
    loadReports();
  }, [loadUserReports]);

  // Load nearby reports for community activity
  useEffect(() => {
    const loadNearby = async () => {
      const reports = await loadNearbyReports();
      setNearbyReports(reports as ReportWithVote[]);
    };
    loadNearby();
  }, [loadNearbyReports]);

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
      {/* Banaking News Bwnn Banner */}
      <BreakingNewsBanner />

      {/* Main Grid */}
      <div style={styles.dashboardGrid}>
        {/* Main Content */}
        <div style={styles.mainContent}>
          {/* Location Card */}
          {isGeocoding ? (
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '40px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              textAlign: 'center'
            }}>
              <LoadingSpinner size="lg" />
              <div style={{ color: '#6b7280', fontSize: '16px', fontWeight: '500', marginTop: '16px' }}>
                Loading location data...
              </div>
            </div>
          ) : userLocation && currentLocationAddress ? (
            <div style={styles.locationCard}>
              <div style={styles.locationCardGradient}></div>
              <div style={styles.locationCardContent}>
                <div style={styles.locationHeader}>
                  <div style={styles.locationInfo}>
                    <div style={styles.locationAddress}>{currentLocationAddress}</div>
                  </div>
                </div>

                {/* Enhanced Vibe Analysis */}
                {localCurrentLocationVibe ? (
                  <div style={{
                    background: `linear-gradient(135deg, ${getVibeColor(localCurrentLocationVibe.type)}08 0%, ${getVibeColor(localCurrentLocationVibe.type)}04 100%)`,
                    border: `1px solid ${getVibeColor(localCurrentLocationVibe.type)}20`,
                    borderRadius: '20px',
                    padding: '28px 24px',
                    marginTop: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Subtle background pattern */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '120px',
                      height: '120px',
                      background: `radial-gradient(circle, ${getVibeColor(localCurrentLocationVibe.type)}10 0%, transparent 70%)`,
                      borderRadius: '50%',
                      transform: 'translate(40px, -40px)'
                    }}></div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '24px',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      {/* Header */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: '800',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                      }}>
                        {/* Circular Progress Chart */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '16px'
                        }}>
                          <MultiSegmentCircularProgress
                            segments={currentLocationVibeDistribution
                              .filter(vibe => vibe.percentage > 0)
                              .slice(0, 5)
                              .map(vibe => ({
                                percentage: vibe.percentage,
                                color: vibe.color,
                                label: t(`vibes.${vibe.type}`, vibe.type)
                              }))
                            }
                            size={140}
                            strokeWidth={12}
                            centerContent={
                              <div style={{
                                textAlign: 'center',
                                color: getVibeColor(localCurrentLocationVibe.type)
                              }}>
                                <div style={{
                                  fontSize: '1.75rem',
                                  fontWeight: '900',
                                  lineHeight: 1,
                                  marginBottom: '2px'
                                }}>
                                  {localCurrentLocationVibe.percentage}%
                                </div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                  opacity: 0.8
                                }}>
                                  {t(`vibes.${localCurrentLocationVibe.type}`, localCurrentLocationVibe.type)}
                                </div>
                              </div>
                            }
                          />
                          <div style={{
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                          }}>
                            {t('community.sentimentDistribution')}
                          </div>
                        </div>

                        {/* Vibe Description */}
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '16px',
                          padding: '20px',
                          textAlign: 'left'
                        }}>
                          <div style={{
                            fontSize: '1.25rem',
                            fontWeight: '800',
                            color: getVibeColor(localCurrentLocationVibe.type),
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}>
                            {getVibeIcon(localCurrentLocationVibe.type)}
                            {t(`vibes.${localCurrentLocationVibe.type}`, localCurrentLocationVibe.type)}
                          </div>
                          <div style={{
                            color: '#475569',
                            fontSize: '0.95rem',
                            lineHeight: '1.6',
                            maxWidth: '400px',
                            margin: '0 auto',
                            textAlign: 'justify'
                          }}>
                            The area is currently experiencing {localCurrentLocationVibe.type.toLowerCase()} conditions.
                            {localCurrentLocationVibe.type === 'calm' && ' Ideal for focused work and relaxed social interactions. Safety metrics remain consistently high.'}
                            {localCurrentLocationVibe.type === 'safe' && ' High safety metrics with visible security presence and community trust.'}
                            {localCurrentLocationVibe.type === 'lively' && ' Energetic environment with moderate social activity and engagement.'}
                            {localCurrentLocationVibe.type === 'festive' && ' Celebratory mood with events and gatherings creating positive energy.'}
                          </div>
                        </div>

                        {/* Expandable Breakdown */}
                        <div style={{
                          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
                          paddingTop: '20px'
                        }}>
                          <button
                            onClick={() => setIsVibeBreakdownExpanded(!isVibeBreakdownExpanded)}
                            style={{
                              width: '100%',
                              background: 'rgba(255, 255, 255, 0.9)',
                              backdropFilter: 'blur(12px)',
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                              borderRadius: '12px',
                              padding: '16px 20px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.2s ease',
                              color: '#374151',
                              fontSize: '0.95rem',
                              fontWeight: '600'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i className="fas fa-chart-bar" style={{ color: getVibeColor(localCurrentLocationVibe.type) }}></i>
                              View Detailed Breakdown
                            </span>
                            <i className={`fas fa-chevron-${isVibeBreakdownExpanded ? 'up' : 'down'}`}
                              style={{ color: '#6b7280', transition: 'transform 0.2s ease' }}></i>
                          </button>

                          {/* Expanded Content */}
                          {isVibeBreakdownExpanded && (
                            <div style={{
                              marginTop: '16px',
                              animation: 'slideDown 0.3s ease-out'
                            }}>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                gap: '12px'
                              }}>
                                {currentLocationVibeDistribution
                                  .filter(vibe => vibe.percentage > 0)
                                  .map((vibe, index) => (
                                    <div
                                      key={vibe.type}
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.9)',
                                        backdropFilter: 'blur(12px)',
                                        border: `1px solid ${vibe.color}30`,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s ease',
                                        animation: `fadeInUp 0.4s ease-out ${index * 0.1}s both`
                                      }}
                                    >
                                      <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: `linear-gradient(135deg, ${vibe.color} 0%, ${vibe.color}cc 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '16px',
                                        boxShadow: `0 2px 8px ${vibe.color}40`
                                      }}>
                                        {getVibeIcon(vibe.type)}
                                      </div>
                                      <div style={{
                                        fontSize: '0.875rem',
                                        fontWeight: '700',
                                        color: vibe.color,
                                        textAlign: 'center'
                                      }}>
                                        {t(`vibes.${vibe.type}`, vibe.type)}
                                      </div>
                                      <div style={{
                                        fontSize: '1.25rem',
                                        fontWeight: '900',
                                        color: vibe.color
                                      }}>
                                        {vibe.percentage}%
                                      </div>
                                      <div style={{
                                        fontSize: '0.75rem',
                                        color: '#6b7280',
                                        textAlign: 'center'
                                      }}>
                                        {vibe.count} reports
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CSS Animations */}
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
                        @keyframes fadeInUp {
                          from {
                            opacity: 0;
                            transform: translateY(20px);
                          }
                          to {
                            opacity: 1;
                            transform: translateY(0);
                          }
                        }
                      `}
                    </style>
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
          {/* Community Activity */}
          <div style={styles.activityCard}>
            <div style={styles.activityHeader}>
              <div style={styles.activityTitle}>Community Activity</div>
            </div>
            <div style={styles.activityContent}>
              {nearbyReportsLoading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px'
                }}>
                  <LoadingSpinner size="md" />
                </div>
              ) : nearbyReports.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#64748b'
                }}>
                  <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                  <p>No nearby reports</p>
                </div>
              ) : (
                nearbyReports.slice(0, 5).map(report => (
                  <div
                    key={report.id}
                    onClick={() => {
                      console.log('Report clicked:', report.id, report.latitude, report.longitude);
                      onNavigateToMap?.(report.latitude, report.longitude);
                    }}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* User Profile Picture */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Profile picture clicked:', report.user_id);
                        onNavigateToProfile?.(report.user_id);
                      }}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px solid #e5e7eb',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      {report.profile?.profile_picture_url ? (
                        <img
                          src={report.profile.profile_picture_url}
                          alt={report.profile.username || 'User'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.parentElement?.querySelector('.profile-fallback') as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="profile-fallback"
                        style={{
                          display: report.profile?.profile_picture_url ? 'none' : 'flex',
                          width: '100%',
                          height: '100%',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontSize: '16px',
                          fontWeight: '600'
                        }}
                      >
                        {(report.profile?.username || report.profile?.first_name || 'U')[0]?.toUpperCase() || 'U'}
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '600',
                        color: '#0f172a',
                        marginBottom: '2px'
                      }}>
                        {String(t(`vibes.${report.vibe_type}`))} {String(t('profile.report'))}
                      </div>
                      <div style={{
                        color: '#64748b',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        {report.location || String(t('profile.unknownLocation'))}
                      </div>
                      {report.notes && (
                        <div style={{
                          color: '#475569',
                          fontSize: '14px',
                          marginBottom: '4px'
                        }}>
                          {report.notes}
                        </div>
                      )}
                      <div style={{
                        color: '#64748b',
                        fontSize: '12px'
                      }}>
                        {new Date(report.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Vote Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        onClick={() => voteOnReport(report.id, 'upvote')}
                        style={{
                          backgroundColor: report.user_vote === 'upvote' ? '#10b981' : 'transparent',
                          color: report.user_vote === 'upvote' ? 'white' : '#64748b',
                          border: `1px solid ${report.user_vote === 'upvote' ? '#10b981' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          minWidth: '48px',
                          minHeight: '44px',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        <i className="fas fa-thumbs-up"></i>
                        {report.upvotes || 0}
                      </button>
                      <button
                        onClick={() => voteOnReport(report.id, 'downvote')}
                        style={{
                          backgroundColor: report.user_vote === 'downvote' ? '#ef4444' : 'transparent',
                          color: report.user_vote === 'downvote' ? 'white' : '#64748b',
                          border: `1px solid ${report.user_vote === 'downvote' ? '#ef4444' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          minWidth: '48px',
                          minHeight: '44px',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        <i className="fas fa-thumbs-down"></i>
                        {report.downvotes || 0}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityDashboard;
