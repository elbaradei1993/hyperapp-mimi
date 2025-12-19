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
import VibePulseCard from './VibePulseCard';
import { backgroundLocationService } from '../services/backgroundLocationService';
import {
  ShieldCheck,
  CloudSnow,
  Music,
  PartyPopper,
  Users,
  EyeOff,
  AlertTriangle,
  Volume2,
  VolumeX
} from 'lucide-react';
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

  // Premium Base styles
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

  // Premium Header styles
  dashboardHeader: {
    marginBottom: '32px',
    position: 'relative' as const,
    padding: '0 20px',
  },
  dashboardTitle: {
    fontSize: '1.5rem',
    fontWeight: '900' as const,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
    marginBottom: '8px',
    letterSpacing: '-0.03em',
    lineHeight: '1.2',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  dashboardSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
    fontWeight: '600' as const,
    lineHeight: '1.4',
    letterSpacing: '0.01em',
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

  // Premium Location Card
  locationCard: {
    background: 'var(--bg-glass)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  locationCardGradient: {
    position: 'absolute' as const,
    top: '0',
    left: '0',
    right: '0',
    height: '2px',
    background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.6) 0%, rgba(59, 130, 246, 0.8) 50%, rgba(29, 78, 216, 0.6) 100%)',
    boxShadow: '0 0 10px rgba(37, 99, 235, 0.3)',
  },
  locationCardContent: {
    padding: '32px 24px',
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
    width: '72px',
    height: '72px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3), 0 4px 12px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden'
  },
  locationInfo: {
    width: '100%',
  },
  locationAddress: {
    fontSize: '1.375rem',
    fontWeight: '800' as const,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
    backgroundClip: 'text',
    marginBottom: '12px',
    lineHeight: '1.3',
    letterSpacing: '-0.02em',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
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



  // Premium Activity Feed
  activityCard: {
    background: 'var(--bg-glass)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative' as const
  },
  activityHeader: {
    padding: '24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  activityTitle: {
    fontSize: '1.25rem',
    fontWeight: '800' as const,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
    backgroundClip: 'text',
    letterSpacing: '-0.02em',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
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
    gap: '16px',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'all 0.3s ease',
    position: 'relative' as const,
    minHeight: '80px',
    background: 'rgba(255, 255, 255, 0.02)',
  },
  activityAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '700' as const,
    fontSize: '1rem',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3), 0 2px 6px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    position: 'relative' as const,
    overflow: 'hidden'
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
  },

  // Touch improvements
  '@media (hover: none) and (pointer: coarse)': {
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
  onVibesUpdate?: (vibes: Vibe[]) => void;
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
  onNavigateToProfile,
  onVibesUpdate
}) => {
  const { t } = useTranslation();
  const { setCurrentLocationVibe } = useVibe();
  const { user, isAuthenticated } = useAuth();
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
  const [isVibeBreakdownExpanded, setIsVibeBreakdownExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isActivityExpanded, setIsActivityExpanded] = useState(true); // Default expanded

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

  const getVibeIconComponent = useCallback((vibeType: string) => {
    switch (vibeType) {
      case 'safe':
        return <ShieldCheck size={32} />;
      case 'calm':
        return <CloudSnow size={32} />;
      case 'lively':
        return <Music size={32} />;
      case 'festive':
        return <PartyPopper size={32} />;
      case 'crowded':
        return <Users size={32} />;
      case 'suspicious':
        return <EyeOff size={32} />;
      case 'dangerous':
        return <AlertTriangle size={32} />;
      case 'noisy':
        return <Volume2 size={32} />;
      case 'quiet':
        return <VolumeX size={32} />;
      default:
        return <ShieldCheck size={32} />;
    }
  }, []);

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

  // Initialize background location service and subscribe to significant location changes
  useEffect(() => {
    let locationUnsubscribe: (() => void) | null = null;

    const initializeBackgroundLocation = async () => {
      try {
        // Initialize background location service
        await backgroundLocationService.initialize();

        // Subscribe to significant location changes only
        locationUnsubscribe = backgroundLocationService.onLocationChange(
          async (newLocation, oldLocation) => {
            console.log('📍 Significant location change detected, updating vibe analysis');

            // Only update vibe analysis when location significantly changes
            if (vibes.length > 0) {
              setIsGeocoding(true);
              setError(null);

              try {
                const [address, vibeAnalysis] = await Promise.all([
                  reverseGeocode(newLocation[0], newLocation[1]),
                  analyzeNearbyVibes(newLocation, vibes)
                ]);

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
              } catch (error) {
                console.error('Error processing location data:', error);
                setError('Failed to load location data');
                setCurrentLocationAddress('');
                setLocalCurrentLocationVibe(null);
                setCurrentLocationVibeDistribution([]);
              } finally {
                setIsGeocoding(false);
              }
            }
          }
        );

        // Get initial location for immediate display
        const initialLocation = backgroundLocationService.getCurrentLocation();
        if (initialLocation && vibes.length > 0) {
          setIsGeocoding(true);
          try {
            const [address, vibeAnalysis] = await Promise.all([
              reverseGeocode(initialLocation[0], initialLocation[1]),
              analyzeNearbyVibes(initialLocation, vibes)
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
            } else {
              setCurrentLocationVibe(null);
            }
          } catch (error) {
            console.error('Error processing initial location data:', error);
          } finally {
            setIsGeocoding(false);
          }
        }
      } catch (error) {
        console.error('Failed to initialize background location:', error);
      }
    };

    initializeBackgroundLocation();

    // Cleanup function
    return () => {
      if (locationUnsubscribe) {
        locationUnsubscribe();
      }
      backgroundLocationService.stop();
    };
  }, [vibes.length, analyzeNearbyVibes, getVibeColor]); // Only depend on vibes length and analysis functions



  // Generate enhanced activity feed - always called before any conditional returns
  const activityFeed = useMemo(() => {
    const recentReports = vibes
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6); // Increased to show more activity

    return recentReports.map(report => {
      // Get proper display name with fallbacks
      const getDisplayName = () => {
        if (report.profile?.first_name && report.profile?.last_name) {
          return `${report.profile.first_name} ${report.profile.last_name}`;
        }
        if (report.profile?.username) {
          return report.profile.username;
        }
        // Fallback to first 8 characters of UUID for privacy
        return report.user_id.substring(0, 8);
      };

      return {
        id: report.id,
        user: report.user_id.substring(0, 2).toUpperCase(),
        userId: getDisplayName(),
        message: `${t('community.reportedAtmosphere', 'Reported {{vibe}} atmosphere', { vibe: report.vibe_type })}${report.notes ? ` - ${report.notes.substring(0, 40)}` : ''}`,
        location: report.location || 'Unknown location',
        time: new Date(report.created_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        type: report.emergency ? 'safe' : report.vibe_type,
        vibeType: report.vibe_type,
        notes: report.notes || '',
        createdAt: report.created_at
      };
    });
  }, [vibes]);

  // Load user reports on component mount
  useEffect(() => {
    const loadReports = async () => {
      const reports = await loadUserReports();
      setUserReports(reports);
    };
    loadReports();
  }, [loadUserReports]);



  // Set up optimized real-time subscriptions with debouncing
  useEffect(() => {
    if (!isAuthenticated || !user?.onboarding_completed) return;

    // Clean up existing subscriptions
    Object.values(subscriptionsRef.current).forEach(subscription => {
      subscription?.unsubscribe?.();
    });
    subscriptionsRef.current = {};

    // Debounce subscription updates to prevent excessive re-renders
    let updateTimeout: NodeJS.Timeout;
    let lastUpdate = Date.now();

    // Set up optimized real-time subscriptions
    subscriptionsRef.current.reports = reportsService.subscribeToReports((newReport) => {
      // Only update if it's been at least 2 seconds since last update
      const now = Date.now();
      if (now - lastUpdate < 2000) return;

      lastUpdate = now;

      // Use setTimeout to batch updates
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        if (!newReport.emergency) {
          console.log('New vibe report received:', newReport.id);
          // Update vibes state efficiently via callback
          onVibesUpdate?.([newReport, ...vibes.slice(0, 999)]);
        }
      }, 100);
    });

    subscriptionsRef.current.votes = reportsService.subscribeToVotes((update) => {
      // Batch vote updates to prevent spam
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        console.log('Vote update received:', update.reportId);
        // Update both vibes and userReports efficiently via callbacks
        onVibesUpdate?.(vibes.map((vibe: Vibe) =>
          vibe.id === update.reportId
            ? { ...vibe, upvotes: update.upvotes, downvotes: update.downvotes }
            : vibe
        ));
        setUserReports(prev => prev.map(report =>
          report.id === update.reportId
            ? { ...report, upvotes: update.upvotes, downvotes: update.downvotes }
            : report
        ));
      }, 100);
    });

    // Cleanup function
    return () => {
      clearTimeout(updateTimeout);
      Object.values(subscriptionsRef.current).forEach(subscription => {
        subscription?.unsubscribe?.();
      });
      subscriptionsRef.current = {};
    };
  }, [user?.onboarding_completed, onVibesUpdate]);

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
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '20px',
              padding: '40px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <LoadingSpinner size="lg" />
              <div style={{
                color: '#64748b',
                fontSize: '16px',
                fontWeight: '600',
                marginTop: '16px',
                position: 'relative',
                zIndex: 1
              }}>
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
                          <span style={{ fontSize: '1.5rem' }}>
                            {getVibeIconComponent(localCurrentLocationVibe.type)}
                          </span>
                          {t(`vibes.${localCurrentLocationVibe.type}`, localCurrentLocationVibe.type)} Atmosphere
                        </div>
                      </div>

                      {/* Main Content */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                      }}>
                        {/* Premium Circular Progress Chart */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '20px'
                        }}>
                          <div style={{
                            position: 'relative',
                            borderRadius: '50%',
                            filter: 'drop-shadow(0 8px 32px rgba(0, 0, 0, 0.12))'
                          }}>
                            {/* Premium Background Glow */}
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '200px',
                              height: '200px',
                              borderRadius: '50%',
                              background: `radial-gradient(circle, ${getVibeColor(localCurrentLocationVibe.type)}15 0%, ${getVibeColor(localCurrentLocationVibe.type)}08 40%, transparent 70%)`,
                              animation: 'premiumGlow 3s ease-in-out infinite',
                              zIndex: -1
                            }}></div>

                            {/* Sophisticated Pulsing Rings */}
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '140px',
                              height: '140px',
                              borderRadius: '50%',
                              border: `1.5px solid ${getVibeColor(localCurrentLocationVibe.type)}60`,
                              boxShadow: `0 0 20px ${getVibeColor(localCurrentLocationVibe.type)}40, inset 0 0 20px ${getVibeColor(localCurrentLocationVibe.type)}20`,
                              animation: 'premiumPulse1 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite',
                              zIndex: 0
                            }}></div>
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '165px',
                              height: '165px',
                              borderRadius: '50%',
                              border: `1px solid ${getVibeColor(localCurrentLocationVibe.type)}45`,
                              boxShadow: `0 0 15px ${getVibeColor(localCurrentLocationVibe.type)}30`,
                              animation: 'premiumPulse2 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite 0.8s',
                              zIndex: 0
                            }}></div>
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '190px',
                              height: '190px',
                              borderRadius: '50%',
                              border: `0.8px solid ${getVibeColor(localCurrentLocationVibe.type)}30`,
                              boxShadow: `0 0 10px ${getVibeColor(localCurrentLocationVibe.type)}20`,
                              animation: 'premiumPulse3 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite 1.6s',
                              zIndex: 0
                            }}></div>

                            {/* Metallic Particles Effect */}
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '220px',
                              height: '220px',
                              zIndex: -1
                            }}>
                              {[...Array(8)].map((_, i) => (
                                <div key={i} style={{
                                  position: 'absolute',
                                  width: '3px',
                                  height: '3px',
                                  background: `linear-gradient(45deg, ${getVibeColor(localCurrentLocationVibe.type)}80, ${getVibeColor(localCurrentLocationVibe.type)}40)`,
                                  borderRadius: '50%',
                                  boxShadow: `0 0 6px ${getVibeColor(localCurrentLocationVibe.type)}60`,
                                  top: `${50 + 35 * Math.sin((i * 45) * Math.PI / 180)}%`,
                                  left: `${50 + 35 * Math.cos((i * 45) * Math.PI / 180)}%`,
                                  animation: `particleFloat 4s ease-in-out infinite ${i * 0.5}s`,
                                  opacity: 0.7
                                }}></div>
                              ))}
                            </div>

                            {/* Premium Chart Container */}
                            <div style={{
                              position: 'relative',
                              zIndex: 2,
                              filter: 'drop-shadow(0 4px 16px rgba(0, 0, 0, 0.15))'
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
                                strokeWidth={14}
                                centerContent={
                                  <div style={{
                                    textAlign: 'center',
                                    position: 'relative'
                                  }}>
                                    {/* Premium Center Glow */}
                                    <div style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      width: '80px',
                                      height: '80px',
                                      borderRadius: '50%',
                                      background: `radial-gradient(circle, ${getVibeColor(localCurrentLocationVibe.type)}20 0%, transparent 70%)`,
                                      animation: 'centerGlow 3s ease-in-out infinite',
                                      zIndex: -1
                                    }}></div>

                                    <div style={{
                                      fontSize: '2.25rem',
                                      fontWeight: '900',
                                      lineHeight: 1,
                                      marginBottom: '4px',
                                      background: `linear-gradient(135deg, ${getVibeColor(localCurrentLocationVibe.type)} 0%, ${getVibeColor(localCurrentLocationVibe.type)}dd 50%, ${getVibeColor(localCurrentLocationVibe.type)}aa 100%)`,
                                      WebkitBackgroundClip: 'text',
                                      WebkitTextFillColor: 'transparent',
                                      backgroundClip: 'text',
                                      textShadow: `0 2px 8px ${getVibeColor(localCurrentLocationVibe.type)}40`,
                                      animation: 'textGlow 2s ease-in-out infinite alternate'
                                    }}>
                                      {localCurrentLocationVibe.percentage}%
                                    </div>
                                    <div style={{
                                      fontSize: '0.875rem',
                                      fontWeight: '800',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.15em',
                                      color: `${getVibeColor(localCurrentLocationVibe.type)}ee`,
                                      textShadow: `0 1px 3px ${getVibeColor(localCurrentLocationVibe.type)}30`,
                                      animation: 'textPulse 2s ease-in-out infinite alternate'
                                    }}>
                                      {t(`vibes.${localCurrentLocationVibe.type}`, localCurrentLocationVibe.type)}
                                    </div>
                                  </div>
                                }
                              />
                            </div>
                          </div>

                          {/* Premium Label */}
                          <div style={{
                            textAlign: 'center',
                            padding: '12px 20px',
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                            marginTop: '40px'
                          }}>
                            <div style={{
                              color: '#64748b',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              letterSpacing: '0.02em'
                            }}>
                              {t('community.sentimentDistribution')}
                            </div>
                            <div style={{
                              color: '#94a3b8',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              marginTop: '2px'
                            }}>
                              Real-time community sentiment
                            </div>
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
                              {t('community.viewDetailedBreakdown')}
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
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        background: `linear-gradient(135deg, ${vibe.color} 0%, ${vibe.color}cc 100%)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: `0 2px 8px ${vibe.color}40`,
                                        animation: 'pulseVibeIcon 2s ease-in-out infinite'
                                      }}>
                                        {getVibeIconComponent(vibe.type)}
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
                                        fontSize: '0.75rem',
                                        color: '#64748b',
                                        textAlign: 'center',
                                        lineHeight: '1.3'
                                      }}>
                                        {t(`vibes.${vibe.type}Desc`, `${vibe.type} description`)}
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

                    {/* Premium CSS Animations */}
                    <style>
                      {`
                        /* Premium Pulsing Rings */
                        @keyframes premiumPulse1 {
                          0%, 100% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 0.8;
                            filter: blur(0px);
                          }
                          50% {
                            transform: translate(-50%, -50%) scale(1.15);
                            opacity: 0.4;
                            filter: blur(1px);
                          }
                        }
                        @keyframes premiumPulse2 {
                          0%, 100% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 0.6;
                            filter: blur(0px);
                          }
                          50% {
                            transform: translate(-50%, -50%) scale(1.25);
                            opacity: 0.3;
                            filter: blur(1px);
                          }
                        }
                        @keyframes premiumPulse3 {
                          0%, 100% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 0.4;
                            filter: blur(0px);
                          }
                          50% {
                            transform: translate(-50%, -50%) scale(1.35);
                            opacity: 0.2;
                            filter: blur(1px);
                          }
                        }

                        /* Premium Background Glow */
                        @keyframes premiumGlow {
                          0%, 100% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 0.3;
                          }
                          50% {
                            transform: translate(-50%, -50%) scale(1.1);
                            opacity: 0.6;
                          }
                        }

                        /* Center Content Glow */
                        @keyframes centerGlow {
                          0%, 100% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 0.4;
                          }
                          50% {
                            transform: translate(-50%, -50%) scale(1.2);
                            opacity: 0.8;
                          }
                        }

                        /* Text Glow Effects */
                        @keyframes textGlow {
                          0%, 100% {
                            text-shadow: 0 2px 8px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.2);
                          }
                          50% {
                            text-shadow: 0 2px 12px rgba(16, 185, 129, 0.6), 0 0 30px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.2);
                          }
                        }

                        @keyframes textPulse {
                          0%, 100% {
                            opacity: 0.9;
                            transform: scale(1);
                          }
                          50% {
                            opacity: 1;
                            transform: scale(1.02);
                          }
                        }

                        /* Metallic Particles */
                        @keyframes particleFloat {
                          0%, 100% {
                            transform: translateY(0px) rotate(0deg);
                            opacity: 0.7;
                          }
                          25% {
                            transform: translateY(-8px) rotate(90deg);
                            opacity: 1;
                          }
                          50% {
                            transform: translateY(-4px) rotate(180deg);
                            opacity: 0.8;
                          }
                          75% {
                            transform: translateY(-12px) rotate(270deg);
                            opacity: 0.9;
                          }
                        }

                        /* Legacy animations for compatibility */
                        @keyframes pulseRadius1 {
                          0%, 100% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 1;
                          }
                          50% {
                            transform: translate(-50%, -50%) scale(1.25);
                            opacity: 0.7;
                          }
                        }
                        @keyframes pulseRadius2 {
                          0%, 100% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 0.8;
                          }
                          50% {
                            transform: translate(-50%, -50%) scale(1.35);
                            opacity: 0.5;
                          }
                        }
                        @keyframes pulseRadius3 {
                          0%, 100% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 0.6;
                          }
                          50% {
                            transform: translate(-50%, -50%) scale(1.45);
                            opacity: 0.3;
                          }
                        }
                        @keyframes pulseGlow {
                          0%, 100% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 0.3;
                          }
                          50% {
                            transform: translate(-50%, -50%) scale(1.2);
                            opacity: 0.6;
                          }
                        }
                        @keyframes pulseChart {
                          0%, 100% {
                            transform: scale(1);
                            opacity: 1;
                          }
                          50% {
                            transform: scale(1.05);
                            opacity: 0.9;
                          }
                        }
                        @keyframes pulseVibeIcon {
                          0%, 100% {
                            transform: scale(1);
                            opacity: 1;
                          }
                          50% {
                            transform: scale(1.1);
                            opacity: 0.8;
                          }
                        }
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
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '20px',
              padding: '40px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <i className="fas fa-location-slash" style={{
                fontSize: '48px',
                color: '#94a3b8',
                marginBottom: '16px',
                position: 'relative',
                zIndex: 1
              }}></i>
              <div style={{
                color: '#64748b',
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '8px',
                position: 'relative',
                zIndex: 1
              }}>
                Location Not Available
              </div>
              <div style={{
                color: '#94a3b8',
                fontSize: '14px',
                position: 'relative',
                zIndex: 1
              }}>
                Please enable location services to see your area's community vibe
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          {/* Premium Activity Feed Dropdown */}
          <div style={styles.activityCard}>
            {/* Premium Dropdown Header */}
            <div
              style={{
                ...styles.activityHeader,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: isActivityExpanded ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                transition: 'all 0.3s ease'
              }}
              onClick={() => setIsActivityExpanded(!isActivityExpanded)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}>
                  <i className="fas fa-history" style={{ fontSize: '16px', color: 'white' }}></i>
                </div>
                <h2 style={styles.activityTitle}>
                  {t('community.recentActivityTitle')}
                </h2>
              </div>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                transform: isActivityExpanded ? 'rotate(0deg)' : 'rotate(180deg)'
              }}>
                <i className="fas fa-chevron-up" style={{
                  fontSize: '12px',
                  color: '#64748b',
                  transition: 'color 0.3s ease'
                }}></i>
              </div>
            </div>

            {/* Expandable Content */}
            {isActivityExpanded && (
              <div style={{
                animation: 'slideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                padding: '0 24px 24px'
              }}>
                <div style={styles.activityContent}>
                  {activityFeed.map((activity, index) => (
                    <div key={index} style={{
                      ...styles.activityItem,
                      background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.01)',
                      animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.01)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}>
                      <div style={styles.activityAvatar}>
                        {activity.user}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={styles.activityMessage}>
                          {activity.message}
                        </div>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          marginTop: '8px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.75rem',
                            color: '#64748b'
                          }}>
                            <i className="fas fa-user" style={{ fontSize: '10px' }}></i>
                            <span style={{ fontWeight: '600' }}>
                              {activity.userId}
                            </span>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.75rem',
                            color: '#64748b'
                          }}>
                            <i className="fas fa-map-marker-alt" style={{ fontSize: '10px' }}></i>
                            <span style={{ fontWeight: '500' }}>
                              {activity.location}
                            </span>
                          </div>
                        </div>
                        <div style={styles.activityMeta}>
                          <span>{activity.time}</span>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.6rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            background: getVibeColor(activity.type) + '20',
                            color: getVibeColor(activity.type),
                            border: `1px solid ${getVibeColor(activity.type)}40`
                          }}>
                            {t(`vibes.${activity.type}`, activity.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityDashboard;
