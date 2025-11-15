import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './shared/Modal';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
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
            {t('privacy.title', 'Privacy Policy')}
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '4px'
          }}>
            <strong>{t('privacy.lastUpdated', 'Last Updated')}:</strong> November 15, 2025
          </p>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-primary)',
            fontWeight: '500'
          }}>
            {t('privacy.intro', 'Your privacy matters to us. This policy explains how we collect, use, and protect your information.')}
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
            {t('privacy.tableOfContents', 'Table of Contents')}
          </h2>
          <ol style={{
            paddingLeft: '20px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.8'
          }}>
            <li><a href="#information-collection" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Information We Collect</a></li>
            <li><a href="#information-usage" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>How We Use Your Information</a></li>
            <li><a href="#information-sharing" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Information Sharing and Disclosure</a></li>
            <li><a href="#data-security" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Data Security</a></li>
            <li><a href="#user-rights" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Your Rights and Choices</a></li>
            <li><a href="#international-transfers" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>International Data Transfers</a></li>
            <li><a href="#cookies" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Cookies and Tracking Technologies</a></li>
            <li><a href="#children-privacy" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Children's Privacy</a></li>
            <li><a href="#policy-changes" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Changes to This Policy</a></li>
            <li><a href="#contact" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Contact Us</a></li>
          </ol>
        </div>

        {/* Main Content */}
        <div style={{ fontSize: '15px' }}>

          {/* 1. Information Collection */}
          <section id="information-collection" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              1. {t('privacy.informationCollection', 'Information We Collect')}
            </h2>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('privacy.personalInformation', 'Personal Information')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.personalInfoDesc', 'We collect information you provide directly to us, including:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('privacy.accountInfo', 'Account information (name, email, phone number, username)')}</li>
              <li>{t('privacy.profileInfo', 'Profile information (interests, preferences, location preferences)')}</li>
              <li>{t('privacy.communication', 'Communications you send to us')}</li>
              <li>{t('privacy.feedback', 'Feedback, support requests, and other messages')}</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('privacy.automaticInfo', 'Automatically Collected Information')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.automaticInfoDesc', 'When you use our services, we automatically collect:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('privacy.deviceInfo', 'Device information (IP address, browser type, operating system)')}</li>
              <li>{t('privacy.locationData', 'Location data (GPS coordinates, Wi-Fi access points)')}</li>
              <li>{t('privacy.usageData', 'Usage data (pages visited, features used, time spent)')}</li>
              <li>{t('privacy.crashReports', 'Crash reports and performance data')}</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('privacy.communityData', 'Community Safety Data')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.communityDataDesc', 'As a community safety platform, we collect and process:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('privacy.safetyReports', 'Safety reports and incident descriptions')}</li>
              <li>{t('privacy.locationReports', 'Location data associated with safety reports')}</li>
              <li>{t('privacy.communityFeedback', 'Community feedback and voting data')}</li>
              <li>{t('privacy.aggregatedData', 'Aggregated and anonymized community safety trends')}</li>
            </ul>
          </section>

          {/* 2. How We Use Information */}
          <section id="information-usage" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              2. {t('privacy.informationUsage', 'How We Use Your Information')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.usageIntro', 'We use collected information to:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('privacy.provideServices', 'Provide, maintain, and improve our community safety services')}</li>
              <li>{t('privacy.processReports', 'Process and verify safety reports and emergency alerts')}</li>
              <li>{t('privacy.personalize', 'Personalize your experience and provide relevant safety information')}</li>
              <li>{t('privacy.communicate', 'Communicate with you about your account and our services')}</li>
              <li>{t('privacy.security', 'Detect, prevent, and address security threats and fraudulent activity')}</li>
              <li>{t('privacy.legalCompliance', 'Comply with legal obligations and enforce our terms')}</li>
              <li>{t('privacy.analytics', 'Analyze usage patterns and improve our platform')}</li>
              <li>{t('privacy.emergencyResponse', 'Support emergency response efforts when appropriate')}</li>
            </ul>
          </section>

          {/* 3. Information Sharing */}
          <section id="information-sharing" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              3. {t('privacy.informationSharing', 'Information Sharing and Disclosure')}
            </h2>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('privacy.whenWeShare', 'When We Share Information')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.sharingIntro', 'We may share your information in the following circumstances:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li><strong>{t('privacy.emergencies', 'Emergencies')}:</strong> {t('privacy.emergencySharing', 'With emergency services when there is an imminent threat to safety')}</li>
              <li><strong>{t('privacy.legalRequests', 'Legal Requirements')}:</strong> {t('privacy.legalSharing', 'When required by law, court order, or government request')}</li>
              <li><strong>{t('privacy.serviceProviders', 'Service Providers')}:</strong> {t('privacy.providerSharing', 'With trusted third-party service providers who assist our operations')}</li>
              <li><strong>{t('privacy.businessTransfers', 'Business Transfers')}:</strong> {t('privacy.businessSharing', 'In connection with a merger, acquisition, or sale of assets')}</li>
              <li><strong>{t('privacy.consent', 'With Your Consent')}:</strong> {t('privacy.consentSharing', 'When you explicitly agree to the sharing')}</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {t('privacy.anonymousData', 'Anonymous and Aggregated Data')}
            </h3>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.anonymousDesc', 'We may share anonymized, aggregated data that cannot identify individual users for research, analytics, and community safety insights.')}
            </p>
          </section>

          {/* 4. Data Security */}
          <section id="data-security" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              4. {t('privacy.dataSecurity', 'Data Security')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.securityIntro', 'We implement comprehensive security measures to protect your information:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('privacy.encryption', 'End-to-end encryption for data transmission')}</li>
              <li>{t('privacy.accessControls', 'Strict access controls and authentication requirements')}</li>
              <li>{t('privacy.regularAudits', 'Regular security audits and vulnerability assessments')}</li>
              <li>{t('privacy.employeeTraining', 'Employee training on data protection and privacy')}</li>
              <li>{t('privacy.incidentResponse', 'Incident response plans for data breaches')}</li>
              <li>{t('privacy.physicalSecurity', 'Physical security measures for our data centers')}</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {t('privacy.securityNote', 'However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.')}
            </p>
          </section>

          {/* 5. User Rights */}
          <section id="user-rights" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              5. {t('privacy.userRights', 'Your Rights and Choices')}
            </h2>

            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid var(--border-color)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--accent-primary)' }}>
                {t('privacy.gdprRights', 'GDPR Rights (EU Users)')}
              </h3>
              <ul style={{
                paddingLeft: '20px',
                color: 'var(--text-secondary)',
                lineHeight: '1.7'
              }}>
                <li><strong>{t('privacy.access', 'Access')}:</strong> {t('privacy.accessRight', 'Request a copy of your personal data')}</li>
                <li><strong>{t('privacy.rectification', 'Rectification')}:</strong> {t('privacy.rectificationRight', 'Correct inaccurate or incomplete data')}</li>
                <li><strong>{t('privacy.erasure', 'Erasure')}:</strong> {t('privacy.erasureRight', 'Request deletion of your data')}</li>
                <li><strong>{t('privacy.portability', 'Portability')}:</strong> {t('privacy.portabilityRight', 'Receive your data in a structured format')}</li>
                <li><strong>{t('privacy.restriction', 'Restriction')}:</strong> {t('privacy.restrictionRight', 'Limit how we process your data')}</li>
                <li><strong>{t('privacy.objection', 'Objection')}:</strong> {t('privacy.objectionRight', 'Object to processing based on legitimate interests')}</li>
              </ul>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid var(--border-color)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--accent-primary)' }}>
                {t('privacy.ccpaRights', 'CCPA Rights (California Users)')}
              </h3>
              <ul style={{
                paddingLeft: '20px',
                color: 'var(--text-secondary)',
                lineHeight: '1.7'
              }}>
                <li><strong>{t('privacy.know', 'Right to Know')}:</strong> {t('privacy.knowRight', 'Request information about data collection and use')}</li>
                <li><strong>{t('privacy.delete', 'Right to Delete')}:</strong> {t('privacy.deleteRight', 'Request deletion of personal information')}</li>
                <li><strong>{t('privacy.optOut', 'Right to Opt-Out')}:</strong> {t('privacy.optOutRight', 'Opt-out of data sales and sharing')}</li>
                <li><strong>{t('privacy.nonDiscrimination', 'Non-Discrimination')}:</strong> {t('privacy.nonDiscriminationRight', 'No discrimination for exercising rights')}</li>
              </ul>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.exerciseRights', 'To exercise these rights, contact us using the information provided below. We will respond within the timeframes required by applicable law.')}
            </p>
          </section>

          {/* 6. International Transfers */}
          <section id="international-transfers" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              6. {t('privacy.internationalTransfers', 'International Data Transfers')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.transfersIntro', 'Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('privacy.adequacy', 'Transfers to countries with adequate data protection (EU adequacy decisions)')}</li>
              <li>{t('privacy.standardClauses', 'Standard contractual clauses approved by relevant authorities')}</li>
              <li>{t('privacy.bindingRules', 'Binding corporate rules for intra-group transfers')}</li>
              <li>{t('privacy.certifications', 'Data protection certifications and frameworks')}</li>
            </ul>
          </section>

          {/* 7. Cookies */}
          <section id="cookies" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              7. {t('privacy.cookies', 'Cookies and Tracking Technologies')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.cookiesIntro', 'We use cookies and similar technologies to enhance your experience:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li><strong>{t('privacy.essentialCookies', 'Essential Cookies')}:</strong> {t('privacy.essentialDesc', 'Required for basic app functionality')}</li>
              <li><strong>{t('privacy.analyticsCookies', 'Analytics Cookies')}:</strong> {t('privacy.analyticsDesc', 'Help us understand how you use our services')}</li>
              <li><strong>{t('privacy.functionalCookies', 'Functional Cookies')}:</strong> {t('privacy.functionalDesc', 'Remember your preferences and settings')}</li>
              <li><strong>{t('privacy.securityCookies', 'Security Cookies')}:</strong> {t('privacy.securityDesc', 'Help protect against fraud and abuse')}</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.cookieSettings', 'You can control cookie preferences through your browser settings or our app settings.')}
            </p>
          </section>

          {/* 8. Children's Privacy */}
          <section id="children-privacy" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              8. {t('privacy.childrenPrivacy', 'Children\'s Privacy')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.childrenIntro', 'Our services are not intended for children under 13 years of age (or the minimum age in your jurisdiction). We do not knowingly collect personal information from children under this age.')}
            </p>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.childrenContact', 'If we become aware that we have collected personal information from a child, we will take steps to delete such information promptly.')}
            </p>
          </section>

          {/* 9. Policy Changes */}
          <section id="policy-changes" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              9. {t('privacy.policyChanges', 'Changes to This Policy')}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.changesIntro', 'We may update this Privacy Policy from time to time. We will notify you of material changes by:')}
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '24px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7'
            }}>
              <li>{t('privacy.emailNotification', 'Sending you an email notification')}</li>
              <li>{t('privacy.appNotification', 'Displaying a prominent notice in the app')}</li>
              <li>{t('privacy.websitePosting', 'Posting the updated policy on our website')}</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.continueUsing', 'Your continued use of our services after the effective date constitutes acceptance of the updated policy.')}
            </p>
          </section>

          {/* 10. Contact */}
          <section id="contact" style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              10. {t('privacy.contact', 'Contact Us')}
            </h2>

            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('privacy.contactIntro', 'If you have questions about this Privacy Policy or our data practices, please contact us:')}
              </p>

              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{t('privacy.email', 'Email')}:</strong>
                <a href="mailto:privacy@hyperapp.com" style={{
                  color: 'var(--accent-primary)',
                  textDecoration: 'none',
                  marginLeft: '8px'
                }}>
                  privacy@hyperapp.com
                </a>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{t('privacy.dpo', 'Data Protection Officer')}:</strong>
                <a href="mailto:dpo@hyperapp.com" style={{
                  color: 'var(--accent-primary)',
                  textDecoration: 'none',
                  marginLeft: '8px'
                }}>
                  dpo@hyperapp.com
                </a>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{t('privacy.mailingAddress', 'Mailing Address')}:</strong>
                <div style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>
                  HyperApp Privacy Team<br />
                  123 Safety Street<br />
                  Community City, CC 12345
                </div>
              </div>

              <p style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                {t('privacy.responseTime', 'We will respond to your inquiry within 30 days or as required by applicable law.')}
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
            {t('privacy.footer', 'This Privacy Policy is governed by the laws of [Your Jurisdiction] and is compliant with international data protection standards.')}
          </p>
          <p>
            {t('privacy.version', 'Version 1.0 - November 15, 2025')}
          </p>
        </div>

      </div>
    </Modal>
  );
};

export default PrivacyPolicyModal;
