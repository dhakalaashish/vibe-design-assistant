// Strategic Design for FAQs

export const FAQUXDesignSkill = `
<skill_name>FAQ UX & Content Strategy</skill_name>
<description>Trigger this skill when designing, writing, or structuring a Frequently Asked Questions (FAQ) section, knowledge base, or customer support portal.</description>
<heuristics>
1. **Align with Customer Support:** Base FAQs on the actual, real-world queries fielded by your sales and support teams. Put a UX researcher in charge of routing these insights to product teams.
2. **Don't Band-Aid Bad UI:** Do not use FAQs as a long-term patch for poor user interfaces or confusing information architecture; fix the root usability problems instead.
3. **Support Complex UIs Visually:** If interfaces are inherently complex, link to explanatory media, tutorials, or use annotated screenshots rather than relying purely on text descriptions.
4. **Frictionless Feedback:** Make it extremely easy and pleasant for users to ask questions or report bugs directly from the FAQ without requiring them to register or log in.
5. **Track and Escalate:** Measure incoming questions over time to validate improvements, and establish a rapid-escalation process for urgent, high-impact issues.
6. **Establish Context First:** Always answer the fundamental "What is it?" question first to orient users who parachute into your FAQ directly from an external web search.
7. **Use the User's Vocabulary:** Write questions exactly as users ask them, using their exact terminology to match search queries and mental models.
8. **Link to External Authority:** Do not duplicate effort; link out to well-done, authoritative third-party content when it provides the best answer.
9. **Provide Comprehensive Resources:** Put help at the user's fingertips by embedding links to related manuals, tutorials, support contact info, and community forums directly within the answers.
10. **Maintain Content Freshness:** Regularly prune the FAQ to remove outdated answers, eliminate duplicates, and ensure the information lifecycle remains active.
11. **Prioritize by Demand:** Order the FAQ intelligently, placing the most frequently needed and highly sought-after answers at the very top of the list.
12. **Chunk by Topic:** Divide large, diverse FAQs into distinct, logical categories with a clear table of contents or an annotated index.
13. **Contextual Placement:** Place specific FAQ content directly on the website pages that generate those questions, while providing a link back to the master FAQ.
14. **Differentiate Formats:** Clearly distinguish curated, official company FAQs from open community Q&A forums so users know the authoritative source of the answer.
15. **Direct and Decisive Answers:** For closed-ended questions, start the answer immediately with a clear "Yes," "No," or "It depends."
16. **Empathetic and Plain Language:** Adopt a friendly, personable tone. Use plain language, keeping in mind that the reader may be frustrated or have a limited vocabulary.
17. **Scannable Question Phrasing:** Avoid repeating the same starting words across a list of questions so users can easily scan for information-carrying keywords.
18. **Favor Lists Over Paragraphs:** Never write a dense paragraph when the information can be formatted as a highly scannable bulleted or numbered list.
19. **Footer Placement:** Always place a link to the FAQ in the site's footer, which is where users naturally look when they are lost or seeking help.
20. **Jump Links for Efficiency:** Use jump links (anchor links) at the top of single-page FAQs to let users bypass scrolling and jump directly to relevant answers.
21. **"Back to Top" Affordances:** Provide "Top" or "Back to Top" links after each answer section so users don't have to scroll manually back to the index.
22. **Contextual Cross-Linking:** Link directly to the specific tools, forms, or resources mentioned in the answer rather than just referencing them by name.
23. **Clear Visual Affordances:** Ensure links look like links. Use a dedicated link color, and ensure that bullet icons or thumbnails next to topics are also clickable targets.
24. **Generous Accordion Targets:** If using accordions to hide answers, make the entire question row (not just the +/- icon) clickable to expand the content.
25. **Provide "Expand All" Controls:** For accordion-based FAQs, include "Expand All" and "Collapse All" controls to facilitate visual scanning and browser "Find on Page" (Ctrl+F) functionality.
26. **Accessible Search Tools:** If the FAQ includes a search bar, label the button clearly (e.g., "Search FAQs") and place field labels outside of the input box, not as disappearing placeholder text.
27. **Semantic HTML Structure:** Use proper heading tags (H1, H2, H3) to chunk content so screen reader users can efficiently skim the document structure.
28. **No JavaScript Dependency:** Ensure the FAQ and its expandable sections remain readable and navigable even if JavaScript fails or is disabled in the browser.
29. **Descriptive Link Text:** Never use generic link text like "click here" or "more info." Use descriptive phrases so users and search engines understand the destination.
30. **Optimize for Search Queries:** Spell out "Frequently Asked Questions" in the main heading and use the acronym "FAQ" in the page title and meta-description. 
31. **High-Contrast, Scalable Typography:** Use high-contrast colors (pass the squint/grayscale test) and base font sizes of 12-14pt that wrap cleanly and can be easily enlarged by the user.
32. **Strong Visual Hierarchy:** Use varying heading sizes, font weights, and ample whitespace to create a clear visual hierarchy instead of relying purely on numbering.
33. **Avoid False Bottoms:** Do not use heavy horizontal lines or excessive vertical whitespace to separate sections, as they can create an "illusion of completeness" that stops users from scrolling.
34. **Single-Column Layout:** Use a single-column layout for FAQs to optimize readability and predictable scanning. Avoid truncating answers just to make a layout look attractive.
35. **Feedback Loops:** Include mechanisms to collect data on answer quality (e.g., "Was this helpful?") and allow users to report unhelpful or outdated content for continuous quality control.
</heuristics>
`;