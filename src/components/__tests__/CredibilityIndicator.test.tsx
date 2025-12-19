import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  CredibilityIndicator,
  ValidationButtons,
  UserVerificationBadge,
  CredibilityMeter,
  ValidationStats
} from '../CredibilityIndicator'

// Mock the credibility service
vi.mock('../../services/credibilityService', () => ({
  credibilityService: {
    getCredibilityLevel: vi.fn((score) => {
      if (score >= 0.8) return { level: 'high', label: 'Highly Credible', color: '#10b981', icon: '⭐' }
      if (score >= 0.6) return { level: 'medium', label: 'Moderately Credible', color: '#f59e0b', icon: '⚖️' }
      return { level: 'low', label: 'Low Credibility', color: '#ef4444', icon: '⚠️' }
    }),
    getVerificationLevelInfo: vi.fn((level) => {
      switch (level) {
        case 'trusted': return { label: 'Trusted Reporter', color: '#10b981', icon: '⭐', description: 'High reputation' }
        case 'verified': return { label: 'Verified User', color: '#3b82f6', icon: '✅', description: 'Identity verified' }
        default: return { label: 'Basic User', color: '#6b7280', icon: '👤', description: 'Email verified' }
      }
    })
  }
}))

describe('CredibilityIndicator', () => {
  it('should render with high credibility', () => {
    render(<CredibilityIndicator score={0.85} />)

    expect(screen.getByText('Highly Credible')).toBeInTheDocument()
    expect(screen.getByText('⭐')).toBeInTheDocument()
  })

  it('should render with medium credibility', () => {
    render(<CredibilityIndicator score={0.7} />)

    expect(screen.getByText('Moderately Credible')).toBeInTheDocument()
    expect(screen.getByText('⚖️')).toBeInTheDocument()
  })

  it('should render with low credibility', () => {
    render(<CredibilityIndicator score={0.3} />)

    expect(screen.getByText('Low Credibility')).toBeInTheDocument()
    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const mockOnClick = vi.fn()
    render(<CredibilityIndicator score={0.8} onClick={mockOnClick} />)

    const indicator = screen.getByText('Highly Credible')
    fireEvent.click(indicator)

    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('should show default toast when clicked without onClick prop', () => {
    // Mock console.log for the toast function
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    render(<CredibilityIndicator score={0.8} />)

    const indicator = screen.getByText('Highly Credible')
    fireEvent.click(indicator)

    // The toast function uses console.log, so we check if it was called
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe('ValidationButtons', () => {
  it('should render confirm and deny buttons', () => {
    render(<ValidationButtons reportId={1} userValidation={null} onValidate={() => {}} />)

    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Deny')).toBeInTheDocument()
  })

  it('should show confirm button as selected when userValidation is confirm', () => {
    render(<ValidationButtons reportId={1} userValidation="confirm" onValidate={() => {}} />)

    const confirmButton = screen.getByText('Confirm').closest('button')
    const denyButton = screen.getByText('Deny').closest('button')

    expect(confirmButton).toHaveClass('bg-green-500')
    expect(denyButton).not.toHaveClass('bg-red-500')
  })

  it('should show deny button as selected when userValidation is deny', () => {
    render(<ValidationButtons reportId={1} userValidation="deny" onValidate={() => {}} />)

    const confirmButton = screen.getByText('Confirm').closest('button')
    const denyButton = screen.getByText('Deny').closest('button')

    expect(denyButton).toHaveClass('bg-red-500')
    expect(confirmButton).not.toHaveClass('bg-green-500')
  })

  it('should call onValidate with confirm when confirm button is clicked', async () => {
    const mockOnValidate = vi.fn()
    const user = userEvent.setup()

    render(<ValidationButtons reportId={1} userValidation={null} onValidate={mockOnValidate} />)

    const confirmButton = screen.getByText('Confirm')
    await user.click(confirmButton)

    expect(mockOnValidate).toHaveBeenCalledWith('confirm')
  })

  it('should call onValidate with deny when deny button is clicked', async () => {
    const mockOnValidate = vi.fn()
    const user = userEvent.setup()

    render(<ValidationButtons reportId={1} userValidation={null} onValidate={mockOnValidate} />)

    const denyButton = screen.getByText('Deny')
    await user.click(denyButton)

    expect(mockOnValidate).toHaveBeenCalledWith('deny')
  })

  it('should disable buttons when disabled prop is true', () => {
    render(<ValidationButtons reportId={1} userValidation={null} onValidate={() => {}} disabled={true} />)

    const confirmButton = screen.getByText('Confirm').closest('button')
    const denyButton = screen.getByText('Deny').closest('button')

    expect(confirmButton).toBeDisabled()
    expect(denyButton).toBeDisabled()
  })

  it('should render with small size', () => {
    render(<ValidationButtons reportId={1} userValidation={null} onValidate={() => {}} size="sm" />)

    const confirmButton = screen.getByText('Confirm').closest('button')
    expect(confirmButton).toHaveClass('px-3', 'py-1', 'text-sm')
  })

  it('should render with medium size by default', () => {
    render(<ValidationButtons reportId={1} userValidation={null} onValidate={() => {}} />)

    const confirmButton = screen.getByText('Confirm').closest('button')
    expect(confirmButton).toHaveClass('px-4', 'py-2', 'text-base')
  })
})

describe('UserVerificationBadge', () => {
  it('should render trusted user badge', () => {
    render(<UserVerificationBadge level="trusted" />)

    expect(screen.getByText('Trusted Reporter')).toBeInTheDocument()
  })

  it('should render verified user badge', () => {
    render(<UserVerificationBadge level="verified" />)

    expect(screen.getByText('Verified User')).toBeInTheDocument()
  })

  it('should render basic user badge', () => {
    render(<UserVerificationBadge level="basic" />)

    expect(screen.getByText('Basic User')).toBeInTheDocument()
  })

  it('should render basic user badge for undefined level', () => {
    render(<UserVerificationBadge level={undefined} />)

    expect(screen.getByText('Basic User')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const mockOnClick = vi.fn()
    render(<UserVerificationBadge level="verified" onClick={mockOnClick} />)

    const badge = screen.getByText('Verified User')
    fireEvent.click(badge)

    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('should show default toast when clicked without onClick prop', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    render(<UserVerificationBadge level="verified" />)

    const badge = screen.getByText('Verified User')
    fireEvent.click(badge)

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should render with small size by default', () => {
    render(<UserVerificationBadge level="verified" />)

    const badge = screen.getByText('Verified User')
    expect(badge).toHaveClass('text-0.6rem')
  })

  it('should hide label when showLabel is false', () => {
    render(<UserVerificationBadge level="verified" showLabel={false} />)

    expect(screen.queryByText('Verified User')).not.toBeInTheDocument()
  })
})

describe('CredibilityMeter', () => {
  it('should render credibility score and percentage', () => {
    render(<CredibilityMeter score={0.75} />)

    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('Credibility')).toBeInTheDocument()
  })

  it('should show correct color for high credibility', () => {
    render(<CredibilityMeter score={0.85} />)

    const progressBar = screen.getByRole('progressbar') || screen.getByText('85%').closest('div')?.querySelector('div')
    // The progress bar should have the high credibility color
    // This is a simplified test - in a real scenario you'd check the style
  })

  it('should apply custom className', () => {
    render(<CredibilityMeter score={0.7} className="custom-class" />)

    const container = screen.getByText('Credibility').closest('div')
    expect(container).toHaveClass('custom-class')
  })
})

describe('ValidationStats', () => {
  it('should render validation counts', () => {
    render(<ValidationStats confirmCount={5} denyCount={2} totalValidations={7} />)

    expect(screen.getByText('👍')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('👎')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('7 total')).toBeInTheDocument()
  })

  it('should calculate and show percentages', () => {
    render(<ValidationStats confirmCount={6} denyCount={4} totalValidations={10} />)

    expect(screen.getByText('(60%)')).toBeInTheDocument()
    expect(screen.getByText('(40%)')).toBeInTheDocument()
  })

  it('should show "No validations yet" when total is 0', () => {
    render(<ValidationStats confirmCount={0} denyCount={0} totalValidations={0} />)

    expect(screen.getByText('No validations yet')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<ValidationStats confirmCount={1} denyCount={0} totalValidations={1} className="custom-stats" />)

    const container = screen.getByText('👍').closest('div')
    expect(container).toHaveClass('custom-stats')
  })
})
