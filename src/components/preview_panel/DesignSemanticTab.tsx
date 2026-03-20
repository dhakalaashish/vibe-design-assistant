import { useLoadApp } from "@/hooks/useLoadApp";
import { useAtomValue, useAtom, useSetAtom } from "jotai";
import { selectedFileAtom } from "@/atoms/viewAtoms";
import { useDesignSemanticInNewChat } from "../chat/DesignInNewChat";
import { designCreationModeAtom } from "@/atoms/designAtoms";
import { DesignViewProps } from "./DesignView";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useLoadAppFile } from "@/hooks/useLoadAppFile";
import { useTheme } from "@/contexts/ThemeContext";
import { ChevronRight, Circle, Save, RefreshCw, Layout, Code, MousePointerClick, ArrowRight, Waypoints, Palette, Settings } from "lucide-react";
import "@/components/chat/monaco";
import { IpcClient } from "@/ipc/ipc_client";
import { showError, showSuccess, showWarning } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { useSettings } from "@/hooks/useSettings";
import { useCheckProblems } from "@/hooks/useCheckProblems";
import { getLanguage } from "@/utils/get_language";

type CanvasMode = 'structure' | 'flows';

interface DesignFileEditorProps {
  appId: number | null;
  filePath: string;
}

interface BreadcrumbProps {
  path: string;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  isSaving: boolean;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  path,
  hasUnsavedChanges,
  onSave,
  isSaving,
}) => {
  const segments = path.split("/").filter(Boolean);

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
                data-testid="save-file-button"
              >
                <Save size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasUnsavedChanges ? "Save changes" : "No unsaved changes"}
            </TooltipContent>
          </Tooltip>
          {hasUnsavedChanges && (
            <Circle
              size={8}
              fill="currentColor"
              className="text-amber-600 dark:text-amber-400"
            />
          )}
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
  // Use refs for values that need to be current in event handlers
  const originalValueRef = useRef<string | undefined>(undefined);
  const editorRef = useRef<any>(null);
  const isSavingRef = useRef<boolean>(false);
  const needsSaveRef = useRef<boolean>(false);
  const currentValueRef = useRef<string | undefined>(undefined);

  const queryClient = useQueryClient();
  const { checkProblems } = useCheckProblems(appId);

  // Update state when content loads
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

  // Sync the UI with the needsSave ref
  useEffect(() => {
    setDisplayUnsavedChanges(needsSaveRef.current);
  }, [needsSaveRef.current]);

  // Determine if dark mode based on theme
  const isDarkMode =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const editorTheme = isDarkMode ? "dyad-dark" : "dyad-light";

  // Handle editor mount
  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Listen for model content change events
    editor.onDidBlurEditorText(() => {
      console.log("Editor text blurred, checking if save needed");
      if (needsSaveRef.current) {
        saveFile();
      }
    });
  };

  // Handle content change
  const handleEditorChange = (newValue: string | undefined) => {
    setValue(newValue);
    currentValueRef.current = newValue;

    const hasChanged = newValue !== originalValueRef.current;
    needsSaveRef.current = hasChanged;
    setDisplayUnsavedChanges(hasChanged);
  };

  // Save the file
  const saveFile = async () => {
    if (
      !appId ||
      !currentValueRef.current ||
      !needsSaveRef.current ||
      isSavingRef.current
    )
      return;

    try {
      isSavingRef.current = true;
      setIsSaving(true);

      const ipcClient = IpcClient.getInstance();
      const { warning } = await ipcClient.editAppFile(
        appId,
        filePath,
        currentValueRef.current,
      );
      await queryClient.invalidateQueries({ queryKey: ["versions", appId] });
      if (settings?.enableAutoFixProblems) {
        checkProblems();
      }
      if (warning) {
        showWarning(warning);
      } else {
        showSuccess("File saved");
      }

      originalValueRef.current = currentValueRef.current;
      needsSaveRef.current = false;
      setDisplayUnsavedChanges(false);
    } catch (error) {
      showError(error);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading file content...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message}</div>;
  }

  if (!content) {
    return <div className="p-4 text-gray-500">No content available</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <Breadcrumb
        path={filePath}
        hasUnsavedChanges={displayUnsavedChanges}
        onSave={saveFile}
        isSaving={isSaving}
      />
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

const DesignCanvasUI = ({ content }: { content: string }) => {
    const [mode, setMode] = useState<CanvasMode>('structure');
    const [selectedNode, setSelectedNode] = useState<any | null>(null);
    const [activeFlow, setActiveFlow] = useState<string | null>(null);
    const [activeFunction, setActiveFunction] = useState<string | null>(null);

    // View Options (Applied to Structure)
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [showNav, setShowNav] = useState<boolean>(true);
    const [showStyles, setShowStyles] = useState<boolean>(true);
    const [showFunctionality, setShowFunctionality] = useState<boolean>(false);

    // Editable Graph State
    const [graph, setGraph] = useState<any>(null);

    // Parse the embedded JSON from the Markdown ONCE
    useEffect(() => {
        try {
            const match = content.match(/```json\n([\s\S]*?)\n```/);
            if (match && match[1]) {
                const parsedGraph = JSON.parse(match[1]);
                setGraph(parsedGraph);
                // Set initial flow if available
                if (parsedGraph.edges?.flows?.length > 0) {
                    setActiveFlow(parsedGraph.edges.flows[0].name);
                }
            }
        } catch (e) {
            console.error("Failed to parse Design Semantic JSON", e);
        }
    }, [content]);

    if (!graph) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                <Layout className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground">No Graph Data Found</h3>
            </div>
        );
    }

    // -- EDITING LOGIC --
    const handleUpdateNode = (field: string, value: string) => {
        if (!selectedNode) return;
        
        setGraph((prev: any) => {
            const newGraph = { ...prev };
            const isScreen = selectedNode.parent === 'body';
            const arrayToUpdate = isScreen ? newGraph.nodes.screens : newGraph.nodes.components;
            
            const index = arrayToUpdate.findIndex((n: any) => n.id === selectedNode.id);
            if (index !== -1) {
                arrayToUpdate[index] = { ...arrayToUpdate[index], [field]: value };
            }
            return newGraph;
        });

        setSelectedNode((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleAddChild = () => {
        if (!selectedNode) return;
        const newId = `comp-new-${Date.now()}`;
        const newComp = {
            id: newId,
            parent: selectedNode.id,
            name: "New Component",
            purpose: "Describe purpose here...",
            styles: "Inherited from Global"
        };
        
        setGraph((prev: any) => ({
            ...prev,
            nodes: {
                ...prev.nodes,
                components: [...prev.nodes.components, newComp]
            }
        }));
    };

    // Toggle Functionality Logic
    const handleToggleFunctionality = (checked: boolean) => {
        setShowFunctionality(checked);
        // Automatically select the first functionality if turning on and none selected
        if (checked && !activeFunction && graph?.metadata?.functionalities?.length > 0) {
            setActiveFunction(graph.metadata.functionalities[0].name);
        }
    };

    // -- RENDER HELPERS --

    const getNodeById = (id: string) => {
        const screen = graph.nodes.screens.find((s: any) => s.id === id);
        if (screen) return { ...screen, isScreen: true };
        const comp = graph.nodes.components.find((c: any) => c.id === id);
        if (comp) return { ...comp, isScreen: false };
        return null;
    };

    const isNodeActive = (id: string): boolean => {
        if (mode === 'structure') {
            // If functionality toggle is on, dim nodes not part of the active function
            if (showFunctionality && activeFunction) {
                const func = graph.metadata?.functionalities?.find((f: any) => f.name === activeFunction);
                if (!func) return true;

                // 1. Is this specific node explicitly listed in the functionality?
                if (func.relatedNodes.includes(id)) return true;

                // 2. CSS Inheritance Fix: Is any of this node's children listed?
                // If a child component is active, the parent screen MUST stay visible.
                const hasActiveChild = (nodeId: string): boolean => {
                    const children = graph.nodes.components.filter((c: any) => c.parent === nodeId);
                    return children.some((c: any) => func.relatedNodes.includes(c.id) || hasActiveChild(c.id));
                };

                return hasActiveChild(id);
            }
            return true; 
        }
        if (mode === 'flows' && activeFlow) {
            const flow = graph.edges?.flows?.find((f: any) => f.name === activeFlow);
            return flow?.steps.includes(id);
        }
        return true;
    };

    // Standard Grid Render (Used for Structure mode)
    const renderStandardNode = (node: any, currentDepth: number) => {
        const active = isNodeActive(node.id);
        const children = graph.nodes.components.filter((c: any) => c.parent === node.id);
        const incomingNavs = graph.edges?.navigation?.filter((n: any) => n.toScreenId === node.id || n.toComponentId === node.id) || [];
        const outgoingNavs = graph.edges?.navigation?.filter((n: any) => n.fromComponentId === node.id) || [];

        // Stop rendering if we exceed zoom depth
        if (currentDepth > zoomLevel) return null;

        const isScreen = currentDepth === 0;

        return (
            <div 
                key={node.id} 
                onClick={(e) => { e.stopPropagation(); setSelectedNode({ type: isScreen ? 'Screen' : 'Component', ...node }); }}
                className={`
                    border transition-all duration-300 cursor-pointer shadow-sm
                    ${isScreen ? 'w-80 rounded-xl bg-white dark:bg-zinc-900' : 'w-full p-2 rounded-md bg-slate-50 dark:bg-zinc-800/80 mt-2'}
                    ${active ? 'opacity-100 scale-100' : 'opacity-30 scale-95 grayscale'}
                    ${selectedNode?.id === node.id ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-primary/50'}
                `}
            >
                <div className={`font-semibold flex justify-between items-center ${isScreen ? 'p-3 border-b bg-muted/30 text-sm rounded-t-xl' : 'text-xs'}`}>
                    {node.name}
                </div>

                {/* Toggles (Nav & Styles) */}
                <div className="px-3 py-1 space-y-1 mt-1">
                    {showNav && incomingNavs.length > 0 && incomingNavs.map((n:any, i:number) => (
                        <div key={i} className="text-[10px] text-blue-600 font-medium">← Comes from {getNodeById(n.fromComponentId)?.name || 'Unknown'}</div>
                    ))}
                    {showNav && outgoingNavs.length > 0 && outgoingNavs.map((n:any, i:number) => (
                        <div key={i} className="text-[10px] text-emerald-600 font-medium">→ Goes to {getNodeById(n.toScreenId)?.name || 'Unknown'}</div>
                    ))}
                    {showStyles && node.styles && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-500 font-medium font-mono truncate">Styles: {node.styles}</div>
                    )}
                </div>

                {/* Render Nested Children */}
                {children.length > 0 && currentDepth < zoomLevel && (
                    <div className={`${isScreen ? 'p-3' : 'pl-2 border-l border-dashed border-border/60 ml-1'} flex flex-col`}>
                        {children.map((child: any) => renderStandardNode(child, currentDepth + 1))}
                    </div>
                )}
                
                {children.length > 0 && currentDepth === zoomLevel && (
                    <div className="text-[10px] text-center text-muted-foreground mt-2 py-1 bg-muted/20 rounded">
                        +{children.length} nested item(s)...
                    </div>
                )}
            </div>
        );
    };

    // Flow Sequence Renderer
    const renderFlowSequence = () => {
        const flow = graph.edges?.flows?.find((f: any) => f.name === activeFlow);
        if (!flow || !flow.steps) return <div className="text-muted-foreground">Select a flow to view sequence.</div>;

        return (
            <div className="flex items-center space-x-4 overflow-x-auto pb-8 pt-4 px-4 w-full">
                {flow.steps.map((stepId: string, index: number) => {
                    const node = getNodeById(stepId);
                    if (!node) return null;

                    const incomingNavs = showNav ? (graph.edges?.navigation?.filter((n: any) => n.toScreenId === node.id || n.toComponentId === node.id) || []) : [];
                    const outgoingNavs = showNav ? (graph.edges?.navigation?.filter((n: any) => n.fromComponentId === node.id) || []) : [];

                    return (
                        <React.Fragment key={`${stepId}-${index}`}>
                            <div 
                                onClick={(e) => { e.stopPropagation(); setSelectedNode({ type: node.isScreen ? 'Screen' : 'Component', ...node }); }}
                                className={`
                                    flex-shrink-0 w-64 border rounded-xl bg-white dark:bg-zinc-900 shadow-md cursor-pointer transition-all
                                    ${selectedNode?.id === node.id ? 'ring-2 ring-primary border-primary scale-105' : 'border-border hover:border-primary/50'}
                                `}
                            >
                                <div className={`px-3 py-2 border-b font-semibold text-sm rounded-t-xl flex justify-between items-center ${node.isScreen ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' : 'bg-muted/30'}`}>
                                    {node.name}
                                    <span className="text-[10px] uppercase font-bold opacity-50">{node.isScreen ? 'Screen' : 'Component'}</span>
                                </div>
                                
                                <div className="p-3 text-xs text-muted-foreground min-h-[60px]">
                                    {node.purpose}
                                </div>

                                {/* Flow view specific Nav/Styles toggle info */}
                                {(showNav || showStyles) && (
                                    <div className="px-3 pb-3 pt-1 space-y-1 border-t border-dashed bg-slate-50 dark:bg-zinc-800/50 rounded-b-xl">
                                        {showNav && incomingNavs.length > 0 && incomingNavs.map((n:any, i:number) => (
                                            <div key={i} className="text-[10px] text-blue-600 font-medium truncate">← {getNodeById(n.fromComponentId)?.name || 'Unknown'}</div>
                                        ))}
                                        {showNav && outgoingNavs.length > 0 && outgoingNavs.map((n:any, i:number) => (
                                            <div key={i} className="text-[10px] text-emerald-600 font-medium truncate">→ {getNodeById(n.toScreenId)?.name || 'Unknown'}</div>
                                        ))}
                                        {showStyles && node.styles && (
                                            <div className="text-[10px] text-amber-600 dark:text-amber-500 font-medium font-mono truncate mt-1">Sty: {node.styles}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Arrow connecting the steps */}
                            {index < flow.steps.length - 1 && (
                                <div className="flex-shrink-0 text-muted-foreground flex flex-col items-center justify-center">
                                    <div className="h-px w-8 bg-border"></div>
                                    <ArrowRight className="w-5 h-5 text-primary my-1" />
                                    <div className="h-px w-8 bg-border"></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950 relative overflow-hidden">
            
            {/* 1. Mode Switcher (TOP BAR) */}
            <div className="flex items-center justify-center p-3 border-b bg-white dark:bg-zinc-900 z-10 gap-2">
                <Button variant={mode === 'structure' ? 'default' : 'outline'} size="sm" onClick={() => setMode('structure')}><Layout className="w-4 h-4 mr-2" /> Screen</Button>
                <Button variant={mode === 'flows' ? 'default' : 'outline'} size="sm" onClick={() => setMode('flows')}><MousePointerClick className="w-4 h-4 mr-2" /> Flows</Button>
            </div>

            {/* Main Layout Area */}
            <div className="flex flex-1 overflow-hidden">
                
                {/* 2. Main Canvas */}
                <div className="flex-1 overflow-auto p-8 relative flex flex-col">
                    
                    {/* View Controls & Dropdowns */}
                    <div className="mb-8 flex items-center justify-between bg-white dark:bg-zinc-900 p-3 rounded-lg border shadow-sm">
                        
                        {/* Left Controls (Zoom & Checks) */}
                        <div className="flex items-center gap-6">
                            {/* Zoom is only for the Structure (Screen) mode */}
                            {mode === 'structure' && (
                                <div className="flex items-center gap-2 bg-muted p-1 rounded-md">
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoomLevel(z => Math.max(0, z - 1))} disabled={zoomLevel === 0}>-</Button>
                                    <span className="text-xs font-semibold px-2">Zoom Level {zoomLevel}</span>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoomLevel(z => Math.min(3, z + 1))} disabled={zoomLevel === 3}>+</Button>
                                </div>
                            )}

                            {/* Show Nav, Styles, and Functionality checks */}
                            <div className="flex items-center gap-4 text-sm font-medium">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={showNav} onChange={(e) => setShowNav(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                    Show Navigation
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={showStyles} onChange={(e) => setShowStyles(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                    Show Styles
                                </label>
                                {mode === 'structure' && (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={showFunctionality} onChange={(e) => handleToggleFunctionality(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                        Show Functionality
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Right Controls (Dropdowns) */}
                        <div className="flex items-center gap-3">
                            {mode === 'flows' && (
                                <select className="bg-muted border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary font-medium" value={activeFlow || ""} onChange={(e) => setActiveFlow(e.target.value)}>
                                    {graph.edges?.flows?.map((f: any) => <option key={f.name} value={f.name}>{f.name}</option>)}
                                </select>
                            )}
                            {/* Functionality Dropdown appears only in Structure mode and when checked */}
                            {mode === 'structure' && showFunctionality && (
                                <select className="bg-muted border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary font-medium" value={activeFunction || ""} onChange={(e) => setActiveFunction(e.target.value)}>
                                    {graph.metadata?.functionalities?.map((f: any) => <option key={f.name} value={f.name}>{f.name}</option>)}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Conditional Rendering based on Mode */}
                    {mode === 'flows' ? (
                        <div className="w-full flex-1 border-2 border-dashed border-border/60 rounded-xl bg-white/50 dark:bg-zinc-900/50 flex items-center overflow-x-auto">
                             {renderFlowSequence()}
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-8 items-start pb-20">
                            {graph.nodes?.screens?.filter((s:any) => s.parent === 'body').map((screen: any) => 
                                renderStandardNode(screen, 0)
                            )}
                        </div>
                    )}

                </div>

                {/* 4. Editable Context Panel (Sidebar) */}
                {selectedNode && (
                    <div className="w-96 border-l bg-white dark:bg-zinc-900 shadow-2xl p-5 flex flex-col z-20 overflow-y-auto animate-in slide-in-from-right-8 border-t-0 border-r-0 border-b-0">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">{selectedNode.type} Settings</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedNode(null)}>✕</Button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Name</label>
                                <input 
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" 
                                    value={selectedNode.name} 
                                    onChange={(e) => handleUpdateNode('name', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Purpose</label>
                                <textarea 
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary min-h-[80px]" 
                                    value={selectedNode.purpose} 
                                    onChange={(e) => handleUpdateNode('purpose', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Styles (Specific or Inherited)</label>
                                <input 
                                    className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary font-mono text-xs" 
                                    value={selectedNode.styles || "Inherited from Global"} 
                                    onChange={(e) => handleUpdateNode('styles', e.target.value)}
                                />
                            </div>

                            {/* Only allow adding nested components if we are not looking at a Flow sequence */}
                            {mode !== 'flows' && (
                                <div className="pt-4 border-t">
                                    <Button className="w-full" variant="secondary" onClick={handleAddChild}>
                                        + Add Nested Component
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const DesignSemanticsTab = ({ loading, app }: DesignViewProps) => {
    const [designMode] = useAtom(designCreationModeAtom);
    const [viewMode, setViewMode] = useState<'canvas' | 'code'>('canvas');
    const { refreshApp } = useLoadApp(app?.id ?? null);

    const DESIGN_FILE = "DESIGN_SEMANTIC.md";

    const designFilePath = app?.files?.find(
        (file) => file === DESIGN_FILE
    );
    const { content } = useLoadAppFile(app?.id ?? null, designFilePath || "");

    const { handleDesignSemanticInfer, handleDesignSemanticBuild } = useDesignSemanticInNewChat()

    const hasCodebase = Boolean(app?.files && app.files.length > 0);

    const setDesignMode = useSetAtom(designCreationModeAtom);


    const onInferClick = async () => {
        setDesignMode("processing-infer");
        await handleDesignSemanticInfer();
    };

    const onBuildClick = async () => {
        setDesignMode("processing-build");
        await handleDesignSemanticBuild();
    };

    if (designMode === "processing-infer") {
        return (
            <div className="flex flex-col h-full max-w-3xl mx-auto px-6 py-12 gap-6">
                <h1 className="text-2xl font-semibold">Building your Design Semantic file</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Building your Design Semantic file, once done, you can chat on your left
                    to understand the design semantic file, or have us edit it for you.
                </p>
            </div>
        );
    }

    if (designMode === "processing-build") {
        return (
            <div className="flex flex-col h-full max-w-3xl mx-auto px-6 py-12 gap-6">
                <h1 className="text-2xl font-semibold">Let’s think deeply about your design</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    We will ask you questions, and you will answer them, this will help you
                    think deeply about your UI/UX. At the end we will create the design
                    semantic for you. Once you are done, you can edit it manually, or ask us
                    to edit it.
                </p>
            </div>
        );
    }

    if (!designFilePath) {
        return (
            <div className="flex flex-col h-full max-w-3xl mx-auto px-6 py-12 gap-6">
                <h1 className="text-2xl font-semibold">
                    Let’s lock in your app’s DNA.
                </h1>

                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                        Vibe coding is great for moving fast, but as a project grows, it’s easy
                        to lose the <span className="font-medium text-foreground">vibe</span>.
                        You might notice the AI starting to hallucinate UI patterns, forgetting
                        navigation rules, or breaking your user’s flow.
                    </p>

                    <p>
                        To fix this, we use a{" "}
                        <span className="font-medium text-foreground">
                            Design Semantic File
                        </span>
                        . Think of it as your project’s{" "}
                        <span className="italic">source of truth</span> — who your users are,
                        what they’re trying to do, and the design rules that should never be
                        broken.
                    </p>

                    <p>
                        This gives the AI intent, not just code. It prevents vibe drift and
                        keeps every new feature aligned with your original vision.
                    </p>
                </div>

                <div className="pt-4">
                    <h2 className="text-sm font-medium mb-3">
                        How do you want to build yours?
                    </h2>

                    <div className="flex flex-col gap-3">
                        {hasCodebase && (
                            <button
                                className="border rounded-lg p-4 text-left hover:bg-muted transition cursor-pointer"
                                onClick={onInferClick}
                            >
                                <div className="font-medium">
                                    🔍 Infer from Codebase
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    I’ll scan your files to reverse-engineer your existing design
                                    decisions.
                                </div>
                            </button>
                        )}


                        <button
                            className="border rounded-lg p-4 text-left hover:bg-muted transition cursor-pointer"
                            onClick={onBuildClick}
                        >
                            <div className="font-medium">
                                🧠 Build it Together
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                We’ll define your app’s purpose, users, and rules from scratch.
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        )
    }


    if (loading) {
        return <div className="text-center py-4">Loading DESIGN_SEMANTIC CONTENT...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => refreshApp()}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                        disabled={loading || !app?.id}
                        title="Refresh Design File"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <div className="text-sm font-medium text-foreground flex items-center gap-2">
                        {DESIGN_FILE}
                    </div>
                </div>

                {/* View Switcher */}
                <div className="flex bg-muted p-1 rounded-md">
                    <button 
                        onClick={() => setViewMode('canvas')}
                        className={`px-3 py-1 text-xs font-medium rounded-sm flex items-center gap-1 transition-all ${viewMode === 'canvas' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                    >
                        <Layout size={14} /> UI Canvas
                    </button>
                    <button 
                        onClick={() => setViewMode('code')}
                        className={`px-3 py-1 text-xs font-medium rounded-sm flex items-center gap-1 transition-all ${viewMode === 'code' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                    >
                        <Code size={14} /> Raw File
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'canvas' ? (
                    <DesignCanvasUI content={content || ""} />
                ) : (
                    <DesignFileEditor appId={app?.id ?? null} filePath={designFilePath!} />
                )}
            </div>
        </div>
    );
};