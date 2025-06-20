-- Update Terms of Service page content
UPDATE pages 
SET content = '# Terms of Service

Last updated: February 4, 2024

## 1. Agreement to Terms

By accessing and using AfriTix''s services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you disagree with any part of these terms, you may not use our services.

## 2. Use License

Permission is granted to temporarily access AfriTix services for personal, non-commercial transactional use only.

## 3. User Accounts

3.1. You must provide accurate and complete information when creating an account.
3.2. You are responsible for maintaining the security of your account credentials.
3.3. You must notify us immediately of any unauthorized access to your account.

## 4. Ticket Purchases

4.1. All ticket sales are final unless otherwise stated by the event organizer.
4.2. Tickets may not be resold without explicit permission.
4.3. AfriTix reserves the right to cancel tickets obtained in violation of these terms.

## 5. Payment Terms

5.1. All prices are in XOF unless otherwise stated.
5.2. Payment processing fees are non-refundable.
5.3. We use secure payment processors to handle transactions.

## 6. Refund Policy

6.1. Refunds are subject to event organizer policies.
6.2. Processing fees are non-refundable.
6.3. Cancelled events will be fully refunded.

## 7. Event Organizer Terms

7.1. Organizers must provide accurate event information.
7.2. Organizers are responsible for their event''s compliance with local laws.
7.3. AfriTix may remove events that violate our policies.

## 8. Intellectual Property

8.1. Our platform and content are protected by copyright and other laws.
8.2. Users may not copy or modify the platform without permission.

## 9. Limitation of Liability

9.1. AfriTix is not responsible for event cancellations or changes.
9.2. We are not liable for damages exceeding ticket purchase amounts.

## 10. Privacy

Your use of AfriTix is also governed by our Privacy Policy.

## 11. Governing Law

These terms are governed by the laws of Burkina Faso.

## 12. Changes to Terms

We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting.',
meta_title = 'Terms of Service - AfriTix',
meta_description = 'Read AfriTix''s terms of service. Learn about ticket purchases, refunds, user accounts, and more.',
published = true
WHERE slug = 'terms-of-service';

-- Update Privacy Policy page content
UPDATE pages 
SET content = '# Privacy Policy

Last updated: February 4, 2024

## 1. Introduction

AfriTix ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and protect your information.

## 2. Information We Collect

### 2.1 Personal Information
- Name and contact details
- Email address
- Phone number
- Payment information
- Location data
- Device information

### 2.2 Usage Data
- Browser type and version
- Access times and dates
- Pages viewed
- Interaction patterns

## 3. How We Use Your Information

We use your information to:
- Process ticket purchases
- Send order confirmations
- Provide customer support
- Send event updates
- Improve our services
- Prevent fraud

## 4. Data Protection

### 4.1 Security Measures
- Encryption of sensitive data
- Regular security audits
- Secure payment processing
- Access controls

### 4.2 Data Retention
We retain your data only as long as necessary for:
- Legal requirements
- Business operations
- Fraud prevention

## 5. Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Request data deletion
- Object to processing
- Data portability

## 6. Cookies

We use cookies to:
- Maintain your session
- Remember preferences
- Analyze usage patterns
- Improve performance

## 7. Third-Party Services

We may share data with:
- Payment processors
- Analytics providers
- Email service providers
- Event organizers

## 8. International Transfers

Data may be processed in:
- Burkina Faso
- Other African countries
- Cloud service locations

## 9. Children''s Privacy

We do not knowingly collect data from children under 13.

## 10. Changes to This Policy

We may update this policy periodically. Changes will be posted on this page.

## 11. Contact Us

For privacy questions, contact:
Email: privacy@afritix.com
Address: 123 Innovation Hub, Ouagadougou, Burkina Faso',
meta_title = 'Privacy Policy - AfriTix',
meta_description = 'Learn how AfriTix collects, uses, and protects your personal information. Read our comprehensive privacy policy.',
published = true
WHERE slug = 'privacy-policy';

-- Insert if not exists
INSERT INTO pages (title, slug, content, meta_title, meta_description, published)
SELECT 'Terms of Service', 'terms-of-service', content, meta_title, meta_description, published
FROM pages WHERE slug = 'terms-of-service'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO pages (title, slug, content, meta_title, meta_description, published)
SELECT 'Privacy Policy', 'privacy-policy', content, meta_title, meta_description, published
FROM pages WHERE slug = 'privacy-policy'
ON CONFLICT (slug) DO NOTHING;