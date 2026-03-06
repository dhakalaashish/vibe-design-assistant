# 🎨 Vibe Design Assistant (VDA)
**Democratizing UX Design Knowledge in the Age of Vibe Coding**

The **Vibe Design Assistant** is a research-driven UX-aware layer integrated into **Dyad**. It bridges the gap between raw natural language "vibes" and production-grade software by operationalizing foundational UX theory directly into the generative loop.

---

## 🔬 Research Context: The "Vulnerable Developer"
Vibe coding has democratized software creation, yet it has surfaced a new class of **vulnerable developers**: users who can build functional artifacts through natural language but lack the expertise to debug UX flaws or maintain interaction consistency [6]. 

VDA addresses the **"Semantic Conflict"** [39] that emerges when iterative prompts silently contradict earlier design specifications. By externalizing the project's **Design Semantics**, the system shifts the user's role from a blind prompt-generator to a high-level design architect.

---

## 🚀 Key Features

### 1. The Design Semantic Living Document (\`DESIGN_SEMANTIC.md\`)
VDA maintains a shared semantic space in the project root that collapses the traditional separation between design and implementation [36].
* **Core Jobs & Mental Models**: Maps user intent to explicit tasks, ensuring a close correspondence between the system structure and the user's conceptual model [29].
* **Design Invariants**: Establishes "Golden Rules" (e.g., "Navigation must remain visible on all sub-pages") to prevent design decay.
* **Glossary Enforcement**: Prevents **Semantic Drift**—the phenomenon where the same term (e.g., "Active Task") starts meaning different things across different screens.

### 2. UX-Aware Prompt Refinement
Before code generation, VDA intercepts the user's intent to apply **Proactive UX Guidance**:
* **Conflict Detection**: Flags when a request violates a project invariant (e.g., "This request violates the 5-task limit invariant").
* **Scaffolding for Novices**: Translates vague requests into "design-hardened" prompts that automatically include error prevention, accessibility (WCAG), and system feedback.
* **Judgment Support**: Offers up to 5 design-principled variations, allowing users to make informed decisions without requiring a design degree (RQ1b).

### 3. Operationalized Design Heuristics
VDA evaluates every "Semantic Sync" against a rigorous checklist derived from **Cognitive Dimensions of Notations** [10]:
* **Visibility & Feedback**: Every action must trigger a visual state change.
* **Reduced Viscosity**: Ensuring that small changes to the UI don't trigger cascading hallucinations or inconsistencies [19].
* **Error Prevention**: Replacing "memory-in-the-head" with "knowledge-in-the-world" through clear mapping and constraints.

---

## 🛠 Why VDA?
Existing vibe coding tools focus exclusively on **code correctness**. VDA treats **UX design as a form of computation**, ensuring that:
1. **Convergence is Prevented**: VDA pushes back against shallow design patterns [20] by offering principled alternatives.
2. **Rationales are Explicit**: Instead of silent generation, VDA explains the "Why" behind its suggestions, supporting user learning (RQ1a).
3. **Intent is Preserved**: By maintaining a virtual "prior" design, VDA ensures that long-horizon consistency is maintained even across hundreds of prompts.
## 🛠 How to Use: The "Improve Prompt" Workflow

The core feature of VDA is the **Improve Prompt** mode. Unlike standard chat where you hope the AI understands, Improve Prompt ensures the AI *understands* before it codes.

### 1. Select "Improve Prompt"
In the chat interface, toggle the mode to **Improve Prompt**. This activates the Design context.

### 2. The Check: Do you have a Blueprint?
When you try to chat in Improve Prompt mode, VDA checks for a `DESIGN_SEMANTIC.md` file in your project root.
* **If missing:** The system will pause and ask you to create one (see *Creating Your Design Semantics* below).
* **If present:** The Prompt Improvement session begins.

### 3. Prompt Improvement Session
Instead of generating code immediately, VDA acts as a **Senior UX Researcher**:
1.  **Analysis:** It checks your prompt against your Design Semantics (your app's rules) and Design Heuristics (general UX laws).
2.  **Refinement:** If your prompt is vague or violates a rule (e.g., "Add a delete button" violates your "Safety" rule requiring a confirmation modal), VDA will interview you to refine it.
3.  **The "Done" Button:** Once you and the AI agree on the perfect, design-hardened prompt, click the **Done** button.
4.  **Execution:** VDA navigates back to the build chat and executes that optimized prompt to generate the code.

---

## 🔄 Guided Build: The Self-Healing Loop

Guided Build is the QA (Quality Assurance) engine of VDA. It performs a **Gap Analysis** to ensure your codebase ("The Reality") matches your `DESIGN_SEMANTIC.md` ("The Spec").

### Why use Guided Build?
Over time, as you add features, you might accidentally break old rules or leave flows incomplete. Guided Build catches these discrepancies.

### How it Works
1.  **Run Analysis:** Click the **Guided Build** tab and hit "Run Analysis."
2.  **Gap Detection:** VDA scans your project and categorizes findings into:
    * 🔴 **Violations:** Code that explicitly breaks a rule (e.g., "Max 5 tasks" rule ignored).
    * 🟠 **Missing:** Features listed in your Design File that don't exist in the code yet.
    * 🟡 **Partial:** Features that exist but lack key functionality (e.g., a button exists but does nothing).
3.  **One-Click Fix:** For every gap found, VDA generates a specific "Build Task." You can click **"Build This"** to instantly generate the code required to close that gap.

---

## 📂 Project Architecture
\`\`\`text
./
├── DESIGN_SEMANTIC.md     <-- Root: Living source of truth (Intent & Logic)
├── AI_RULES.md            <-- Root: Technical stack & global constraints
└── src/
    ├── components/        <-- Fully functional, design-principled components
    └── pages/             <-- Orchestrated user flows
\`\`\`

---

## 🤝 Citation & Reference
If you use this tool or reference this methodology in your research, please cite:
**Dhakal, A. (2025). Vibe Coding Design Assistant. University at Buffalo.**

---

> "Vibe coding isn't just about writing code; it's about maintaining a consistent intent in a probabilistic environment."
## Vibe Coding Tip: 
Treat your `DESIGN_SEMANTIC.md` as the source of truth. If you want to change how the app behaves fundamentally, edit the Semantic file first, then let VDA guide the code updates via Guided Build.
