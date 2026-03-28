import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, FileCode2, Settings2, AlertTriangle, AlertCircle } from "lucide-react";
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

// Mock data: You can later replace this with actual files or DB queries
const BASE_HEURISTICS = [
  { id: "nielsen", name: "Nielsen's 10 Usability Heuristics" },
  { id: "wcag", name: "Accessibility (WCAG 2.1 AA)" },
  { id: "material", name: "Material Design Guidelines" },
  { id: "apple_hig", name: "Apple Human Interface Guidelines" },
];

export const DesignHeuristicsTab = ({ app }: { app: any }) => {
  const appId = useAtomValue(selectedAppIdAtom);
  const [activeDoc, setActiveDoc] = useState<string>("app-specific");
  
  // Track which base heuristics are checked to be included
  const [selectedHeuristics, setSelectedHeuristics] = useState<Set<string>>(
    new Set(["nielsen", "wcag"])
  );

  // --- NEW FILE & STATUS CHECKS ---
  const hasHeuristicsFile = app?.files?.includes("docs/app_design_heuristic.md");
  const hasSemanticFile = app?.files?.includes("DESIGN_SEMANTIC.md");
  
  // TODO: Link these to your actual Jotai atoms or global state from the Semantics tab
  const hasSemanticIssues = false; // Set to true if there are >0 issues
  const hasUncheckedEdits = false; // Set to true if "Edit detected" is active

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clicking the checkbox from triggering the row click
    setSelectedHeuristics(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCompile = () => {
    // TODO: Wire this up to streamMessage to actually compile the file using the selected rules
    console.log("Compiling heuristics using:", Array.from(selectedHeuristics));
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

        <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Base Frameworks
        </div>

        {/* Document Checklist */}
        <div className="flex-1 overflow-y-auto">
          {BASE_HEURISTICS.map(doc => (
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
        {activeDoc === "app-specific" ? (
          hasHeuristicsFile ? (
            // 1. App Specific Heuristics Exist -> Show as uneditable (pointer-events-none makes it visually read-only)
            <div className="relative h-full">
               <div className="absolute inset-0 z-10 bg-transparent cursor-not-allowed" title="This file is auto-generated and read-only."></div>
               <div className="h-full pointer-events-none opacity-90">
                 <DesignFileEditor appId={appId} filePath="docs/app_design_heuristic.md" />
               </div>
            </div>
          ) : !hasSemanticFile ? (
            // 2. No Design Semantics Exist -> Prompt to create them
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground animate-in fade-in">
                <FileCode2 size={64} className="mb-6 opacity-20" />
                <h2 className="text-2xl font-semibold text-foreground mb-2">Design Semantics Required</h2>
                <p className="max-w-md text-sm leading-relaxed mb-6">
                    You need to establish your core Design Semantics first before the AI can generate App Specific Design Heuristics.
                </p>
            </div>
          ) : (hasSemanticIssues || hasUncheckedEdits) ? (
            // 3. Semantics Exist but have issues/edits -> Block generation
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground animate-in fade-in">
                <AlertTriangle size={64} className="mb-6 text-amber-500 opacity-60" />
                <h2 className="text-2xl font-semibold text-foreground mb-2">Resolve Semantics Issues</h2>
                <p className="max-w-md text-sm leading-relaxed">
                    Your Design Semantics file has unchecked edits or active issues. Please switch to the Design Semantics tab, verify your changes, and fix any problems before generating heuristics.
                </p>
            </div>
          ) : (
            // 4. Semantics Exist and are clean -> Show Generate Button
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground animate-in fade-in">
                <BookOpen size={64} className="mb-6 text-primary opacity-50" />
                <h2 className="text-2xl font-semibold text-foreground mb-2">Generate App Specific Design Heuristics</h2>
                <p className="max-w-xl text-sm leading-relaxed mb-6">
                    <strong>Design Heuristics</strong> are broad rules of thumb for UI/UX design (like "consistency" or "error prevention"). 
                    Generating an app-specific file translates your exact Design Semantics into actionable, tailored evaluation criteria for this specific project.
                </p>
                <Button size="lg" onClick={() => console.log("Trigger Generation")}>Generate App Specific Design Heuristics</Button>
            </div>
          )
        ) : (
          // If viewing a base framework, show a reference screen
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
            <BookOpen size={64} className="mb-6 opacity-20" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              {BASE_HEURISTICS.find(d => d.id === activeDoc)?.name}
            </h2>
            <p className="max-w-md text-sm leading-relaxed">
              This is a standard heuristic framework. Check the box on the left to include these rules when the AI compiles your App Specific Heuristics file.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};