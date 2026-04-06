// Mobile Intranets and Enterprise Apps

export const MobileEnterpriseTaskFlowSkill = `
<skill_name>Mobile Enterprise Task Flow</skill_name>
<description>Trigger this skill when designing workflows, navigation, and process architecture for mobile enterprise and intranet applications.</description>
<heuristics>
1. **Fix Broken Processes First:** Do not blindly port desktop workflows to mobile. Streamline and redesign the offline or desktop process before mobilizing it.
2. **Progressive Disclosure:** Pare down screen elements to the absolute basics. Hide secondary details and deeper functionality behind extra taps to keep initial screens uncluttered.
3. **Make Smart Assumptions:** Auto-select or remember the user's context (e.g., their current physical location, recently used items, or active scenario) to save time and reduce repetitive selections.
4. **Chunk Content and Tasks:** Break complex tasks into sequential, bite-sized screens rather than relying on long, infinitely scrolling forms.
</heuristics>
`;

export const MobileDataEntryInteractionSkill = `
<skill_name>Mobile Data Entry & Interaction</skill_name>
<description>Trigger this skill when creating forms, input fields, and interactive touch elements for mobile enterprise applications.</description>
<heuristics>
1. **Minimize Typing on Glass:** Replace free-text entry fields with selection lists, type-ahead/auto-suggestions, and pre-populated data wherever possible to reduce input errors.
2. **Trigger Correct Keyboards:** Automatically invoke the appropriate native keyboard (e.g., numeric pad for quantities, alphanumeric for text) based on the specific data field.
3. **Exploit Native Device Features:** Integrate deeply with native OS capabilities like click-to-dial for phone numbers, GPS/maps for routing, and the native camera for documentation.
4. **Ensure Legible Typography:** Default to larger text sizes (e.g., 16px baseline) to prevent squinting in the field. Truncate long labels strategically (e.g., left-to-right priority) and use ellipses for overflow.
5. **Design "Blind Thumb" Targets:** For repetitive, high-frequency actions in the field, design massive tap targets that users can confidently strike without diverting their visual attention to the screen.
</heuristics>
`;

export const MobilePerformanceOfflineSkill = `
<skill_name>Mobile Performance & Offline Resilience</skill_name>
<description>Trigger this skill when architecting data fetching, loading states, and connectivity handling for mobile enterprise apps.</description>
<heuristics>
1. **Plan for Connectivity Outages:** Enterprise apps must be resilient in the field. Design apps to save state, store data locally (e.g., in-browser databases), and sync asynchronously so work is not lost when cellular signals drop.
2. **Optimize Load Times:** Keep pages lightweight by minimizing server calls, combining graphical assets into sprites, and minifying code to accommodate metered bandwidth and weak connections.
3. **Load Contextually:** Restrict initial data downloads to the immediate physical context (e.g., load only the 10 closest locations or 8 most recent news items). Rely on explicit user action ("Load More") to fetch additional data.
</heuristics>
`;

export const MobileFirstTestingScalingSkill = `
<skill_name>Mobile-First Testing & Scaling</skill_name>
<description>Trigger this skill when establishing the design philosophy, prototyping, and testing phases for cross-device enterprise applications.</description>
<heuristics>
1. **Design Mobile First:** Start designing for the smallest screen and most constrained environment first, then use progressive enhancement to scale the UI for tablets and desktops.
2. **Test on Real Devices Early:** Do not rely solely on desktop emulators or browser resizing. Test interactions, tap targets, and performance on actual physical devices as early as the HTML/CSS prototype phase.
3. **Use Physical-Scale Prototypes:** When sketching ideas, use 3x5 index cards for early paper prototyping, as they accurately mimic the physical dimensions and constraints of a smartphone in the user's hand.
</heuristics>
`;
