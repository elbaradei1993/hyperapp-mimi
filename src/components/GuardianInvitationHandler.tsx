import React, { useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { guardianService } from '../services/guardian';

import { LoadingSpinner } from './shared';

const GuardianInvitationHandler: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth_required'>('loading');
  const [message, setMessage] = useState('Processing guardian invitation...');
  const [inviterName, setInviterName] = useState<string>('');

  useEffect(() => {
    const handleGuardianInvitation = async () => {
      try {
        console.log('🔄 Handling guardian invitation...');

        // Extract token from URL path
        const pathParts = window.location.pathname.split('/');
        const token = pathParts[pathParts.length - 1]; // Last part of path

        if (!token) {
          setStatus('error');
          setMessage('Invalid invitation link - missing token');
          return;
        }

        console.log('📝 Extracted invitation token:', token);

        // Check if user is authenticated
        if (!isAuthenticated || !user) {
          console.log('🔐 User not authenticated, showing auth prompt');
          setStatus('auth_required');
          setMessage('Please sign in to accept this guardian invitation');
          return;
        }

        // Accept the invitation
        console.log('✅ Accepting guardian invitation...');
        const relationship = await guardianService.acceptGuardianInvitation(token, user.id);

        // Get inviter's name from the relationship
        const inviterProfile = relationship.guardian_profile;
        const name = inviterProfile?.first_name && inviterProfile?.last_name
          ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
          : inviterProfile?.first_name || inviterProfile?.last_name || inviterProfile?.email || 'your contact';

        setInviterName(name);
        setStatus('success');
        setMessage(`You are now connected as a guardian to ${name}!`);

        // Redirect to guardian tab after success
        setTimeout(() => {
          window.location.href = '/#guardian'; // Use hash for SPA navigation
        }, 3000);

      } catch (error: any) {
        console.error('❌ Guardian invitation acceptance failed:', error);

        let errorMessage = 'Failed to accept guardian invitation';

        if (error.message?.includes('Invalid or expired invitation')) {
          errorMessage = 'This invitation link has expired or is invalid';
        } else if (error.message?.includes('already accepted')) {
          errorMessage = 'This invitation has already been accepted';
        } else if (error.message) {
          errorMessage = error.message;
        }

        setStatus('error');
        setMessage(errorMessage);
      }
    };

    handleGuardianInvitation();
  }, [isAuthenticated, user]);

  const handleSignIn = () => {
    // Store the current URL so we can return to it after auth
    sessionStorage.setItem('postAuthRedirect', window.location.href);
    window.location.href = '/';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: '20px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%',
      }}>
        {status === 'loading' && (
          <>
            <LoadingSpinner />
            <h2 style={{
              marginTop: '20px',
              marginBottom: '10px',
              fontSize: '1.5rem',
              fontWeight: '600',
            }}>
              Accepting Guardian Invitation
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              lineHeight: '1.5',
            }}>
              {message}
            </p>
          </>
        )}

        {status === 'auth_required' && (
          <>
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px',
            }}>
              🛡️
            </div>
            <h2 style={{
              marginBottom: '10px',
              fontSize: '1.5rem',
              fontWeight: '600',
            }}>
              Guardian Invitation
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              lineHeight: '1.5',
              marginBottom: '20px',
            }}>
              {message}
            </p>
            <button
              onClick={handleSignIn}
              style={{
                padding: '12px 24px',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--accent-secondary)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--accent-primary)';
              }}
            >
              Sign In to Accept
            </button>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px',
            }}>
              ✅
            </div>
            <h2 style={{
              marginBottom: '10px',
              fontSize: '1.5rem',
              fontWeight: '600',
              color: 'var(--success)',
            }}>
              Guardian Connected!
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              lineHeight: '1.5',
            }}>
              {message}
            </p>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              marginTop: '10px',
            }}>
              Redirecting to your Guardian dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px',
            }}>
              ❌
            </div>
            <h2 style={{
              marginBottom: '10px',
              fontSize: '1.5rem',
              fontWeight: '600',
              color: 'var(--danger)',
            }}>
              Invitation Failed
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              lineHeight: '1.5',
              marginBottom: '20px',
            }}>
              {message}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--accent-secondary)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--accent-primary)';
              }}
            >
              Go to App
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GuardianInvitationHandler;
