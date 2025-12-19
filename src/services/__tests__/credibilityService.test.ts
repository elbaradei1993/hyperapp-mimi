import { describe, it, expect, vi, beforeEach } from 'vitest'
import { credibilityService } from '../credibilityService'
import { supabase } from '../../lib/supabase'

// Mock the supabase module
vi.mock('../../lib/supabase', () => ({
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

describe('CredibilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateReport', () => {
    it('should successfully validate a report for the first time', async () => {
      const mockSupabase = vi.mocked(supabase)
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
      mockSupabase.from.mockImplementation(mockFrom as any)

      const result = await credibilityService.validateReport(1, 'user123', 'confirm')

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('report_validations')
    })

    it('should update existing validation', async () => {
      const mockSupabase = vi.mocked(supabase)
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { validation_type: 'deny' },
              error: null
            }))
          }))
        })),
        update: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
      mockSupabase.from.mockImplementation(mockFrom as any)

      const result = await credibilityService.validateReport(1, 'user123', 'confirm')

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('report_validations')
    })

    it('should return false on error', async () => {
      const mockSupabase = vi.mocked(supabase)
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.reject(new Error('Database error')))
          }))
        }))
      }))
      mockSupabase.from.mockImplementation(mockFrom as any)

      const result = await credibilityService.validateReport(1, 'user123', 'confirm')

      expect(result).toBe(false)
    })
  })

  describe('getUserValidation', () => {
    it('should return user validation', async () => {
      const mockSupabase = vi.mocked(supabase)
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { validation_type: 'confirm' },
              error: null
            }))
          }))
        }))
      }))
      mockSupabase.from.mockImplementation(mockFrom as any)

      const result = await credibilityService.getUserValidation(1, 'user123')

      expect(result).toBe('confirm')
    })

    it('should return null when no validation exists', async () => {
      const mockSupabase = vi.mocked(supabase)
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: { code: 'PGRST116' }
            }))
          }))
        }))
      }))
      mockSupabase.from.mockImplementation(mockFrom as any)

      const result = await credibilityService.getUserValidation(1, 'user123')

      expect(result).toBe(null)
    })
  })

  describe('getValidationStats', () => {
    it('should return validation statistics', async () => {
      const mockSupabase = vi.mocked(supabase)
      const mockData = [
        { validation_type: 'confirm' },
        { validation_type: 'confirm' },
        { validation_type: 'deny' }
      ]
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
      }))
      mockSupabase.from.mockImplementation(mockFrom as any)

      const result = await credibilityService.getValidationStats(1)

      expect(result).toEqual({
        confirmCount: 2,
        denyCount: 1,
        totalValidations: 3
      })
    })

    it('should return zero stats when no validations exist', async () => {
      const mockSupabase = vi.mocked(supabase)
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
      mockSupabase.from.mockImplementation(mockFrom as any)

      const result = await credibilityService.getValidationStats(1)

      expect(result).toEqual({
        confirmCount: 0,
        denyCount: 0,
        totalValidations: 0
      })
    })
  })

  describe('calculateCredibilityScore', () => {
    it('should return server-calculated score if available', () => {
      const report = {
        credibility_score: 0.8,
        validation_count: 5,
        user_reputation: 100,
        created_at: new Date().toISOString()
      }

      const result = credibilityService.calculateCredibilityScore(report)

      expect(result).toBe(0.8)
    })

    it('should calculate client-side score when server score unavailable', () => {
      const report = {
        validation_count: 5,
        user_reputation: 50,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day old
      }
      const validationStats = {
        confirmCount: 3,
        denyCount: 2,
        totalValidations: 5
      }

      const result = credibilityService.calculateCredibilityScore(report, validationStats)

      expect(result).toBeGreaterThan(0.1)
      expect(result).toBeLessThan(0.9)
    })

    it('should handle reports without validation stats', () => {
      const report = {
        user_reputation: 25,
        created_at: new Date().toISOString()
      }

      const result = credibilityService.calculateCredibilityScore(report)

      expect(result).toBeGreaterThan(0.1)
      expect(result).toBeLessThan(0.9)
    })
  })

  describe('getCredibilityLevel', () => {
    it('should return high credibility level', () => {
      const result = credibilityService.getCredibilityLevel(0.85)

      expect(result).toEqual({
        level: 'high',
        label: 'Highly Credible',
        color: '#10b981',
        icon: '⭐'
      })
    })

    it('should return medium credibility level', () => {
      const result = credibilityService.getCredibilityLevel(0.7)

      expect(result).toEqual({
        level: 'medium',
        label: 'Moderately Credible',
        color: '#f59e0b',
        icon: '⚖️'
      })
    })

    it('should return low credibility level', () => {
      const result = credibilityService.getCredibilityLevel(0.3)

      expect(result).toEqual({
        level: 'low',
        label: 'Low Credibility',
        color: '#ef4444',
        icon: '⚠️'
      })
    })
  })

  describe('getVerificationLevelInfo', () => {
    it('should return trusted user info', () => {
      const result = credibilityService.getVerificationLevelInfo('trusted')

      expect(result).toEqual({
        label: 'Trusted Reporter',
        color: '#10b981',
        icon: '⭐',
        description: 'High reputation + accurate reporting history'
      })
    })

    it('should return verified user info', () => {
      const result = credibilityService.getVerificationLevelInfo('verified')

      expect(result).toEqual({
        label: 'Verified User',
        color: '#3b82f6',
        icon: '✅',
        description: 'Identity verified + activity history'
      })
    })

    it('should return basic user info', () => {
      const result = credibilityService.getVerificationLevelInfo('basic')

      expect(result).toEqual({
        label: 'Basic User',
        color: '#6b7280',
        icon: '👤',
        description: 'Email/phone verified'
      })
    })

    it('should return basic user info for undefined level', () => {
      const result = credibilityService.getVerificationLevelInfo(undefined)

      expect(result.label).toBe('Basic User')
    })
  })

  describe('updateUserVerificationLevel', () => {
    it('should update user verification level successfully', async () => {
      const mockSupabase = vi.mocked(supabase)
      const mockFrom = vi.fn(() => ({
        update: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
      mockSupabase.from.mockImplementation(mockFrom as any)

      const result = await credibilityService.updateUserVerificationLevel('user123', 'verified')

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should return false on error', async () => {
      const mockSupabase = vi.mocked(supabase)
      const mockFrom = vi.fn(() => ({
        update: vi.fn(() => Promise.reject(new Error('Update failed')))
      }))
      mockSupabase.from.mockImplementation(mockFrom as any)

      const result = await credibilityService.updateUserVerificationLevel('user123', 'verified')

      expect(result).toBe(false)
    })
  })

  describe('removeValidation', () => {
    it('should remove user validation successfully', async () => {
      const mockSupabase = vi.mocked(supabase)
      const mockFrom = vi.fn(() => ({
        delete: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
      mockSupabase.from.mockImplementation(mockFrom as any)

      const result = await credibilityService.removeValidation(1, 'user123')

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('report_validations')
    })

    it('should return false on error', async () => {
      const mockSupabase = vi.mocked(supabase)
      const mockFrom = vi.fn(() => ({
        delete: vi.fn(() => Promise.reject(new Error('Delete failed')))
      }))
      mockSupabase.from.mockImplementation(mockFrom as any)

      const result = await credibilityService.removeValidation(1, 'user123')

      expect(result).toBe(false)
    })
  })

  describe('getVerificationLevelFromUpvotes', () => {
    it('should return basic for less than 15 upvotes', () => {
      expect(credibilityService.getVerificationLevelFromUpvotes(0)).toBe('basic')
      expect(credibilityService.getVerificationLevelFromUpvotes(10)).toBe('basic')
      expect(credibilityService.getVerificationLevelFromUpvotes(14)).toBe('basic')
    })

    it('should return verified for 15-49 upvotes', () => {
      expect(credibilityService.getVerificationLevelFromUpvotes(15)).toBe('verified')
      expect(credibilityService.getVerificationLevelFromUpvotes(25)).toBe('verified')
      expect(credibilityService.getVerificationLevelFromUpvotes(49)).toBe('verified')
    })

    it('should return trusted for 50+ upvotes', () => {
      expect(credibilityService.getVerificationLevelFromUpvotes(50)).toBe('trusted')
      expect(credibilityService.getVerificationLevelFromUpvotes(100)).toBe('trusted')
    })
  })
})
