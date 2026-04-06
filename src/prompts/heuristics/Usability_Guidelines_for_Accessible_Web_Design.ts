// Usability Guidelines for Accessible Web Design
export const GoodDesignRulesSkill = `
<skill_name>Good Design Rules</skill_name>
<description>Trigger this skill for foundational, high-level design decisions to ensure universal usability.</description>
<heuristics>
1. **Follow Basic Design Rules:** Adhere to established principles of simplicity, clarity, and user-centered design, as good general design inherently improves accessibility.
</heuristics>
`;

export const GraphicsAndMultimediaSkill = `
<skill_name>Graphics and Multimedia</skill_name>
<description>Trigger this skill when incorporating images, animations, or multimedia elements.</description>
<heuristics>
1. **Minimize Graphic Use:** Reduce reliance on graphics to improve performance and decrease noise for screen readers.
2. **Explicit Labeling:** Give all graphics (including ad banners) understandable names. Use \`alt\` text for brief descriptions and the \`longdesc\` attribute for thorough details.
3. **Never Blur for Unavailability:** Remove unavailable options completely rather than blurring them, which confuses users with low vision.
4. **Textual Counterparts:** Always provide the information contained in useful graphics as accessible text, and clearly refer users to these alternate text sources.
5. **Avoid Shrunk Images:** Do not shrink down pictures of actual pages to use as graphics or buttons; they become illegible or deceptive when magnified.
6. **Ensure Crispness:** Only use crisp, clear images to ensure they remain legible under magnification.
7. **Multimedia Opt-Out:** Make it exceptionally easy for users to skip multimedia and Flash demos.
8. **Avoid Automatic Text-Only Sites:** Strive to make the primary graphical site accessible rather than defaulting to a segregated text-only version.
</heuristics>
`;

export const PopupsAndMenusSkill = `
<skill_name>Pop-up Windows, Rollover Text, New Windows, and Cascading Menus</skill_name>
<description>Trigger this skill when designing navigation menus, tooltips, or dynamic window behaviors.</description>
<heuristics>
1. **Avoid Pop-ups and New Windows:** Prevent unexpected window spawns that disorient assistive technology users. 
2. **Forgiving Defaults:** If dialog boxes must be used, ensure the default action is the safest/most forgiving.
3. **Provide Return Paths:** If opening a new window is unavoidable, always provide a simple, explicit way back to the main homepage.
4. **No Essential Rollovers:** Do not rely on rollover (hover) text to convey important information, as it is inaccessible to screen magnifiers and keyboard users.
5. **Flatten Navigation:** Avoid cascading menus; use flat, clickable menu structures instead.
</heuristics>
`;

export const LinksAndButtonsSkill = `
<skill_name>Links and Buttons</skill_name>
<description>Trigger this skill when formatting hyperlinks and call-to-action buttons.</description>
<heuristics>
1. **Limit Link Density:** Restrict the number of links on a single page to avoid overwhelming screen reader users.
2. **Sufficient Target Size:** Avoid tiny text for links and very small buttons. 
3. **Spaced Elements:** Leave ample whitespace between links and buttons to prevent accidental misclicks by users with motor skill challenges.
4. **Text Link Preference:** Avoid using images as the sole method for linking. Create text links inline where it makes sense, and use distinct buttons only when necessary.
5. **Unique Command Links:** Ensure important commands are isolated as their own unique links.
6. **Underline All Links:** Always underline text links so they remain identifiable regardless of color contrast or magnification.
</heuristics>
`;

export const PageOrganizationSkill = `
<skill_name>Page Organization</skill_name>
<description>Trigger this skill when planning page layouts, DOM structure, and site hierarchy.</description>
<heuristics>
1. **Immediate Identification:** Confirm the company name and page identity immediately upon loading (e.g., at the top of the DOM).
2. **Distinct Logo Naming:** Do not use the word "homepage" as the \`alt\` text for your company logo across all pages.
3. **Minimize Scrolling:** Reduce the need for excessive vertical and horizontal scrolling.
4. **Group Choices:** Keep all user options/choices in the same visual vicinity. Warn users that a choice is coming and announce how many options exist.
5. **Consistent Design:** Keep page layouts and navigation structures consistent across the entire site.
6. **Enable Skipping:** Implement invisible "Skip Links" so screen reader users can bypass repetitive navigational elements.
7. **Logical URLs:** Choose simple, informative URLs and maintain them in the address field after loading.
</heuristics>
`;

export const InterveningPagesSkill = `
<skill_name>Intervening Pages</skill_name>
<description>Trigger this skill when evaluating user flows, onboarding, or entry points to the application.</description>
<heuristics>
1. **No Splash Pages:** Avoid superfluous splash or cover pages. The very first page should clearly describe the company and site.
2. **Streamlined Steps:** Include only strictly necessary steps and pages in any user flow.
</heuristics>
`;

export const FormsAndFieldsSkill = `
<skill_name>Forms and Fields</skill_name>
<description>Trigger this skill when building data entry interfaces and user forms.</description>
<heuristics>
1. **Minimal Collection:** Limit required information to the absolute minimum.
2. **Vertical Stacking:** Stack fields in a vertical column; avoid side-by-side layouts.
3. **Proximity of Labels and Buttons:** Put text labels directly adjacent to their fields. Place "Go" or "Submit" buttons as close as possible to the final input field.
4. **Pre-Field Instructions:** Put any specific instructions pertaining to a field *before* the field, not after it.
5. **Standardized Inputs:** Offer standard, single-field entry boxes for phone numbers instead of fragmented boxes.
6. **Accessible Validation:** Do not rely solely on red text/yellow highlighting for errors, or solely on asterisks (*) for required fields.
7. **Logical Tab Sequencing:** Ensure the tab order is logical and strictly matches the visual layout.
8. **Generous Timeouts:** Provide ample time before triggering security timeouts, as data entry is slower for assistive tech users.
</heuristics>
`;

export const PresentingTextSkill = `
<skill_name>Presenting Text</skill_name>
<description>Trigger this skill for typography, copywriting, and color choices for text.</description>
<heuristics>
1. **High Contrast:** Choose text and background colors with high contrast. Never rely on a background image to provide contrast with text.
2. **Readable Sizing:** Do not use very small body text or subtle, muted text for headings and categories.
3. **Magnifier Compatibility:** Test fonts with screen magnifiers and ensure the site allows for relative text scaling/magnification.
4. **Concise Copywriting:** Write concisely and remove superfluous, irrelevant text to reduce "ear fatigue" for screen readers.
5. **Pronounceable Acronyms:** If a name includes an initialism or acronym, instruct screen readers on how to pronounce it using appropriate HTML tags.
6. **Minimize Distracting Punctuation:** Rethink and reduce the use of parentheses and asterisks, which disrupt the natural reading flow of screen readers.
</heuristics>
`;

export const SearchSkill = `
<skill_name>Search</skill_name>
<description>Trigger this skill when designing search bars, query handling, and search result pages.</description>
<heuristics>
1. **Universal Availability:** Provide a search box in a predictable spot; do not rely solely on a browsing directory interface.
2. **Forgiving Queries:** Offer a search engine that forgives spelling errors (e.g., "Did you mean?").
3. **Clear Results:** Clearly describe search results, announcing the total number found at the top. Do not present relevance rankings in a data table.
4. **Handle Empty Queries:** Explicitly inform users if they have accidentally submitted an empty search box.
</heuristics>
`;

export const ShoppingSkill = `
<skill_name>Shopping</skill_name>
<description>Trigger this skill when creating e-commerce flows, product catalogs, and checkout systems.</description>
<heuristics>
1. **Thorough Descriptions:** Describe images of items for sale as thoroughly as if there were no images at all.
2. **Proximal Actions:** Position "Add to Cart" and "Checkout" buttons very close to the items for purchase (consider placing them at both the top and bottom of the page).
3. **Logical Continuations:** Help users continue shopping seamlessly by routing them back to a main category page, rather than the specific item page, after adding an item to their cart.
4. **Clear Terminology:** Use clear international e-commerce terms. Use the HTML \`LANG\` attribute if mixing English terms into non-English sites.
</heuristics>
`;

export const TablesAndFramesSkill = `
<skill_name>Tables and Frames</skill_name>
<description>Trigger this skill when utilizing HTML tables, column layouts, or frames.</description>
<heuristics>
1. **Semantic Tables Only:** Avoid using tables for aesthetic page layout. 
2. **Minimize Large Tables:** Avoid large data tables. If necessary, provide the same information in a linear text format.
3. **Explicit Table States:** Never use graphics (like icons or checkboxes) to indicate states like yes/no or on/off in tables; use explicit text.
4. **Table Summaries:** Always use attributes to summarize the content and structure of tables before the data begins.
5. **Screen Reader Alignment:** Ensure that visible alphabetic lists in tables exactly match the linear reading order a screen reader will process.
6. **Magnifier-Safe Columns:** Critically evaluate column layouts to ensure they don't force screen magnifier users into excessive horizontal panning.
7. **Describe Frames:** Explicitly title and describe all frames if they must be used.
</heuristics>
`;

export const TrustStrategyImageSkill = `
<skill_name>Trust, Strategy, and Company Image</skill_name>
<description>Trigger this skill for content related to customer support, corporate policies, and inclusive copywriting.</description>
<heuristics>
1. **Inclusive Language:** Always use person-first language (e.g., "people in wheelchairs" rather than "wheelchairs", or "screen reader users" rather than "screen readers").
2. **Capable Support:** Ensure the site is supported by customer service representatives who are trained in basic accessibility issues to assist users when digital barriers fail.
</heuristics>
`;

