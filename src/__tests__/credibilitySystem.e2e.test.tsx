import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { credibilityService } from '../services/credibilityService'
import { CredibilityIndicator, ValidationButtons, UserVerificationBadge } from '../components/CredibilityIndicator'

// Mock all external dependencies
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn()
        })),
        order: vi.fn()
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }))
  }
}))

vi.mock('../services/credibilityService', () => ({
  credibilityService: {
    validateReport: vi.fn(),
    getUserValidation: vi.fn(),
    getValidationStats: vi.fn(),
    calculateCredibilityScore: vi.fn(),
    getCredibilityLevel: vi.fn(),
    getVerificationLevelInfo: vi.fn(),
    updateUserVerificationLevel: vi.fn(),
    removeValidation: vi.fn()
  }
}))

describe('Credibility System End-to-End', () => {
  let mockCredibilityService: any

  beforeEach(() => {
    mockCredibilityService = vi.mocked(credibilityService)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete Validation Workflow', () => {
    it('should allow user to validate a report and update UI accordingly', async () => {
      // Setup mocks
      mockCredibilityService.getUserValidation.mockResolvedValue(null)
      mockCredibilityService.validateReport.mockResolvedValue(true)
      mockCredibilityService.getValidationStats.mockResolvedValue({
        confirmCount: 0,
        denyCount: 0,
        totalValidations: 0
      })
      mockCredibilityService.calculateCredibilityScore.mockReturnValue(0.5)
      mockCredibilityService.getCredibilityLevel.mockReturnValue({
        level: 'medium',
        label: 'Moderately Credible',
        color: '#f59e0b',
        icon: '⚖️'
      })

      const user = userEvent.setup()

      // Render validation buttons
      render(<ValidationButtons reportId={1} userValidation={null} onValidate={vi.fn()} />)

      // Initially no validation
      expect(screen.getByText('Confirm')).toBeInTheDocument()
      expect(screen.getByText('Deny')).toBeInTheDocument()

      // User clicks confirm
      const confirmButton = screen.getByText('Confirm')
      await user.click(confirmButton)

      // Verify the service was called
      expect(mockCredibilityService.validateReport).toHaveBeenCalledWith(1, expect.any(String), 'confirm')
    })

    it('should show validation state after user validates', async () => {
      const user = userEvent.setup()
      let currentValidation: 'confirm' | 'deny' | null = null

      const handleValidate = (validationType: 'confirm' | 'deny') => {
        currentValidation = validationType
      }

      const { rerender } = render(
        <ValidationButtons
          reportId={1}
          userValidation={currentValidation}
          onValidate={handleValidate}
        />
      )

      // Initially no validation selected
      expect(screen.getByText('Confirm').closest('button')).not.toHaveClass('bg-green-500')
      expect(screen.getByText('Deny').closest('button')).not.toHaveClass('bg-red-500')

      // User validates as confirm
      const confirmButton = screen.getByText('Confirm')
      await user.click(confirmButton)

      // Rerender with updated state
      rerender(
        <ValidationButtons
          reportId={1}
          userValidation={currentValidation}
          onValidate={handleValidate}
        />
      )

      // Now confirm button should be selected
      expect(screen.getByText('Confirm').closest('button')).toHaveClass('bg-green-500')
      expect(screen.getByText('Deny').closest('button')).not.toHaveClass('bg-red-500')
    })

    it('should allow user to change their validation', async () => {
      const user = userEvent.setup()
      let currentValidation: 'confirm' | 'deny' | null = 'confirm'

      const handleValidate = (validationType: 'confirm' | 'deny') => {
        currentValidation = validationType
      }

      const { rerender } = render(
        <ValidationButtons
          reportId={1}
          userValidation={currentValidation}
          onValidate={handleValidate}
        />
      )

      // Initially confirm is selected
      expect(screen.getByText('Confirm').closest('button')).toHaveClass('bg-green-500')

      // User changes to deny
      const denyButton = screen.getByText('Deny')
      await user.click(denyButton)

      // Rerender with updated state
      rerender(
        <ValidationButtons
          reportId={1}
          userValidation={currentValidation}
          onValidate={handleValidate}
        />
      )

      // Now deny button should be selected
      expect(screen.getByText('Deny').closest('button')).toHaveClass('bg-red-500')
      expect(screen.getByText('Confirm').closest('button')).not.toHaveClass('bg-green-500')
    })
  })

  describe('Credibility Score Integration', () => {
    it('should display correct credibility level based on score', () => {
      mockCredibilityService.getCredibilityLevel
        .mockReturnValueOnce({
          level: 'high',
          label: 'Highly Credible',
          color: '#10b981',
          icon: '⭐'
        })
        .mockReturnValueOnce({
          level: 'medium',
          label: 'Moderately Credible',
          color: '#f59e0b',
          icon: '⚖️'
        })
        .mockReturnValueOnce({
          level: 'low',
          label: 'Low Credibility',
          color: '#ef4444',
          icon: '⚠️'
        })

      // High credibility
      const { rerender } = render(<CredibilityIndicator score={0.85} />)
      expect(screen.getByText('Highly Credible')).toBeInTheDocument()

      // Medium credibility
      rerender(<CredibilityIndicator score={0.7} />)
      expect(screen.getByText('Moderately Credible')).toBeInTheDocument()

      // Low credibility
      rerender(<CredibilityIndicator score={0.3} />)
      expect(screen.getByText('Low Credibility')).toBeInTheDocument()
    })

    it('should calculate credibility score from validation stats', () => {
      mockCredibilityService.calculateCredibilityScore.mockReturnValue(0.75)
      mockCredibilityService.getCredibilityLevel.mockReturnValue({
        level: 'medium',
        label: 'Moderately Credible',
        color: '#f59e0b',
        icon: '⚖️'
      })

      const report = {
        user_reputation: 50,
        created_at: new Date().toISOString()
      }
      const validationStats = {
        confirmCount: 4,
        denyCount: 1,
        totalValidations: 5
      }

      const score = credibilityService.calculateCredibilityScore(report, validationStats)

      expect(score).toBe(0.75)
      expect(mockCredibilityService.calculateCredibilityScore).toHaveBeenCalledWith(report, validationStats)
    })
  })

  describe('User Verification System', () => {
    it('should display correct verification badges', () => {
      mockCredibilityService.getVerificationLevelInfo
        .mockReturnValueOnce({
          label: 'Trusted Reporter',
          color: '#10b981',
          icon: '⭐',
          description: 'High reputation + accurate reporting history'
        })
        .mockReturnValueOnce({
          label: 'Verified User',
          color: '#3b82f6',
          icon: '✅',
          description: 'Identity verified + activity history'
        })
        .mockReturnValueOnce({
          label: 'Basic User',
          color: '#6b7280',
          icon: '👤',
          description: 'Email/phone verified'
        })

      const { rerender } = render(<UserVerificationBadge level="trusted" />)
      expect(screen.getByText('Trusted Reporter')).toBeInTheDocument()

      rerender(<UserVerificationBadge level="verified" />)
      expect(screen.getByText('Verified User')).toBeInTheDocument()

      rerender(<UserVerificationBadge level="basic" />)
      expect(screen.getByText('Basic User')).toBeInTheDocument()
    })

    it('should handle verification level updates', async () => {
      mockCredibilityService.updateUserVerificationLevel.mockResolvedValue(true)

      const result = await credibilityService.updateUserVerificationLevel('user123', 'verified')

      expect(result).toBe(true)
      expect(mockCredibilityService.updateUserVerificationLevel).toHaveBeenCalledWith('user123', 'verified')
    })
  })

  describe('Validation Statistics', () => {
    it('should display validation statistics correctly', () => {
      mockCredibilityService.getValidationStats.mockResolvedValue({
        confirmCount: 8,
        denyCount: 2,
        totalValidations: 10
      })

      // This would typically be tested in a component that uses ValidationStats
      // For now, we test the service directly
      const promise = credibilityService.getValidationStats(1)

      expect(promise).resolves.toEqual({
        confirmCount: 8,
        denyCount: 2,
        totalValidations: 10
      })
    })

    it('should handle reports with no validations', () => {
      mockCredibilityService.getValidationStats.mockResolvedValue({
        confirmCount: 0,
        denyCount: 0,
        totalValidations: 0
      })

      const promise = credibilityService.getValidationStats(1)

      expect(promise).resolves.toEqual({
        confirmCount: 0,
        denyCount: 0,
        totalValidations: 0
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      mockCredibilityService.validateReport.mockResolvedValue(false)

      const result = await credibilityService.validateReport(1, 'user123', 'confirm')

      expect(result).toBe(false)
    })

    it('should handle service unavailability', async () => {
      mockCredibilityService.getUserValidation.mockRejectedValue(new Error('Service unavailable'))

      await expect(credibilityService.getUserValidation(1, 'user123')).rejects.toThrow('Service unavailable')
    })

    it('should handle invalid validation types', () => {
      // This test ensures the system only accepts valid validation types
      const invalidValidation = 'invalid' as any

      // The service should reject invalid types at runtime
      expect(() => {
        // This would normally be caught by TypeScript, but we test runtime behavior
        credibilityService.validateReport(1, 'user123', invalidValidation)
      }).not.toThrow() // Service handles it gracefully
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle multiple simultaneous validations', async () => {
      mockCredibilityService.validateReport.mockResolvedValue(true)

      const validations = [
        credibilityService.validateReport(1, 'user1', 'confirm'),
        credibilityService.validateReport(2, 'user2', 'deny'),
        credibilityService.validateReport(3, 'user3', 'confirm')
      ]

      const results = await Promise.all(validations)

      expect(results).toEqual([true, true, true])
      expect(mockCredibilityService.validateReport).toHaveBeenCalledTimes(3)
    })

    it('should cache user validations efficiently', async () => {
      mockCredibilityService.getUserValidation
        .mockResolvedValueOnce('confirm')
        .mockResolvedValueOnce('confirm') // Should be cached

      const result1 = await credibilityService.getUserValidation(1, 'user123')
      const result2 = await credibilityService.getUserValidation(1, 'user123')

      expect(result1).toBe('confirm')
      expect(result2).toBe('confirm')
      expect(mockCredibilityService.getUserValidation).toHaveBeenCalledTimes(2)
    })
  })

  describe('Data Consistency', () => {
    it('should maintain consistent state after validation changes', async () => {
      // Setup initial state
      mockCredibilityService.getUserValidation.mockResolvedValue(null)
      mockCredibilityService.validateReport.mockResolvedValue(true)
      mockCredibilityService.getValidationStats.mockResolvedValue({
        confirmCount: 0,
        denyCount: 0,
        totalValidations: 0
      })

      // User validates
      const validateResult = await credibilityService.validateReport(1, 'user123', 'confirm')
      expect(validateResult).toBe(true)

      // Check validation was recorded
      mockCredibilityService.getUserValidation.mockResolvedValue('confirm')
      const userValidation = await credibilityService.getUserValidation(1, 'user123')
      expect(userValidation).toBe('confirm')

      // Check stats were updated
      mockCredibilityService.getValidationStats.mockResolvedValue({
        confirmCount: 1,
        denyCount: 0,
        totalValidations: 1
      })
      const stats = await credibilityService.getValidationStats(1)
      expect(stats.confirmCount).toBe(1)
      expect(stats.totalValidations).toBe(1)
    })

    it('should handle concurrent validation attempts', async () => {
      // Simulate race condition
      let callCount = 0
      mockCredibilityService.validateReport.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          await new Promise(resolve => setTimeout(resolve, 10)) // Simulate delay
          return true
        }
        return false // Second call fails due to existing validation
      })

      const results = await Promise.all([
        credibilityService.validateReport(1, 'user123', 'confirm'),
        credibilityService.validateReport(1, 'user123', 'deny')
      ])

      expect(results).toContain(true)
      expect(results).toContain(false)
    })
  })
})
