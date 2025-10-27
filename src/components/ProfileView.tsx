import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { reportsService } from '../services/reports';
import { LoadingSpinner, EmptyState } from './shared';
import type { User } from '../types';
import { INTEREST_CATEGORIES } from '../types';

interface UserStats {
  totalReports: number;
  totalUpvotes: number;
  reputation: number;
  rank: number | null;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
}

interface RecentActivity {
  id: number;
  vibe_type: string;
  location: string;
  notes: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
}

interface Report {
  id: number;
  vibe_type: string;
  location?: string;
  notes?: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  user_vote?: 'upvote' | 'downvote' | null;
  user_id?: string;
}

const ProfileView: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalReports: 0,
    totalUpvotes: 0,
    reputation: 0,
    rank: null
  });
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [nearbyReports, setNearbyReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    interests: [] as string[]
  });

  useEffect(() => {
    if (user) {
      loadProfileData();
      loadReportsData();

      // Set up real-time subscriptions for automatic updates
      const reportsSubscription = reportsService.subscribeToReports((newReport) => {
        // Refresh profile data when new reports are created
        loadProfileData();
        loadReportsData();
      });

      const votesSubscription = reportsService.subscribeToVotes((update) => {
        // Refresh data when votes change (affects user stats)
        loadProfileData();
        loadReportsData();
      });

      // Cleanup subscriptions on unmount
      return () => {
        reportsSubscription.unsubscribe();
        votesSubscription.unsubscribe();
      };
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load all profile data in parallel
      const [statsData, badgesData, activityData] = await Promise.all([
        loadUserStats(),
        loadUserBadges(),
        loadRecentActivity()
      ]);

      setStats(statsData);
      setBadges(badgesData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (): Promise<UserStats> => {
    try {
      // Get user's reports for stats
      const reports = await reportsService.getReports({ userId: user!.id });

      const totalReports = reports.length;
      const totalUpvotes = reports.reduce((sum: number, r) => sum + (r.upvotes || 0), 0);
      const reputation = await calculateUserReputation(user!.id);
      const rank = await calculateUserRank(user!.id);

      return { totalReports, totalUpvotes, reputation, rank };
    } catch (error) {
      console.error("Error calculating user stats:", error);
      return { totalReports: 0, totalUpvotes: 0, reputation: 0, rank: null };
    }
  };

  const calculateUserReputation = async (userId: string): Promise<number> => {
    try {
      const reports = await reportsService.getReports({ userId });

      let reputation = 0;
      reports.forEach((report) => {
        const netVotes = (report.upvotes || 0) - (report.downvotes || 0);
        reputation += Math.max(0, netVotes);
      });

      // Add base reputation for active users
      reputation += Math.min(10, reports.length);

      return Math.max(0, reputation);
    } catch (error) {
      console.error("Error calculating user reputation:", error);
      return 0;
    }
  };

  const calculateUserRank = async (userId: string): Promise<number | null> => {
    try {
      const { data: allUsers, error } = await authService.getAllUsersByReputation();

      if (error) {
        console.error("Error calculating user rank:", error);
        return null;
      }

      const userIndex = allUsers.findIndex((u: any) => u.user_id === userId);
      return userIndex !== -1 ? userIndex + 1 : null;
    } catch (error) {
      console.error("Error calculating user rank:", error);
      return null;
    }
  };

  const loadUserBadges = async (): Promise<Badge[]> => {
    const userBadges: Badge[] = [];
    const reputation = await calculateUserReputation(user!.id);

    // Reputation-based badges
    if (reputation >= 100) {
      userBadges.push({
        id: 'community-leader',
        name: t('profile.badges.communityLeader.name'),
        description: t('profile.badges.communityLeader.description'),
        icon: 'fas fa-crown',
        color: 'linear-gradient(135deg, #FFD700, #FFA500)',
        earned: true
      });
    } else if (reputation >= 50) {
      userBadges.push({
        id: 'trusted-reporter',
        name: t('profile.badges.trustedReporter.name'),
        description: t('profile.badges.trustedReporter.description'),
        icon: 'fas fa-shield-alt',
        color: 'linear-gradient(135deg, #4CAF50, #45A049)',
        earned: true
      });
    } else if (reputation >= 10) {
      userBadges.push({
        id: 'active-contributor',
        name: t('profile.badges.activeContributor.name'),
        description: t('profile.badges.activeContributor.description'),
        icon: 'fas fa-star',
        color: 'linear-gradient(135deg, #2196F3, #1976D2)',
        earned: true
      });
    }

    // Activity-based badges
    try {
      const reports = await reportsService.getReports({ userId: user!.id });
      const reportCount = reports.length;

      if (reportCount >= 50) {
        userBadges.push({
          id: 'safety-guardian',
          name: t('profile.badges.safetyGuardian.name'),
          description: t('profile.badges.safetyGuardian.description'),
          icon: 'fas fa-user-shield',
          color: 'linear-gradient(135deg, #9C27B0, #7B1FA2)',
          earned: true
        });
      } else if (reportCount >= 20) {
        userBadges.push({
          id: 'community-watch',
          name: t('profile.badges.communityWatch.name'),
          description: t('profile.badges.communityWatch.description'),
          icon: 'fas fa-eye',
          color: 'linear-gradient(135deg, #FF5722, #D84315)',
          earned: true
        });
      } else if (reportCount >= 5) {
        userBadges.push({
          id: 'first-responder',
          name: t('profile.badges.firstResponder.name'),
          description: t('profile.badges.firstResponder.description'),
          icon: 'fas fa-plus-circle',
          color: 'linear-gradient(135deg, #009688, #00796B)',
          earned: true
        });
      }
    } catch (error) {
      console.error("Error checking user badges:", error);
    }

    return userBadges;
  };

  const loadRecentActivity = async (): Promise<RecentActivity[]> => {
    try {
      const reports = await reportsService.getReports({
        userId: user!.id,
        limit: 5
      });

      return reports.map(report => ({
        id: report.id,
        vibe_type: report.vibe_type,
        location: report.location || '',
        notes: report.notes || '',
        created_at: report.created_at,
        upvotes: report.upvotes,
        downvotes: report.downvotes
      }));
    } catch (error) {
      console.error("Error loading user recent activity:", error);
      return [];
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return t('profile.timeAgo.justNow');
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return t('profile.timeAgo.minutesAgo', { count: diffInMinutes });
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return t('profile.timeAgo.hoursAgo', { count: diffInHours, plural: diffInHours > 1 ? 's' : '' });
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return t('profile.timeAgo.daysAgo', { count: diffInDays, plural: diffInDays > 1 ? 's' : '' });
  };

  const getVibeIcon = (vibeType: string): string => {
    const icons: { [key: string]: string } = {
      crowded: 'fas fa-users',
      noisy: 'fas fa-volume-up',
      festive: 'fas fa-glass-cheers',
      calm: 'fas fa-peace',
      suspicious: 'fas fa-eye-slash',
      dangerous: 'fas fa-exclamation-triangle'
    };
    return icons[vibeType] || 'fas fa-question-circle';
  };

  const getVibeColor = (vibeType: string): string => {
    const colors: { [key: string]: string } = {
      crowded: '#FFA500',
      noisy: '#FF6B35',
      festive: '#28A745',
      calm: '#17A2B8',
      suspicious: '#FFC107',
      dangerous: '#DC3545'
    };
    return colors[vibeType] || '#6C757D';
  };

  const loadReportsData = async () => {
    if (!user) return;

    try {
      setReportsLoading(true);

      // Load user's reports and nearby reports in parallel
      const [myReportsData, nearbyReportsData] = await Promise.all([
        loadMyReports(),
        loadNearbyReports()
      ]);

      setMyReports(myReportsData);
      setNearbyReports(nearbyReportsData);
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const loadMyReports = async (): Promise<Report[]> => {
    try {
      const reports = await reportsService.getReports({ userId: user!.id });

      return reports.map(report => ({
        ...report,
        user_vote: null // User's own reports don't need vote tracking
      }));
    } catch (error) {
      console.error("Error loading user reports:", error);
      return [];
    }
  };

  const loadNearbyReports = async (): Promise<Report[]> => {
    try {
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
    }
  };

  const voteOnReport = async (reportId: number, voteType: 'upvote' | 'downvote') => {
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
  };

  const capitalizeFirstLetter = (string: string): string => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column'
      }}>
        <LoadingSpinner size="lg" />
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginTop: '16px' }}>{t('profile.loading')}</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      {/* Profile Header */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px var(--shadow-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          color: 'var(--text-muted)'
        }}>
          <i className="fas fa-user"></i>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              margin: 0
            }}>
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.username || 'User'
              }
            </h1>
            <button
              onClick={() => {
                setEditForm({
                  firstName: user?.first_name || '',
                  lastName: user?.last_name || '',
                  phone: user?.phone || '',
                  interests: user?.interests || []
                });
                setShowEditModal(true);
              }}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fas fa-edit"></i>
              {t('profile.editProfile')}
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <i className="fas fa-star" style={{ color: 'var(--warning)' }}></i>
            <span style={{
              fontSize: '18px',
              fontWeight: '600',
              color: stats.reputation > 50 ? 'var(--success)' : 'var(--text-primary)'
            }}>
              {stats.reputation} {t('profile.reputationPoints')}
            </span>
          </div>

          <p style={{
            color: 'var(--text-muted)',
            fontSize: '14px',
            margin: 0
          }}>
            {t('profile.memberSince')} {user?.created_at ? new Date(user.created_at).toLocaleDateString() : t('common.recently')}
          </p>
        </div>
      </div>

      {/* Personal Information Section */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px var(--shadow-color)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fas fa-id-card" style={{ color: 'var(--text-muted)' }}></i>
          {t('profile.personalInfo')}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}>
              <i className="fas fa-envelope"></i>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>{t('profile.email')}</div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>
                {user?.email || t('profile.notProvided')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}>
              <i className="fas fa-phone"></i>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>{t('profile.phone')}</div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>
                {user?.phone || t('profile.notProvided')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}>
              <i className="fas fa-map-marker-alt"></i>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>{t('profile.location')}</div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>
                {user?.location
                  ? (typeof user.location === 'string'
                      ? user.location
                      : (user.location.address || `${user.location.latitude.toFixed(4)}, ${user.location.longitude.toFixed(4)}`))
                  : t('profile.notProvided')
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Community Interests Section */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px var(--shadow-color)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fas fa-heart" style={{ color: 'var(--text-muted)' }}></i>
          {t('profile.communityInterests')}
        </h2>

        {user?.interests && user.interests.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {user.interests.map((interest, index) => (
              <span key={`${interest}-${index}`} style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--accent-primary)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <i className="fas fa-tag"></i>
                {interest}
              </span>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)'
          }}>
            <i className="fas fa-heart" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <p>{t('profile.noInterests')}</p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px var(--shadow-color)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: 'var(--accent-primary)',
            marginBottom: '8px'
          }}>
            {stats.totalReports}
          </div>
          <div style={{
            color: 'var(--text-muted)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {t('profile.totalReports')}
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px var(--shadow-color)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: 'var(--success)',
            marginBottom: '8px'
          }}>
            {stats.totalUpvotes}
          </div>
          <div style={{
            color: 'var(--text-muted)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {t('profile.communityUpvotes')}
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px var(--shadow-color)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: 'var(--warning)',
            marginBottom: '8px'
          }}>
            #{stats.rank || '-'}
          </div>
          <div style={{
            color: 'var(--text-muted)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {t('profile.communityRank')}
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px var(--shadow-color)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '16px'
        }}>
          {t('profile.achievementBadges')}
        </h2>

        {badges.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)'
          }}>
            <i className="fas fa-medal" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <p>{t('profile.noBadges')}</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {badges.map(badge => (
              <div key={badge.id} style={{
                border: '2px solid var(--border-color)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                background: badge.color,
                color: 'white'
              }}>
                <div style={{
                  fontSize: '32px',
                  marginBottom: '8px',
                  opacity: 0.9
                }}>
                  <i className={badge.icon}></i>
                </div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  {badge.name}
                </h3>
                <p style={{
                  fontSize: '12px',
                  opacity: 0.9,
                  margin: 0
                }}>
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Reports Section */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px var(--shadow-color)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'var(--text-primary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-list" style={{ color: 'var(--text-muted)' }}></i>
            {t('profile.myReports')} ({myReports.length})
          </h2>
          <button
            style={{
              backgroundColor: 'var(--success)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fas fa-plus"></i>
            {t('profile.newReport')}
          </button>
        </div>

        {myReports.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)'
          }}>
            <i className="fas fa-plus-circle" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <p>{t('profile.noReports')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myReports.slice(0, 3).map(report => (
              <div key={report.id} style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: getVibeColor(report.vibe_type),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px'
                }}>
                  <i className={getVibeIcon(report.vibe_type)}></i>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '2px'
                  }}>
                    {t(`vibes.${report.vibe_type}`)} {t('profile.report')}
                  </div>
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    marginBottom: '4px'
                  }}>
                    {report.location || t('profile.unknownLocation')}
                  </div>
                  {report.notes && (
                    <div style={{
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      marginBottom: '4px'
                    }}>
                      {report.notes}
                    </div>
                  )}
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: '12px'
                  }}>
                    {formatTimeAgo(report.created_at)} • 👍 {report.upvotes || 0} 👎 {report.downvotes || 0}
                  </div>
                </div>
              </div>
            ))}
            {myReports.length > 3 && (
              <button style={{
                alignSelf: 'center',
                backgroundColor: 'transparent',
                color: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                marginTop: '8px'
              }}>
                {t('profile.viewAllReports')} ({myReports.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Community Activity Section */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px var(--shadow-color)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fas fa-users" style={{ color: 'var(--text-muted)' }}></i>
          {t('profile.communityActivity')}
        </h2>

        {reportsLoading ? (
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
            color: 'var(--text-muted)'
          }}>
            <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <p>{t('profile.noNearbyReports')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {nearbyReports.slice(0, 5).map(report => (
              <div key={report.id} style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: getVibeColor(report.vibe_type),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px'
                }}>
                  <i className={getVibeIcon(report.vibe_type)}></i>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '2px'
                  }}>
                    {t(`vibes.${report.vibe_type}`)} {t('profile.report')}
                  </div>
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    marginBottom: '4px'
                  }}>
                    {report.location || t('profile.unknownLocation')}
                  </div>
                  {report.notes && (
                    <div style={{
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      marginBottom: '4px'
                    }}>
                      {report.notes}
                    </div>
                  )}
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: '12px'
                  }}>
                    {formatTimeAgo(report.created_at)}
                  </div>
                </div>

                {/* Vote Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    onClick={() => voteOnReport(report.id, 'upvote')}
                    style={{
                      backgroundColor: report.user_vote === 'upvote' ? 'var(--success)' : 'transparent',
                      color: report.user_vote === 'upvote' ? 'white' : 'var(--text-muted)',
                      border: `1px solid ${report.user_vote === 'upvote' ? 'var(--success)' : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <i className="fas fa-thumbs-up"></i>
                    {report.upvotes || 0}
                  </button>
                  <button
                    onClick={() => voteOnReport(report.id, 'downvote')}
                    style={{
                      backgroundColor: report.user_vote === 'downvote' ? 'var(--danger)' : 'transparent',
                      color: report.user_vote === 'downvote' ? 'white' : 'var(--text-muted)',
                      border: `1px solid ${report.user_vote === 'downvote' ? 'var(--danger)' : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <i className="fas fa-thumbs-down"></i>
                    {report.downvotes || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px var(--shadow-color)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '16px'
        }}>
          {t('profile.recentActivity')}
        </h2>

        {recentActivity.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)'
          }}>
            <i className="fas fa-plus-circle" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
            <p>{t('profile.noRecentActivity')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivity.map(activity => (
              <div key={activity.id} style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: getVibeColor(activity.vibe_type),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px'
                }}>
                  <i className={getVibeIcon(activity.vibe_type)}></i>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '2px'
                  }}>
                    {t(`vibes.${activity.vibe_type}`)} {t('profile.report')}
                  </div>
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    marginBottom: '4px'
                  }}>
                    {activity.location || t('profile.unknownLocation')}
                  </div>
                  {activity.notes && (
                    <div style={{
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      marginBottom: '4px'
                    }}>
                      {activity.notes}
                    </div>
                  )}
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: '12px'
                  }}>
                    {formatTimeAgo(activity.created_at)} • 👍 {activity.upvotes || 0} 👎 {activity.downvotes || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                margin: 0
              }}>
                {t('profile.editProfile')}
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Name Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '6px'
                  }}>
                    {t('profile.firstName')}
                  </label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder={t('profile.firstNamePlaceholder')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--text-secondary)',
                    marginBottom: '6px'
                  }}>
                    {t('profile.lastName')}
                  </label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder={t('profile.lastNamePlaceholder')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)',
                  marginBottom: '6px'
                }}>
                  {t('profile.phone')}
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder={t('profile.phonePlaceholder')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Interests Section */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)',
                  marginBottom: '12px'
                }}>
                  {t('profile.communityInterests')}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '8px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  {Object.entries(INTEREST_CATEGORIES).map(([categoryKey, category]) => (
                    <div key={categoryKey}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-muted)',
                        marginBottom: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {category.icon} {category.label}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {category.items.slice(0, 3).map((interest, index) => {
                          const isSelected = editForm.interests.includes(interest);
                          return (
                            <button
                              key={`${categoryKey}-${interest}-${index}`}
                              onClick={() => {
                                setEditForm(prev => ({
                                  ...prev,
                                  interests: isSelected
                                    ? prev.interests.filter(i => i !== interest)
                                    : [...prev.interests, interest]
                                }));
                              }}
                              style={{
                                padding: '6px 8px',
                                border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                borderRadius: '6px',
                                backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                                color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                fontSize: '12px',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              {interest}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '24px'
              }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={async () => {
                    try {
                      await updateProfile({
                        first_name: editForm.firstName,
                        last_name: editForm.lastName,
                        phone: editForm.phone,
                        interests: editForm.interests
                      });
                      setShowEditModal(false);
                      // Reload profile data to reflect changes
                      loadProfileData();
                    } catch (error) {
                      console.error('Error updating profile:', error);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {t('profile.saveChanges')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
