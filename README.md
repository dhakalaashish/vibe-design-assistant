# 🎨 Vibe Design Assistant (VDA)
**Your UX Lead for Vibe Coding**

Welcome to the **Vibe Design Assistant**, a specialized layer integrated into **Dyad**.

Vibe coding is powerful, but it often leads to "drift"—where your app works, but the UX feels inconsistent, or the AI forgets core rules you set three days ago. VDA fixes this by introducing **Design Semantics**: a living blueprint of your application that ensures every line of code generated aligns with your specific vision and universal UX best practices.

---

## ⚡️ Quick Start

Get the assistant running locally with your Dyad instance.

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/dhakalaashish/vibe-design-assistant.git
    cd vibe-design-assistant
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Start the Application**
    ```bash
    npm start
    ```

---

## 🛠 How to Use: The "Guided Build" Workflow

The core feature of VDA is the **Guided Build** mode. Unlike standard chat where you hope the AI understands, Guided Build ensures the AI *understands* before it codes.

### 1. Select "Guided Build"
In the chat interface, toggle the mode to **Guided Build**. This activates the Design context.

### 2. The Check: Do you have a Blueprint?
When you try to chat in Guided Build mode, VDA checks for a `DESIGN_SEMANTIC.md` file in your project root.
* **If missing:** The system will pause and ask you to create one (see *Creating Your Design Semantics* below).
* **If present:** The Prompt Improvement session begins.

### 3. Prompt Improvement Session
Instead of generating code immediately, VDA acts as a **Senior UX Researcher**:
1.  **Analysis:** It checks your prompt against your Design Semantics (your app's rules) and Design Heuristics (general UX laws).
2.  **Refinement:** If your prompt is vague or violates a rule (e.g., "Add a delete button" violates your "Safety" rule requiring a confirmation modal), VDA will interview you to refine it.
3.  **The "Done" Button:** Once you and the AI agree on the perfect, design-hardened prompt, click the **Done** button.
4.  **Execution:** VDA navigates back to the build chat and executes that optimized prompt to generate the code.

---

## 🔄 Auto Build: The Self-Healing Loop

Auto Build is the QA (Quality Assurance) engine of VDA. It performs a **Gap Analysis** to ensure your codebase ("The Reality") matches your `DESIGN_SEMANTIC.md` ("The Spec").

### Why use Auto Build?
Over time, as you add features, you might accidentally break old rules or leave flows incomplete. Auto Build catches these discrepancies.

### How it Works
1.  **Run Analysis:** Click the **Auto Build** tab and hit "Run Analysis."
2.  **Gap Detection:** VDA scans your project and categorizes findings into:
    * 🔴 **Violations:** Code that explicitly breaks a rule (e.g., "Max 5 tasks" rule ignored).
    * 🟠 **Missing:** Features listed in your Design File that don't exist in the code yet.
    * 🟡 **Partial:** Features that exist but lack key functionality (e.g., a button exists but does nothing).
3.  **One-Click Fix:** For every gap found, VDA generates a specific "Build Task." You can click **"Build This"** to instantly generate the code required to close that gap.

---

## 📄 Creating Your Design Semantics (`DESIGN_SEMANTIC.md`)

The `DESIGN_SEMANTIC.md` file is the brain of your application. It acts as an interface between **you** and the **platform**. It contains your screen lists, user flows, core jobs, and unchangeable rules.

If you don't have one, VDA offers two ways to create it:

### Option A: Build Together (Recommended for New Apps)
* **Best for:** Starting from scratch or when the current code doesn't match your vision.
* **How it works:** The AI interviews you. It asks about your users, your goals, and your desired flows. It then compiles a structured semantic file that represents your *vision*, not just code.

### Option B: Infer from Code
* **Best for:** Importing an existing codebase.
* **How it works:** The AI scans your `src/` folder, analyzes your components and routing, and reverse-engineers the Design Semantics. This helps you understand the "vibe" of an app you didn't write yourself.

---

## 🧠 Core Concepts

To master VDA, it helps to understand the two types of intelligence it uses:

### 1. Design Semantics (App-Specific)
These are the **"Laws of Your App."**
* *Example:* "This Task App allows max 5 active items," or "The primary color is Neon Blue."
* These are unique to your project. VDA ensures new features never contradict these rules.

### 2. Design Heuristics (General UX Laws)
These are the **"Laws of Good Software."**
* *Example:* "Always provide feedback after a user action," or "Error messages must be helpful, not generic."
* VDA uses a concept derived from **Anthropic Skills** to categorize these heuristics. Based on what you are building (e.g., a Dashboard vs. a Social Feed), VDA filters and extracts the relevant heuristics to check your prompts against.

---

## 📂 Architecture

```text
./
├── DESIGN_SEMANTIC.md    <-- The "Contract" between you and the AI.
├── src/
│   ├── components/       <-- Components generated using the Semantic file.
│   └── pages/            <-- Screens defined in the Semantic file.
```

## Vibe Coding Tip: 
Treat your `DESIGN_SEMANTIC.md` as the source of truth. If you want to change how the app behaves fundamentally, edit the Semantic file first, then let VDA guide the code updates via Auto Build.
