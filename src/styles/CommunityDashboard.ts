export const styles = {
  loadingContainer: {
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column' as const
  },
  loadingText: {
    color: 'var(--text-muted)',
    marginTop: '16px'
  },
  emptyStateContainer: {
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-secondary)',
    overflow: 'hidden',
    position: 'relative' as const
  },
  container: {
    height: '100vh',
    width: '100vw',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    padding: '16px',
    paddingBottom: '100px'
  },
  header: {
    marginBottom: '32px',
    textAlign: 'center' as const
  },
  headerBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '50px',
    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
    marginBottom: '16px'
  },
  headerIcon: {
    fontSize: '20px'
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '600' as const
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: '16px',
    fontWeight: '500' as const,
    margin: '0'
  },
  locationCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    position: 'relative' as const,
    overflow: 'hidden',
    maxWidth: '600px',
    margin: '0 auto'
  },
  locationCardGradient: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '6px',
    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)'
  },
  locationCardContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '24px'
  },
  locationIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
  },
  locationIconInner: {
    fontSize: '32px'
  },
  locationAddress: {
    color: '#1f2937',
    fontSize: '24px',
    fontWeight: '700' as const,
    marginBottom: '8px',
    lineHeight: '1.3',
    textAlign: 'center' as const,
    width: '100%'
  },
  locationArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px'
  },
  locationPinIcon: {
    color: '#3b82f6'
  },
  locationAreaText: {
    margin: '0'
  },
  vibeCard: {
    padding: '24px',
    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
    border: '2px solid #e5e7eb',
    borderRadius: '16px',
    textAlign: 'center' as const,
    width: '100%'
  },
  vibeCardIcon: {
    fontSize: '24px',
    color: '#9ca3af',
    marginBottom: '8px'
  },
  vibeCardTitle: {
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: '500' as const
  },
  noLocationCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    maxWidth: '500px',
    margin: '0 auto',
    textAlign: 'center' as const
  },
  noLocationIcon: {
    fontSize: '48px',
    color: '#d1d5db',
    marginBottom: '16px'
  },
  noLocationTitle: {
    color: '#6b7280',
    fontSize: '18px',
    fontWeight: '600' as const,
    marginBottom: '8px'
  },
  noLocationText: {
    color: '#9ca3af',
    fontSize: '14px'
  },
  errorCard: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    maxWidth: '500px',
    margin: '0 auto',
    textAlign: 'center' as const
  },
  errorIcon: {
    fontSize: '48px',
    color: '#ef4444',
    marginBottom: '16px'
  },
  errorTitle: {
    color: '#6b7280',
    fontSize: '18px',
    fontWeight: '600' as const,
    marginBottom: '8px'
  },
  errorText: {
    color: '#9ca3af',
    fontSize: '14px',
    marginBottom: '24px'
  },
  retryButton: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    marginTop: '16px'
  },
  insightsSection: {
    marginTop: '32px'
  }
} as const;
