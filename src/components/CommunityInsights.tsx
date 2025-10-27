import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner, Modal } from './shared';
import { calculateDistance } from '../lib/clustering';
import type { Report } from '../types';

interface CommunityInsightsProps {
  reports: Report[];
  isLoading?: boolean;
  userLocation?: [number, number] | null;
  onNewReport?: () => void;
}

const CommunityInsights: React.FC<CommunityInsightsProps> = ({
  reports,
  isLoading = false,
  userLocation,
  onNewReport
}) => {
  const { t } = useTranslation();
  const [showAllChallengesModal, setShowAllChallengesModal] = useState(false);

  // Filter reports to nearby area (within 2km)
  const nearbyReports = useMemo(() => {
    if (!userLocation) return reports;

    return reports.filter(report => {
      if (!report.latitude || !report.longitude) return false;
      const distance = calculateDistance(
        userLocation[0], userLocation[1],
        report.latitude, report.longitude
      );
      return distance <= 2; // 2km radius
    });
  }, [reports, userLocation]);

  // Get recent activity (last 24 hours)
  const recentActivity = useMemo(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return nearbyReports.filter(report => new Date(report.created_at) > oneDayAgo);
  }, [nearbyReports]);

  // Calculate safety overview from real data
  const safetyOverview = useMemo(() => {
    const safetyVibes = ['safe', 'calm', 'quiet'];
    const dangerVibes = ['dangerous', 'suspicious'];

    const safeCount = nearbyReports.filter(r => safetyVibes.includes(r.vibe_type)).length;
    const dangerCount = nearbyReports.filter(r => dangerVibes.includes(r.vibe_type)).length;
    const total = nearbyReports.length;

    const safetyScore = total > 0 ? Math.round((safeCount / total) * 100) : 50;

    return {
      score: safetyScore,
      safeReports: safeCount,
      dangerReports: dangerCount,
      totalReports: total,
      level: safetyScore >= 70 ? 'safe' : safetyScore >= 40 ? 'moderate' : 'caution'
    };
  }, [nearbyReports]);

  // Get community highlights (emergency reports and notable activity)
  const communityHighlights = useMemo(() => {
    const emergencies = nearbyReports.filter(r => r.emergency);
    const notableReports = nearbyReports.filter(r =>
      r.notes && r.notes.length > 10 // Reports with substantial notes
    ).slice(0, 3);

    return {
      emergencies: emergencies.slice(0, 2),
      notable: notableReports
    };
  }, [nearbyReports]);

  // Calculate activity pulse
  const activityPulse = useMemo(() => {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentHour = nearbyReports.filter(r => new Date(r.created_at) > hourAgo).length;

    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentDay = nearbyReports.filter(r => new Date(r.created_at) > dayAgo).length;

    const avgHourly = recentDay / 24;

    return {
      lastHour: recentHour,
      dailyAverage: Math.round(avgHourly),
      status: recentHour > avgHourly * 1.5 ? 'high' : recentHour > avgHourly * 0.5 ? 'normal' : 'low'
    };
  }, [nearbyReports]);

  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      background: 'transparent',
      padding: '0'
    }}>
      {/* Compact Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <i className="fas fa-users" style={{ fontSize: '14px' }}></i>
          </div>
          <div>
            <h2 style={{
              color: '#1f2937',
              fontSize: '20px',
              fontWeight: '700',
              margin: '0',
              lineHeight: '1.2'
            }}>
              Community Hub
            </h2>
            <p style={{
              color: '#6b7280',
              fontSize: '14px',
              margin: '4px 0 0 0'
            }}>
              {nearbyReports.length} reports in your area
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px'
      }}>

        {/* Live Activity Feed */}
        <InteractiveCard
          title="Live Activity"
          icon="fas fa-rss"
          color="#3b82f6"
          onClick={() => {}}
        >
          <ActivityFeed reports={recentActivity.slice(0, 3)} />
        </InteractiveCard>

        {/* Safety Overview */}
        <InteractiveCard
          title="Safety Check"
          icon="fas fa-shield-alt"
          color="#10b981"
          onClick={() => {}}
        >
          <SafetyOverview data={safetyOverview} />
        </InteractiveCard>

        {/* Community Highlights */}
        <InteractiveCard
          title="Highlights"
          icon="fas fa-star"
          color="#f59e0b"
          onClick={() => {}}
        >
          <CommunityHighlights data={communityHighlights} />
        </InteractiveCard>

        {/* Activity Pulse */}
        <InteractiveCard
          title="Activity Pulse"
          icon="fas fa-heartbeat"
          color="#ef4444"
          onClick={() => {}}
        >
          <ActivityPulse data={activityPulse} />
        </InteractiveCard>

        {/* Community Stats */}
        <InteractiveCard
          title="Community Stats"
          icon="fas fa-chart-bar"
          color="#8b5cf6"
          onClick={() => {}}
        >
          <CommunityStats reports={nearbyReports} />
        </InteractiveCard>

        {/* Quick Actions */}
        <InteractiveCard
          title="Quick Actions"
          icon="fas fa-bolt"
          color="#06b6d4"
          onClick={() => {}}
        >
          <QuickActions onNewReport={onNewReport} />
        </InteractiveCard>

        {/* Community Challenges */}
        <InteractiveCard
          title="Community Challenges"
          icon="fas fa-trophy"
          color="#f59e0b"
          onClick={() => {}}
        >
          <CommunityChallenges
            reports={nearbyReports}
            userLocation={userLocation}
            onShowAllChallenges={() => setShowAllChallengesModal(true)}
          />
        </InteractiveCard>

        {/* Personal Achievements */}
        <InteractiveCard
          title="Achievements"
          icon="fas fa-medal"
          color="#8b5cf6"
          onClick={() => {}}
        >
          <PersonalAchievements reports={nearbyReports} />
        </InteractiveCard>

      </div>

      {/* Empty State */}
      {nearbyReports.length === 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
          border: '1px solid #f3f4f6',
          marginTop: '20px'
        }}>
          <i className="fas fa-map-marker-alt" style={{ fontSize: '32px', color: '#d1d5db', marginBottom: '12px' }}></i>
          <div style={{
            color: '#6b7280',
            fontSize: '16px',
            fontWeight: '500',
            marginBottom: '4px'
          }}>
            No Nearby Activity
          </div>
          <div style={{
            color: '#9ca3af',
            fontSize: '14px'
          }}>
            Community activity will appear here as people report in your area.
          </div>
        </div>
      )}

      {/* All Challenges Modal */}
      <Modal
        isOpen={showAllChallengesModal}
        onClose={() => setShowAllChallengesModal(false)}
        title="All Community Challenges"
        size="xl"
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          maxHeight: '70vh',
          overflowY: 'auto',
          padding: '8px'
        }}>
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());

            const todayReports = nearbyReports.filter(r => new Date(r.created_at) >= today);
            const weekReports = nearbyReports.filter(r => new Date(r.created_at) >= weekStart);

            const challenges = [
              {
                id: 'daily_reports',
                title: 'Daily Reporter',
                description: 'Make 3 reports today to help map your community',
                detailedDescription: 'Report safety concerns, positive vibes, or emergency situations in your area. Each report helps build a better community map.',
                progress: Math.min(todayReports.length, 3),
                total: 3,
                reward: '25 points + Daily Streak',
                type: 'daily',
                icon: '📝',
                difficulty: 'Easy',
                timeLeft: '23h 45m'
              },
              {
                id: 'weekly_emergencies',
                title: 'Emergency Helper',
                description: 'Help verify 2 emergency reports this week',
                detailedDescription: 'Emergency reports need community verification to ensure they reach the right people quickly. Your help makes a real difference.',
                progress: Math.min(weekReports.filter(r => r.emergency).length, 2),
                total: 2,
                reward: '50 points + Helper Badge',
                type: 'weekly',
                icon: '🚨',
                difficulty: 'Medium',
                timeLeft: '5 days'
              },
              {
                id: 'community_goal',
                title: 'Community Builder',
                description: 'Help reach 25 reports this week as a team',
                detailedDescription: 'Work together with your community to create comprehensive safety coverage. Every report counts toward our shared goal!',
                progress: Math.min(weekReports.length, 25),
                total: 25,
                reward: 'Community Hero Badge + 100 points',
                type: 'community',
                icon: '👥',
                difficulty: 'Hard',
                timeLeft: '5 days'
              },
              {
                id: 'first_emergency',
                title: 'First Responder',
                description: 'Report your first emergency situation',
                detailedDescription: 'Emergencies happen when we least expect them. Being prepared to report them quickly can save lives.',
                progress: nearbyReports.filter(r => r.emergency).length >= 1 ? 1 : 0,
                total: 1,
                reward: 'First Responder Badge',
                type: 'achievement',
                icon: '🚑',
                difficulty: 'Easy',
                timeLeft: 'Ongoing'
              },
              {
                id: 'explorer',
                title: 'Neighborhood Explorer',
                description: 'Report in 3 different areas this week',
                detailedDescription: 'Help us map safety across different neighborhoods. Your exploration helps create a complete community picture.',
                progress: Math.min(new Set(weekReports.map(r => `${Math.round(r.latitude * 10)}_${Math.round(r.longitude * 10)}`)).size, 3),
                total: 3,
                reward: 'Explorer Badge + 30 points',
                type: 'exploration',
                icon: '🗺️',
                difficulty: 'Medium',
                timeLeft: '5 days'
              }
            ];

            return challenges.map((challenge) => {
              const getStatusColor = (status: string) => {
                switch (status) {
                  case 'completed': return '#10b981';
                  case 'accepted': return '#3b82f6';
                  case 'available': return '#f59e0b';
                  default: return '#6b7280';
                }
              };

              const status = challenge.progress >= challenge.total ? 'completed' : 'available';
              const isCompleted = status === 'completed';

              return (
                <div
                  key={challenge.id}
                  style={{
                    padding: '20px',
                    background: isCompleted
                      ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                      : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    borderRadius: '12px',
                    border: `2px solid ${getStatusColor(status)}`,
                    position: 'relative',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Status indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: getStatusColor(status),
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}></div>

                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <span style={{ fontSize: '24px' }}>{challenge.icon}</span>
                    <div style={{
                      color: '#92400e',
                      fontSize: '18px',
                      fontWeight: '700',
                      flex: 1,
                      lineHeight: '1.2'
                    }}>
                      {challenge.title}
                    </div>
                    <span style={{
                      color: '#6b7280',
                      fontSize: '11px',
                      background: '#f3f4f6',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>
                      {challenge.difficulty}
                    </span>
                  </div>

                  {/* Description */}
                  <div style={{
                    color: '#78350f',
                    fontSize: '14px',
                    marginBottom: '16px',
                    lineHeight: '1.5'
                  }}>
                    {challenge.description}
                  </div>

                  {/* Progress */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      flex: 1,
                      height: '8px',
                      background: '#e5e7eb',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(challenge.progress / challenge.total) * 100}%`,
                        background: getStatusColor(status),
                        borderRadius: '4px',
                        transition: 'width 0.8s ease'
                      }}></div>
                    </div>
                    <span style={{
                      color: '#92400e',
                      fontSize: '14px',
                      fontWeight: '700',
                      minWidth: '45px',
                      textAlign: 'right'
                    }}>
                      {challenge.progress}/{challenge.total}
                    </span>
                  </div>

                  {/* Reward */}
                  <div style={{
                    color: '#92400e',
                    fontSize: '13px',
                    marginBottom: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    🎁 {challenge.reward}
                  </div>

                  {/* Time left */}
                  <div style={{
                    color: '#6b7280',
                    fontSize: '12px',
                    marginBottom: '16px',
                    fontWeight: '500'
                  }}>
                    ⏰ {challenge.timeLeft} left
                  </div>

                  {/* Status */}
                  <div style={{
                    textAlign: 'center',
                    padding: '10px',
                    color: getStatusColor(status),
                    fontSize: '13px',
                    fontWeight: '700',
                    background: status === 'completed' ? '#f0fdf4' : '#fef3c7',
                    borderRadius: '8px',
                    border: `1px solid ${getStatusColor(status)}`
                  }}>
                    {status === 'completed' ? '✅ Completed' : '🔄 In Progress'}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </Modal>
    </div>
  );
};

// Interactive card component
interface InteractiveCardProps {
  title: string;
  icon: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}

const InteractiveCard: React.FC<InteractiveCardProps> = ({ title, icon, color, onClick, children }) => (
  <div
    onClick={onClick}
    style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
      border: '1px solid #f3f4f6',
      minHeight: '240px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.05)';
    }}
  >
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '16px'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <i className={icon} style={{ fontSize: '14px' }}></i>
      </div>
      <h3 style={{
        color: '#1f2937',
        fontSize: '16px',
        fontWeight: '600',
        margin: 0
      }}>
        {title}
      </h3>
    </div>
    {children}
  </div>
);

// Activity Feed Component
const ActivityFeed: React.FC<{ reports: Report[] }> = ({ reports }) => {
  if (reports.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <i className="fas fa-rss" style={{ fontSize: '24px', color: '#d1d5db', marginBottom: '8px' }}></i>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>No recent activity</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {reports.map((report, index) => (
        <div key={report.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: report.emergency ? '#ef4444' : '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px'
          }}>
            {report.emergency ? '🚨' : '📍'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: '#1f2937',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '2px'
            }}>
              {report.vibe_type} {report.emergency ? 'Emergency' : 'Report'}
            </div>
            <div style={{
              color: '#6b7280',
              fontSize: '12px'
            }}>
              {new Date(report.created_at).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Safety Overview Component
const SafetyOverview: React.FC<{ data: any }> = ({ data }) => {
  const getSafetyColor = (level: string) => {
    switch (level) {
      case 'safe': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'caution': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: `conic-gradient(${getSafetyColor(data.level)} ${data.score}%, #e5e7eb 0%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        position: 'relative'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{
            color: getSafetyColor(data.level),
            fontSize: '18px',
            fontWeight: '700'
          }}>
            {data.score}%
          </span>
        </div>
      </div>
      <div style={{
        color: '#1f2937',
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '4px',
        textTransform: 'capitalize'
      }}>
        {data.level} Area
      </div>
      <div style={{
        color: '#6b7280',
        fontSize: '12px'
      }}>
        Based on {data.totalReports} reports
      </div>
    </div>
  );
};

// Community Highlights Component
const CommunityHighlights: React.FC<{ data: any }> = ({ data }) => {
  const highlights = [...data.emergencies, ...data.notable];

  if (highlights.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <i className="fas fa-star" style={{ fontSize: '24px', color: '#d1d5db', marginBottom: '8px' }}></i>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>No highlights yet</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {highlights.slice(0, 2).map((report: Report, index: number) => (
        <div key={report.id} style={{
          padding: '10px',
          background: report.emergency ? '#fef2f2' : '#f0f9ff',
          borderRadius: '6px',
          border: `1px solid ${report.emergency ? '#fecaca' : '#bae6fd'}`
        }}>
          <div style={{
            color: report.emergency ? '#dc2626' : '#0369a1',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '2px'
          }}>
            {report.emergency ? '🚨 Emergency' : '📝 Notable Report'}
          </div>
          <div style={{
            color: '#374151',
            fontSize: '12px',
            lineHeight: '1.3'
          }}>
            {report.notes ? report.notes.substring(0, 40) + '...' : `${report.vibe_type} report`}
          </div>
        </div>
      ))}
    </div>
  );
};

// Activity Pulse Component
const ActivityPulse: React.FC<{ data: any }> = ({ data }) => {
  const getPulseColor = (status: string) => {
    switch (status) {
      case 'high': return '#ef4444';
      case 'normal': return '#10b981';
      case 'low': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: getPulseColor(data.status),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 12px',
        animation: data.status === 'high' ? 'pulse 2s infinite' : 'none'
      }}>
        <i className="fas fa-heartbeat" style={{ color: 'white', fontSize: '20px' }}></i>
      </div>
      <div style={{
        color: '#1f2937',
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '4px'
      }}>
        {data.lastHour} reports/hour
      </div>
      <div style={{
        color: '#6b7280',
        fontSize: '12px',
        textTransform: 'capitalize'
      }}>
        {data.status} activity
      </div>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}
      </style>
    </div>
  );
};

// Community Stats Component
const CommunityStats: React.FC<{ reports: Report[] }> = ({ reports }) => {
  const stats = useMemo(() => {
    const total = reports.length;
    const emergencies = reports.filter(r => r.emergency).length;
    const uniqueUsers = new Set(reports.map(r => r.user_id)).size;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayReports = reports.filter(r => new Date(r.created_at) >= today).length;

    return { total, emergencies, uniqueUsers, todayReports };
  }, [reports]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#1f2937', fontSize: '18px', fontWeight: '700' }}>{stats.total}</div>
        <div style={{ color: '#6b7280', fontSize: '12px' }}>Total Reports</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#1f2937', fontSize: '18px', fontWeight: '700' }}>{stats.uniqueUsers}</div>
        <div style={{ color: '#6b7280', fontSize: '12px' }}>Contributors</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#1f2937', fontSize: '18px', fontWeight: '700' }}>{stats.emergencies}</div>
        <div style={{ color: '#6b7280', fontSize: '12px' }}>Emergencies</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#1f2937', fontSize: '18px', fontWeight: '700' }}>{stats.todayReports}</div>
        <div style={{ color: '#6b7280', fontSize: '12px' }}>Today</div>
      </div>
    </div>
  );
};

// Quick Actions Component
const QuickActions: React.FC<{ onNewReport?: () => void }> = ({ onNewReport }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNewReport?.();
        }}
        style={{
          width: '100%',
          padding: '12px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <i className="fas fa-plus" style={{ fontSize: '12px' }}></i>
        Report Vibe
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          window.open('tel:911', '_self');
        }}
        style={{
          width: '100%',
          padding: '12px',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <i className="fas fa-phone" style={{ fontSize: '12px' }}></i>
        Emergency Call
      </button>
    </div>
  );
};

// Community Challenges Component
const CommunityChallenges: React.FC<{
  reports: Report[],
  userLocation?: [number, number] | null,
  onShowAllChallenges: () => void
}> = ({ reports, userLocation, onShowAllChallenges }) => {
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
  const [acceptedChallenges, setAcceptedChallenges] = useState<Set<string>>(new Set());
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(new Set());

  const challenges = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const todayReports = reports.filter(r => new Date(r.created_at) >= today);
    const weekReports = reports.filter(r => new Date(r.created_at) >= weekStart);

    return [
      {
        id: 'daily_reports',
        title: 'Daily Reporter',
        description: 'Make 3 reports today to help map your community',
        detailedDescription: 'Report safety concerns, positive vibes, or emergency situations in your area. Each report helps build a better community map.',
        progress: Math.min(todayReports.length, 3),
        total: 3,
        reward: '25 points + Daily Streak',
        type: 'daily',
        icon: '📝',
        difficulty: 'Easy',
        timeLeft: '23h 45m'
      },
      {
        id: 'weekly_emergencies',
        title: 'Emergency Helper',
        description: 'Help verify 2 emergency reports this week',
        detailedDescription: 'Emergency reports need community verification to ensure they reach the right people quickly. Your help makes a real difference.',
        progress: Math.min(weekReports.filter(r => r.emergency).length, 2),
        total: 2,
        reward: '50 points + Helper Badge',
        type: 'weekly',
        icon: '🚨',
        difficulty: 'Medium',
        timeLeft: '5 days'
      },
      {
        id: 'community_goal',
        title: 'Community Builder',
        description: 'Help reach 25 reports this week as a team',
        detailedDescription: 'Work together with your community to create comprehensive safety coverage. Every report counts toward our shared goal!',
        progress: Math.min(weekReports.length, 25),
        total: 25,
        reward: 'Community Hero Badge + 100 points',
        type: 'community',
        icon: '👥',
        difficulty: 'Hard',
        timeLeft: '5 days'
      },
      {
        id: 'first_emergency',
        title: 'First Responder',
        description: 'Report your first emergency situation',
        detailedDescription: 'Emergencies happen when we least expect them. Being prepared to report them quickly can save lives.',
        progress: reports.filter(r => r.emergency).length >= 1 ? 1 : 0,
        total: 1,
        reward: 'First Responder Badge',
        type: 'achievement',
        icon: '🚑',
        difficulty: 'Easy',
        timeLeft: 'Ongoing'
      },
      {
        id: 'explorer',
        title: 'Neighborhood Explorer',
        description: 'Report in 3 different areas this week',
        detailedDescription: 'Help us map safety across different neighborhoods. Your exploration helps create a complete community picture.',
        progress: Math.min(new Set(weekReports.map(r => `${Math.round(r.latitude * 10)}_${Math.round(r.longitude * 10)}`)).size, 3),
        total: 3,
        reward: 'Explorer Badge + 30 points',
        type: 'exploration',
        icon: '🗺️',
        difficulty: 'Medium',
        timeLeft: '5 days'
      }
    ];
  }, [reports]);

  const activeChallenge = challenges.find(c => c.progress < c.total) || challenges[0];

  const handleChallengeClick = (challengeId: string) => {
    setExpandedChallenge(expandedChallenge === challengeId ? null : challengeId);
  };

  const handleAcceptChallenge = (challengeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcceptedChallenges(prev => new Set([...prev, challengeId]));
    // Could add notification or animation here
  };

  const handleCompleteChallenge = (challengeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedChallenges(prev => new Set([...prev, challengeId]));
    // Trigger celebration animation
    setTimeout(() => {
      // Could add confetti or success animation
    }, 500);
  };

  const getChallengeStatus = (challenge: any) => {
    if (completedChallenges.has(challenge.id)) return 'completed';
    if (acceptedChallenges.has(challenge.id)) return 'accepted';
    if (challenge.progress >= challenge.total) return 'completed';
    return 'available';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'accepted': return '#3b82f6';
      case 'available': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        onClick={() => handleChallengeClick(activeChallenge.id)}
        style={{
          padding: '12px',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '8px',
          border: '1px solid #f59e0b',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Status indicator */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getStatusColor(getChallengeStatus(activeChallenge))
        }}></div>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px'
        }}>
          <span style={{ fontSize: '16px' }}>{activeChallenge.icon}</span>
          <div style={{
            color: '#92400e',
            fontSize: '14px',
            fontWeight: '600',
            flex: 1
          }}>
            {activeChallenge.title}
          </div>
          <span style={{
            color: '#6b7280',
            fontSize: '10px',
            background: '#f3f4f6',
            padding: '2px 6px',
            borderRadius: '10px'
          }}>
            {activeChallenge.difficulty}
          </span>
        </div>

        {/* Description */}
        <div style={{
          color: '#78350f',
          fontSize: '12px',
          marginBottom: '8px',
          lineHeight: '1.4'
        }}>
          {expandedChallenge === activeChallenge.id ? activeChallenge.detailedDescription : activeChallenge.description}
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{
            flex: 1,
            height: '6px',
            background: '#e5e7eb',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${(activeChallenge.progress / activeChallenge.total) * 100}%`,
              background: getStatusColor(getChallengeStatus(activeChallenge)),
              borderRadius: '3px',
              transition: 'width 0.5s ease'
            }}></div>
          </div>
          <span style={{
            color: '#92400e',
            fontSize: '12px',
            fontWeight: '600',
            minWidth: '35px',
            textAlign: 'right'
          }}>
            {activeChallenge.progress}/{activeChallenge.total}
          </span>
        </div>

        {/* Reward */}
        <div style={{
          color: '#92400e',
          fontSize: '11px',
          marginBottom: '8px',
          fontWeight: '500'
        }}>
          🎁 {activeChallenge.reward}
        </div>

        {/* Time left */}
        <div style={{
          color: '#6b7280',
          fontSize: '10px',
          marginBottom: '8px'
        }}>
          ⏰ {activeChallenge.timeLeft} left
        </div>

        {/* Action buttons (when expanded) */}
        {expandedChallenge === activeChallenge.id && (
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #e5e7eb'
          }}>
            {getChallengeStatus(activeChallenge) === 'available' && (
              <button
                onClick={(e) => handleAcceptChallenge(activeChallenge.id, e)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Accept Challenge
              </button>
            )}
            {getChallengeStatus(activeChallenge) === 'accepted' && activeChallenge.progress >= activeChallenge.total && (
              <button
                onClick={(e) => handleCompleteChallenge(activeChallenge.id, e)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🎉 Complete!
              </button>
            )}
            {getChallengeStatus(activeChallenge) === 'accepted' && (
              <button
                onClick={(e) => setAcceptedChallenges(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(activeChallenge.id);
                  return newSet;
                })}
                style={{
                  padding: '8px 12px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Skip
              </button>
            )}
          </div>
        )}

        {/* Expand indicator */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          color: '#6b7280',
          fontSize: '10px'
        }}>
          {expandedChallenge === activeChallenge.id ? '↑' : '↓'}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#6b7280', fontSize: '12px' }}>
          {challenges.filter(c => c.progress >= c.total || completedChallenges.has(c.id)).length} completed
        </span>
        <button
          onClick={onShowAllChallenges}
          style={{
            color: '#f59e0b',
            fontSize: '12px',
            fontWeight: '600',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          View All →
        </button>
      </div>
    </div>
  );
};

// Personal Achievements Component
const PersonalAchievements: React.FC<{ reports: Report[] }> = ({ reports }) => {
  const achievements = useMemo(() => {
    const userReports = reports.length;
    const emergencies = reports.filter(r => r.emergency).length;
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekReports = reports.filter(r => new Date(r.created_at) >= weekAgo).length;

    return [
      {
        id: 'first_report',
        title: 'First Steps',
        description: 'Made your first report',
        icon: '🎯',
        unlocked: userReports >= 1,
        progress: Math.min(userReports, 1),
        total: 1
      },
      {
        id: 'safety_guardian',
        title: 'Safety Guardian',
        description: 'Helped 5 emergency situations',
        icon: '🛡️',
        unlocked: emergencies >= 5,
        progress: Math.min(emergencies, 5),
        total: 5
      },
      {
        id: 'community_hero',
        title: 'Community Hero',
        description: '10 reports in one week',
        icon: '⭐',
        unlocked: weekReports >= 10,
        progress: Math.min(weekReports, 10),
        total: 10
      },
      {
        id: 'consistent_reporter',
        title: 'Consistent Reporter',
        description: 'Report for 7 days straight',
        icon: '🔥',
        unlocked: false, // Would need streak tracking
        progress: 0,
        total: 7
      }
    ];
  }, [reports]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const nextAchievement = achievements.find(a => !a.unlocked);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Achievement Progress */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: `conic-gradient(#8b5cf6 ${unlockedCount * 25}%, #e5e7eb 0%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 8px'
        }}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{
              color: '#8b5cf6',
              fontSize: '16px',
              fontWeight: '700'
            }}>
              {unlockedCount}
            </span>
          </div>
        </div>
        <div style={{
          color: '#1f2937',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '2px'
        }}>
          {unlockedCount} Achievements
        </div>
        <div style={{
          color: '#6b7280',
          fontSize: '12px'
        }}>
          {achievements.length - unlockedCount} remaining
        </div>
      </div>

      {/* Next Achievement */}
      {nextAchievement && (
        <div style={{
          padding: '10px',
          background: '#f3f4f6',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            color: '#6b7280',
            fontSize: '11px',
            marginBottom: '4px'
          }}>
            Next: {nextAchievement.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              flex: 1,
              height: '4px',
              background: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${(nextAchievement.progress / nextAchievement.total) * 100}%`,
                background: '#8b5cf6',
                borderRadius: '2px'
              }}></div>
            </div>
            <span style={{
              color: '#6b7280',
              fontSize: '10px'
            }}>
              {nextAchievement.progress}/{nextAchievement.total}
            </span>
          </div>
        </div>
      )}

      {/* Recent Badges */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {achievements.filter(a => a.unlocked).slice(0, 3).map((achievement) => (
          <div key={achievement.id} style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            {achievement.icon}
          </div>
        ))}
      </div>
    </div>
  );
};



export default CommunityInsights;
