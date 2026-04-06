// B2B Websites

export const B2BWorkflowsAndArchitectureSkill = `
<skill_name>B2B Workflows & Information Architecture</skill_name>
<description>Trigger this skill when designing deep, multi-level user flows and overall system architecture for complex B2B applications and long buying cycles.</description>
<heuristics>
1. **Align with Professional Mental Models:** Structure the information architecture to match the professional tasks and logic of the industry, prioritizing functionality, scalability, and accuracy over pure aesthetics or emotional appeal.
2. **Support Deep User Flows:** Design for hierarchical, multi-stage tasks. Provide robust navigation (breadcrumbs, contextual menus) that allows users to transition smoothly between generalized overviews and detailed editing.
3. **Preserve System States:** Support continuous operations in high-load environments by implementing automatic saving, draft management, and the ability to return to previous stages without data loss.
4. **Address Both "Users" and "Choosers":** Create workflows and content that speak to two distinct audiences: the daily operators who need efficiency and usability, and the decision-makers/leadership who need technical specifications, comparison charts, and ROI justification.
5. **Support Long Buying Cycles:** Optimize the experience to support collaborative purchasing processes, allowing users to build shortlists, share options with colleagues, and easily return to paused workflows.
</heuristics>
`;

export const B2BFormsAndDataEntrySkill = `
<skill_name>B2B Form Design & Data Entry</skill_name>
<description>Trigger this skill when building complex data-entry interfaces, lead-generation forms, or high-volume transactional screens in a B2B environment.</description>
<heuristics>
1. **Optimize for Repeatability and Speed:** Design forms to support high-speed data entry for expert users. Provide keyboard shortcuts, logical tab indexing, and streamlined repetitive actions.
2. **Implement Real-Time Validation:** Provide instant, contextual feedback and real-time data validation to prevent errors before submission, which is critical in high-risk, professional environments.
3. **Design for Task Logic, Not Database Structure:** Structure form fields to match the logical sequence of the user's task, rather than mirroring the backend database architecture.
4. **Balance Lead Generation:** Create lead-generation forms that encourage conversions by asking only for necessary information, reducing friction for prospects entering the sales funnel.
</heuristics>
`;

export const B2BCustomizationAndRolesSkill = `
<skill_name>B2B Personalization, Customization & Roles</skill_name>
<description>Trigger this skill when determining user permissions, dashboards, and role-specific interface adaptations in B2B systems.</description>
<heuristics>
1. **Role-Specific Customization:** Adapt panels, filters, data entry templates, and visualizations to meet the exact needs of specific professional roles (e.g., analyst vs. logistician vs. financial manager).
2. **Reduce Information Noise:** Use personalization to hide irrelevant functional modules based on the user's previous actions, preferences, or current task context, thereby reducing cognitive load.
3. **Support Expert Interaction:** Provide system flexibility and shortcuts for experienced users. Ensure full transparency of the system's logic so professionals maintain analytical control over their workflows.
4. **Empower User Configuration:** Allow professional users to customize interaction elements (like toolbars and data visualization filters) to match their specific organizational standards or daily habits.
</heuristics>
`;

export const B2BContentAndDecisionSupportSkill = `
<skill_name>B2B Content & Decision Support</skill_name>
<description>Trigger this skill when designing product/service pages, pricing models, and post-sale support resources for B2B buyers.</description>
<heuristics>
1. **Clarify Complex Pricing:** Display complex pricing scenarios transparently so business customers can accurately calculate costs across different tiers, seats, or usage models.
2. **Facilitate Robust Comparisons:** Build detailed comparison charts that allow buyers to weigh complex technical specifications and features side-by-side.
3. **Provide Tangible Proof of Value:** Integrate case studies, white papers, and technical documentation directly into the user journey to showcase expertise and prove business benefits.
4. **Support Post-Sale Maintenance:** Design the interface to serve as an ongoing resource for existing customers, providing easy access to technical support, account management, and self-service troubleshooting.
</heuristics>
`;

export const B2BUXEvaluationSkill = `
<skill_name>B2B SaaS UX Evaluation (Dual-Track)</skill_name>
<description>Trigger this skill when establishing methodologies for evaluating and tracking the user experience of B2B SaaS products, especially when access to external users is limited.</description>
<heuristics>
1. **Leverage Internal Heuristic Evaluations (Track 1):** When external user testing is restricted due to confidentiality or recruitment challenges, use trained internal evaluators to review the interface against established usability heuristics, prioritizing issues by severity and frequency.
2. **Monitor Long-Term Metrics (Track 2):** B2B SaaS products require continuous evaluation. Use the Goals-Signals-Metrics (GSM) framework to map specific business and user goals to trackable UX signals and measurable metrics over time.
3. **Map Complex User Roles:** Use service design tools like Contextual Personas and User Journey Maps to accurately capture and visualize the highly diversified goals, competencies, and operational patterns of B2B stakeholders.
4. **Target Professional Scenarios:** Conduct usability testing (via observation, action logging, and "think aloud" protocols) based strictly on real, complex professional scenarios rather than generalized usability tasks.
</heuristics>
`;
