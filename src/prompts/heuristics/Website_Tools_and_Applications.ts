// Website Tools and Applications

export const UserCenteredDesignSkill = `
<skill_name>User-Centered Design</skill_name>
<description>Trigger this skill when designing the core workflow, content strategy, navigation, and feedback loops of a web application to ensure usability.</description>
<heuristics>
1. **Goal-Oriented Workflow:** Provide only the features that support genuine user needs. Gently guide users through linear, expected workflows. Do not force users to name projects before creating them, and never show incomplete or unavailable options.
2. **Contextual Grouping:** Show features and data that must be used together on the same screen, but avoid cramming the entire application onto a single screen. 
3. **Speak the User's Language:** Use clear, straightforward labels. Avoid technical jargon (e.g., "plug-in", "toggle", "Flash") and invented marketing words. Group similar items logically.
4. **Clear Navigation Affordances:** Visually indicate what is clickable. Never hide navigational links behind graphics or rely on words that automatically disappear or change. Ensure vertical or angled text is avoided for readability.
5. **Immediate, Proximal Feedback:** Provide immediate visual feedback to acknowledge user input. Place interactive controls and their resulting display areas in close physical proximity so changes aren't overlooked. Highlight selected areas clearly.
</heuristics>
`;

export const AttractingVisitorsSkill = `
<skill_name>Attracting Visitors & Quality</skill_name>
<description>Trigger this skill when establishing the application's tone, initial impressions, and overall quality assurance.</description>
<heuristics>
1. **Match Audience Tone:** Ensure the visual style, motion, and tone match the target audience (e.g., avoid child-like animations for adult tools).
2. **Explicit Value Proposition:** Immediately communicate the application's purpose and rationale so users understand the benefit of investing their time.
3. **Provide Complete Results:** Give useful, thorough results and recommendations. If selling products, show prices immediately without requiring extra clicks.
4. **Strict Quality Assurance:** Ensure all application results perfectly match user input. Fix technical bugs, ensure load stability, and guarantee that all on-screen instructions are 100% accurate.
</heuristics>
`;

export const ObjectOrientedControlSkill = `
<skill_name>Object-Oriented Control</skill_name>
<description>Trigger this skill when building configurators, drawing tools, or applications where users manipulate, resize, or rotate objects.</description>
<heuristics>
1. **Simple Drag-and-Drop:** Keep drag-and-drop mechanics simple and discoverable. Detect where users intend to place objects and auto-snap them to assist alignment.
2. **Smart Object Creation:** Stagger new objects so they don't stack invisibly on top of each other. Use transparency or strict z-index layering rules to prevent smaller objects from being permanently hidden.
3. **Intuitive Resizing:** Allow objects to resize only in the direction they are being pulled. Use directional arrows that map to the dimension changing (e.g., up/down arrows for height), regardless of how the object is rotated.
4. **Easy Rotation:** Make rotation controls obvious. Offer common preset angles (45, 90, 180 degrees) rather than forcing exact degree inputs. Never auto-rotate objects unnecessarily.
5. **Visible Workspaces & Choices:** Clearly label the dimensions of spatial work areas. Do not hide object palettes or tool choices inside nested tabs or menus.
</heuristics>
`;

export const PresentationSkill = `
<skill_name>Presentation (Motion, Sound, Visuals)</skill_name>
<description>Trigger this skill when making decisions about animation, audio, typography, scrollbars, and imagery.</description>
<heuristics>
1. **Restrained Motion & Sound:** Avoid gratuitous motion, continuous slow fading, or unexpected audio. Provide an obvious way to mute sound. Use subtle audio or motion strictly for functional feedback (e.g., snapping an object into place).
2. **Legible Typography & Color:** Never use tiny fonts (< 11pt). Ensure high contrast between text and backgrounds, present product colors accurately, and avoid using transparent overlays for menus or field labels.
3. **Standardized Scrolling:** Provide recognizable scrollbars with sliders that indicate the relative length of the list. Ensure click zones are large, let users control scroll speed, and never show a scrollbar if there is nothing to scroll.
4. **Meaningful Visuals:** Do not make links look like banner ads. Use widely recognized icons and label them if their meaning isn't universally obvious. Avoid blurred, faded, or purely decorative images in favor of realistic, highly informative photos and diagrams.
</heuristics>
`;

export const ImplementationNutsAndBoltsSkill = `
<skill_name>Implementation Nuts & Bolts</skill_name>
<description>Trigger this skill when architecting browser behaviors, load times, saving states, and peripheral input interactions.</description>
<heuristics>
1. **Browser Integration:** Avoid opening new browser windows; if required, use a moderate size and force it to the front. 
2. **Optimized Loading:** Auto-detect capabilities and bandwidth without forcing unnecessary plug-in downloads. Minimize load times, preload elements, and show accurate progress bars rather than distracting placeholder screens.
3. **Data Persistence & Output:** Automatically save user preferences/data using cookies. Provide explicit, easy-to-use options for saving, printing, emailing, and bookmarking exact locations within the application.
4. **Forgiving Interactions:** Support double-clicking, create generous click/tap zones, ensure users can tab through form fields logically, and carefully control hover states so menus don't trigger or vanish accidentally.
</heuristics>
`;

export const UserAssistanceSkill = `
<skill_name>User Assistance</skill_name>
<description>Trigger this skill when designing help menus, on-screen instructions, tutorials, and error recovery flows.</description>
<heuristics>
1. **Unobtrusive Help:** Make help features noticeable but provide them *only* when the user explicitly asks. Address real, documented user problems using plain, non-technical language.
2. **Concise Instructions:** Keep on-screen instructions short, simple, and highly visible. Provide good, realistic examples to demonstrate functionality.
3. **User-Controlled Tutorials:** Use realistic, scenario-based tutorials. Let the user control the pace (avoid auto-advancing or relentless "Next" buttons), show progress, and remove distracting background music.
4. **Constructive Error Recovery:** Support "Undo" and ensure the browser's Back button works without wiping data. Provide constructive, noticeable error messages precisely at the point of the error, showing all errors at once if on a single page.
</heuristics>
`;

export const ApplicationSpecificsSkill = `
<skill_name>Application Specifics (Maps & Registration)</skill_name>
<description>Trigger this skill when building interactive maps, locator tools, or registration/login flows.</description>
<heuristics>
1. **Obvious Map Controls:** Provide an obvious way to pan and zoom maps. Show the overview map first, then zoom directly to the user's place of interest. Provide simple legends and always include a distance scale.
2. **Accessible Locations:** Never hide location names. Provide alternative ways to find locations (like search boxes or alphabetical lists) when map pins are too dense to label.
3. **Minimize Registration:** Avoid requiring registration if possible. If unavoidable, keep it short, simple, and clearly distinct from the returning-user login area.
4. **Clear Confirmation:** Give highly noticeable feedback upon successful registration or project saving.
5. **Proper Localization:** Ensure the application is culturally and linguistically localized for international users (avoiding hard-coded English text or format assumptions in foreign markets).
</heuristics>
`;

export const RIAAcessibilitySkill = `
<skill_name>Rich Internet Application (RIA) Accessibility</skill_name>
<description>Trigger this skill when ensuring highly interactive, visual, or Flash/Canvas-like applications are usable for people with disabilities (screen readers, screen magnifiers).</description>
<heuristics>
1. **Provide Accessible Alternatives:** Provide fully functional HTML/non-visual alternatives. Place the link to the alternate format in the upper left corner so screen readers find it immediately.
2. **Stable Interfaces:** Avoid opening animations/splash pages, or at least represent their meaning in text. Provide static navigation that doesn't disappear/reappear, and let users control how long text remains on screen.
3. **Logical Screen Reader Flow:** Accurately name all elements (do not let screen readers default to "button"). Ensure the tab order reads text and controls in a logical, conversational sequence.
4. **High-Contrast Visuals:** Use strong contrast and clean fonts. Do not gray-out critical information or overlap transparent menus. Include detailed text descriptions for all products and essential images.
5. **Proximal Feedback:** Ensure that visual responses to user actions happen in close proximity to the cursor/focus point, so screen magnifier users do not miss the feedback. Isolate activity to one area of the screen to prevent disorientation.
</heuristics>
`;