import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { reportsService } from '../services/reports';
import { uploadService } from '../services/upload';
import { LoadingSpinner, EmptyState } from './shared';
import { reverseGeocode } from '../lib/geocoding';
import { Geolocation } from '@capacitor/geolocation';
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
  const [showMyReports, setShowMyReports] = useState(false);
  const [editStep, setEditStep] = useState(1);
  const [cachedUserReports, setCachedUserReports] = useState<Report[]>([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
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
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [currentLocationAddress, setCurrentLocationAddress] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current location and reverse geocode it - same as Community Dashboard
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        setIsGeocoding(true);
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });

        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        setCurrentLocationAddress(address);
        setLocationAddress(address);
      } catch (error) {
        console.error('Error getting current location:', error);
        setCurrentLocationAddress('Location unavailable');
        setLocationAddress('Location unavailable');
      } finally {
        setIsGeocoding(false);
      }
    };

    getCurrentLocation();
  }, []);

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
        // Immediately update vote counts for user's reports if this report belongs to them
        const isUserReport = myReports.some(report => report.id === update.reportId);
        if (isUserReport) {
          setMyReports(prevReports =>
            prevReports.map(report =>
              report.id === update.reportId
                ? { ...report, upvotes: update.upvotes, downvotes: update.downvotes }
                : report
            )
          );

          // Also update recent activity data
          setRecentActivity(prevActivity =>
            prevActivity.map(activity =>
              activity.id === update.reportId
                ? { ...activity, upvotes: update.upvotes, downvotes: update.downvotes }
                : activity
            )
          );
        }

        // Also refresh full data to ensure consistency (as fallback)
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

      // Load critical profile data first (basic info and stats)
      const statsData = await loadUserStats();
      setStats(statsData);

      // Load recent activity immediately after stats
      const activityData = await loadRecentActivity();
      setRecentActivity(activityData);

      // Defer badge loading to improve initial load time
      loadUserBadges().then(badgesData => {
        setBadges(badgesData);
      }).catch(error => {
        console.error('Error loading badges:', error);
        setBadges([]);
      });

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
      // Use cached reports if available, otherwise fetch them
      let reports = cachedUserReports;
      if (!reportsLoaded || reports.length === 0) {
        reports = await reportsService.getReports({ userId: user!.id });
        setCachedUserReports(reports);
        setReportsLoaded(true);
      }

      const totalReports = reports.length;
      const totalUpvotes = reports.reduce((sum: number, r) => sum + (r.upvotes || 0), 0);
      const reputation = calculateUserReputationFromReports(reports);
      const rank = await calculateUserRank(user!.id);

      return { totalReports, totalUpvotes, reputation, rank };
    } catch (error) {
      console.error("Error calculating user stats:", error);
      return { totalReports: 0, totalUpvotes: 0, reputation: 0, rank: null };
    }
  };

  const calculateUserReputationFromReports = (reports: Report[]): number => {
    let reputation = 0;
    reports.forEach((report) => {
      const netVotes = (report.upvotes || 0) - (report.downvotes || 0);
      reputation += Math.max(0, netVotes);
    });

    // Add base reputation for active users
    reputation += Math.min(10, reports.length);

    return Math.max(0, reputation);
  };

  const calculateUserReputation = async (userId: string): Promise<number> => {
    try {
      const reports = await reportsService.getReports({ userId });
      return calculateUserReputationFromReports(reports);
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

    // Use cached reports if available
    const reports = cachedUserReports.length > 0 ? cachedUserReports : await reportsService.getReports({ userId: user!.id });
    const reputation = calculateUserReputationFromReports(reports);
    const reportCount = reports.length;

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

  const createConfetti = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#ffd166', '#06d6a0', '#118ab2'];

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.width = Math.random() * 10 + 5 + 'px';
      confetti.style.height = Math.random() * 10 + 5 + 'px';
      confetti.style.animation = `confetti ${Math.random() * 3 + 2}s linear forwards`;
      confetti.style.animationDelay = Math.random() * 2 + 's';

      document.body.appendChild(confetti);

      // Remove confetti after animation completes
      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti);
        }
      }, 5000);
    }
  };

  // Get location address - simplified to share with Community Dashboard
  const getLocationAddress = (): string => {
    // For now, return a placeholder - this should be shared with Community Dashboard
    // TODO: Share location address with Community Dashboard via context or props
    return user?.location ? 'Current Location' : t('profile.notProvided');
  };

  return (
    <div style={{
      padding: '16px',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: 'var(--bg-secondary)',
      paddingBottom: '100px',
      paddingTop: '80px',
      minHeight: '100vh'
    }}
    className="profile-container">
      {/* Premium Profile Header */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        borderRadius: '20px',
        padding: '40px',
        marginBottom: '32px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Premium Multi-layer Background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.02) 100%)',
          pointerEvents: 'none'
        }}></div>

        {/* Luxury Gradient Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(168, 85, 247, 0.06) 35%, rgba(236, 72, 153, 0.04) 70%, rgba(34, 197, 94, 0.02) 100%)',
          backgroundSize: '300% 300%',
          animation: 'luxuryGradientShift 12s ease-in-out infinite',
          pointerEvents: 'none'
        }}></div>

        {/* Metallic Reflection Effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 20%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0.4) 80%, transparent 100%)',
          pointerEvents: 'none'
        }}></div>

        {/* Premium Particle System */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          overflow: 'hidden'
        }}>
          {/* Gold Particle */}
          <div style={{
            position: 'absolute',
            top: '25%',
            left: '15%',
            width: '3px',
            height: '3px',
            background: 'linear-gradient(45deg, #FFD700, #FFA500)',
            borderRadius: '50%',
            opacity: '0.6',
            boxShadow: '0 0 6px rgba(255, 215, 0, 0.4)',
            animation: 'premiumFloat1 8s ease-in-out infinite'
          }}></div>

          {/* Silver Particle */}
          <div style={{
            position: 'absolute',
            top: '65%',
            right: '20%',
            width: '2px',
            height: '2px',
            background: 'linear-gradient(45deg, #C0C0C0, #A8A8A8)',
            borderRadius: '50%',
            opacity: '0.5',
            boxShadow: '0 0 4px rgba(192, 192, 192, 0.3)',
            animation: 'premiumFloat2 10s ease-in-out infinite'
          }}></div>

          {/* Bronze Particle */}
          <div style={{
            position: 'absolute',
            bottom: '30%',
            left: '75%',
            width: '4px',
            height: '4px',
            background: 'linear-gradient(45deg, #CD7F32, #A0522D)',
            borderRadius: '50%',
            opacity: '0.4',
            boxShadow: '0 0 8px rgba(205, 127, 50, 0.3)',
            animation: 'premiumFloat3 9s ease-in-out infinite'
          }}></div>

          {/* Crystal Particle */}
          <div style={{
            position: 'absolute',
            top: '45%',
            right: '8%',
            width: '2px',
            height: '2px',
            background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6))',
            borderRadius: '50%',
            opacity: '0.7',
            boxShadow: '0 0 3px rgba(255, 255, 255, 0.5)',
            animation: 'premiumFloat4 7s ease-in-out infinite'
          }}></div>
        </div>

        {/* Premium Inner Shadow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.05)',
          pointerEvents: 'none',
          borderRadius: '20px'
        }}></div>

        {/* Premium CSS Animations */}
        <style>{`
          @keyframes luxuryGradientShift {
            0%, 100% { background-position: 0% 50%; }
            25% { background-position: 100% 0%; }
            50% { background-position: 100% 100%; }
            75% { background-position: 0% 100%; }
          }

          @keyframes premiumFloat1 {
            0%, 100% {
              transform: translateY(0px) translateX(0px) scale(1);
              opacity: 0.6;
            }
            25% {
              transform: translateY(-12px) translateX(8px) scale(1.2);
              opacity: 0.9;
            }
            50% {
              transform: translateY(-6px) translateX(-4px) scale(0.8);
              opacity: 0.4;
            }
            75% {
              transform: translateY(-18px) translateX(12px) scale(1.1);
              opacity: 0.7;
            }
          }

          @keyframes premiumFloat2 {
            0%, 100% {
              transform: translateY(0px) translateX(0px) scale(1);
              opacity: 0.5;
            }
            33% {
              transform: translateY(10px) translateX(-10px) scale(1.3);
              opacity: 0.8;
            }
            66% {
              transform: translateY(-8px) translateX(8px) scale(0.7);
              opacity: 0.3;
            }
          }

          @keyframes premiumFloat3 {
            0%, 100% {
              transform: translateY(0px) translateX(0px) scale(1);
              opacity: 0.4;
            }
            40% {
              transform: translateY(15px) translateX(-6px) scale(1.4);
              opacity: 0.7;
            }
            80% {
              transform: translateY(-10px) translateX(10px) scale(0.6);
              opacity: 0.2;
            }
          }

          @keyframes premiumFloat4 {
            0%, 100% {
              transform: translateY(0px) translateX(0px) scale(1);
              opacity: 0.7;
            }
            50% {
              transform: translateY(-8px) translateX(6px) scale(1.1);
              opacity: 0.9;
            }
          }

          @keyframes confetti {
            0% {
              transform: translateY(-10px) rotateZ(15deg);
              opacity: 1;
            }
            25% {
              transform: translateY(10px) rotateZ(-5deg);
              opacity: 0.8;
            }
            50% {
              transform: translateY(-5px) rotateZ(10deg);
              opacity: 0.9;
            }
            75% {
              transform: translateY(15px) rotateZ(-10deg);
              opacity: 0.7;
            }
            100% {
              transform: translateY(100vh) rotateZ(0deg);
              opacity: 0;
            }
          }
        `}</style>

        {/* Profile Picture */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '3px solid transparent',
          backgroundImage: 'var(--brand-gradient)',
          backgroundClip: 'padding-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
          color: 'var(--text-muted)',
          boxShadow: 'var(--shadow-md)',
          transition: 'all 0.3s ease'
        }}>
          {user?.profile_picture_url ? (
            <img
              src={user.profile_picture_url}
              alt="Profile"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
                overflow: 'hidden'
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallbackIcon = target.parentElement?.querySelector('.profile-fallback') as HTMLElement;
                if (fallbackIcon) {
                  fallbackIcon.style.display = 'flex';
                }
              }}
              onLoad={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'block';
                const fallbackIcon = target.parentElement?.querySelector('.profile-fallback') as HTMLElement;
                if (fallbackIcon) {
                  fallbackIcon.style.display = 'none';
                }
              }}
            />
          ) : null}
          <div
            className="profile-fallback"
            style={{
              display: user?.profile_picture_url ? 'none' : 'flex',
              position: 'absolute',
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              fontSize: '40px'
            }}
          >
            <i className="fas fa-user"></i>
          </div>
        </div>

        {/* Online status indicator */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'var(--success)',
          border: '3px solid var(--bg-primary)',
          boxShadow: '0 0 0 2px var(--bg-glass)'
        }}></div>

        {/* Enhanced Profile Info */}
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            {/* Gradient Name */}
            <h1 style={{
              fontSize: '20px',
              fontWeight: '700',
              background: 'var(--brand-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
              marginBottom: '16px',
              letterSpacing: '-0.025em'
            }}>
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.username || 'User'
              }
            </h1>

            {/* Premium Edit Button */}
            <button
              onClick={() => {
                console.log('Edit profile button clicked!');
                console.log('User object:', user);

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

                setEditStep(1);
                setShowEditModal(true);
              }}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                zIndex: 10,
                position: 'relative',
                pointerEvents: 'auto',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3), 0 4px 10px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                letterSpacing: '0.025em',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.4), 0 6px 15px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #f472b6 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3), 0 4px 10px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px) scale(0.98)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.2), 0 2px 5px rgba(0, 0, 0, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.1)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.4), 0 6px 15px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
              }}
            >
              <i className="fas fa-edit" style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2))' }}></i>
              <span style={{ fontWeight: '700' }}>{t('profile.editProfile')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Premium Personal Information Section */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Premium Background Gradient */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(147, 51, 234, 0.02) 50%, rgba(236, 72, 153, 0.01) 100%)',
          pointerEvents: 'none'
        }}></div>

        {/* Premium Inner Shadow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.03)',
          pointerEvents: 'none',
          borderRadius: '16px'
        }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            letterSpacing: '-0.025em'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <i className="fas fa-id-card" style={{ fontSize: '18px' }}></i>
            </div>
            {t('profile.personalInfo')}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}>
                <i className="fas fa-envelope" style={{ fontSize: '18px' }}></i>
              </div>
              <div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {t('profile.email')}
                </div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em'
                }}>
                  {user?.email || t('profile.notProvided')}
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}>
                <i className="fas fa-phone" style={{ fontSize: '18px' }}></i>
              </div>
              <div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {t('profile.phone')}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em'
                }}>
                  {user?.phone || t('profile.notProvided')}
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}>
                <i className="fas fa-map-marker-alt" style={{ fontSize: '18px' }}></i>
              </div>
              <div>
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {t('profile.location')}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em'
                }}>
                  {locationAddress}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.06)';
        }}>
          {/* Premium Background Gradient */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.04) 0%, rgba(59, 130, 246, 0.02) 100%)',
            pointerEvents: 'none'
          }}></div>

          {/* Premium Inner Shadow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.02)',
            pointerEvents: 'none',
            borderRadius: '16px'
          }}></div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)'
            }}>
              <i className="fas fa-chart-line" style={{ fontSize: '20px', color: 'white' }}></i>
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px',
              letterSpacing: '-0.02em'
            }}>
              {stats.totalReports}
            </div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {String(t('profile.totalReports'))}
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.06)';
        }}>
          {/* Premium Background Gradient */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(16, 185, 129, 0.02) 100%)',
            pointerEvents: 'none'
          }}></div>

          {/* Premium Inner Shadow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.02)',
            pointerEvents: 'none',
            borderRadius: '16px'
          }}></div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
            }}>
              <i className="fas fa-thumbs-up" style={{ fontSize: '20px', color: 'white' }}></i>
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px',
              letterSpacing: '-0.02em'
            }}>
              {stats.totalUpvotes}
            </div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {String(t('profile.communityUpvotes'))}
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.06)';
        }}>
          {/* Premium Background Gradient */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(245, 158, 11, 0.02) 100%)',
            pointerEvents: 'none'
          }}></div>

          {/* Premium Inner Shadow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.02)',
            pointerEvents: 'none',
            borderRadius: '16px'
          }}></div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)'
            }}>
              <i className="fas fa-trophy" style={{ fontSize: '20px', color: 'white' }}></i>
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px',
              letterSpacing: '-0.02em'
            }}>
              #{stats.rank || '-'}
            </div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {String(t('profile.communityRank'))}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Badges Section */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Premium Background Gradient */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.03) 0%, rgba(245, 158, 11, 0.02) 50%, rgba(217, 119, 6, 0.01) 100%)',
          pointerEvents: 'none'
        }}></div>

        {/* Premium Inner Shadow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.03)',
          pointerEvents: 'none',
          borderRadius: '16px'
        }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            letterSpacing: '-0.025em'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}>
              <i className="fas fa-medal" style={{ fontSize: '18px' }}></i>
            </div>
            {t('profile.achievementBadges')}
          </h2>

          {badges.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
              }}>
                <i className="fas fa-medal" style={{ fontSize: '32px', color: '#9ca3af' }}></i>
              </div>
              <p style={{
                fontSize: '16px',
                fontWeight: '500',
                margin: 0,
                color: 'var(--text-secondary)'
              }}>
                {t('profile.noBadges')}
              </p>
              <p style={{
                fontSize: '14px',
                margin: '8px 0 0 0',
                opacity: 0.7
              }}>
                Keep contributing to earn your first badge!
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '20px'
            }}>
              {badges.map(badge => (
                <div key={badge.id} style={{
                  background: 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}>
                  {/* Badge Background Gradient */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: badge.color,
                    opacity: 0.9,
                    pointerEvents: 'none'
                  }}></div>

                  {/* Premium Inner Shadow */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.1)',
                    pointerEvents: 'none',
                    borderRadius: '16px'
                  }}></div>

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                    }}>
                      <i className={badge.icon} style={{
                        fontSize: '28px',
                        color: 'white',
                        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                      }}></i>
                    </div>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      marginBottom: '8px',
                      color: 'white',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      letterSpacing: '-0.01em'
                    }}>
                      {badge.name}
                    </h3>
                    <p style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      margin: 0,
                      lineHeight: '1.4',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                    }}>
                      {badge.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Premium My Reports Section */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Premium Background Gradient */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(59, 130, 246, 0.02) 50%, rgba(16, 185, 129, 0.01) 100%)',
          pointerEvents: 'none'
        }}></div>

        {/* Premium Inner Shadow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.03)',
          pointerEvents: 'none',
          borderRadius: '16px'
        }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            cursor: 'pointer'
          }}
          onClick={() => setShowMyReports(!showMyReports)}
          >
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              letterSpacing: '-0.025em'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
              }}>
                <i className="fas fa-list" style={{ fontSize: '18px' }}></i>
              </div>
              {t('profile.myReports')} ({myReports.length})
            </h2>
            <button style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              color: 'var(--text-muted)',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}>
              <i className={`fas fa-chevron-${showMyReports ? 'up' : 'down'}`} style={{ fontSize: '14px' }}></i>
            </button>
          </div>

          {myReports.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
              }}>
                <i className="fas fa-plus-circle" style={{ fontSize: '32px', color: '#9ca3af' }}></i>
              </div>
              <p style={{
                fontSize: '14px',
                fontWeight: '500',
                margin: 0,
                color: 'var(--text-secondary)'
              }}>
                {t('profile.noReports')}
              </p>
              <p style={{
                fontSize: '12px',
                margin: '8px 0 0 0',
                opacity: 0.7
              }}>
                Your safety reports will appear here
              </p>
            </div>
          ) : showMyReports && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myReports.map(report => (
                <div key={report.id} style={{
                  background: 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${getVibeColor(report.vibe_type)} 0%, ${getVibeColor(report.vibe_type)}dd 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: `0 4px 12px ${getVibeColor(report.vibe_type)}40`
                  }}>
                    <i className={getVibeIcon(report.vibe_type)} style={{ fontSize: '18px' }}></i>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                      fontSize: '14px',
                      letterSpacing: '-0.01em'
                    }}>
                      {t(`vibes.${report.vibe_type}`)} {t('profile.report')}
                    </div>
                    <div style={{
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      marginBottom: '6px',
                      fontWeight: '500'
                    }}>
                      📍 {report.location || t('profile.unknownLocation')}
                    </div>
                    {report.notes && (
                      <div style={{
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        marginBottom: '8px',
                        lineHeight: '1.4'
                      }}>
                        {report.notes}
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      <span>🕒 {formatTimeAgo(report.created_at)}</span>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#10b981',
                        fontWeight: '600'
                      }}>
                        👍 {report.upvotes || 0}
                      </span>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#ef4444',
                        fontWeight: '600'
                      }}>
                        👎 {report.downvotes || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal - Matching OnboardingModal Style */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header - Clean and Simple */}
            <div style={{
              padding: '24px 20px 0',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '6px',
                lineHeight: '1.2'
              }}>
                {t('profile.editProfile')}
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#475569',
                marginBottom: '20px'
              }}>
                Update your profile information
              </p>

              {/* Progress Indicator - Horizontal Bars like OnboardingModal */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '6px',
                marginBottom: '16px'
              }}>
                {[1, 2, 3, 4, 5, 6].map(step => (
                  <div
                    key={step}
                    style={{
                      width: '24px',
                      height: '3px',
                      borderRadius: '1.5px',
                      background: step <= editStep ? '#0066ff' : '#e2e8f0',
                      transition: 'all 0.3s ease',
                      transform: step <= editStep ? 'scale(1.1)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Modal Content - Matching OnboardingModal */}
            <div style={{
              padding: '0 24px',
              flex: 1,
              overflowY: 'auto',
              maxHeight: '50vh'
            }}>
              {/* Form Content - Progressive Disclosure */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Step 1: Profile Picture */}
                {editStep === 1 && (
                  <div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#1f2937',
                      marginBottom: '6px',
                      textAlign: 'center'
                    }}>
                      Add a Profile Picture
                    </h3>
                    <p style={{
                      color: '#6b7280',
                      marginBottom: '24px',
                      fontSize: '13px',
                      textAlign: 'center'
                    }}>
                      Help others recognize you in the community
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                      {/* Profile Picture Preview */}
                      <div style={{
                        width: '140px',
                        height: '140px',
                        borderRadius: '50%',
                        border: '4px solid #e5e7eb',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f9fafb',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
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
                          <i className="fas fa-user" style={{ fontSize: '56px', color: '#9ca3af' }}></i>
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
                            padding: '12px 20px',
                            borderRadius: '12px',
                            border: '2px solid #d1d5db',
                            backgroundColor: 'white',
                            color: '#374151',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: uploadingPicture ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: uploadingPicture ? 0.5 : 1,
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                          }}
                          onMouseOver={(e) => {
                            if (!uploadingPicture) {
                              e.currentTarget.style.borderColor = '#3b82f6';
                              e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.2)';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!uploadingPicture) {
                              e.currentTarget.style.borderColor = '#d1d5db';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                            }
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
                              padding: '12px 20px',
                              borderRadius: '12px',
                              border: '2px solid #dc2626',
                              backgroundColor: 'white',
                              color: '#dc2626',
                              fontSize: '15px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.borderColor = '#b91c1c';
                              e.currentTarget.style.boxShadow = '0 4px 16px rgba(220, 38, 38, 0.2)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.borderColor = '#dc2626';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                            }}
                          >
                            <i className="fas fa-trash"></i>
                            Remove
                          </button>
                        )}
                      </div>

                      <p style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        textAlign: 'center',
                        margin: '0',
                        maxWidth: '280px'
                      }}>
                        Upload a profile picture (max 5MB, JPG/PNG/WebP/GIF). You can skip this step and add one later.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: First Name */}
                {editStep === 2 && (
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1f2937',
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}>
                      What's your first name?
                    </h3>
                    <p style={{
                      color: '#6b7280',
                      marginBottom: '32px',
                      fontSize: '14px',
                      textAlign: 'center'
                    }}>
                      This will be used to personalize your experience
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter your first name"
                        autoFocus
                        style={{
                          width: '100%',
                          maxWidth: '280px',
                          padding: '12px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '10px',
                          fontSize: '16px',
                          fontWeight: '500',
                          outline: 'none',
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Last Name */}
                {editStep === 3 && (
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1f2937',
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}>
                      And your last name?
                    </h3>
                    <p style={{
                      color: '#6b7280',
                      marginBottom: '32px',
                      fontSize: '14px',
                      textAlign: 'center'
                    }}>
                      Your last name helps us create your profile
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Enter your last name"
                        autoFocus
                        style={{
                          width: '100%',
                          maxWidth: '280px',
                          padding: '12px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '10px',
                          fontSize: '16px',
                          fontWeight: '500',
                          outline: 'none',
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Phone Number */}
                {editStep === 4 && (
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1f2937',
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}>
                      How can we reach you?
                    </h3>
                    <p style={{
                      color: '#6b7280',
                      marginBottom: '32px',
                      fontSize: '14px',
                      textAlign: 'center'
                    }}>
                      We'll use this for important safety alerts (optional)
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        autoFocus
                        style={{
                          width: '100%',
                          maxWidth: '280px',
                          padding: '12px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '10px',
                          fontSize: '16px',
                          fontWeight: '500',
                          outline: 'none',
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Step 5: Address */}
                {editStep === 5 && (
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1f2937',
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}>
                      Where are you located?
                    </h3>
                    <p style={{
                      color: '#6b7280',
                      marginBottom: '32px',
                      fontSize: '14px',
                      textAlign: 'center'
                    }}>
                      We'll use this to show relevant community reports and safety information in your area
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Enter your city or address"
                        autoFocus
                        style={{
                          width: '100%',
                          maxWidth: '280px',
                          padding: '12px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '10px',
                          fontSize: '16px',
                          fontWeight: '500',
                          outline: 'none',
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Step 6: Community Interests */}
                {editStep === 6 && (
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1f2937',
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}>
                      What community activities interest you?
                    </h3>
                    <p style={{
                      color: '#6b7280',
                      marginBottom: '32px',
                      fontSize: '14px',
                      textAlign: 'center'
                    }}>
                      Select activities you enjoy to connect with like-minded people in your community
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {Object.entries(INTEREST_CATEGORIES).map(([key, category]) => (
                        <div key={key}>
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1f2937',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span style={{ fontSize: '18px' }}>{category.icon}</span>
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
                                  padding: '8px 14px',
                                  borderRadius: '20px',
                                  border: editForm.interests.includes(item) ? '2px solid #3b82f6' : '2px solid #d1d5db',
                                  backgroundColor: editForm.interests.includes(item) ? '#eff6ff' : 'white',
                                  color: editForm.interests.includes(item) ? '#1d4ed8' : '#374151',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
                                }}
                                onMouseOver={(e) => {
                                  if (!editForm.interests.includes(item)) {
                                    e.currentTarget.style.borderColor = '#9ca3af';
                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                  }
                                }}
                                onMouseOut={(e) => {
                                  if (!editForm.interests.includes(item)) {
                                    e.currentTarget.style.borderColor = '#d1d5db';
                                    e.currentTarget.style.backgroundColor = 'white';
                                  }
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
                )}

              </div>
            </div>

            {/* Modal Footer - Matching OnboardingModal */}
            <div style={{
              padding: '20px 24px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              background: '#ffffff'
            }}>
              {/* Left Button - Cancel or Back */}
              <button
                onClick={editStep === 1 ? () => setShowEditModal(false) : () => setEditStep(editStep - 1)}
                className="modal-action-btn"
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#374151',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#3385ff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                {editStep === 1 ? t('common.cancel') : 'Back'}
              </button>

              {/* Right Button - Continue or Save */}
              {editStep < 6 ? (
                <button
                  onClick={() => {
                    // Basic validation for required fields
                    if (editStep === 2 && !editForm.firstName.trim()) {
                      alert('Please enter your first name');
                      return;
                    }
                    if (editStep === 3 && !editForm.lastName.trim()) {
                      alert('Please enter your last name');
                      return;
                    }
                    setEditStep(editStep + 1);
                  }}
                  className="modal-action-btn"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: '#0066ff',
                    color: 'white',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#0052d4';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#0066ff';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {editStep === 1 ? 'Continue to First Name' :
                   editStep === 2 ? 'Continue to Last Name' :
                   editStep === 3 ? 'Continue to Phone' :
                   editStep === 4 ? 'Continue to Address' :
                   'Continue to Interests'}
                </button>
              ) : (
                <button
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

                      // Prepare location update - only save if location has content
                      const locationUpdate = editForm.location && editForm.location.trim() ? {
                        latitude: user?.location?.latitude || 0,
                        longitude: user?.location?.longitude || 0,
                        address: editForm.location.trim()
                      } : undefined;

                      await updateProfile({
                        first_name: editForm.firstName,
                        last_name: editForm.lastName,
                        phone: editForm.phone,
                        profile_picture_url: profilePictureUrl,
                        location: locationUpdate,
                        interests: editForm.interests
                      });

                      // Show confetti animation for successful update
                      createConfetti();

                      setShowEditModal(false);
                      setEditStep(1); // Reset for next time
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
                  className="modal-action-btn"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: uploadingPicture ? 'not-allowed' : 'pointer',
                    border: 'none',
                    background: uploadingPicture ? '#9ca3af' : '#10b981',
                    color: 'white',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    opacity: uploadingPicture ? 0.6 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!uploadingPicture) {
                      e.currentTarget.style.background = '#0da271';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!uploadingPicture) {
                      e.currentTarget.style.background = uploadingPicture ? '#9ca3af' : '#10b981';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {uploadingPicture ? 'Uploading...' : t('profile.saveChanges')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
