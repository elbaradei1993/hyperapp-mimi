import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner, EmptyState, CircularProgress, MultiSegmentCircularProgress } from './shared';
import { clusterReports, formatDistance, analyzeClusterVibes, calculateDistance, type LocationCluster } from '../lib/clustering';
import { reportsService } from '../services/reports';
import { reverseGeocode } from '../lib/geocoding';
import CommunityInsights from './CommunityInsights';
import type { Vibe, Report } from '../types';

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
    if (userLocation && vibes.length > 0) {
      const geocodeAndAnalyze = async () => {
        setIsGeocoding(true);
        try {
          // Reverse geocode the address
          const address = await reverseGeocode(userLocation[0], userLocation[1]);
          setCurrentLocationAddress(address);

          // Find reports within 1km of user location to calculate local vibe
          const nearbyReports = vibes.filter((vibe: Vibe) => {
            if (vibe.latitude == null || vibe.longitude == null) return false;
            const distance = calculateDistance(
              userLocation[0],
              userLocation[1],
              vibe.latitude!,
              vibe.longitude!
            );
            return distance <= 1; // 1km radius
          });

          if (nearbyReports.length > 0) {
            const vibeAnalysis = analyzeClusterVibes(nearbyReports);
            setCurrentLocationVibe(vibeAnalysis.dominantVibe);

            // Calculate full vibe distribution for multi-segment chart
            const vibeCounts: Record<string, number> = {};
            for (const report of nearbyReports) {
              const vibeType = report.vibe_type;
              vibeCounts[vibeType] = (vibeCounts[vibeType] || 0) + 1;
            }

            const totalReports = nearbyReports.length;
            const vibeDistribution = Object.entries(vibeCounts)
              .map(([type, count]) => ({
                type,
                count,
                percentage: Math.round((count / totalReports) * 100),
                color: getVibeColor(type)
              }))
              .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending

            setCurrentLocationVibeDistribution(vibeDistribution);
          } else {
            setCurrentLocationVibe(null);
            setCurrentLocationVibeDistribution([]);
          }
        } catch (error) {
          console.error('Error geocoding user location:', error);
          setCurrentLocationAddress('');
          setCurrentLocationVibe(null);
        } finally {
          setIsGeocoding(false);
        }
      };

      geocodeAndAnalyze();
    } else {
      setCurrentLocationAddress('');
      setCurrentLocationVibe(null);
    }
  }, [userLocation, vibes]);

  // Set up real-time subscriptions
  useEffect(() => {
    const reportsSubscription = reportsService.subscribeToReports((newReport) => {
      if (!newReport.emergency) {
        // Since we're now using props directly, the parent component will handle updates
        // This subscription is still needed for real-time updates, but we don't maintain local state
        console.log('New vibe report received:', newReport.id);
      }
    });

    const votesSubscription = reportsService.subscribeToVotes((update) => {
      // Vote updates will be handled by the parent component through props
      console.log('Vote update received:', update.reportId);
    });

    // Cleanup subscriptions
    return () => {
      reportsSubscription.unsubscribe();
      votesSubscription.unsubscribe();
    };
  }, []);

  // Get vibe color based on type
  const getVibeColor = (vibeType: string): string => {
    const colorMap: Record<string, string> = {
      safe: '#10b981',      // green
      calm: '#3b82f6',      // blue
      lively: '#f59e0b',    // amber
      festive: '#8b5cf6',   // violet
      crowded: '#ef4444',   // red
      suspicious: '#f97316', // orange
      dangerous: '#dc2626',  // red-600
      noisy: '#6b7280',     // gray
      quiet: '#06b6d4',     // cyan
      unknown: '#6b7280'    // gray
    };
    return colorMap[vibeType] || '#6b7280';
  };

  // Get vibe icon
  const getVibeIcon = (vibeType: string): string => {
    const iconMap: Record<string, string> = {
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
    return iconMap[vibeType] || '❓';
  };

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <LoadingSpinner size="lg" />
        <p style={{ color: 'var(--text-muted)', marginTop: '16px' }}>
          {t('app.loadingCommunityData', 'Loading community data...')}
        </p>
      </div>
    );
  }

  if (clusters.length === 0) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-secondary)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <EmptyState
          icon={<i className="fas fa-users" style={{ fontSize: '48px' }}></i>}
          title={t('community.noData', 'No Community Data')}
          description={t('community.noDataDesc', 'Community vibe data will appear here as reports are submitted in your area.')}
        />
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      overflow: 'auto',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '50px',
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
          marginBottom: '16px'
        }}>
          <i className="fas fa-location-dot" style={{ fontSize: '20px' }}></i>
          <span style={{ fontSize: '18px', fontWeight: '600' }}>
            {t('community.title', 'Your Location')}
          </span>
        </div>

        <p style={{
          color: '#64748b',
          fontSize: '16px',
          fontWeight: '500',
          margin: '0'
        }}>
          {t('community.subtitle', 'See how your current area feels')}
        </p>
      </div>

      {/* Current Location Indicator */}
      {userLocation && currentLocationAddress ? (
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          position: 'relative',
          overflow: 'hidden',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          {/* Subtle gradient background */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)'
          }}></div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
            }}>
              <i className="fas fa-location-dot" style={{ fontSize: '32px' }}></i>
            </div>

            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{
                color: '#1f2937',
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '8px',
                lineHeight: '1.3'
              }}>
                {currentLocationAddress}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '16px',
                color: '#6b7280',
                marginBottom: '24px'
              }}>
                <i className="fas fa-map-pin" style={{ color: '#3b82f6' }}></i>
                <span>{t('community.yourArea', 'Your Current Area')}</span>
              </div>
            </div>

            {/* Current Location Vibe */}
            {currentLocationVibe ? (
              <div style={{
                padding: '24px',
                background: `linear-gradient(135deg, ${getVibeColor(currentLocationVibe.type)}12 0%, ${getVibeColor(currentLocationVibe.type)}06 100%)`,
                border: `2px solid ${getVibeColor(currentLocationVibe.type)}30`,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                width: '100%',
                boxShadow: `0 4px 16px ${getVibeColor(currentLocationVibe.type)}20`
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, ${getVibeColor(currentLocationVibe.type)} 0%, ${getVibeColor(currentLocationVibe.type)}cc 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  boxShadow: `0 6px 20px ${getVibeColor(currentLocationVibe.type)}50`
                }}>
                  {getVibeIcon(currentLocationVibe.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <MultiSegmentCircularProgress
                      segments={currentLocationVibeDistribution.map(vibe => ({
                        percentage: vibe.percentage,
                        color: vibe.color,
                        label: vibe.type
                      }))}
                      size={80}
                      strokeWidth={6}
                      backgroundColor="#e5e7eb"
                      centerContent={
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '900',
                          color: getVibeColor(currentLocationVibe.type),
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                        }}>
                          {currentLocationVibe.percentage}%
                        </div>
                      }
                      animationDuration={2000}
                    />
                    <div style={{
                      color: getVibeColor(currentLocationVibe.type),
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      {t(`vibes.${currentLocationVibe.type}`, currentLocationVibe.type)}
                    </div>
                  </div>
                  <div style={{
                    color: '#9ca3af',
                    fontSize: '14px',
                    marginTop: '8px'
                  }}>
                    Based on {currentLocationVibe.count} nearby report{currentLocationVibe.count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '24px',
                background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                border: '2px solid #e5e7eb',
                borderRadius: '16px',
                textAlign: 'center',
                width: '100%'
              }}>
                <i className="fas fa-chart-bar" style={{ fontSize: '24px', color: '#9ca3af', marginBottom: '8px' }}></i>
                <div style={{
                  color: '#6b7280',
                  fontSize: '16px',
                  fontWeight: '500'
                }}>
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
          maxWidth: '500px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <i className="fas fa-location-slash" style={{ fontSize: '48px', color: '#d1d5db', marginBottom: '16px' }}></i>
          <div style={{
            color: '#6b7280',
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            Location Not Available
          </div>
          <div style={{
            color: '#9ca3af',
            fontSize: '14px'
          }}>
            Please enable location services to see your area's community vibe
          </div>
        </div>
      )}

      {/* Community Insights Section */}
      {userLocation && currentLocationAddress && (
        <div style={{ marginTop: '32px' }}>
          <CommunityInsights
            reports={vibes}
            isLoading={isLoading}
            userLocation={userLocation}
            onNewReport={onNewReport}
          />
        </div>
      )}
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
