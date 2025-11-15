import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './shared/Modal';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
    >
      <div style={{
        maxHeight: '70vh',
        overflowY: 'auto',
        padding: '0 8px 16px 8px',
        lineHeight: '1.6',
        color: 'var(--text-primary)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif'
      }}>

        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '8px',
            borderBottom: '3px solid var(--accent-primary)',
            paddingBottom: '12px'
          }}>
            {t('terms.title', 'Terms of Service')}
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '4px'
          }}>
            <strong>{t('terms.lastUpdated', 'Last Updated')}:</strong> November 15, 2025
          </p>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-primary)',
            fontWeight: '500'
          }}>
            {t('terms.intro', 'Please read these terms carefully before using HyperApp. By using our services, you agree to be bound by these terms.')}
          </p>
        </div>

        {/* Table of Contents */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '32px',
          border: '1px solid var(--border-color)'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '16px'
          }}>
            {t('terms.tableOfContents', 'Table of Contents')}
          </h2>
          <ol style={{
            paddingLeft: '20px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.8'
          }}>
            <li><a href="#acceptance" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Acceptance of Terms</a></li>
            <li><a href="#description" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Service Description</a></li>
            <li><a href="#eligibility" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>User Eligibility</a></li>
            <li><a href="#accounts" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>User Accounts</a></li>
            <li><a href="#acceptable-use" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Acceptable Use</a></li>
            <li><a href="#content" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>User Content and Conduct</a></li>
            <li><a href="#emergency-services" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Emergency Services Disclaimer</a></li>
            <li><a href="#disclaimers" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Disclaimers and Limitations</a></li>
            <li><a href="#liability" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Limitation of Liability</a></li>
            <li><a href="#indemnification" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Indemnification</a></li>
            <li><a href="#termination" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Termination</a></li>
            <li><a href="#governing-law" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Governing Law</a></li>
            <li><a href="#dispute-resolution" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Dispute Resolution</a></li>
            <li><a href="#changes" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Changes to Terms</a></li>
            <li><a href="#contact" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Contact Information</a></li>
          </ol>
        </div>

        {/* Main Content */}
        <div style={{ fontSize: '15px' }}>

          {/* 1. Acceptance of Terms */}
          <section id="acceptance" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              1. {t('terms.acceptance', 'Acceptance of Terms')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.acceptanceDesc', 'By accessing or using HyperApp, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our services.')}
            </p>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.ageRequirement', 'You must be at least 13 years old (or the minimum age required in your jurisdiction) to use our services.')}
            </p>
          </section>

          {/* 2. Service Description */}
          <section id="description" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              2. {t('terms.description', 'Service Description')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.serviceDesc', 'HyperApp is a community safety platform that enables users to:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('terms.shareSafety', 'Share real-time safety information and reports')}</li>
              <li>{t('terms.receiveAlerts', 'Receive community safety alerts and notifications')}</li>
              <li>{t('terms.accessData', 'Access aggregated community safety data and trends')}</li>
              <li>{t('terms.connectCommunity', 'Connect with local community safety initiatives')}</li>
              <li>{t('terms.emergencyReporting', 'Report safety concerns and emergency situations')}</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.serviceChanges', 'We reserve the right to modify, suspend, or discontinue any part of our services at any time.')}
            </p>
          </section>

          {/* 3. User Eligibility */}
          <section id="eligibility" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              3. {t('terms.eligibility', 'User Eligibility')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.eligibilityDesc', 'To use HyperApp, you must:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('terms.ageRequirement', 'Be at least 13 years old (or the minimum age in your jurisdiction)')}</li>
              <li>{t('terms.legalCapacity', 'Have the legal capacity to enter into binding agreements')}</li>
              <li>{t('terms.notRestricted', 'Not be restricted from using our services under applicable laws')}</li>
              <li>{t('terms.provideAccurate', 'Provide accurate and complete information when creating an account')}</li>
            </ul>
          </section>

          {/* 4. User Accounts */}
          <section id="accounts" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              4. {t('terms.accounts', 'User Accounts')}
            </h2>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.accountCreation', 'Account Creation and Security')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.accountSecurity', 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.')}
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.accountTermination', 'Account Termination')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.accountTerminationDesc', 'We reserve the right to suspend or terminate your account at any time for violations of these terms or for other conduct that we determine to be harmful to our service or other users.')}
            </p>
          </section>

          {/* 5. Acceptable Use */}
          <section id="acceptable-use" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              5. {t('terms.acceptableUse', 'Acceptable Use')}
            </h2>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.permittedUse', 'Permitted Use')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.permittedDesc', 'You may use HyperApp only for lawful purposes and in accordance with these terms.')}
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.prohibitedActivities', 'Prohibited Activities')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.prohibitedDesc', 'You agree not to:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('terms.falseReports', 'Submit false, misleading, or fraudulent safety reports')}</li>
              <li>{t('terms.harassment', 'Harass, threaten, or intimidate other users')}</li>
              <li>{t('terms.inappropriate', 'Post inappropriate, offensive, or harmful content')}</li>
              <li>{t('terms.impersonation', 'Impersonate others or misrepresent your identity')}</li>
              <li>{t('terms.unauthorized', 'Attempt to gain unauthorized access to our systems')}</li>
              <li>{t('terms.interference', 'Interfere with or disrupt our services')}</li>
              <li>{t('terms.violation', 'Violate any applicable laws or regulations')}</li>
              <li>{t('terms.abuse', 'Use our services for any abusive or malicious purpose')}</li>
            </ul>
          </section>

          {/* 6. User Content and Conduct */}
          <section id="content" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              6. {t('terms.content', 'User Content and Conduct')}
            </h2>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.contentOwnership', 'Content Ownership and Licensing')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.contentLicense', 'By submitting content to HyperApp, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content in connection with our services. You retain ownership of your content.')}
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.contentResponsibilities', 'Content Responsibilities')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.contentRespDesc', 'You are solely responsible for the content you submit and the consequences of posting it. You represent and warrant that:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('terms.contentAccurate', 'Your content is accurate and not misleading')}</li>
              <li>{t('terms.contentRights', 'You have the right to submit the content')}</li>
              <li>{t('terms.contentLegal', 'Your content does not violate any laws or rights')}</li>
              <li>{t('terms.contentAppropriate', 'Your content is appropriate for our community')}</li>
            </ul>
          </section>

          {/* 7. Emergency Services Disclaimer */}
          <section id="emergency-services" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              7. {t('terms.emergencyServices', 'Emergency Services Disclaimer')}
            </h2>

            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#dc2626'
              }}>
                ⚠️ {t('terms.emergencyWarning', 'CRITICAL EMERGENCY NOTICE')}
              </h3>
              <p style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                {t('terms.emergency911', 'HyperApp is NOT a replacement for emergency services. In case of immediate danger or emergency:')}
              </p>
              <ul style={{
                paddingLeft: '20px',
                color: 'var(--text-secondary)',
                lineHeight: '1.7',
                fontWeight: '500'
              }}>
                <li>{t('terms.callEmergency', 'Call your local emergency number (911, 112, etc.) immediately')}</li>
                <li>{t('terms.contactPolice', 'Contact local law enforcement directly')}</li>
                <li>{t('terms.seekHelp', 'Seek immediate assistance from qualified professionals')}</li>
              </ul>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.emergencyDisclaimer', 'HyperApp provides community safety information but cannot guarantee response times, accuracy of information, or availability of emergency services. We are not liable for any delays or failures in emergency response.')}
            </p>
          </section>

          {/* 8. Disclaimers and Limitations */}
          <section id="disclaimers" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              8. {t('terms.disclaimers', 'Disclaimers and Limitations')}
            </h2>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.serviceDisclaimer', 'Service "As Is"')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.asIsDesc', 'HyperApp is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.')}
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.accuracyDisclaimer', 'Accuracy and Reliability')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.accuracyDesc', 'While we strive for accuracy, we cannot guarantee the accuracy, completeness, or reliability of user-generated content, safety information, or community reports. Users should exercise their own judgment and verify information independently.')}
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.availabilityDisclaimer', 'Service Availability')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.availabilityDesc', 'We do not guarantee that our services will be uninterrupted, timely, secure, or error-free. Service outages may occur due to maintenance, technical issues, or other factors beyond our control.')}
            </p>
          </section>

          {/* 9. Limitation of Liability */}
          <section id="liability" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              9. {t('terms.liability', 'Limitation of Liability')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.liabilityDesc', 'To the maximum extent permitted by applicable law, HyperApp and its affiliates, officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('terms.personalInjury', 'Personal injury or property damage')}</li>
              <li>{t('terms.dataLoss', 'Loss of data, profits, or business opportunities')}</li>
              <li>{t('terms.serviceInterruption', 'Service interruption or unavailability')}</li>
              <li>{t('terms.inaccurateInfo', 'Reliance on inaccurate or incomplete information')}</li>
              <li>{t('terms.thirdPartyActions', 'Actions or omissions of third parties')}</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.totalLiability', 'Our total liability shall not exceed the amount paid by you for our services in the twelve months preceding the claim.')}
            </p>
          </section>

          {/* 10. Indemnification */}
          <section id="indemnification" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              10. {t('terms.indemnification', 'Indemnification')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.indemnificationDesc', 'You agree to indemnify, defend, and hold harmless HyperApp and its affiliates, officers, directors, employees, and agents from and against any claims, demands, losses, damages, costs, liabilities, and expenses (including reasonable attorneys\' fees) arising out of or related to:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('terms.contentClaims', 'Your use of our services')}</li>
              <li>{t('terms.contentViolation', 'Your violation of these terms')}</li>
              <li>{t('terms.contentSubmitted', 'Content you submit or share')}</li>
              <li>{t('terms.lawViolation', 'Your violation of applicable laws')}</li>
              <li>{t('terms.thirdPartyRights', 'Infringement of third-party rights')}</li>
            </ul>
          </section>

          {/* 11. Termination */}
          <section id="termination" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              11. {t('terms.termination', 'Termination')}
            </h2>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.terminationByUser', 'Termination by You')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.userTermination', 'You may terminate your account at any time by contacting us or using the account deletion feature in settings.')}
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.terminationByUs', 'Termination by Us')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.companyTermination', 'We may terminate or suspend your account immediately, without prior notice, for any violation of these terms.')}
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.effectOfTermination', 'Effect of Termination')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.terminationEffect', 'Upon termination, your right to use our services ceases immediately. We may delete your account and data in accordance with our data retention policies.')}
            </p>
          </section>

          {/* 12. Governing Law */}
          <section id="governing-law" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              12. {t('terms.governingLaw', 'Governing Law')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.lawDesc', 'These Terms of Service shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law principles.')}
            </p>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.jurisdiction', 'Any legal action or proceeding arising under these terms will be brought exclusively in the courts of [Your Jurisdiction], and you hereby consent to personal jurisdiction and venue therein.')}
            </p>
          </section>

          {/* 13. Dispute Resolution */}
          <section id="dispute-resolution" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              13. {t('terms.disputeResolution', 'Dispute Resolution')}
            </h2>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.informalResolution', 'Informal Resolution')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.informalDesc', 'Before initiating formal dispute resolution, you agree to first contact us at legal@hyperapp.com to seek an informal resolution.')}
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.bindingArbitration', 'Binding Arbitration')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.arbitrationDesc', 'Any disputes arising out of or relating to these terms or our services that cannot be resolved informally shall be resolved through binding arbitration in accordance with the rules of [Arbitration Organization].')}
            </p>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('terms.classAction', 'Class Action Waiver')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.classActionDesc', 'You agree to resolve disputes only on an individual basis and waive your right to participate in class actions, collective actions, or representative proceedings.')}
            </p>
          </section>

          {/* 14. Changes to Terms */}
          <section id="changes" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              14. {t('terms.changes', 'Changes to Terms')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.changesDesc', 'We reserve the right to modify these Terms of Service at any time. We will notify users of material changes by:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('terms.emailNotification', 'Sending an email notification')}</li>
              <li>{t('terms.appNotification', 'Posting a notice in the app')}</li>
              <li>{t('terms.websiteUpdate', 'Updating the effective date on our website')}</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.continuedUse', 'Your continued use of HyperApp after the effective date of changes constitutes acceptance of the modified terms.')}
            </p>
          </section>

          {/* 15. Contact Information */}
          <section id="contact" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              15. {t('terms.contact', 'Contact Information')}
            </h2>

            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.contactDesc', 'If you have questions about these Terms of Service, please contact us:')}
              </p>

              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{t('terms.email', 'Email')}:</strong>
                <a href="mailto:legal@hyperapp.com" style={{
                  color: 'var(--accent-primary)',
                  textDecoration: 'none',
                  marginLeft: '8px'
                }}>
                  legal@hyperapp.com
                </a>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{t('terms.legalDepartment', 'Legal Department')}:</strong>
                <a href="mailto:legal@hyperapp.com" style={{
                  color: 'var(--accent-primary)',
                  textDecoration: 'none',
                  marginLeft: '8px'
                }}>
                  legal@hyperapp.com
                </a>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{t('terms.mailingAddress', 'Mailing Address')}:</strong>
                <div style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>
                  HyperApp Legal Department<br />
                  123 Safety Street<br />
                  Community City, CC 12345
                </div>
              </div>

              <p style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                {t('terms.responseTime', 'We will respond to your inquiry within 30 days.')}
              </p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          paddingTop: '24px',
          borderTop: '2px solid var(--border-color)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '14px'
        }}>
          <p style={{ marginBottom: '8px' }}>
            {t('terms.footer', 'These Terms of Service constitute the entire agreement between you and HyperApp regarding the use of our services.')}
          </p>
          <p>
            {t('terms.version', 'Version 1.0 - November 15, 2025')}
          </p>
        </div>

      </div>
    </Modal>
  );
};

export default TermsOfServiceModal;
