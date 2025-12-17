import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './shared/Modal';
import Button from './shared/Button';
import styles from './LegalModal.module.css';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onAccept
}) => {
  const { t } = useTranslation();

  console.log('PrivacyPolicyModal render - isOpen:', isOpen, 'onAccept:', !!onAccept);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
    >
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            {t('privacy.title', 'Privacy Policy')}
          </h1>
        </div>

        {/* Table of Contents */}
        <div className={styles.tableOfContents}>
          <h2 className={styles.tocTitle}>
            {t('privacy.tableOfContents', 'Table of Contents')}
          </h2>
          <ol className={styles.tocList}>
            <li className={styles.tocItem}>
              <a href="#information-collection" className={styles.tocLink}>
                {t('privacy.tocInformationCollection')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#information-usage" className={styles.tocLink}>
                {t('privacy.tocInformationUsage')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#information-sharing" className={styles.tocLink}>
                {t('privacy.tocInformationSharing')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#data-security" className={styles.tocLink}>
                {t('privacy.tocDataSecurity')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#user-rights" className={styles.tocLink}>
                {t('privacy.tocUserRights')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#international-transfers" className={styles.tocLink}>
                {t('privacy.tocInternationalTransfers')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#cookies" className={styles.tocLink}>
                {t('privacy.tocCookies')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#children-privacy" className={styles.tocLink}>
                {t('privacy.tocChildrenPrivacy')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#policy-changes" className={styles.tocLink}>
                {t('privacy.tocPolicyChanges')}
              </a>
            </li>
          </ol>
        </div>

        {/* Main Content */}
        <div className={styles.sectionContent}>
          {/* 1. Information Collection */}
          <section id="information-collection" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>1</div>
                <h2 className={styles.sectionTitle}>
                  {t('privacy.informationCollection', 'Information We Collect')}
                </h2>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('privacy.personalInformation', 'Personal Information')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('privacy.personalInfoDesc', 'We collect information you provide directly to us, including:')}
              </p>
              <ul className={styles.list}>
                <li className={styles.listItem}>{t('privacy.accountInfo', 'Account information (name, email, phone number, username)')}</li>
                <li className={styles.listItem}>{t('privacy.profileInfo', 'Profile information (interests, preferences, location preferences)')}</li>
                <li className={styles.listItem}>{t('privacy.communication', 'Communications you send to us')}</li>
                <li className={styles.listItem}>{t('privacy.feedback', 'Feedback, support requests, and other messages')}</li>
              </ul>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('privacy.automaticInfo', 'Automatically Collected Information')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('privacy.automaticInfoDesc', 'When you use our services, we automatically collect:')}
              </p>
              <ul className={styles.list}>
                <li className={styles.listItem}>{t('privacy.deviceInfo', 'Device information (IP address, browser type, operating system)')}</li>
                <li className={styles.listItem}>{t('privacy.locationData', 'Location data (GPS coordinates, Wi-Fi access points)')}</li>
                <li className={styles.listItem}>{t('privacy.usageData', 'Usage data (pages visited, features used, time spent)')}</li>
                <li className={styles.listItem}>{t('privacy.crashReports', 'Crash reports and performance data')}</li>
              </ul>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('privacy.communityData', 'Community Safety Data')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('privacy.communityDataDesc', 'As a community safety platform, we collect and process:')}
              </p>
              <ul className={styles.list}>
                <li className={styles.listItem}>{t('privacy.safetyReports', 'Safety reports and incident descriptions')}</li>
                <li className={styles.listItem}>{t('privacy.locationReports', 'Location data associated with safety reports')}</li>
                <li className={styles.listItem}>{t('privacy.communityFeedback', 'Community feedback and voting data')}</li>
                <li className={styles.listItem}>{t('privacy.aggregatedData', 'Aggregated and anonymized community safety trends')}</li>
              </ul>
            </div>
          </section>

          {/* 2. How We Use Information */}
          <section id="information-usage" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>2</div>
                <h2 className={styles.sectionTitle}>
                  {t('privacy.informationUsage', 'How We Use Your Information')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.usageIntro', 'We use collected information to:')}
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>{t('privacy.provideServices', 'Provide, maintain, and improve our community safety services')}</li>
              <li className={styles.listItem}>{t('privacy.processReports', 'Process and verify safety reports and emergency alerts')}</li>
              <li className={styles.listItem}>{t('privacy.personalize', 'Personalize your experience and provide relevant safety information')}</li>
              <li className={styles.listItem}>{t('privacy.communicate', 'Communicate with you about your account and our services')}</li>
              <li className={styles.listItem}>{t('privacy.security', 'Detect, prevent, and address security threats and fraudulent activity')}</li>
              <li className={styles.listItem}>{t('privacy.legalCompliance', 'Comply with legal obligations and enforce our terms')}</li>
              <li className={styles.listItem}>{t('privacy.analytics', 'Analyze usage patterns and improve our platform')}</li>
              <li className={styles.listItem}>{t('privacy.emergencyResponse', 'Support emergency response efforts when appropriate')}</li>
            </ul>
          </section>

          {/* 3. Information Sharing */}
          <section id="information-sharing" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>3</div>
                <h2 className={styles.sectionTitle}>
                  {t('privacy.informationSharing', 'Information Sharing and Disclosure')}
                </h2>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('privacy.whenWeShare', 'When We Share Information')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('privacy.sharingIntro', 'We may share your information in the following circumstances:')}
              </p>
              <ul className={styles.list}>
                <li className={styles.listItem}><strong>{t('privacy.emergencies', 'Emergencies')}:</strong> {t('privacy.emergencySharing', 'With emergency services when there is an imminent threat to safety')}</li>
                <li className={styles.listItem}><strong>{t('privacy.legalRequests', 'Legal Requirements')}:</strong> {t('privacy.legalSharing', 'When required by law, court order, or government request')}</li>
                <li className={styles.listItem}><strong>{t('privacy.serviceProviders', 'Service Providers')}:</strong> {t('privacy.providerSharing', 'With trusted third-party service providers who assist our operations')}</li>
                <li className={styles.listItem}><strong>{t('privacy.businessTransfers', 'Business Transfers')}:</strong> {t('privacy.businessSharing', 'In connection with a merger, acquisition, or sale of assets')}</li>
                <li className={styles.listItem}><strong>{t('privacy.consent', 'With Your Consent')}:</strong> {t('privacy.consentSharing', 'When you explicitly agree to the sharing')}</li>
              </ul>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('privacy.anonymousData', 'Anonymous and Aggregated Data')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('privacy.anonymousDesc', 'We may share anonymized, aggregated data that cannot identify individual users for research, analytics, and community safety insights.')}
              </p>
            </div>
          </section>

          {/* 4. Data Security */}
          <section id="data-security" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>4</div>
                <h2 className={styles.sectionTitle}>
                  {t('privacy.dataSecurity', 'Data Security')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.securityIntro', 'We implement comprehensive security measures to protect your information:')}
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>{t('privacy.encryption', 'End-to-end encryption for data transmission')}</li>
              <li className={styles.listItem}>{t('privacy.accessControls', 'Strict access controls and authentication requirements')}</li>
              <li className={styles.listItem}>{t('privacy.regularAudits', 'Regular security audits and vulnerability assessments')}</li>
              <li className={styles.listItem}>{t('privacy.employeeTraining', 'Employee training on data protection and privacy')}</li>
              <li className={styles.listItem}>{t('privacy.incidentResponse', 'Incident response plans for data breaches')}</li>
              <li className={styles.listItem}>{t('privacy.physicalSecurity', 'Physical security measures for our data centers')}</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {t('privacy.securityNote', 'However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.')}
            </p>
          </section>

          {/* 5. User Rights */}
          <section id="user-rights" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>5</div>
                <h2 className={styles.sectionTitle}>
                  {t('privacy.userRights', 'Your Rights and Choices')}
                </h2>
              </div>
            </div>

            <div className={styles.highlightBox}>
              <h3 className={styles.highlightTitle}>
                {t('privacy.gdprRights', 'GDPR Rights (EU Users)')}
              </h3>
              <ul className={styles.highlightList}>
                <li><strong>{t('privacy.access', 'Access')}:</strong> {t('privacy.accessRight', 'Request a copy of your personal data')}</li>
                <li><strong>{t('privacy.rectification', 'Rectification')}:</strong> {t('privacy.rectificationRight', 'Correct inaccurate or incomplete data')}</li>
                <li><strong>{t('privacy.erasure', 'Erasure')}:</strong> {t('privacy.erasureRight', 'Request deletion of your data')}</li>
                <li><strong>{t('privacy.portability', 'Portability')}:</strong> {t('privacy.portabilityRight', 'Receive your data in a structured format')}</li>
                <li><strong>{t('privacy.restriction', 'Restriction')}:</strong> {t('privacy.restrictionRight', 'Limit how we process your data')}</li>
                <li><strong>{t('privacy.objection', 'Objection')}:</strong> {t('privacy.objectionRight', 'Object to processing based on legitimate interests')}</li>
              </ul>
            </div>

            <div className={styles.highlightBox}>
              <h3 className={styles.highlightTitle}>
                {t('privacy.ccpaRights', 'CCPA Rights (California Users)')}
              </h3>
              <ul className={styles.highlightList}>
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
          <section id="international-transfers" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>6</div>
                <h2 className={styles.sectionTitle}>
                  {t('privacy.internationalTransfers', 'International Data Transfers')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.transfersIntro', 'Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards:')}
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>{t('privacy.adequacy', 'Transfers to countries with adequate data protection (EU adequacy decisions)')}</li>
              <li className={styles.listItem}>{t('privacy.standardClauses', 'Standard contractual clauses approved by relevant authorities')}</li>
              <li className={styles.listItem}>{t('privacy.bindingRules', 'Binding corporate rules for intra-group transfers')}</li>
              <li className={styles.listItem}>{t('privacy.certifications', 'Data protection certifications and frameworks')}</li>
            </ul>
          </section>

          {/* 7. Cookies */}
          <section id="cookies" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>7</div>
                <h2 className={styles.sectionTitle}>
                  {t('privacy.cookies', 'Cookies and Tracking Technologies')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.cookiesIntro', 'We use cookies and similar technologies to enhance your experience:')}
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}><strong>{t('privacy.essentialCookies', 'Essential Cookies')}:</strong> {t('privacy.essentialDesc', 'Required for basic app functionality')}</li>
              <li className={styles.listItem}><strong>{t('privacy.analyticsCookies', 'Analytics Cookies')}:</strong> {t('privacy.analyticsDesc', 'Help us understand how you use our services')}</li>
              <li className={styles.listItem}><strong>{t('privacy.functionalCookies', 'Functional Cookies')}:</strong> {t('privacy.functionalDesc', 'Remember your preferences and settings')}</li>
              <li className={styles.listItem}><strong>{t('privacy.securityCookies', 'Security Cookies')}:</strong> {t('privacy.securityDesc', 'Help protect against fraud and abuse')}</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.cookieSettings', 'You can control cookie preferences through your browser settings or our app settings.')}
            </p>
          </section>

          {/* 8. Children's Privacy */}
          <section id="children-privacy" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>8</div>
                <h2 className={styles.sectionTitle}>
                  {t('privacy.childrenPrivacy', 'Children\'s Privacy')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.childrenIntro', 'Our services are not intended for children under 13 years of age (or the minimum age in your jurisdiction). We do not knowingly collect personal information from children under this age.')}
            </p>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.childrenContact', 'If we become aware that we have collected personal information from a child, we will take steps to delete such information promptly.')}
            </p>
          </section>

          {/* 9. Policy Changes */}
          <section id="policy-changes" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>9</div>
                <h2 className={styles.sectionTitle}>
                  {t('privacy.policyChanges', 'Changes to This Policy')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.changesIntro', 'We may update this Privacy Policy from time to time. We will notify you of material changes by:')}
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>{t('privacy.emailNotification', 'Sending you an email notification')}</li>
              <li className={styles.listItem}>{t('privacy.appNotification', 'Displaying a prominent notice in the app')}</li>
              <li className={styles.listItem}>{t('privacy.websitePosting', 'Posting the updated policy on our website')}</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('privacy.continueUsing', 'Your continued use of our services after the effective date constitutes acceptance of the updated policy.')}
            </p>
          </section>



        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            {t('privacy.footer', 'This Privacy Policy is governed by the laws of [Your Jurisdiction] and is compliant with international data protection standards.')}
          </p>
          <p className={styles.footerVersion}>
            {t('privacy.version', 'Version 1.0 - November 15, 2025')}
          </p>
        </div>

        {/* Consent Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '20px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          marginTop: '20px'
        }}>
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              onAccept?.(); // Optional call if provided
              onClose();
            }}
          >
            {t('common.accept', 'Accept Privacy Policy')}
          </Button>
        </div>

      </div>
    </Modal>
  );
};

export default PrivacyPolicyModal;
