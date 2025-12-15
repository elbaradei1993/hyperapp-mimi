import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { reportsService } from '../services/reports';
import { uploadService } from '../services/upload';
import { LoadingSpinner, EmptyState } from './shared';
import { reverseGeocode } from '../lib/geocoding';
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
  const [editStep, setEditStep] = useState(1); // 1 = Basic Info, 2 = Interests
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
  const [detectingLocation, setDetectingLocation] = useState(false);
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

      // Try to detect and update current location in background
      detectCurrentLocationForProfile().catch(error => {
        console.log('Location detection for profile failed, using existing location:', error);
      });

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

  // Helper function to extract address from location regardless of format
  const getLocationAddress = (location: any): string => {
    if (!location) return t('profile.notProvided');

    // If location is an object, extract the address
    if (typeof location === 'object' && location.address) {
      return location.address;
    }

    // If location is a string, try to parse it as JSON
    if (typeof location === 'string') {
      try {
        const parsed = JSON.parse(location);
        if (parsed && typeof parsed === 'object' && parsed.address) {
          return parsed.address;
        }
        // If it's a valid JSON object but no address, return the string as-is (fallback)
        return location;
      } catch (error) {
        // If it's not valid JSON, treat it as a plain address string
        return location;
      }
    }

    return t('profile.notProvided');
  };

  // Detect current location for profile display
  const detectCurrentLocationForProfile = async () => {
    if (detectingLocation) return;

    setDetectingLocation(true);
    try {
      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get address
      const address = await reverseGeocode(latitude, longitude);

      // Update user's profile with the detected location
      if (user) {
        await updateProfile({
          location: {
            latitude,
            longitude,
            address
          }
        });
      }

    } catch (error: any) {
      console.warn('Location detection for profile failed:', error);
      // Don't show error to user, just use existing location
    } finally {
      setDetectingLocation(false);
    }
  };

  // Detect current location and populate the location field
  const detectCurrentLocation = async () => {
    if (detectingLocation) return;

    setDetectingLocation(true);
    try {
      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get address
      const address = await reverseGeocode(latitude, longitude);

      // Update the location field with the detected address
      setEditForm(prev => ({
        ...prev,
        location: address
      }));

    } catch (error) {
      console.warn('Location detection failed:', error);
      // Fall back to stored location if available
      const fallbackLocation = user?.location
        ? (typeof user.location === 'string'
            ? user.location
            : (user.location.address || `${user.location.latitude.toFixed(4)}, ${user.location.longitude.toFixed(4)}`))
        : '';

      setEditForm(prev => ({
        ...prev,
        location: fallbackLocation
      }));
    } finally {
      setDetectingLocation(false);
    }
  };

  return (
    <div style={{
      padding: '16px',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: 'var(--bg-secondary)',
      paddingBottom: '100px', // Extra padding for mobile scrolling
      paddingTop: '80px', // Add top padding to account for fixed header
      minHeight: '100vh'
    }}>
      {/* Modern Profile Header */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--bg-glass-border)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated Background Gradient */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(45deg, rgba(76, 0, 176, 0.35), rgba(168, 85, 247, 0.35), rgba(124, 58, 237, 0.35))',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 8s ease infinite',
          pointerEvents: 'none'
        }}></div>

        {/* Floating Particles Effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          overflow: 'hidden'
        }}>
          {/* Particle 1 */}
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: '4px',
            height: '4px',
            background: 'var(--brand-primary)',
            borderRadius: '50%',
            opacity: '0.3',
            animation: 'floatParticle1 6s ease-in-out infinite'
          }}></div>

          {/* Particle 2 */}
          <div style={{
            position: 'absolute',
            top: '60%',
            right: '15%',
            width: '3px',
            height: '3px',
            background: 'var(--accent-primary)',
            borderRadius: '50%',
            opacity: '0.4',
            animation: 'floatParticle2 8s ease-in-out infinite'
          }}></div>

          {/* Particle 3 */}
          <div style={{
            position: 'absolute',
            bottom: '25%',
            left: '70%',
            width: '5px',
            height: '5px',
            background: 'var(--brand-secondary)',
            borderRadius: '50%',
            opacity: '0.2',
            animation: 'floatParticle3 7s ease-in-out infinite'
          }}></div>
        </div>

        {/* Subtle background gradient accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '200px',
          height: '200px',
          background: 'var(--brand-gradient)',
          opacity: '0.03',
          borderRadius: '50%',
          transform: 'translate(50%, -50%)',
          pointerEvents: 'none'
        }}></div>

        {/* CSS Animations */}
        <style>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @keyframes floatParticle1 {
            0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
            25% { transform: translateY(-10px) translateX(5px); opacity: 0.6; }
            50% { transform: translateY(-5px) translateX(-5px); opacity: 0.4; }
            75% { transform: translateY(-15px) translateX(10px); opacity: 0.5; }
          }

          @keyframes floatParticle2 {
            0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.4; }
            33% { transform: translateY(8px) translateX(-8px); opacity: 0.7; }
            66% { transform: translateY(-6px) translateX(6px); opacity: 0.3; }
          }

          @keyframes floatParticle3 {
            0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
            40% { transform: translateY(12px) translateX(-4px); opacity: 0.5; }
            80% { transform: translateY(-8px) translateX(8px); opacity: 0.3; }
          }
        `}</style>

        {/* Enhanced Profile Avatar */}
        <div style={{
          position: 'relative',
          flexShrink: 0
        }}>
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
        </div>

        {/* Enhanced Profile Info */}
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            {/* Gradient Name */}
            <h1 style={{
              fontSize: '24px',
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

            {/* Modern Edit Button */}
            <button
              onClick={async () => {
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

                await detectCurrentLocation();
                setEditStep(1); // Reset to first step
                setShowEditModal(true);
              }}
              style={{
                background: 'var(--brand-gradient)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                zIndex: 10,
                position: 'relative',
                pointerEvents: 'auto',
                boxShadow: 'var(--shadow-md)',
                transition: 'all 0.3s ease',
                letterSpacing: '0.025em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
            >
              <i className="fas fa-edit"></i>
              {t('profile.editProfile')}
            </button>
          </div>


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
          fontSize: '18px',
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
                {getLocationAddress(user?.location)}
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
          fontSize: '18px',
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
            fontSize: '28px',
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
            {String(t('profile.totalReports'))}
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
            fontSize: '28px',
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
            {String(t('profile.communityUpvotes'))}
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
            fontSize: '28px',
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
            {String(t('profile.communityRank'))}
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
          fontSize: '18px',
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
                  fontSize: '28px',
                  marginBottom: '8px',
                  opacity: 0.9
                }}>
                  <i className={badge.icon}></i>
                </div>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  {badge.name}
                </h3>
                <p style={{
                  fontSize: '11px',
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
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          cursor: 'pointer'
        }}
        onClick={() => setShowMyReports(!showMyReports)}
        >
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
          <button style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}>
            <i className={`fas fa-chevron-${showMyReports ? 'up' : 'down'}`}></i>
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
        ) : showMyReports && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myReports.map(report => (
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
          </div>
        )}
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
            {/* Modal Header - Matching OnboardingModal */}
            <div style={{
              padding: '32px 24px 0',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #0066ff 0%, #0052d4 100%)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1.125rem'
                }}>
                  H
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#0f172a'
                }}>
                  HyperApp
                </div>
              </div>
              <h2 style={{
                fontSize: '1.375rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '8px',
                lineHeight: '1.2'
              }}>
                {t('profile.editProfile')}
              </h2>
              <p style={{
                fontSize: '1rem',
                color: '#475569',
                marginBottom: '24px'
              }}>
                Update your profile information
              </p>

              {/* Progress Indicator - Horizontal Bars like OnboardingModal */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '24px'
              }}>
                {[1, 2].map(step => (
                  <div
                    key={step}
                    style={{
                      width: '40px',
                      height: '4px',
                      borderRadius: '2px',
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

              {/* Step 1: Basic Information */}
              {editStep === 1 && (
                <>
                  {/* Profile Picture */}
                  <div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937',
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
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937',
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
                          {t('profile.firstName')}
                        </label>
                        <input
                          type="text"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder={t('profile.firstNamePlaceholder')}
                          aria-label={t('profile.firstName')}
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
                          {t('profile.lastName')}
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
                          placeholder={t('profile.phonePlaceholder')}
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
                </>
              )}

              {/* Step 2: Community Interests */}
              {editStep === 2 && (
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1f2937',
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {Object.entries(INTEREST_CATEGORIES).map(([key, category]) => (
                      <div key={key}>
                        <h4 style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '8px',
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
                          gap: '8px'
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
                                padding: '8px 16px',
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
              {editStep === 1 ? (
                <>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="modal-action-btn"
                    style={{
                      padding: '14px 20px',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#374151',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
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
                    {t('common.cancel')}
                  </button>

                  <button
                    onClick={() => setEditStep(2)}
                    className="modal-action-btn"
                    style={{
                      padding: '14px 20px',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: '#0066ff',
                      color: 'white',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
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
                    Continue to Interests
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditStep(1)}
                    className="modal-action-btn"
                    style={{
                      padding: '14px 20px',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#374151',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
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
                    Back
                  </button>

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
                      padding: '14px 20px',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: uploadingPicture ? 'not-allowed' : 'pointer',
                      border: 'none',
                      background: uploadingPicture ? '#9ca3af' : '#10b981',
                      color: 'white',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
