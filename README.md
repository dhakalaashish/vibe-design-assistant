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