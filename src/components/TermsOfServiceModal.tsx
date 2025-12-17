import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './shared/Modal';
import Button from './shared/Button';
import styles from './LegalModal.module.css';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  isOpen,
  onClose,
  onAccept
}) => {
  const { t } = useTranslation();

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
            {t('terms.title', 'Terms of Service')}
          </h1>
        </div>

        {/* Table of Contents */}
        <div className={styles.tableOfContents}>
          <h2 className={styles.tocTitle}>
            {t('terms.tableOfContents', 'Table of Contents')}
          </h2>
          <ol className={styles.tocList}>
            <li className={styles.tocItem}>
              <a href="#acceptance" className={styles.tocLink}>
                {t('terms.tocAcceptance')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#description" className={styles.tocLink}>
                {t('terms.tocDescription')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#eligibility" className={styles.tocLink}>
                {t('terms.tocEligibility')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#accounts" className={styles.tocLink}>
                {t('terms.tocAccounts')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#acceptable-use" className={styles.tocLink}>
                {t('terms.tocAcceptableUse')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#content" className={styles.tocLink}>
                {t('terms.tocContent')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#emergency-services" className={styles.tocLink}>
                {t('terms.tocEmergencyServices')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#disclaimers" className={styles.tocLink}>
                {t('terms.tocDisclaimers')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#liability" className={styles.tocLink}>
                {t('terms.tocLiability')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#indemnification" className={styles.tocLink}>
                {t('terms.tocIndemnification')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#termination" className={styles.tocLink}>
                {t('terms.tocTermination')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#governing-law" className={styles.tocLink}>
                {t('terms.tocGoverningLaw')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#dispute-resolution" className={styles.tocLink}>
                {t('terms.tocDisputeResolution')}
              </a>
            </li>
            <li className={styles.tocItem}>
              <a href="#changes" className={styles.tocLink}>
                {t('terms.tocChanges')}
              </a>
            </li>
          </ol>
        </div>

        {/* Main Content */}
        <div className={styles.sectionContent}>
          {/* 1. Acceptance of Terms */}
          <section id="acceptance" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>1</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.acceptance', 'Acceptance of Terms')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.acceptanceDesc', 'By accessing or using HyperApp, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our services.')}
            </p>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.ageRequirement', 'You must be at least 13 years old (or the minimum age required in your jurisdiction) to use our services.')}
            </p>
          </section>

          {/* 2. Service Description */}
          <section id="description" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>2</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.description', 'Service Description')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.serviceDesc', 'HyperApp is a community safety platform that enables users to:')}
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>{t('terms.shareSafety', 'Share real-time safety information and reports')}</li>
              <li className={styles.listItem}>{t('terms.receiveAlerts', 'Receive community safety alerts and notifications')}</li>
              <li className={styles.listItem}>{t('terms.accessData', 'Access aggregated community safety data and trends')}</li>
              <li className={styles.listItem}>{t('terms.connectCommunity', 'Connect with local community safety initiatives')}</li>
              <li className={styles.listItem}>{t('terms.emergencyReporting', 'Report safety concerns and emergency situations')}</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.serviceChanges', 'We reserve the right to modify, suspend, or discontinue any part of our services at any time.')}
            </p>
          </section>

          {/* 3. User Eligibility */}
          <section id="eligibility" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>3</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.eligibility', 'User Eligibility')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.eligibilityDesc', 'To use HyperApp, you must:')}
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>{t('terms.ageRequirement', 'Be at least 13 years old (or the minimum age in your jurisdiction)')}</li>
              <li className={styles.listItem}>{t('terms.legalCapacity', 'Have the legal capacity to enter into binding agreements')}</li>
              <li className={styles.listItem}>{t('terms.notRestricted', 'Not be restricted from using our services under applicable laws')}</li>
              <li className={styles.listItem}>{t('terms.provideAccurate', 'Provide accurate and complete information when creating an account')}</li>
            </ul>
          </section>

          {/* 4. User Accounts */}
          <section id="accounts" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>4</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.accounts', 'User Accounts')}
                </h2>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.accountCreation', 'Account Creation and Security')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.accountSecurity', 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.')}
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.accountTermination', 'Account Termination')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.accountTerminationDesc', 'We reserve the right to suspend or terminate your account at any time for violations of these terms or for other conduct that we determine to be harmful to our service or other users.')}
              </p>
            </div>
          </section>

          {/* 5. Acceptable Use */}
          <section id="acceptable-use" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>5</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.acceptableUse', 'Acceptable Use')}
                </h2>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.permittedUse', 'Permitted Use')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.permittedDesc', 'You may use HyperApp only for lawful purposes and in accordance with these terms.')}
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.prohibitedActivities', 'Prohibited Activities')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.prohibitedDesc', 'You agree not to:')}
              </p>
              <ul className={styles.list}>
                <li className={styles.listItem}>{t('terms.falseReports', 'Submit false, misleading, or fraudulent safety reports')}</li>
                <li className={styles.listItem}>{t('terms.harassment', 'Harass, threaten, or intimidate other users')}</li>
                <li className={styles.listItem}>{t('terms.inappropriate', 'Post inappropriate, offensive, or harmful content')}</li>
                <li className={styles.listItem}>{t('terms.impersonation', 'Impersonate others or misrepresent your identity')}</li>
                <li className={styles.listItem}>{t('terms.unauthorized', 'Attempt to gain unauthorized access to our systems')}</li>
                <li className={styles.listItem}>{t('terms.interference', 'Interfere with or disrupt our services')}</li>
                <li className={styles.listItem}>{t('terms.violation', 'Violate any applicable laws or regulations')}</li>
                <li className={styles.listItem}>{t('terms.abuse', 'Use our services for any abusive or malicious purpose')}</li>
              </ul>
            </div>
          </section>

          {/* 6. User Content and Conduct */}
          <section id="content" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>6</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.content', 'User Content and Conduct')}
                </h2>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.contentOwnership', 'Content Ownership and Licensing')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.contentLicense', 'By submitting content to HyperApp, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content in connection with our services. You retain ownership of your content.')}
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.contentResponsibilities', 'Content Responsibilities')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.contentRespDesc', 'You are solely responsible for the content you submit and the consequences of posting it. You represent and warrant that:')}
              </p>
              <ul className={styles.list}>
                <li className={styles.listItem}>{t('terms.contentAccurate', 'Your content is accurate and not misleading')}</li>
                <li className={styles.listItem}>{t('terms.contentRights', 'You have the right to submit the content')}</li>
                <li className={styles.listItem}>{t('terms.contentLegal', 'Your content does not violate any laws or rights')}</li>
                <li className={styles.listItem}>{t('terms.contentAppropriate', 'Your content is appropriate for our community')}</li>
              </ul>
            </div>
          </section>

          {/* 7. Emergency Services Disclaimer */}
          <section id="emergency-services" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>7</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.emergencyServices', 'Emergency Services Disclaimer')}
                </h2>
              </div>
            </div>

            <div className={styles.warningBox}>
              <h3 className={styles.warningTitle}>
                {t('terms.emergencyWarning', 'CRITICAL EMERGENCY NOTICE')}
              </h3>
              <p className={styles.warningContent}>
                {t('terms.emergency911', 'HyperApp is NOT a replacement for emergency services. In case of immediate danger or emergency:')}
              </p>
              <ul className={styles.warningList}>
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
          <section id="disclaimers" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>8</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.disclaimers', 'Disclaimers and Limitations')}
                </h2>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.serviceDisclaimer', 'Service "As Is"')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.asIsDesc', 'HyperApp is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.')}
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.accuracyDisclaimer', 'Accuracy and Reliability')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.accuracyDesc', 'While we strive for accuracy, we cannot guarantee the accuracy, completeness, or reliability of user-generated content, safety information, or community reports. Users should exercise their own judgment and verify information independently.')}
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.availabilityDisclaimer', 'Service Availability')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.availabilityDesc', 'We do not guarantee that our services will be uninterrupted, timely, secure, or error-free. Service outages may occur due to maintenance, technical issues, or other factors beyond our control.')}
              </p>
            </div>
          </section>

          {/* 9. Limitation of Liability */}
          <section id="liability" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>9</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.liability', 'Limitation of Liability')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.liabilityDesc', 'To the maximum extent permitted by applicable law, HyperApp and its affiliates, officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:')}
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>{t('terms.personalInjury', 'Personal injury or property damage')}</li>
              <li className={styles.listItem}>{t('terms.dataLoss', 'Loss of data, profits, or business opportunities')}</li>
              <li className={styles.listItem}>{t('terms.serviceInterruption', 'Service interruption or unavailability')}</li>
              <li className={styles.listItem}>{t('terms.inaccurateInfo', 'Reliance on inaccurate or incomplete information')}</li>
              <li className={styles.listItem}>{t('terms.thirdPartyActions', 'Actions or omissions of third parties')}</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.totalLiability', 'Our total liability shall not exceed the amount paid by you for our services in the twelve months preceding the claim.')}
            </p>
          </section>

          {/* 10. Indemnification */}
          <section id="indemnification" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>10</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.indemnification', 'Indemnification')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.indemnificationDesc', 'You agree to indemnify, defend, and hold harmless HyperApp and its affiliates, officers, directors, employees, and agents from and against any claims, demands, losses, damages, costs, liabilities, and expenses (including reasonable attorneys\' fees) arising out of or related to:')}
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>{t('terms.contentClaims', 'Your use of our services')}</li>
              <li className={styles.listItem}>{t('terms.contentViolation', 'Your violation of these terms')}</li>
              <li className={styles.listItem}>{t('terms.contentSubmitted', 'Content you submit or share')}</li>
              <li className={styles.listItem}>{t('terms.lawViolation', 'Your violation of applicable laws')}</li>
              <li className={styles.listItem}>{t('terms.thirdPartyRights', 'Infringement of third-party rights')}</li>
            </ul>
          </section>

          {/* 11. Termination */}
          <section id="termination" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>11</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.termination', 'Termination')}
                </h2>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.terminationByUser', 'Termination by You')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.userTermination', 'You may terminate your account at any time by contacting us or using the account deletion feature in settings.')}
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.terminationByUs', 'Termination by Us')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.companyTermination', 'We may terminate or suspend your account immediately, without prior notice, for any violation of these terms.')}
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.effectOfTermination', 'Effect of Termination')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.terminationEffect', 'Upon termination, your right to use our services ceases immediately. We may delete your account and data in accordance with our data retention policies.')}
              </p>
            </div>
          </section>

          {/* 12. Governing Law */}
          <section id="governing-law" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>12</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.governingLaw', 'Governing Law')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.lawDesc', 'These Terms of Service shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law principles.')}
            </p>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.jurisdiction', 'Any legal action or proceeding arising under these terms will be brought exclusively in the courts of [Your Jurisdiction], and you hereby consent to personal jurisdiction and venue therein.')}
            </p>
          </section>

          {/* 13. Dispute Resolution */}
          <section id="dispute-resolution" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>13</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.disputeResolution', 'Dispute Resolution')}
                </h2>
              </div>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.informalResolution', 'Informal Resolution')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.informalDesc', 'Before initiating formal dispute resolution, you agree to first contact us at legal@hyperapp.com to seek an informal resolution.')}
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.bindingArbitration', 'Binding Arbitration')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.arbitrationDesc', 'Any disputes arising out of or relating to these terms or our services that cannot be resolved informally shall be resolved through binding arbitration in accordance with the rules of [Arbitration Organization].')}
              </p>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>
                {t('terms.classAction', 'Class Action Waiver')}
              </h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                {t('terms.classActionDesc', 'You agree to resolve disputes only on an individual basis and waive your right to participate in class actions, collective actions, or representative proceedings.')}
              </p>
            </div>
          </section>

          {/* 14. Changes to Terms */}
          <section id="changes" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionNumber}>14</div>
                <h2 className={styles.sectionTitle}>
                  {t('terms.changes', 'Changes to Terms')}
                </h2>
              </div>
            </div>

            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.changesDesc', 'We reserve the right to modify these Terms of Service at any time. We will notify users of material changes by:')}
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>{t('terms.emailNotification', 'Sending an email notification')}</li>
              <li className={styles.listItem}>{t('terms.appNotification', 'Posting a notice in the app')}</li>
              <li className={styles.listItem}>{t('terms.websiteUpdate', 'Updating the effective date on our website')}</li>
            </ul>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('terms.continuedUse', 'Your continued use of HyperApp after the effective date of changes constitutes acceptance of the modified terms.')}
            </p>
          </section>



        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            {t('terms.footer', 'These Terms of Service constitute the entire agreement between you and HyperApp regarding the use of our services.')}
          </p>
          <p className={styles.footerVersion}>
            {t('terms.version', 'Version 1.0 - November 15, 2025')}
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
            {t('common.accept', 'Accept Terms of Service')}
          </Button>
        </div>

      </div>
    </Modal>
  );
};

export default TermsOfServiceModal;
