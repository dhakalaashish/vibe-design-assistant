// UX Design for Seniors (Ages 65 and older)
export const OlderAdultUsabilitySkill = `
<skill_name>Design for Older Adults (65+)</skill_name>
<description>Trigger this skill when the app's target audience includes adults aged 65 and older, or when prioritizing accessibility for users with declining vision, hearing, or manual dexterity.</description>
<heuristics>
1. **Optimize Readability:** Enforce high color contrast and large default font sizes across all viewports. Strictly avoid thin, light-colored, or low-contrast text, particularly on mobile interfaces.
2. **Enlarge Interactive Targets:** Size all clickable elements (buttons, links, dropdowns) to generously accommodate reduced manual dexterity. Space out interactive elements to prevent accidental "fat-finger" clicks.
3. **Ensure Forgiving Inputs:** Allow flexible data entry formats (e.g., accepting phone numbers or credit cards with or without spaces, parentheses, or hyphens). Provide multiple ways to input data (e.g., allow typing dates instead of forcing finicky scroll-wheel selectors).
4. **Design Prominent, Plain-Language Error Handling:** Write clear, precise error messages free of technical jargon. Place them prominently near the source of the error so they are not easily overlooked in a visually busy interface. Make recovery as simple as possible.
5. **Minimize Disruptive Elements:** Eliminate startling sounds, auto-playing media, and intrusive pop-ups or ads that can cause apprehension, frustration, or wasted time.
6. **Use Inclusive Content Strategy:** Avoid alienating older demographics with overly youth-centric jargon or treating them as a stereotyped niche. Design for a capable, independent user base that values utility and straightforward navigation.
</heuristics>
`;

export const MobileSeniorUsabilitySkill = `
<skill_name>Mobile & Touch Design for Older Adults (60+)</skill_name>
<description>Trigger this skill when the application is designed for mobile devices, relies heavily on touchscreen interactions, and targets users aged 60 and older.</description>
<heuristics>
1. **Label All Icons (Critical):** Never rely solely on visual iconography. Explicitly pair every icon and button with a clear, unambiguous text label so its function is immediately understandable.
2. **Replace Complex Gestures (Critical):** Eliminate the requirement for complex touch gestures (swiping, pinching, double-tapping). Replace them with clear, single-tap button alternatives. 
3. **Maximize Visual Prominence (Critical):** Enforce strict high-contrast rules for interactive elements. Standardize primary action buttons using bright, distinct colors, particularly in Dark Mode where subtle shades cause elements to blend into the background.
4. **Reduce Cognitive Overload:** Hide irrelevant or secondary information by default. Group primary functional buttons logically and consistently (e.g., grouped on one side of the screen) to simplify navigation and decision-making.
5. **Supplement with Voice Input:** Provide voice control or dictation alternatives to standard touch inputs to accommodate users with declining fine motor skills (e.g., tremors or arthritis).
6. **Provide Ubiquitous Help:** Include easily discoverable contextual help options or guidance on every screen to prevent frustration when a user becomes disoriented.
</heuristics>
`;

export const ARSeniorUsabilitySkill = `
<skill_name>Augmented Reality (AR) Design for Older Adults</skill_name>
<description>Trigger this skill when generating, evaluating, or refining prompts for Augmented Reality (AR), Virtual Reality (VR), or mixed-reality spatial applications targeting users aged 65 and older.</description>
<heuristics>
1. **Safe Environmental Augmentation (Critical):** Virtual elements must never obscure essential real-world objects, hazards, or information. Organize digital content in logical spatial layers based on immediate user goals to avoid visual clutter.
2. **High-Visibility Spatial UI (Critical):** Use oversized virtual objects and typography. Enforce strict high contrast (minimum 7:1 ratio). Avoid sudden, drastic changes in screen brightness, as older eyes require more time to adapt to light changes.
3. **Physical and Cognitive Economy:** Minimize the physical movement, reaching, and number of interaction steps required to complete tasks, unless the explicit purpose of the application is physical exercise.
4. **Forgiving Temporal & Spatial Interactions:** Design for slower reaction times and reduced motor precision. Apply Fitts's Law strictly: make interactive targets large and space them adequately to prevent misclicks. Prevent aggressive automatic screen timeouts.
5. **Multimodal Feedback Channels:** Communicate critical information through redundant sensory modalities (visual cues + audio prompts + haptic vibration) to accommodate varying sensory declines, but allow users to toggle these easily to prevent sensory overload.
6. **Gestalt & Familiarity Mapping:** Rely on intuitive, real-world physical metaphors rather than abstract digital concepts. Use text labels instead of ambiguous icons. Group related spatial elements closely (proximity) to reduce cognitive load.
7. **Transparent & Optional Data Privacy:** Clearly communicate data collection purposes in plain language within the UI. Whenever possible, provide a functional, non-personalized "guest" mode that does not require the input of sensitive personal data to operate.
8. **Meaningful & Adaptable Gamification:** If applying gamification, avoid fast-paced, high-pressure, or randomly generated challenges. Focus on meaningful goals, clear rewards, optional social/multiplayer connectivity, and allowing the user to adapt the difficulty.
</heuristics>
`;