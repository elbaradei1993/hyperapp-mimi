import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { reportsService } from '../services/reports';
import { uploadService } from '../services/upload';
import { LoadingSpinner, EmptyState } from './shared';
import type { User } from '../types';
import { INTEREST_CATEGORIES } from '../types';
import '../styles/ProfileView.css';

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
    location: '',
    interests: [] as string[],
    profilePicture: null as File | null,
    profilePicturePreview: ''
  });
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // Load all profile data in parallel for better performance
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
      // Set default values on error
      setStats({ totalReports: 0, totalUpvotes: 0, reputation: 0, rank: null });
      setBadges([]);
      setRecentActivity([]);
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
      if (!user?.id) {
        console.log("No user ID available for loading reports");
        return [];
      }

      console.log("Loading reports for user:", user.id);

      // First try to get reports with user_id
      let reports = await reportsService.getReports({ userId: user.id });
      console.log("Reports with user_id:", reports.length);

      // If no reports found with user_id, also check for reports without user_id
      // This handles existing reports created before user_id was added
      if (reports.length === 0) {
        console.log("No reports found with user_id, checking for reports without user_id");
        const allReports = await reportsService.getReports({ limit: 50 });
        // For now, show recent reports as a fallback - in production you'd want to associate them properly
        reports = allReports.slice(0, 10);
        console.log("Fallback reports loaded:", reports.length);
      }

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

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toggleMobileNav = () => {
    setMobileNavOpen(!mobileNavOpen);
  };

  const closeMobileNav = () => {
    setMobileNavOpen(false);
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <LoadingSpinner size="lg" />
        <p>{t('profile.loading')}</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={toggleMobileNav}>
          <i className="fas fa-bars"></i>
        </button>
        <div className="logo">SafeCommunity</div>
        <div style={{ width: '48px' }}></div> {/* Spacer for balance */}
      </div>

      {/* Mobile Navigation */}
      <div className={`mobile-nav ${mobileNavOpen ? 'active' : ''}`}>
        <button className="nav-close" onClick={closeMobileNav}>
          <i className="fas fa-times"></i>
        </button>
        <div style={{ marginBottom: '32px' }}>
          <div className="profile-avatar" style={{ margin: '0 auto 16px' }}>
            {user?.profile_picture_url ? (
              <img src={user.profile_picture_url} alt="Profile" />
            ) : (
              <i className="fas fa-user"></i>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="profile-name">
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.username || 'User'
              }
            </div>
            <div className="profile-title">Community Safety Advocate</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <a href="#" className="nav-item">
            <i className="fas fa-home"></i>
            <span>Dashboard</span>
          </a>
          <a href="#" className="nav-item active">
            <i className="fas fa-user"></i>
            <span>Profile</span>
          </a>
          <a href="#" className="nav-item">
            <i className="fas fa-map-marker-alt"></i>
            <span>Reports</span>
          </a>
          <a href="#" className="nav-item">
            <i className="fas fa-medal"></i>
            <span>Badges</span>
          </a>
          <a href="#" className="nav-item">
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </a>
        </nav>
      </div>

      <div className={`nav-overlay ${mobileNavOpen ? 'active' : ''}`} onClick={closeMobileNav}></div>

      <div className="dashboard-container">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            {user?.profile_picture_url ? (
              <img src={user.profile_picture_url} alt="Profile" />
            ) : (
              <i className="fas fa-user"></i>
            )}
          </div>
          <h1 className="profile-name">
            {user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : user?.username || 'User'
            }
          </h1>
          <p className="profile-title">Community Safety Advocate</p>
          <div className="reputation-badge">
            <i className="fas fa-star"></i>
            <span>{stats.reputation} Reputation</span>
          </div>

          <div className="quick-stats">
            <div className="stat-mini">
              <span className="stat-mini-value">{stats.totalReports}</span>
              <span className="stat-mini-label">Reports</span>
            </div>
            <div className="stat-mini">
              <span className="stat-mini-value">{stats.totalUpvotes}</span>
              <span className="stat-mini-label">Upvotes</span>
            </div>
            <div className="stat-mini">
              <span className="stat-mini-value">{badges.length}</span>
              <span className="stat-mini-label">Badges</span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={() => {
              console.log('Edit Profile button clicked');
              setEditForm({
                firstName: user?.first_name || '',
                lastName: user?.last_name || '',
                phone: user?.phone || '',
                location: user?.location
                  ? (typeof user.location === 'string'
                      ? user.location
                      : (user.location.address || `${user.location.latitude.toFixed(4)}, ${user.location.longitude.toFixed(4)}`))
                  : '',
                interests: user?.interests || [],
                profilePicture: null,
                profilePicturePreview: user?.profile_picture_url || ''
              });
              console.log('Setting showEditModal to true');
              setShowEditModal(true);
            }}
          >
            <i className="fas fa-edit"></i>
            Edit Profile
          </button>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalReports}</div>
              <div className="stat-label">Total Reports</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalUpvotes}</div>
              <div className="stat-label">Community Upvotes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">#{stats.rank || '-'}</div>
              <div className="stat-label">Community Rank</div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="content-grid">
            {/* Badges */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-medal"></i>
                  Achievement Badges
                </h3>
                <div className="card-actions">
                  <button className="btn btn-outline btn-sm">View All</button>
                </div>
              </div>
              <div className="badges-grid">
                {badges.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-medal"></i>
                    <p>No badges earned yet</p>
                  </div>
                ) : (
                  badges.slice(0, 3).map(badge => (
                    <div key={badge.id} className="badge-card" style={{ background: badge.color }}>
                      <div className="badge-icon">
                        <i className={badge.icon}></i>
                      </div>
                      <div className="badge-name">{badge.name}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Reports */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-list"></i>
                  Recent Reports
                </h3>
                <div className="card-actions">
                  <button className="btn btn-outline btn-sm">View All</button>
                </div>
              </div>
              <div className="reports-list">
                {myReports.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-plus-circle"></i>
                    <p>No reports yet</p>
                  </div>
                ) : (
                  myReports.slice(0, 3).map(report => (
                    <div key={report.id} className="report-item">
                      <div className="report-icon" style={{ backgroundColor: getVibeColor(report.vibe_type) }}>
                        <i className={getVibeIcon(report.vibe_type)}></i>
                      </div>
                      <div className="report-content">
                        <div className="report-title">{t(`vibes.${report.vibe_type}`)} Report</div>
                        <div className="report-meta">
                          <span>{report.location || t('profile.unknownLocation')}</span>
                          <span>{formatTimeAgo(report.created_at)}</span>
                        </div>
                      </div>
                      <div className="report-actions">
                        <button className="btn btn-outline btn-sm">
                          <i className="fas fa-eye"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Community Activity */}
            <div className="card grid-col-span-2">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-users"></i>
                  Community Activity
                </h3>
              </div>
              <div className="reports-list">
                {reportsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                    <LoadingSpinner size="md" />
                  </div>
                ) : nearbyReports.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-users"></i>
                    <p>No nearby reports</p>
                  </div>
                ) : (
                  nearbyReports.slice(0, 5).map(report => (
                    <div key={report.id} className="report-item">
                      <div className="report-icon" style={{ backgroundColor: getVibeColor(report.vibe_type) }}>
                        <i className={getVibeIcon(report.vibe_type)}></i>
                      </div>
                      <div className="report-content">
                        <div className="report-title">{t(`vibes.${report.vibe_type}`)} Report</div>
                        <div className="report-meta">
                          <span>{report.location || t('profile.unknownLocation')}</span>
                          <span>{formatTimeAgo(report.created_at)}</span>
                          <span>👍 {report.upvotes || 0} 👎 {report.downvotes || 0}</span>
                        </div>
                      </div>
                      <div className="report-actions">
                        <button
                          className={`btn btn-outline btn-sm ${report.user_vote === 'upvote' ? 'active' : ''}`}
                          onClick={() => voteOnReport(report.id, 'upvote')}
                        >
                          <i className="fas fa-thumbs-up"></i>
                        </button>
                        <button
                          className={`btn btn-outline btn-sm ${report.user_vote === 'downvote' ? 'active' : ''}`}
                          onClick={() => voteOnReport(report.id, 'downvote')}
                        >
                          <i className="fas fa-thumbs-down"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="card grid-col-span-2">
              <div className="card-header">
                <h3 className="card-title">
                  <i className="fas fa-history"></i>
                  Recent Activity
                </h3>
              </div>
              <div className="timeline">
                {recentActivity.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-plus-circle"></i>
                    <p>No recent activity</p>
                  </div>
                ) : (
                  recentActivity.slice(0, 3).map(activity => (
                    <div key={activity.id} className="timeline-item">
                      <div className="timeline-icon">
                        <i className={getVibeIcon(activity.vibe_type)}></i>
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-title">New Report Submitted</div>
                        <div className="timeline-description">{t(`vibes.${activity.vibe_type}`)} report at {activity.location || t('profile.unknownLocation')}</div>
                        <div className="timeline-time">{formatTimeAgo(activity.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div
          className="modal-overlay"
          style={{ display: 'flex' }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <h2>{t('profile.editProfile')}</h2>
              <p>Update your personal information</p>
              <button
                className="modal-close-btn"
                onClick={() => setShowEditModal(false)}
                aria-label="Close modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {/* Form Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Profile Picture Section */}
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '16px'
                  }}>
                    Profile Picture
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    {/* Profile Picture Preview */}
                    <div style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      border: '3px solid #d1d5db',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f9fafb'
                    }}>
                      {editForm.profilePicturePreview ? (
                        <img
                          src={editForm.profilePicturePreview}
                          alt="Profile preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : user?.profile_picture_url ? (
                        <img
                          src={user.profile_picture_url}
                          alt="Current profile"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <i className="fas fa-user" style={{ fontSize: '48px', color: '#9ca3af' }}></i>
                      )}
                    </div>

                    {/* Upload Controls */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setEditForm(prev => ({ ...prev, profilePicture: file }));

                            // Create preview
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              setEditForm(prev => ({
                                ...prev,
                                profilePicturePreview: e.target?.result as string
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{ display: 'none' }}
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPicture}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          backgroundColor: 'white',
                          color: '#374151',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: uploadingPicture ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          opacity: uploadingPicture ? 0.5 : 1
                        }}
                      >
                        <i className="fas fa-camera"></i>
                        {editForm.profilePicture || user?.profile_picture_url ? 'Change Photo' : 'Upload Photo'}
                      </button>

                      {(editForm.profilePicture || user?.profile_picture_url) && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm(prev => ({
                              ...prev,
                              profilePicture: null,
                              profilePicturePreview: ''
                            }));
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: '1px solid #dc2626',
                            backgroundColor: 'white',
                            color: '#dc2626',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <i className="fas fa-trash"></i>
                          Remove
                        </button>
                      )}
                    </div>

                    <p style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      textAlign: 'center',
                      margin: '8px 0 0 0'
                    }}>
                      Upload a profile picture (max 5MB, JPG/PNG/WebP/GIF)
                    </p>
                  </div>
                </div>

                {/* Personal Information */}
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '16px'
                  }}>
                    Personal Information
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* First Name */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '4px'
                      }}>
                        {t('profile.firstName')} *
                      </label>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder={t('profile.firstNamePlaceholder')}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '4px'
                      }}>
                        {t('profile.lastName')} *
                      </label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder={t('profile.lastNamePlaceholder')}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '4px'
                      }}>
                        {t('profile.phone')}
                      </label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '4px'
                      }}>
                        {t('profile.location')}
                      </label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Enter your location"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px',
                          outline: 'none'
                        }}
                      />
                      <p style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '4px',
                        marginBottom: '0'
                      }}>
                        Your location was automatically detected during onboarding, but you can update it here
                      </p>
                    </div>
                  </div>
                </div>

                {/* Community Interests */}
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '16px'
                  }}>
                    {t('profile.communityInterests')}
                  </h3>

                  <p style={{
                    color: '#6b7280',
                    marginBottom: '24px',
                    fontSize: '14px'
                  }}>
                    Select your interests to connect with like-minded people
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {Object.entries(INTEREST_CATEGORIES).map(([key, category]) => (
                      <div key={key}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: 'var(--text-primary)',
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span>{category.icon}</span>
                          {category.label}
                        </h4>

                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}>
                          {category.items.map((item) => (
                            <button
                              key={item}
                              onClick={() => {
                                setEditForm(prev => ({
                                  ...prev,
                                  interests: prev.interests.includes(item)
                                    ? prev.interests.filter(i => i !== item)
                                    : [...prev.interests, item]
                                }));
                              }}
                              style={{
                                padding: '10px 18px',
                                borderRadius: '20px',
                                border: editForm.interests.includes(item) ? '2px solid #3b82f6' : '2px solid #d1d5db',
                                backgroundColor: editForm.interests.includes(item) ? '#eff6ff' : 'white',
                                color: editForm.interests.includes(item) ? '#1d4ed8' : '#374151',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowEditModal(false)}
              >
                {t('common.cancel')}
              </button>

              <button
                className="btn-save"
                onClick={async () => {
                  if (!user) return;

                  try {
                    setUploadingPicture(true);

                    let profilePictureUrl = user.profile_picture_url;

                    // Upload profile picture if selected
                    if (editForm.profilePicture) {
                      const uploadResult = await uploadService.uploadProfilePicture(
                        editForm.profilePicture,
                        user.id
                      );
                      profilePictureUrl = uploadResult.url;
                    } else if (!editForm.profilePicturePreview && user.profile_picture_url) {
                      // User removed the profile picture
                      profilePictureUrl = undefined;
                    }

                    // Prepare location update - keep existing coordinates if available
                    const locationUpdate = editForm.location ? {
                      latitude: user?.location?.latitude || 0,
                      longitude: user?.location?.longitude || 0,
                      address: editForm.location
                    } : undefined;

                    await updateProfile({
                      first_name: editForm.firstName,
                      last_name: editForm.lastName,
                      phone: editForm.phone,
                      profile_picture_url: profilePictureUrl,
                      location: locationUpdate,
                      interests: editForm.interests
                    });

                    setShowEditModal(false);
                    // Reload profile data to reflect changes
                    loadProfileData();
                  } catch (error) {
                    console.error('Error updating profile:', error);
                    alert(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  } finally {
                    setUploadingPicture(false);
                  }
                }}
                disabled={uploadingPicture}
              >
                {uploadingPicture ? 'Uploading...' : t('profile.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
