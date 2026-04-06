import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, FileCode2, Settings2, AlertTriangle, AlertCircle, Plus, Upload } from "lucide-react";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import React, { useState, useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useLoadAppFile } from "@/hooks/useLoadAppFile";
import { useTheme } from "@/contexts/ThemeContext";
import { Circle, Save } from "lucide-react";
import "@/components/chat/monaco";
import { IpcClient } from "@/ipc/ipc_client";
import { showError, showSuccess, showWarning } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { useSettings } from "@/hooks/useSettings";
import { useCheckProblems } from "@/hooks/useCheckProblems";
import { getLanguage } from "@/utils/get_language";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

// --- DYNAMIC IMPORTS ---
// Import all your raw heuristic files here
import * as B2B_Websites from "@/prompts/heuristics/B2B_Websites";
import * as Customization_Features from "@/prompts/heuristics/Customization_Features";
import * as FAQs from "@/prompts/heuristics/FAQs";
import * as Mobile_Internet_and_Enterprise_Apps from "@/prompts/heuristics/Mobile_Internet_and_Enterprise_Apps";
import * as Usability_Guidelines_for_Accessible_Web_Design from "@/prompts/heuristics/Usability_Guidelines_for_Accessible_Web_Design";
import * as UX_Design_for_Seniors from "@/prompts/heuristics/UX_Design_for_Seniors";
import * as Website_Tools_and_Applications from "@/prompts/heuristics/Website_Tools_and_Applications"; // Assuming this is the filename for the last block

// Map them to an object where the key represents the filename
const RAW_HEURISTIC_MODULES: Record<string, any> = {
  B2B_Websites,
  Customization_Features,
  FAQs,
  Mobile_Internet_and_Enterprise_Apps,
  Usability_Guidelines_for_Accessible_Web_Design,
  UX_Design_for_Seniors,
  Website_Tools_and_Applications
};

// --- TYPES & INTERFACES ---
export interface DesignFileEditorProps {
  appId: number | null;
  filePath: string;
}

interface BreadcrumbProps {
  path: string;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  isSaving: boolean;
}

interface HeuristicSkill {
  name: string;
  description: string;
  heuristics: string;
}

interface HeuristicCategory {
  id: string;
  name: string;
  skills: HeuristicSkill[];
}

// --- PARSING LOGIC ---
const parseSkillString = (rawStr: string): HeuristicSkill | null => {
  const regex = /<skill_name>([\s\S]*?)<\/skill_name>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<heuristics>([\s\S]*?)<\/heuristics>/;
  const match = regex.exec(rawStr);
  if (match) {
    return {
      name: match[1].trim(),
      description: match[2].trim(),
      heuristics: match[3].trim(),
    };
  }
  return null;
};

const buildCategoriesFromModules = (modulesMap: Record<string, any>): HeuristicCategory[] => {
  return Object.entries(modulesMap).map(([fileName, exports]) => {
    // Replace underscores with spaces for the title
    const title = fileName.replace(/_/g, " ");
    
    // Parse all exported strings in this module
    const skills = Object.values(exports)
      .filter((val): val is string => typeof val === "string")
      .map(str => parseSkillString(str))
      .filter((skill): skill is HeuristicSkill => skill !== null);

    return {
      id: fileName.toLowerCase(),
      name: title,
      skills
    };
  }).filter(cat => cat.skills.length > 0);
};

// Dynamically generate the initial state instead of hardcoding JSON
const INITIAL_CATEGORIES = buildCategoriesFromModules(RAW_HEURISTIC_MODULES);


// --- COMPONENTS ---
const Breadcrumb: React.FC<BreadcrumbProps> = ({ path, hasUnsavedChanges, onSave, isSaving }) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1 overflow-hidden">
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSave}
                disabled={!hasUnsavedChanges || isSaving}
                className="h-6 w-6 p-0"
              >
                <Save size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasUnsavedChanges ? "Save changes" : "No unsaved changes"}
            </TooltipContent>
          </Tooltip>
          {hasUnsavedChanges && <Circle size={8} fill="currentColor" className="text-amber-600 dark:text-amber-400" />}
        </div>
      </div>
    </div>
  );
};

const DesignFileEditor = ({ appId, filePath }: DesignFileEditorProps) => {
  const { content, loading, error } = useLoadAppFile(appId, filePath);
  const { theme } = useTheme();
  const [value, setValue] = useState<string | undefined>(undefined);
  const [displayUnsavedChanges, setDisplayUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { settings } = useSettings();
  
  const originalValueRef = useRef<string | undefined>(undefined);
  const editorRef = useRef<any>(null);
  const isSavingRef = useRef<boolean>(false);
  const needsSaveRef = useRef<boolean>(false);
  const currentValueRef = useRef<string | undefined>(undefined);

  const queryClient = useQueryClient();
  const { checkProblems } = useCheckProblems(appId);

  useEffect(() => {
    if (content !== null) {
      setValue(content);
      originalValueRef.current = content;
      currentValueRef.current = content;
      needsSaveRef.current = false;
      setDisplayUnsavedChanges(false);
      setIsSaving(false);
    }
  }, [content, filePath]);

  useEffect(() => {
    setDisplayUnsavedChanges(needsSaveRef.current);
  }, [needsSaveRef.current]);

  const isDarkMode = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const editorTheme = isDarkMode ? "dyad-dark" : "dyad-light";

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.onDidBlurEditorText(() => {
      if (needsSaveRef.current) saveFile();
    });
  };

  const handleEditorChange = (newValue: string | undefined) => {
    setValue(newValue);
    currentValueRef.current = newValue;
    const hasChanged = newValue !== originalValueRef.current;
    needsSaveRef.current = hasChanged;
    setDisplayUnsavedChanges(hasChanged);
  };

  const saveFile = async () => {
    if (!appId || !currentValueRef.current || !needsSaveRef.current || isSavingRef.current) return;
    try {
      isSavingRef.current = true;
      setIsSaving(true);
      const ipcClient = IpcClient.getInstance();
      const { warning } = await ipcClient.editAppFile(appId, filePath, currentValueRef.current);
      await queryClient.invalidateQueries({ queryKey: ["versions", appId] });
      if (settings?.enableAutoFixProblems) checkProblems();
      if (warning) showWarning(warning);
      else showSuccess("File saved");

      originalValueRef.current = currentValueRef.current;
      needsSaveRef.current = false;
      setDisplayUnsavedChanges(false);
    } catch (error: any) {
      showError(error);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading file content...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;
  if (!content) return <div className="p-4 text-gray-500">No content available</div>;

  return (
    <div className="h-full flex flex-col">
      <Breadcrumb path={filePath} hasUnsavedChanges={displayUnsavedChanges} onSave={saveFile} isSaving={isSaving} />
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage={getLanguage(filePath)}
          value={value}
          theme={editorTheme}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            fontFamily: "monospace",
            fontSize: 13,
            lineNumbers: "on",
          }}
        />
      </div>
    </div>
  );
};

export const DesignHeuristicsTab = ({ app }: { app: any }) => {
  const appId = useAtomValue(selectedAppIdAtom);
  const [activeDoc, setActiveDoc] = useState<string>("app-specific");
  
  // Initialize with dynamically parsed modules
  const [categories, setCategories] = useState<HeuristicCategory[]>(INITIAL_CATEGORIES);
  const [selectedHeuristics, setSelectedHeuristics] = useState<Set<string>>(
    new Set(INITIAL_CATEGORIES.map(cat => cat.id)) // Default all to checked, or pick specific ones
  );

  // Import State
  const [importTitle, setImportTitle] = useState("");
  const [importText, setImportText] = useState("");

  const hasHeuristicsFile = app?.files?.includes("docs/app_design_heuristic.md");
  const hasSemanticFile = app?.files?.includes("DESIGN_SEMANTIC.md");

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setSelectedHeuristics(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCompile = () => {
    // TODO: Wire this up to streamMessage
    console.log("Compiling heuristics using:", Array.from(selectedHeuristics));
  };

  const handleImportDocument = () => {
    if (!importTitle.trim() || !importText.trim()) {
      showError("Please provide a title and paste the raw document.");
      return;
    }

    const newSkills: HeuristicSkill[] = [];
    const regex = /<skill_name>([\s\S]*?)<\/skill_name>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<heuristics>([\s\S]*?)<\/heuristics>/g;
    
    let match;
    let found = false;
    while ((match = regex.exec(importText)) !== null) {
      found = true;
      newSkills.push({
        name: match[1].trim(),
        description: match[2].trim(),
        heuristics: match[3].trim(),
      });
    }

    if (!found) {
      showError("Could not find any <skill_name>, <description>, or <heuristics> tags in the pasted text.");
      return;
    }

    const newCategory: HeuristicCategory = {
      id: importTitle.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now(),
      name: importTitle,
      skills: newSkills
    };

    setCategories([...categories, newCategory]);
    setSelectedHeuristics(prev => new Set(prev).add(newCategory.id));
    setImportTitle("");
    setImportText("");
    setActiveDoc(newCategory.id);
    showSuccess(`Imported ${newSkills.length} skills into new tab.`);
  };

  const renderActiveContent = () => {
    if (activeDoc === "app-specific") {
      if (hasHeuristicsFile) {
        return (
          <div className="relative h-full">
             <div className="absolute inset-0 z-10 bg-transparent cursor-not-allowed" title="This file is auto-generated and read-only."></div>
             <div className="h-full pointer-events-none opacity-90">
               <DesignFileEditor appId={appId} filePath="docs/app_design_heuristic.md" />
             </div>
          </div>
        );
      } else if (!hasSemanticFile) {
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground animate-in fade-in">
              <FileCode2 size={64} className="mb-6 opacity-20" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">Design Semantics Required</h2>
              <p className="max-w-md text-sm leading-relaxed mb-6">
                  You need to establish your core Design Semantics first before the AI can generate App Specific Design Heuristics.
              </p>
          </div>
        );
      } else {
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground animate-in fade-in">
              <BookOpen size={64} className="mb-6 text-primary opacity-50" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">Generate App Specific Design Heuristics</h2>
              <p className="max-w-xl text-sm leading-relaxed mb-6">
                  <strong>Design Heuristics</strong> are broad rules of thumb for UI/UX design. 
                  Generating an app-specific file translates your exact Design Semantics into actionable, tailored evaluation criteria for this specific project.
              </p>
              <Button size="lg" onClick={() => console.log("Trigger Generation")}>Generate App Specific Design Heuristics</Button>
          </div>
        );
      }
    }

    if (activeDoc === "import-raw") {
      return (
        <div className="flex flex-col h-full p-6 bg-background animate-in fade-in overflow-y-auto">
          <div className="max-w-3xl w-full mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Upload className="w-6 h-6 text-primary" />
                Import Raw Document
              </h2>
              <p className="text-muted-foreground text-sm">
                Paste your raw codebase heuristics containing the <code>&lt;skill_name&gt;</code>, <code>&lt;description&gt;</code>, and <code>&lt;heuristics&gt;</code> tags.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tab / File Name</label>
                <input 
                  type="text"
                  placeholder="e.g., Security & Authentication"
                  className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && importText.trim()) handleImportDocument();
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Raw Output</label>
                <textarea 
                  className="w-full min-h-[400px] rounded-md border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="export const AuthSkill = `\n<skill_name>...</skill_name>\n<description>...</description>\n<heuristics>...</heuristics>\n`;"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
              </div>

              <Button onClick={handleImportDocument} className="w-full" size="lg">
                Convert to Tab
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const category = categories.find(c => c.id === activeDoc);
    if (category) {
      return (
        <div className="h-full overflow-y-auto p-6 bg-muted/5">
          <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold tracking-tight">{category.name}</h2>
              <p className="text-muted-foreground">
                This framework contains {category.skills.length} core heuristic skill{category.skills.length !== 1 && 's'}. 
                Check the box in the sidebar to include these rules during app-specific compilation.
              </p>
            </div>
            
            <div className="grid gap-6">
              {category.skills.map((skill, idx) => (
                <Card key={idx} className="shadow-sm border-border/50">
                  <CardHeader className="bg-muted/30 pb-4">
                    <CardTitle className="text-lg text-primary">{skill.name}</CardTitle>
                    <CardDescription className="text-sm text-foreground/80 mt-1 leading-relaxed">
                      {skill.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-loose">
                      {skill.heuristics}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* LEFT SIDEBAR: Navigation & Checklists */}
      <div className="w-72 flex-shrink-0 border-r border-border bg-muted/10 flex flex-col">
        {/* Main App Specific Button */}
        <div className="p-3 border-b border-border">
          <Button
            variant={activeDoc === "app-specific" ? "default" : "outline"}
            className="w-full justify-start gap-2 shadow-sm"
            onClick={() => setActiveDoc("app-specific")}
          >
            <FileCode2 size={16} />
            App Specific Heuristics
          </Button>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Base Frameworks
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => setActiveDoc("import-raw")}
            title="Import Raw Document"
          >
            <Plus size={14} />
          </Button>
        </div>

        {/* Document Checklist */}
        <div className="flex-1 overflow-y-auto">
          {categories.map(doc => (
            <div
              key={doc.id}
              onClick={() => setActiveDoc(doc.id)}
              className={`flex items-center justify-between px-4 py-3 cursor-pointer border-l-2 transition-colors ${
                activeDoc === doc.id
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <BookOpen size={16} className={`flex-shrink-0 ${activeDoc === doc.id ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm truncate ${activeDoc === doc.id ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {doc.name}
                </span>
              </div>
              <div onClick={(e) => toggleSelection(doc.id, e)} className="p-1 cursor-pointer">
                <Checkbox checked={selectedHeuristics.has(doc.id)} />
              </div>
            </div>
          ))}
        </div>

        {/* Compile Action */}
        <div className="p-4 border-t border-border bg-muted/20 space-y-3">
          <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-800/50 flex items-start gap-2 leading-tight">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            <p><strong>Warning:</strong> The current heuristics are auto-generated to match your Design Semantics. Compiling custom frameworks may cause inconsistencies.</p>
          </div>
          <Button onClick={handleCompile} className="w-full gap-2" disabled={selectedHeuristics.size === 0}>
            <Settings2 size={16} />
            Compile Selected
          </Button>
        </div>
      </div>

      {/* RIGHT SIDE: Editor or Reference Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {renderActiveContent()}
      </div>
    </div>
  );
};