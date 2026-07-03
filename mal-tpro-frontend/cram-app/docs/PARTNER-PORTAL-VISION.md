# Partner Portal Vision & Design Principles

The **Partner Portal** (`localhost:5174/partner`) is the central collaboration hub between our organization and our regulated partners worldwide. Its purpose is not simply to collect documents—it is to establish continuous trust, transparency, and compliance throughout the entire partnership lifecycle.

Every design decision, workflow, feature, and user interaction should support the following objectives.

## Primary Mission

Build a platform that enables us to perform comprehensive partner due diligence before onboarding and continuously monitor partners after onboarding to ensure they maintain the same high compliance standards that we expect from our own organization.

The platform should help us:

- Mitigate regulatory, financial crime, operational, and reputational risk.
- Verify that partners maintain effective AML, CTF, sanctions, fraud, compliance, and governance controls.
- Ensure partners are not knowingly or unknowingly facilitating financial crime through our ecosystem.
- Maintain an auditable record of ongoing oversight throughout the entire partnership lifecycle.

## Product Philosophy

The experience should feel less like completing compliance paperwork and more like progressing through a collaborative trust journey.

Partners should always understand:

- where they are,
- what has been completed,
- what remains outstanding,
- why each request is required,
- and how close they are to becoming fully approved.

The interface should feel modern, intuitive, engaging, and effortless while maintaining enterprise-grade security and regulatory integrity.

## User Experience Principles

The portal should be:

- Simple and intuitive for first-time users.
- Fast and efficient for returning partners.
- Mobile-friendly and responsive.
- Visually engaging without compromising professionalism.
- Accessible and easy to navigate.
- Consistent across every page and workflow.
- Built with minimal friction and clear guidance.

Avoid overwhelming users with long forms. Instead, divide the experience into logical, manageable steps with clear progress indicators and contextual explanations.

## Gamification

Introduce subtle gamification to improve engagement while maintaining a professional regulatory tone.

Examples include:

- Trust Score
- Compliance Health Score
- Partnership Readiness Meter
- Completion Percentage
- Achievement badges for completed milestones
- Progress checkpoints
- Success animations when sections are completed
- Clear indicators showing outstanding actions

The objective is to motivate partners to complete requirements rather than making compliance feel burdensome.

## End-to-End Partner Lifecycle

The platform should support the complete partner journey, including:

### 1. Partner Onboarding

- Registration
- Initial due diligence
- KYB
- Risk assessment
- Document collection
- Approval workflow

### 2. Ongoing Monitoring

Support continuous oversight after onboarding, including:

- Periodic reviews
- Risk reassessments
- Annual certifications
- Compliance attestations
- Document renewals
- Control testing
- Performance monitoring

### 3. Quarterly Mystery Shopper Programme

Provide a dedicated module to:

- Schedule Mystery Shopper exercises.
- Record findings.
- Track remediation actions.
- Measure partner performance over time.
- Compare historical results.
- Generate management reports.

## Secure Collaboration Hub

The portal should become the single source of truth for communication between our organization and each partner.

Include secure capabilities for:

- Regulatory announcements
- Compliance updates
- Policy acknowledgements
- Secure messaging
- Legal correspondence
- Requests for information
- Evidence submission
- Task management
- Notifications
- Audit trail of all communications

## Legal & Regulatory Requests

Partners should be able to securely receive and respond to requests such as:

- Law enforcement requests
- Subpoenas
- Court orders
- Production orders
- Interdiction requests
- Regulatory inquiries
- Information requests
- Urgent compliance actions

Every request should have secure workflows, deadlines, status tracking, document exchange, approvals, and a complete audit history.

## Compliance Framework

Ensure the portal aligns with applicable international standards and best practices, including:

- AML/CFT regulations
- Sanctions compliance
- Financial crime prevention
- FATF Recommendations
- FFIEC guidance (where applicable)
- Relevant local regulatory requirements in each operating jurisdiction
- Data protection and privacy obligations
- Third-party risk management best practices

## Quality Expectations

Every component of the portal should be:

- Accurate
- Consistent
- Well-designed
- Easy to understand
- Operationally practical
- Audit-ready
- Scalable
- Secure
- Fully traceable
- Supported by comprehensive audit logs and evidence

Whenever a new feature is introduced, evaluate whether it strengthens partner oversight, improves compliance, reduces operational risk, enhances the user experience, or simplifies ongoing collaboration. Features that do not contribute to these objectives should be reconsidered.

## North Star

Ultimately, the Partner Portal should become more than a compliance system—it should serve as a trusted partnership ecosystem that enables secure collaboration, continuous regulatory oversight, proactive risk management, and long-term confidence between our organization and every partner worldwide.

## Implementation anchor (codebase)

| Asset | Path |
|---|---|
| Partner UI (single-file platform) | `partner/Mal_ThirdParty_Risk_Oversight_Platform.jsx` |
| CRAM shell + routing | `src/pages/PartnerPlatformPage.tsx`, `src/App.tsx` (`/partner`) |
| TPRO API (controls, cases, reg-changes, intelligence) | `../../backend/` via Vite proxy `/tpro-api` |
| Partner theme | `src/styles/partner-theme.css` |
| Integration config | `src/config/partnerIntegration.ts` |

When extending the portal, read this document first, then `AGENTS.md` and `CLAUDE.md` in the backend repo.
