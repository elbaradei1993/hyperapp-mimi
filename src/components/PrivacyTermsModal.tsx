import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './shared/Modal';

interface PrivacyTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyTermsModal: React.FC<PrivacyTermsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();

  const privacyContent = (
    <div style={{ lineHeight: '1.6', color: 'var(--text-primary)' }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: 'var(--text-primary)',
        marginBottom: '16px',
        borderBottom: '2px solid var(--accent-primary)',
        paddingBottom: '8px'
      }}>
        Privacy Policy
      </h3>

      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          <strong>Last Updated:</strong> October 31, 2025
        </p>
        <p style={{ fontSize: '14px', marginBottom: '16px' }}>
          This Privacy Policy describes how HyperApp ("we," "us," or "our") collects, uses, discloses, and safeguards your information when you use our community safety and vibe mapping platform (the "Service").
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          1. Information We Collect
        </h4>
        <h5 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          1.1 Personal Information
        </h5>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          We may collect the following personal information:
        </p>
        <ul style={{
          fontSize: '14px',
          marginLeft: '20px',
          marginBottom: '12px',
          listStyleType: 'disc'
        }}>
          <li>Name, email address, and phone number</li>
          <li>Location data (GPS coordinates and addresses)</li>
          <li>Profile information and preferences</li>
          <li>Device information and usage data</li>
          <li>Communication data (reports, messages, and feedback)</li>
        </ul>

        <h5 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          1.2 Automatically Collected Information
        </h5>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          We automatically collect certain information when you use our Service:
        </p>
        <ul style={{
          fontSize: '14px',
          marginLeft: '20px',
          marginBottom: '12px',
          listStyleType: 'disc'
        }}>
          <li>Device information (IP address, browser type, operating system)</li>
          <li>Usage data (pages visited, features used, time spent)</li>
          <li>Location data from your device</li>
          <li>Cookies and similar tracking technologies</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          2. How We Use Your Information
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          We use collected information for the following purposes:
        </p>
        <ul style={{
          fontSize: '14px',
          marginLeft: '20px',
          marginBottom: '12px',
          listStyleType: 'disc'
        }}>
          <li>Provide and maintain our community safety services</li>
          <li>Process and display safety reports and vibe data</li>
          <li>Send notifications and alerts about safety concerns</li>
          <li>Improve and personalize your experience</li>
          <li>Communicate with you about updates and features</li>
          <li>Ensure platform security and prevent abuse</li>
          <li>Comply with legal obligations</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          3. Information Sharing and Disclosure
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          We may share your information in the following circumstances:
        </p>
        <ul style={{
          fontSize: '14px',
          marginLeft: '20px',
          marginBottom: '12px',
          listStyleType: 'disc'
        }}>
          <li><strong>Emergency Situations:</strong> With emergency services when safety is at risk</li>
          <li><strong>Legal Requirements:</strong> When required by law or to protect rights</li>
          <li><strong>Service Providers:</strong> With trusted third parties who assist our operations</li>
          <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
          <li><strong>With Your Consent:</strong> When you explicitly agree to sharing</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          4. Data Security
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          5. Your Rights and Choices
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          Depending on your location, you may have the following rights:
        </p>
        <ul style={{
          fontSize: '14px',
          marginLeft: '20px',
          marginBottom: '12px',
          listStyleType: 'disc'
        }}>
          <li><strong>Access:</strong> Request access to your personal information</li>
          <li><strong>Correction:</strong> Request correction of inaccurate information</li>
          <li><strong>Deletion:</strong> Request deletion of your personal information</li>
          <li><strong>Portability:</strong> Request transfer of your data</li>
          <li><strong>Opt-out:</strong> Opt-out of certain data processing activities</li>
          <li><strong>Location Data:</strong> Control location sharing in app settings</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          6. Data Retention
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. Safety reports and emergency data may be retained longer for community safety purposes.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          7. International Data Transfers
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during such transfers.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          8. Children's Privacy
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          9. Changes to This Privacy Policy
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          10. Contact Us
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          If you have any questions about this Privacy Policy, please contact us at:
        </p>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          Email: privacy@hyperapp.com<br />
          Address: [Company Address]
        </p>
      </div>
    </div>
  );

  const termsContent = (
    <div style={{ lineHeight: '1.6', color: 'var(--text-primary)' }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: 'var(--text-primary)',
        marginBottom: '16px',
        borderBottom: '2px solid var(--accent-primary)',
        paddingBottom: '8px'
      }}>
        Terms of Service
      </h3>

      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          <strong>Last Updated:</strong> October 31, 2025
        </p>
        <p style={{ fontSize: '14px', marginBottom: '16px' }}>
          These Terms of Service ("Terms") govern your use of HyperApp, a community safety and vibe mapping platform ("Service") operated by HyperApp ("we," "us," or "our").
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          1. Acceptance of Terms
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, you may not access the Service.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          2. Description of Service
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          HyperApp is a community-driven platform that allows users to:
        </p>
        <ul style={{
          fontSize: '14px',
          marginLeft: '20px',
          marginBottom: '12px',
          listStyleType: 'disc'
        }}>
          <li>Report safety concerns and emergency situations</li>
          <li>Share community vibe and atmosphere information</li>
          <li>Access real-time safety data and community insights</li>
          <li>Connect with local community members</li>
          <li>Receive safety alerts and notifications</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          3. User Accounts
        </h4>
        <h5 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          3.1 Account Creation
        </h5>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          To use certain features of our Service, you must create an account. You agree to:
        </p>
        <ul style={{
          fontSize: '14px',
          marginLeft: '20px',
          marginBottom: '12px',
          listStyleType: 'disc'
        }}>
          <li>Provide accurate and complete information</li>
          <li>Maintain the security of your account credentials</li>
          <li>Notify us immediately of any unauthorized use</li>
          <li>Be responsible for all activities under your account</li>
        </ul>

        <h5 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          3.2 Account Termination
        </h5>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          We reserve the right to terminate or suspend your account at our discretion, with or without cause, and with or without notice.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          4. User Conduct and Content
        </h4>
        <h5 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          4.1 Prohibited Activities
        </h5>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          You agree not to:
        </p>
        <ul style={{
          fontSize: '14px',
          marginLeft: '20px',
          marginBottom: '12px',
          listStyleType: 'disc'
        }}>
          <li>Submit false or misleading reports</li>
          <li>Harass, threaten, or intimidate other users</li>
          <li>Post inappropriate, offensive, or illegal content</li>
          <li>Impersonate others or provide false information</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Use the Service for commercial purposes without permission</li>
          <li>Violate any applicable laws or regulations</li>
        </ul>

        <h5 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          4.2 Content Ownership
        </h5>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          By submitting content to our Service, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content in connection with the Service.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          5. Emergency Reporting
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          Our Service includes emergency reporting features. While we strive to respond quickly to emergency situations, we cannot guarantee response times or outcomes. In case of immediate danger, always contact local emergency services directly.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          6. Privacy and Data
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          7. Disclaimers and Limitations
        </h4>
        <h5 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          7.1 Service Availability
        </h5>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          We strive to provide reliable service but cannot guarantee uninterrupted or error-free operation. The Service is provided "as is" and "as available."
        </p>

        <h5 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          7.2 Accuracy of Information
        </h5>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          While we make efforts to ensure the accuracy of community reports and data, we cannot guarantee the completeness, accuracy, or reliability of user-generated content.
        </p>

        <h5 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          7.3 Limitation of Liability
        </h5>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          8. Indemnification
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          You agree to indemnify and hold us harmless from any claims, damages, losses, or expenses arising from your use of the Service or violation of these Terms.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          9. Termination
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including breach of these Terms.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          10. Governing Law
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          These Terms shall be governed by and construed in accordance with the laws of [Jurisdiction], without regard to its conflict of law provisions.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          11. Changes to Terms
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the Service.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          12. Contact Information
        </h4>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          If you have any questions about these Terms, please contact us at:
        </p>
        <p style={{ fontSize: '14px', marginBottom: '12px' }}>
          Email: legal@hyperapp.com<br />
          Address: [Company Address]
        </p>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Terms of Service"
      size="md"
    >
      <div style={{
        maxHeight: '70vh',
        overflowY: 'auto',
        padding: '0 4px'
      }}>
        {privacyContent}
        <hr style={{
          border: 'none',
          borderTop: '1px solid var(--border-color)',
          margin: '30px 0'
        }} />
        {termsContent}
      </div>
    </Modal>
  );
};

export default PrivacyTermsModal;
