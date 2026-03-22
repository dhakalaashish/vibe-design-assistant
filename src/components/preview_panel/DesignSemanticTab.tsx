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
import { Circle, Save, RefreshCw, Layout, Code, MousePointerClick, ArrowRight, ArrowLeft, ArrowDown, ZoomInIcon, ZoomOutIcon, Briefcase, Edit2, Trash2, ChevronRight, ChevronDown, Plus } from "lucide-react";
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

type CanvasMode = 'project' | 'structure' | 'flows';

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

    const isDarkMode =
        theme === "dark" ||
        (theme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);
    const editorTheme = isDarkMode ? "dyad-dark" : "dyad-light";

    const handleEditorDidMount: OnMount = (editor) => {
        editorRef.current = editor;
        editor.onDidBlurEditorText(() => {
            if (needsSaveRef.current) {
                saveFile();
            }
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
            const { warning } = await ipcClient.editAppFile(
                appId,
                filePath,
                currentValueRef.current,
            );
            await queryClient.invalidateQueries({ queryKey: ["versions", appId] });
            if (settings?.enableAutoFixProblems) {
                checkProblems();
            }
            if (warning) showWarning(warning);
            else showSuccess("File saved");
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
                    options={{ minimap: { enabled: true }, scrollBeyondLastLine: false, wordWrap: "on", automaticLayout: true, fontFamily: "monospace", fontSize: 13, lineNumbers: "on" }}
                />
            </div>
        </div>
    );
};

const DesignCanvasUI = ({ content }: { content: string }) => {
    const [mode, setMode] = useState<CanvasMode>('project');
    const [selectedNode, setSelectedNode] = useState<any | null>(null);
    const [nodeToDelete, setNodeToDelete] = useState<any | null>(null);
    const [activeFlow, setActiveFlow] = useState<string | null>(null);
    const [activeFunction, setActiveFunction] = useState<string | null>(null);

    // View Options 
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [showNav, setShowNav] = useState<boolean>(false);
    const [showStyles, setShowStyles] = useState<boolean>(false);
    const [showFunctionality, setShowFunctionality] = useState<boolean>(false);

    // Expand/Collapse State
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // Inline Editing State (for Project Tab)
    const [inlineEdit, setInlineEdit] = useState<{ field: string, value: string, index?: number } | null>(null);
    const [personaDraft, setPersonaDraft] = useState<any>(null);

    // Precise Hover Tracking
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    // Flow Sequence Layout State
    const flowContainerRef = useRef<HTMLDivElement>(null);
    const [itemsPerRow, setItemsPerRow] = useState<number>(3);

    // Editable Graph State
    const [graph, setGraph] = useState<any>(null);

    const [draggedFlowIndex, setDraggedFlowIndex] = useState<number | null>(null);
    const [liveSteps, setLiveSteps] = useState<string[] | null>(null); // Holds the live preview array
    const [insertFlowContext, setInsertFlowContext] = useState<{ index: number, selectedScreen: string, selectedComponent: string } | null>(null);

    useEffect(() => {
        try {
            const match = content.match(/```json\n([\s\S]*?)\n```/);
            const parsedGraph = match && match[1] ? JSON.parse(match[1]) : JSON.parse(content);
            setGraph(parsedGraph);
            if (parsedGraph.edges?.flows?.length > 0) {
                setActiveFlow(parsedGraph.edges.flows[0].name);
            }
            if (expandedNodes.size === 0 && parsedGraph.nodes?.screens) {
                setExpandedNodes(new Set());
            }
        } catch (e) {
            console.error("Failed to parse Design Semantic JSON", e);
        }
    }, [content]);

    useEffect(() => {
        if (mode !== 'flows') return;
        const container = flowContainerRef.current;
        if (!container) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const width = entry.contentRect.width;
                const cols = Math.max(1, Math.floor(width / 320));
                setItemsPerRow(cols);
            }
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [mode, activeFlow]);

    const depthMap = useMemo(() => {
        const map = new Map();
        if (!graph) return map;
        const calcDepth = (id: string): number => {
            if (id === 'body') return -1;
            if (map.has(id)) return map.get(id);
            const node = [...(graph.nodes?.screens || []), ...(graph.nodes?.components || [])].find((n: any) => n.id === id);
            if (!node) return 0;
            const d = calcDepth(node.parent) + 1;
            map.set(id, d);
            return d;
        };
        [...(graph.nodes?.screens || []), ...(graph.nodes?.components || [])].forEach((n: any) => calcDepth(n.id));
        return map;
    }, [graph]);

    const nodesWithChildren = useMemo(() => {
        if (!graph) return new Set();
        return new Set([...(graph.nodes?.screens || []), ...(graph.nodes?.components || [])].map((n: any) => n.parent));
    }, [graph]);

    if (!graph) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                <Layout className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground">No Graph Data Found</h3>
            </div>
        );
    }

    const canZoomIn = [...(graph?.nodes?.screens || []), ...(graph?.nodes?.components || [])].some((n: any) => nodesWithChildren.has(n.id) && !expandedNodes.has(n.id));
    const canZoomOut = expandedNodes.size > 0;

    const handleZoomIn = () => {
        const expandedDepths = Array.from(expandedNodes).map(id => depthMap.get(id) || 0);
        const currentMaxDepth = expandedDepths.length > 0 ? Math.max(...expandedDepths) : -1;
        const targetDepth = currentMaxDepth + 1;
        const nodesToExpand = [...(graph.nodes?.screens || []), ...(graph.nodes?.components || [])].filter((n: any) => depthMap.get(n.id) === targetDepth && nodesWithChildren.has(n.id)).map((n: any) => n.id);
        if (nodesToExpand.length > 0) setExpandedNodes(prev => new Set([...prev, ...nodesToExpand]));
    };

    const handleZoomOut = () => {
        const expandedDepths = Array.from(expandedNodes).map(id => depthMap.get(id) || 0);
        if (expandedDepths.length === 0) return;
        const currentMaxDepth = Math.max(...expandedDepths);
        const newExpanded = new Set(expandedNodes);
        Array.from(expandedNodes).forEach(id => {
            if (depthMap.get(id) === currentMaxDepth) newExpanded.delete(id);
        });
        setExpandedNodes(newExpanded);
    };

    // -- EDITING LOGIC (Using Deep Copy for Safety) --
    const handleUpdateNode = (field: string, value: string) => {
        if (!selectedNode) return;
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev)); // Deep copy to prevent strict mode mutation bugs
            if (selectedNode.type === 'Screen' || selectedNode.type === 'Component') {
                const isScreen = selectedNode.parent === 'body';
                const arrayToUpdate = isScreen ? next.nodes.screens : next.nodes.components;
                const index = arrayToUpdate.findIndex((n: any) => n.id === selectedNode.id);
                if (index !== -1) arrayToUpdate[index] = { ...arrayToUpdate[index], [field]: value };
            }
            else if (selectedNode.type === 'Project') {
                if (field === 'description') next.strategy.productDescription = value;
                if (field === 'objectiveUsers') next.strategy.objectives.forUsers = value;
                if (field === 'objectiveCreator') next.strategy.objectives.forCreator = value;
                if (field === 'outOfScope') next.scope.outOfScope = value.split('\n').filter((l: string) => l.trim() !== '');
            }
            else if (selectedNode.type === 'Persona') {
                const idx = selectedNode.index;
                if (next.strategy.personas[idx]) {
                    next.strategy.personas[idx] = { ...next.strategy.personas[idx], [field]: value };
                }
            }
            return next;
        });

        setSelectedNode((prev: any) => ({ ...prev, [field]: value }));
    };

    const saveInlineEdit = () => {
        if (!inlineEdit) return;
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            if (inlineEdit.field === 'description') next.strategy.productDescription = inlineEdit.value;
            if (inlineEdit.field === 'objectiveUsers') next.strategy.objectives.forUsers = inlineEdit.value;
            if (inlineEdit.field === 'objectiveCreator') next.strategy.objectives.forCreator = inlineEdit.value;
            if (inlineEdit.field === 'constraint') {
                if (!next.scope) next.scope = { outOfScope: [] };
                if (inlineEdit.index !== undefined) {
                    next.scope.outOfScope[inlineEdit.index] = inlineEdit.value;
                } else {
                    next.scope.outOfScope.push(inlineEdit.value);
                }
            }
            return next;
        });
        setInlineEdit(null);
    };

    const deleteConstraint = (index: number) => {
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            next.scope.outOfScope.splice(index, 1);
            return next;
        });
    };

    const handleAddChild = (parentId: string, isScreenParent: boolean) => {
        const newId = `comp-new-${Date.now()}`;
        const newComp = { id: newId, parent: parentId, name: "New Component", purpose: "Describe purpose...", styles: "Inherited from Global" };
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            next.nodes.components.push(newComp);
            return next;
        });
        setExpandedNodes(prev => new Set([...prev, parentId]));
    };

    const handleDeleteNode = () => {
        if (!nodeToDelete) return;
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            const deleteRecursive = (id: string) => {
                next.nodes.screens = next.nodes.screens.filter((s: any) => s.id !== id);
                next.nodes.components = next.nodes.components.filter((c: any) => c.id !== id);
                const children = [...(next.nodes.screens || []), ...(next.nodes.components || [])].filter(c => c.parent === id);
                children.forEach(c => deleteRecursive(c.id));
            };
            deleteRecursive(nodeToDelete.id);
            return next;
        });
        if (selectedNode?.id === nodeToDelete.id) setSelectedNode(null);
        setNodeToDelete(null);
    };

    const handleAddPersona = () => {
        const newPersona = { name: "New Persona", demographics: "Add demographic details...", technicalProfile: "Add tech profile...", knowledgeProfile: "Add knowledge profile..." };
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            if (!next.strategy) next.strategy = {};
            if (!next.strategy.personas) next.strategy.personas = [];
            next.strategy.personas.push(newPersona);
            return next;
        });
    };

    const deletePersona = (index: number) => {
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            next.strategy.personas.splice(index, 1);
            return next;
        });
    };

    const openPersonaEditor = (p?: any, index?: number) => {
        if (p) {
            const demParts = p.demographics ? p.demographics.split(',').map((s: string) => s.trim()) : [];
            setPersonaDraft({
                isNew: false, index, name: p.name || '',
                gender: demParts[0] || '', age: demParts[1] || '', education: demParts[2] || '', marital: demParts[3] || '', income: demParts[4] || '',
                expertise: p.technicalProfile?.includes('Low') ? 'Low' : p.technicalProfile?.includes('Medium') ? 'Medium' : p.technicalProfile?.includes('High') ? 'High' : '',
                internet: p.technicalProfile?.match(/Uses internet (.*?)(?:\.|$)/)?.[1] || '',
                sites: p.technicalProfile?.match(/Favorite sites: (.*?)(?:\.|$)/)?.[1] || '',
                knowledgeProfile: p.knowledgeProfile || ''
            });
        } else {
            setPersonaDraft({
                isNew: true, name: 'New Persona', gender: '', age: '', education: '', marital: '', income: '', expertise: '', internet: '', sites: '', knowledgeProfile: ''
            });
        }
        setSelectedNode({ type: 'PersonaForm' });
    };

    const savePersonaDraft = () => {
        if (!personaDraft) return;
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            const techStr = `${personaDraft.expertise} expertise. Uses internet ${personaDraft.internet}. Favorite sites: ${personaDraft.sites}.`.trim();
            const p = {
                name: personaDraft.name,
                demographics: [personaDraft.gender, personaDraft.age, personaDraft.education, personaDraft.marital, personaDraft.income].filter(Boolean).join(', '),
                technicalProfile: techStr.replace(/^[. ]+|[. ]+$/g, ''),
                knowledgeProfile: personaDraft.knowledgeProfile
            };
            if (!next.strategy) next.strategy = {};
            if (!next.strategy.personas) next.strategy.personas = [];
            if (personaDraft.isNew) next.strategy.personas.push(p);
            else next.strategy.personas[personaDraft.index] = p;
            return next;
        });
        setSelectedNode(null);
    };

    const handleToggleFunctionality = (checked: boolean) => {
        setShowFunctionality(checked);
        if (checked && !activeFunction && graph?.metadata?.functionalities?.length > 0) {
            setActiveFunction(graph.metadata.functionalities[0].name);
        }
    };

    // -- RENDER HELPERS --
    const handleDragStart = (e: React.DragEvent, index: number, currentSteps: string[]) => {
        setDraggedFlowIndex(index);
        setLiveSteps([...currentSteps]); // Capture the current layout into live preview
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        // Prevent firing if we aren't dragging, or if we hover over the item we are already holding
        if (draggedFlowIndex === null || liveSteps === null || draggedFlowIndex === index) return;

        // Rearrange the live preview array instantly
        const newSteps = [...liveSteps];
        const [draggedItem] = newSteps.splice(draggedFlowIndex, 1);
        newSteps.splice(index, 0, draggedItem);

        setDraggedFlowIndex(index); // Update the dragged index so it follows the mouse!
        setLiveSteps(newSteps);
    };

    const handleDragEnd = () => {
        setDraggedFlowIndex(null);
        setLiveSteps(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (liveSteps) {
            // Commit the temporary live preview to the actual Graph state
            setGraph((prev: any) => {
                const next = JSON.parse(JSON.stringify(prev));
                const flowIndex = next.edges.flows.findIndex((f: any) => f.name === activeFlow);
                if (flowIndex > -1) {
                    next.edges.flows[flowIndex].steps = liveSteps;
                }
                return next;
            });
        }
        handleDragEnd();
    };

    const handleInsertFlowStep = () => {
        if (!insertFlowContext || !insertFlowContext.selectedScreen) return;
        const targetId = insertFlowContext.selectedComponent || insertFlowContext.selectedScreen;

        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            const flowIndex = next.edges.flows.findIndex((f: any) => f.name === activeFlow);
            if (flowIndex > -1) {
                next.edges.flows[flowIndex].steps.splice(insertFlowContext.index + 1, 0, targetId);
            }
            return next;
        });
        setInsertFlowContext(null);
        setSelectedNode(null);
    };
    const getNodeById = (id: string) => {
        const screen = graph.nodes.screens.find((s: any) => s.id === id);
        if (screen) return { ...screen, isScreen: true };
        const comp = graph.nodes.components.find((c: any) => c.id === id);
        if (comp) return { ...comp, isScreen: false };
        return null;
    };

    const isNodeActive = (id: string): boolean => {
        if (mode === 'structure') {
            if (showFunctionality && activeFunction) {
                const func = graph.metadata?.functionalities?.find((f: any) => f.name === activeFunction);
                if (!func) return true;
                if (func.relatedNodes.includes(id)) return true;
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

    const renderInlineField = (title: string, field: string, currentValue: string, isTextarea = false) => {
        const isEditing = inlineEdit?.field === field;
        return (
            <div
                className="group/field relative border border-transparent hover:border-border rounded-lg p-2 -mx-2 transition-colors"
                onMouseEnter={() => setHoveredNodeId(`inline-${field}`)}
                onMouseLeave={() => setHoveredNodeId(null)}
            >
                <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">{title}</span>
                    {!isEditing && hoveredNodeId === `inline-${field}` && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 absolute right-2 top-2 text-blue-600 hover:bg-blue-100" onClick={() => setInlineEdit({ field, value: currentValue })}>
                            <Edit2 size={12} />
                        </Button>
                    )}
                </div>
                {isEditing ? (
                    <div className="space-y-2 mt-2">
                        {isTextarea ? (
                            <textarea className="w-full bg-white dark:bg-zinc-900 border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary min-h-[80px]" value={inlineEdit.value} onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })} autoFocus />
                        ) : (
                            <input className="w-full bg-white dark:bg-zinc-900 border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary" value={inlineEdit.value} onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })} autoFocus />
                        )}
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setInlineEdit(null)}>Cancel</Button>
                            <Button size="sm" onClick={saveInlineEdit}>Save</Button>
                        </div>
                    </div>
                ) : (
                    <p className="mt-1 text-sm">{currentValue}</p>
                )}
            </div>
        );
    };

    const renderStandardNode = (node: any, currentDepth: number) => {
        const active = isNodeActive(node.id);
        const children = graph.nodes.components.filter((c: any) => c.parent === node.id);
        const incomingNavs = graph.edges?.navigation?.filter((n: any) => n.toScreenId === node.id || n.toComponentId === node.id) || [];
        const outgoingNavs = graph.edges?.navigation?.filter((n: any) => n.fromComponentId === node.id) || [];

        const isScreen = node.parent === 'body';
        const hasChildren = children.length > 0;
        const isExpanded = expandedNodes.has(node.id);

        const toggleExpand = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!hasChildren) return;
            setExpandedNodes(prev => {
                const next = new Set(prev);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
                return next;
            });
        };

        return (
            <div
                key={node.id}
                className={`
                    border transition-all duration-300 shadow-sm relative
                    ${hasChildren ? 'hover:border-primary/50' : 'cursor-default'}
                    ${isScreen ? 'w-80 rounded-xl bg-white dark:bg-zinc-900' : 'w-full p-2 rounded-md bg-slate-50 dark:bg-zinc-800/80 mt-2'}
                    opacity-100 scale-100
                    ${selectedNode?.id === node.id ? 'ring-2 ring-primary border-primary' : 'border-border'}
                `}
            >
                {/* Node Header (CSS Hover Triggers) */}
                <div className={`group/header relative font-semibold flex justify-between items-center ${isScreen ? 'p-3 border-b bg-muted/30 text-sm rounded-t-xl' : 'p-2 text-xs hover:bg-muted/30 rounded-t-md'}`}>
                    <div className="flex items-center gap-1">
                        {hasChildren && (
                            <div onClick={toggleExpand} className="cursor-pointer p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded">
                                {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                            </div>
                        )}
                        {node.name}
                    </div>

                    {/* Hover Tools - Hidden in Flows or Functionality modes */}
                    {!(mode === 'flows' && activeFlow) && !(showFunctionality && activeFunction) && (
                        <div className="opacity-0 group-hover/header:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded absolute right-2 z-10 shadow-sm border border-border/50">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900" onClick={(e) => { e.stopPropagation(); setSelectedNode({ type: 'NewNode', isScreen: false, parent: node.id, name: '', purpose: '', styles: '', connectedTo: '' }); setExpandedNodes(prev => new Set([...prev, node.id])); }}>
                                        <Plus size={12} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Add Nested Component</TooltipContent>
                            </Tooltip>

                            <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900" onClick={(e) => { e.stopPropagation(); setSelectedNode({ type: isScreen ? 'Screen' : 'Component', ...node }); }}>
                                <Edit2 size={12} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900" onClick={(e) => { e.stopPropagation(); setNodeToDelete(node); }}>
                                <Trash2 size={12} />
                            </Button>
                        </div>
                    )}
                </div>

                <div className="px-3 py-1 space-y-1 mt-1">
                    {showNav && incomingNavs.length > 0 && incomingNavs.map((n: any, i: number) => (
                        <div key={i} className="text-[10px] text-blue-600 font-medium">← Comes from {getNodeById(n.fromComponentId)?.name || 'Unknown'}</div>
                    ))}
                    {showNav && outgoingNavs.length > 0 && outgoingNavs.map((n: any, i: number) => (
                        <div key={i} className="text-[10px] text-emerald-600 font-medium">→ Goes to {getNodeById(n.toScreenId)?.name || 'Unknown'}</div>
                    ))}
                    {showStyles && node.styles && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-500 font-medium font-mono truncate">Styles: {node.styles}</div>
                    )}
                </div>

                {isExpanded && hasChildren && (
                    <div className={`${isScreen ? 'p-3' : 'pl-2 border-l border-dashed border-border/60 ml-1'} flex flex-col`} onClick={e => e.stopPropagation()}>
                        {children
                            .filter((child: any) => {
                                // If functionality is active, only render children that are part of it
                                if (showFunctionality && activeFunction) {
                                    return isNodeActive(child.id);
                                }
                                return true;
                            })
                            .map((child: any) => renderStandardNode(child, currentDepth + 1))
                        }
                    </div>
                )}

                {!isExpanded && hasChildren && (
                    <div
                        onClick={toggleExpand}
                        className="text-[10px] text-center text-muted-foreground mt-2 py-1 bg-muted/20 hover:bg-muted/40 cursor-pointer rounded mx-2 mb-2 transition-colors"
                    >
                        +{children.length} nested component(s)...
                    </div>
                )}
            </div>
        );
    };

    const renderFlowSequence = () => {
        const flow = graph.edges?.flows?.find((f: any) => f.name === activeFlow);
        if (!flow || !flow.steps) return <div className="text-muted-foreground m-auto">Select a flow to view sequence.</div>;

        // USE LIVE PREVIEW IF DRAGGING, OTHERWISE USE GRAPH DATA
        const displaySteps = liveSteps || flow.steps;

        const rows = [];
        for (let i = 0; i < displaySteps.length; i += itemsPerRow) {
            rows.push(displaySteps.slice(i, i + itemsPerRow)); // Slices based on live data
        }

        return (
            <div ref={flowContainerRef} className="w-full h-full flex justify-center overflow-y-auto py-12 px-4">
                <div className="flex flex-col inline-flex">
                    {rows.map((rowSteps: string[], rowIndex: number) => {
                        const isEven = rowIndex % 2 === 0;
                        const isLastRow = rowIndex === rows.length - 1;

                        return (
                            <React.Fragment key={`row-${rowIndex}`}>
                                <div className={`flex w-full ${isEven ? 'flex-row' : 'flex-row-reverse'} justify-start`}>
                                    {rowSteps.map((stepId: string, colIndex: number) => {
                                        const node = getNodeById(stepId);
                                        if (!node) return null;

                                        const absoluteIndex = rowIndex * itemsPerRow + colIndex; // Calculate actual index
                                        const isLastInRow = colIndex === rowSteps.length - 1;
                                        const incomingNavs = showNav ? (graph.edges?.navigation?.filter((n: any) => n.toScreenId === node.id || n.toComponentId === node.id) || []) : [];
                                        const outgoingNavs = showNav ? (graph.edges?.navigation?.filter((n: any) => n.fromComponentId === node.id) || []) : [];

                                        return (
                                            <React.Fragment key={`${stepId}-${colIndex}-${absoluteIndex}`}>
                                                {/* 1. START CAP (Before the very first node) */}
                                                {absoluteIndex === 0 && (
                                                    <div className="flex-shrink-0 flex items-center justify-center w-16">
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            className="h-8 w-8 rounded-full border-dashed border-2 border-primary text-primary hover:bg-primary hover:text-white hover:border-solid transition-all z-10 bg-background flex-shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // Passing -1 means it will insert at index 0 (the very beginning)
                                                                setInsertFlowContext({ index: -1, selectedScreen: '', selectedComponent: '' });
                                                                setSelectedNode({ type: 'InsertFlowStep' });
                                                            }}
                                                        >
                                                            <Plus size={16} strokeWidth={3} />
                                                        </Button>
                                                        <div className="h-px flex-1 border-t-2 border-dashed border-primary/50"></div>
                                                    </div>
                                                )}
                                                <div
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, absoluteIndex, displaySteps)}
                                                    onDragEnter={(e) => handleDragEnter(e, absoluteIndex)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDragEnd={handleDragEnd}
                                                    onDrop={handleDrop}
                                                    onMouseEnter={(e) => { e.stopPropagation(); setHoveredNodeId(node.id); }}
                                                    onMouseLeave={(e) => { e.stopPropagation(); setHoveredNodeId(null); }}
                                                    className={`relative flex-shrink-0 w-64 border rounded-xl bg-white dark:bg-zinc-900 shadow-md transition-all duration-300 
                                                        ${selectedNode?.id === node.id ? 'ring-2 ring-primary border-primary scale-105' : 'border-border'} 
                                                        ${draggedFlowIndex === absoluteIndex ? 'opacity-40 border-dashed border-2 ring-2 ring-primary/50 bg-primary/5 scale-95 z-50' : ''}`}
                                                >
                                                    <div className={`px-3 py-2 border-b font-semibold text-sm rounded-t-xl flex justify-between items-center cursor-grab active:cursor-grabbing hover:bg-black/5 dark:hover:bg-white/5 ${node.isScreen ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' : 'bg-muted/30'}`}>
                                                        {node.name}
                                                        <span className="text-[10px] uppercase font-bold opacity-50">{node.isScreen ? 'Screen' : 'Component'}</span>

                                                        {hoveredNodeId === node.id && !activeFlow && (
                                                            <div className="flex items-center gap-1 bg-white/80 dark:bg-zinc-900/80 p-1 rounded absolute right-2 z-10">
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); setSelectedNode({ type: node.isScreen ? 'Screen' : 'Component', ...node }); }}>
                                                                    <Edit2 size={12} />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); setNodeToDelete(node); }}>
                                                                    <Trash2 size={12} />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-3 text-xs text-muted-foreground min-h-[60px]">{node.purpose}</div>
                                                    {(showNav || showStyles) && (
                                                        <div className="px-3 pb-3 pt-1 space-y-1 border-t border-dashed bg-slate-50 dark:bg-zinc-800/50 rounded-b-xl">
                                                            {showNav && incomingNavs.length > 0 && incomingNavs.map((n: any, i: number) => <div key={i} className="text-[10px] text-blue-600 font-medium truncate">← {getNodeById(n.fromComponentId)?.name || 'Unknown'}</div>)}
                                                            {showNav && outgoingNavs.length > 0 && outgoingNavs.map((n: any, i: number) => <div key={i} className="text-[10px] text-emerald-600 font-medium truncate">→ {getNodeById(n.toScreenId)?.name || 'Unknown'}</div>)}
                                                            {showStyles && node.styles && <div className="text-[10px] text-amber-600 dark:text-amber-500 font-medium font-mono truncate mt-1">Sty: {node.styles}</div>}
                                                        </div>
                                                    )}
                                                </div>

                                                {!isLastInRow && (
                                                    <div className="flex-shrink-0 text-muted-foreground flex items-center justify-center w-16 relative group/arrow">
                                                        <div className="h-px flex-1 bg-border"></div>
                                                        {isEven ? <ArrowRight className="w-5 h-5 text-primary mx-1 group-hover/arrow:opacity-0 transition-opacity" /> : <ArrowLeft className="w-5 h-5 text-primary mx-1 group-hover/arrow:opacity-0 transition-opacity" />}
                                                        <div className="h-px flex-1 bg-border"></div>

                                                        {/* Hover Plus Button */}
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            className="absolute h-6 w-6 rounded-full opacity-0 group-hover/arrow:opacity-100 transition-opacity bg-background border-primary text-primary hover:bg-primary hover:text-white"
                                                            onClick={() => {
                                                                setInsertFlowContext({ index: absoluteIndex, selectedScreen: '', selectedComponent: '' });
                                                                setSelectedNode({ type: 'InsertFlowStep' });
                                                            }}
                                                        >
                                                            <Plus size={12} strokeWidth={3} />
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* 2. END CAP (After the very last node) */}
                                                {absoluteIndex === flow.steps.length - 1 && (
                                                    <div className="flex-shrink-0 flex items-center justify-center w-16">

                                                        {/* Render line BEFORE the button if it's an even row (going right) */}
                                                        {isEven && <div className="h-px flex-1 border-t-2 border-dashed border-primary/50"></div>}

                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            className="h-8 w-8 rounded-full border-dashed border-2 border-primary text-primary hover:bg-primary hover:text-white hover:border-solid transition-all z-10 bg-background flex-shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setInsertFlowContext({ index: absoluteIndex, selectedScreen: '', selectedComponent: '' });
                                                                setSelectedNode({ type: 'InsertFlowStep' });
                                                            }}
                                                        >
                                                            <Plus size={16} strokeWidth={3} />
                                                        </Button>

                                                        {/* Render line AFTER the button if it's an odd row (going left) */}
                                                        {!isEven && <div className="h-px flex-1 border-t-2 border-dashed border-primary/50"></div>}

                                                    </div>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>

                                {!isLastRow && (
                                    <div className={`w-full flex ${isEven ? 'justify-end' : 'justify-start'}`}>
                                        <div className="flex flex-col items-center w-64 relative group/arrow">
                                            <div className="w-px h-6 bg-border"></div>
                                            <ArrowDown className="w-5 h-5 text-primary my-1 group-hover/arrow:opacity-0 transition-opacity" />
                                            <div className="w-px h-6 bg-border"></div>

                                            {/* Hover Plus Button */}
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="absolute top-[18px] h-6 w-6 rounded-full opacity-0 group-hover/arrow:opacity-100 transition-opacity bg-background border-primary text-primary hover:bg-primary hover:text-white"
                                                onClick={() => {
                                                    const lastIndexInRow = rowIndex * itemsPerRow + rowSteps.length - 1;
                                                    setInsertFlowContext({ index: lastIndexInRow, selectedScreen: '', selectedComponent: '' });
                                                    setSelectedNode({ type: 'InsertFlowStep' });
                                                }}
                                            >
                                                <Plus size={12} strokeWidth={3} />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950 relative overflow-hidden">

            {/* Modal for Deletion Confirmation */}
            {nodeToDelete && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xl max-w-sm w-full border">
                        <h3 className="text-lg font-bold mb-2">Delete {nodeToDelete.isScreen ? 'Screen' : 'Component'}?</h3>
                        <p className="text-sm text-muted-foreground mb-6">Are you sure you want to delete "{nodeToDelete.name}"? This will also delete any nested components inside it.</p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setNodeToDelete(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDeleteNode}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Mode Switcher (TOP BAR) */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-zinc-900 z-10 min-h-[56px]">
                {/* Left Side: Mode Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant={mode === 'project' ? 'default' : 'outline'} size="sm" onClick={() => setMode('project')}>
                        <Briefcase className="w-4 h-4 mr-2" /> Project
                    </Button>
                    <Button variant={mode === 'structure' ? 'default' : 'outline'} size="sm" onClick={() => setMode('structure')}>
                        <Layout className="w-4 h-4 mr-2" /> Screen
                    </Button>
                    <Button variant={mode === 'flows' ? 'default' : 'outline'} size="sm" onClick={() => setMode('flows')}>
                        <MousePointerClick className="w-4 h-4 mr-2" /> Flows
                    </Button>
                </div>

                {/* Right Side: View Controls (Unified Row with Truncation) */}
                {mode !== 'project' && (
                    <div className="flex items-center gap-4 animate-in fade-in duration-200 overflow-hidden ml-4">
                        {/* Dropdowns Group with Truncation Logic */}
                        <div className="flex items-center gap-2 min-w-0">
                            {mode === 'flows' && (
                                <select
                                    className="bg-muted/50 border border-border rounded-md px-2 py-1 text-xs outline-none font-medium w-full max-w-[350px] truncate"
                                    value={activeFlow || ""}
                                    onChange={(e) => setActiveFlow(e.target.value)}
                                >
                                    {graph.edges?.flows?.map((f: any) => (
                                        <option key={f.name} value={f.name}>
                                            {f.name.length > 50 ? `${f.name.substring(0, 45)}...` : f.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {mode === 'structure' && showFunctionality && (
                                <div className="flex items-center gap-2">
                                    <select
                                        className="bg-muted/50 border border-border rounded-md px-2 py-1 text-xs outline-none font-medium w-full max-w-[300px] truncate"
                                        value={activeFunction || ""}
                                        onChange={(e) => setActiveFunction(e.target.value)}
                                    >
                                        {graph.metadata?.functionalities?.map((f: any) => (
                                            <option key={f.name} value={f.name}>
                                                {f.name.length > 50 ? `${f.name.substring(0, 45)}...` : f.name}
                                            </option>
                                        ))}
                                    </select>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs border-dashed text-primary hover:bg-primary hover:text-white"
                                                onClick={() => setSelectedNode({ type: 'FunctionalityForm', isNew: true, name: '', description: '', relatedNodes: [] })}
                                            >
                                                <Plus size={12} className="mr-1" /> New
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            Add a new functionality
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                        {/* Checkboxes Group - Used shorter labels to save space */}
                        <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground border-r pr-4 h-6 flex-shrink-0">
                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                                <input type="checkbox" checked={showNav} onChange={(e) => setShowNav(e.target.checked)} className="rounded text-primary focus:ring-primary h-3.5 w-3.5" /> Nav
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                                <input type="checkbox" checked={showStyles} onChange={(e) => setShowStyles(e.target.checked)} className="rounded text-primary focus:ring-primary h-3.5 w-3.5" /> Styles
                            </label>
                            {mode === 'structure' && (
                                <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                                    <input type="checkbox" checked={showFunctionality} onChange={(e) => handleToggleFunctionality(e.target.checked)} className="rounded text-primary focus:ring-primary h-3.5 w-3.5" /> Functionality
                                </label>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Layout Area */}
            <div className="flex flex-1 overflow-hidden">

                {/* 2. Main Canvas */}
                <div className="flex-1 overflow-auto p-8 relative flex flex-col">

                    {mode === 'project' && (
                        <div className="max-w-4xl mx-auto w-full space-y-8 pb-20">
                            {/* Project Strategy Card (Inline Editable) */}
                            <div className="p-6 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm border-border">
                                <h2 className="text-xl font-bold mb-5 flex items-center"><Briefcase className="mr-2 w-5 h-5 text-primary" /> Strategy & Objectives</h2>
                                <div className="space-y-4 text-sm leading-relaxed">
                                    {renderInlineField("Product Description", "description", graph.strategy?.productDescription || '', true)}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                                        {renderInlineField("Objective (Users)", "objectiveUsers", graph.strategy?.objectives?.forUsers || '', true)}
                                        {renderInlineField("Objective (Creator)", "objectiveCreator", graph.strategy?.objectives?.forCreator || '', true)}
                                    </div>
                                </div>
                            </div>

                            {/* Personas Grid */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold">Target Personas</h2>
                                    <Button variant="outline" size="sm" onClick={() => openPersonaEditor()}>+ Add Persona</Button>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {graph.strategy?.personas?.map((p: any, i: number) => (
                                        <div
                                            key={i}
                                            onMouseEnter={() => setHoveredNodeId(`persona-${i}`)}
                                            onMouseLeave={() => setHoveredNodeId(null)}
                                            className={`p-5 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm transition-all relative ${selectedNode?.type === 'PersonaForm' && personaDraft?.index === i ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-primary/50'}`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-bold text-lg text-primary">{p.name}</h3>
                                                {hoveredNodeId === `persona-${i}` && (
                                                    <div className="flex gap-1 absolute right-3 top-3 bg-white/90 p-1 rounded">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); openPersonaEditor(p, i); }}><Edit2 size={12} /></Button>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); deletePersona(i); }}><Trash2 size={12} /></Button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-sm space-y-3">
                                                <div><span className="font-semibold text-xs uppercase text-muted-foreground">Demographics</span><p>{p.demographics}</p></div>
                                                <div><span className="font-semibold text-xs uppercase text-muted-foreground">Technical Profile</span><p>{p.technicalProfile}</p></div>
                                                <div><span className="font-semibold text-xs uppercase text-muted-foreground">Knowledge Profile</span><p>{p.knowledgeProfile}</p></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Out of Scope Constraints Card */}
                            <div className="p-6 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm border-border">
                                <h2 className="text-xl font-bold mb-5 flex items-center">Out of Scope Constraints</h2>
                                <div className="space-y-2">
                                    {graph.scope?.outOfScope?.map((item: string, i: number) => {
                                        const isEditing = inlineEdit?.field === 'constraint' && inlineEdit.index === i;
                                        return isEditing ? (
                                            <div key={item} className="p-3 border rounded-lg bg-slate-50 dark:bg-zinc-800 space-y-2">
                                                <textarea className="w-full bg-white dark:bg-zinc-900 border rounded text-sm p-2 focus:ring-2 focus:ring-primary" value={inlineEdit.value} onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })} autoFocus />
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => setInlineEdit(null)}>Cancel</Button>
                                                    <Button size="sm" onClick={saveInlineEdit}>Save</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                key={item}
                                                onMouseEnter={() => setHoveredNodeId(`constraint-${i}`)}
                                                onMouseLeave={() => setHoveredNodeId(null)}
                                                className="flex justify-between items-start p-3 border rounded-lg bg-white dark:bg-zinc-900 shadow-sm hover:border-primary/50 transition-all relative"
                                            >
                                                <p className="text-sm pr-16">{item}</p>
                                                {hoveredNodeId === `constraint-${i}` && (
                                                    <div className="flex gap-1 absolute right-2 top-2 bg-white p-1 rounded">
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-600 hover:bg-blue-100" onClick={() => setInlineEdit({ field: 'constraint', value: item, index: i })}><Edit2 size={12} /></Button>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600 hover:bg-red-100" onClick={() => deleteConstraint(i)}><Trash2 size={12} /></Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {inlineEdit?.field === 'constraint' && inlineEdit.index === undefined ? (
                                        <div className="p-3 border rounded-lg bg-slate-50 dark:bg-zinc-800 space-y-2 mt-4">
                                            <textarea className="w-full bg-white dark:bg-zinc-900 border rounded text-sm p-2 focus:ring-2 focus:ring-primary" placeholder="New constraint..." value={inlineEdit.value} onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })} autoFocus />
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setInlineEdit(null)}>Cancel</Button>
                                                <Button size="sm" onClick={saveInlineEdit}>Add</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button variant="outline" size="sm" className="mt-4 w-full border-dashed" onClick={() => setInlineEdit({ field: 'constraint', value: '' })}>+ Add Constraint</Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Structure / Flows Rendering */}
                    {mode === 'flows' && (
                        <div className="w-full flex-1 border-2 border-dashed border-border/60 rounded-xl bg-white/50 dark:bg-zinc-900/50 flex overflow-hidden">
                            {renderFlowSequence()}
                        </div>
                    )}
                    {mode === 'structure' && (
                        <div className="flex flex-col w-full h-full relative">
                            {/* --- STICKY FUNCTIONALITY HEADER --- */}
                            {showFunctionality && activeFunction && (
                                <div className="sticky -top-8 z-40 -mt-8 -mx-8 px-8 pt-6 pb-4 mb-8 bg-slate-50/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-border/50 flex flex-col items-center animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                                            {activeFunction}
                                        </span>

                                        {/* Actions moved inline to prevent overlap */}
                                        <div className="flex items-center gap-1 bg-white/50 dark:bg-zinc-900/50 rounded-full px-1 border border-border/50">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-blue-600 hover:bg-blue-100" onClick={() => {
                                                        const func = graph.metadata?.functionalities?.find((f: any) => f.name === activeFunction);
                                                        setSelectedNode({ type: 'FunctionalityForm', isNew: false, originalName: activeFunction, ...func });
                                                    }}>
                                                        <Edit2 size={12} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">Edit Functionality</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-red-600 hover:bg-red-100" onClick={() => {
                                                        setGraph((prev: any) => {
                                                            const next = JSON.parse(JSON.stringify(prev));
                                                            next.metadata.functionalities = next.metadata.functionalities.filter((f: any) => f.name !== activeFunction);
                                                            return next;
                                                        });
                                                        setActiveFunction(null);
                                                    }}>
                                                        <Trash2 size={12} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">Delete Functionality</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* --- NEW FUNCTIONALITY DESCRIPTION BANNER --- */}
                            {showFunctionality && activeFunction && (
                                <div className="max-w-2xl w-full mx-auto mb-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-top-2">
                                    <p className="text-sm text-muted-foreground">
                                        {graph?.metadata?.functionalities?.find((f: any) => f.name === activeFunction)?.description || "No description provided."}
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-8 items-start pb-20 justify-center">
                                {graph.nodes?.screens?.filter((s: any) => {
                                    // Only show top-level screens (parent === 'body')
                                    if (s.parent !== 'body') return false;

                                    // If functionality view is ON, only show screens that are "active"
                                    if (showFunctionality && activeFunction) {
                                        return isNodeActive(s.id);
                                    }

                                    // Otherwise show all top-level screens
                                    return true;
                                }).map((screen: any) => renderStandardNode(screen, 0))}

                                {/* Hide 'Add Screen' button when focusing on a specific functionality to keep the view clean */}
                                {(!showFunctionality || !activeFunction) && (
                                    <div
                                        onClick={() => setSelectedNode({ type: 'NewNode', isScreen: true, parent: 'body', name: '', purpose: '', styles: '', connectedTo: '' })}
                                        className="w-80 border-2 border-dashed border-border hover:border-primary/50 rounded-xl flex items-center justify-center p-6 cursor-pointer text-muted-foreground hover:text-primary transition-colors min-h-[150px]"
                                    >
                                        + Add Screen
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Floating Zoom Controls (Global/Local Map-style) */}
                {mode === 'structure' && (
                    <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-10 bg-white dark:bg-zinc-900 p-2 rounded-xl shadow-lg border">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!canZoomIn} onClick={handleZoomIn}>
                                    <ZoomInIcon className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Expand Next Level</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!canZoomOut} onClick={handleZoomOut}>
                                    <ZoomOutIcon className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Collapse Deepest Level</TooltipContent>
                        </Tooltip>
                    </div>
                )}

                {/* 4. Editable Context Panel (Sidebar) */}
                {selectedNode && (
                    <div className="w-96 border-l bg-white dark:bg-zinc-900 shadow-2xl p-5 flex flex-col z-20 overflow-y-auto animate-in slide-in-from-right-8 border-t-0 border-r-0 border-b-0">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">
                                {selectedNode.type === 'PersonaForm' ? (personaDraft?.isNew ? 'Add Persona' : 'Edit Persona') :
                                    selectedNode.type === 'FunctionalityForm' ? (selectedNode.isNew ? 'Add Functionality' : 'Edit Functionality') :
                                        `${selectedNode.type} Settings`}
                            </span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedNode(null)}>✕</Button>
                        </div>

                        <div className="space-y-4">
                            {/* Editor fields for Existing Screens & Components */}
                            {(selectedNode.type === 'Screen' || selectedNode.type === 'Component') && (
                                <>
                                    <div><label className="text-xs font-semibold text-muted-foreground mb-1 block">Name</label><input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.name} onChange={(e) => handleUpdateNode('name', e.target.value)} /></div>
                                    <div><label className="text-xs font-semibold text-muted-foreground mb-1 block">Purpose</label><textarea className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary min-h-[80px]" value={selectedNode.purpose} onChange={(e) => handleUpdateNode('purpose', e.target.value)} /></div>
                                    <div><label className="text-xs font-semibold text-muted-foreground mb-1 block">Styles (Specific or Inherited)</label><input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary font-mono text-xs" value={selectedNode.styles || "Inherited from Global"} onChange={(e) => handleUpdateNode('styles', e.target.value)} /></div>
                                    <div className="pt-4 border-t flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)}>Cancel</Button>
                                        <Button size="sm" onClick={() => setSelectedNode(null)}>Save</Button>
                                    </div>
                                </>
                            )}

                            {/* Editor fields for CREATING a New Node */}
                            {selectedNode.type === 'NewNode' && (
                                <>
                                    <div><label className="text-xs font-semibold text-muted-foreground mb-1 block">Name</label><input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.name} onChange={(e) => setSelectedNode({ ...selectedNode, name: e.target.value })} autoFocus /></div>
                                    <div><label className="text-xs font-semibold text-muted-foreground mb-1 block">Purpose</label><textarea className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary min-h-[80px]" value={selectedNode.purpose} onChange={(e) => setSelectedNode({ ...selectedNode, purpose: e.target.value })} /></div>
                                    <div><label className="text-xs font-semibold text-muted-foreground mb-1 block">Styles</label><input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary font-mono text-xs" value={selectedNode.styles} placeholder="Inherited from Global" onChange={(e) => setSelectedNode({ ...selectedNode, styles: e.target.value })} /></div>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Connected to Node (Navigation)</label>
                                        <select className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.connectedTo} onChange={(e) => setSelectedNode({ ...selectedNode, connectedTo: e.target.value })}>
                                            <option value="">None</option>
                                            {[...(graph.nodes?.screens || []), ...(graph.nodes?.components || [])].map(n => (
                                                <option key={n.id} value={n.id}>{n.name} ({n.id.startsWith('screen') ? 'Screen' : 'Component'})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="pt-4 border-t flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)}>Cancel</Button>
                                        <Button size="sm" onClick={() => {
                                            if (!selectedNode.name) return;
                                            setGraph((prev: any) => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                const newId = selectedNode.isScreen ? `screen-new-${Date.now()}` : `comp-new-${Date.now()}`;
                                                const newNode = { id: newId, parent: selectedNode.parent, name: selectedNode.name, purpose: selectedNode.purpose, styles: selectedNode.styles || "Inherited from Global" };

                                                if (selectedNode.isScreen) next.nodes.screens.push(newNode);
                                                else next.nodes.components.push(newNode);

                                                if (selectedNode.connectedTo) {
                                                    if (!next.edges.navigation) next.edges.navigation = [];
                                                    next.edges.navigation.push({ fromComponentId: newId, toScreenId: selectedNode.connectedTo });
                                                }
                                                return next;
                                            });
                                            setSelectedNode(null);
                                        }}>Done</Button>
                                    </div>
                                </>
                            )}

                            {/* Add this inside the sidebar rendering area */}
                            {selectedNode.type === 'InsertFlowStep' && insertFlowContext && (
                                <>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">1. Select Screen (Required)</label>
                                        <select
                                            className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                                            value={insertFlowContext.selectedScreen}
                                            onChange={(e) => setInsertFlowContext({ ...insertFlowContext, selectedScreen: e.target.value, selectedComponent: '' })}
                                        >
                                            <option value="">Select a screen...</option>
                                            {graph.nodes?.screens?.filter((s: any) => s.parent === 'body').map((n: any) => (
                                                <option key={n.id} value={n.id}>{n.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {insertFlowContext.selectedScreen && (
                                        <div>
                                            <label className="text-xs font-semibold text-muted-foreground mb-1 block mt-4">2. Select Component (Optional)</label>
                                            <select
                                                className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                                                value={insertFlowContext.selectedComponent}
                                                onChange={(e) => setInsertFlowContext({ ...insertFlowContext, selectedComponent: e.target.value })}
                                            >
                                                <option value="">Entire Screen (Default)</option>
                                                {/* Recursively find all children components of the selected screen */}
                                                {graph.nodes?.components?.filter((c: any) => {
                                                    const checkParent = (id: string): boolean => {
                                                        if (id === insertFlowContext.selectedScreen) return true;
                                                        const node = graph.nodes.components.find((comp: any) => comp.id === id);
                                                        if (node && node.parent !== 'body') return checkParent(node.parent);
                                                        return false;
                                                    };
                                                    return checkParent(c.id);
                                                }).map((n: any) => (
                                                    <option key={n.id} value={n.id}>{n.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t flex justify-end gap-2 mt-4">
                                        <Button variant="outline" size="sm" onClick={() => { setInsertFlowContext(null); setSelectedNode(null); }}>Cancel</Button>
                                        <Button size="sm" disabled={!insertFlowContext.selectedScreen} onClick={handleInsertFlowStep}>Insert Step</Button>
                                    </div>
                                </>
                            )}

                            {/* Detailed Editor fields for Personas */}
                            {selectedNode.type === 'PersonaForm' && personaDraft && (
                                <>
                                    <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Name / Role</label><input className="w-full border bg-slate-50 dark:bg-zinc-800 rounded p-2 text-sm focus:ring-1 focus:ring-primary" value={personaDraft.name} onChange={e => setPersonaDraft({ ...personaDraft, name: e.target.value })} /></div>

                                    <h4 className="font-semibold text-sm pt-4 border-t mt-4 mb-2 text-primary">Demographics</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Gender</label>
                                            <select className="w-full border bg-slate-50 dark:bg-zinc-800 rounded p-2 text-sm focus:ring-1 focus:ring-primary" value={personaDraft.gender} onChange={e => setPersonaDraft({ ...personaDraft, gender: e.target.value })}>
                                                <option value="">Select...</option><option value="Female">Female</option><option value="Male">Male</option><option value="Non-binary">Non-binary</option><option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Age</label>
                                            <select className="w-full border bg-slate-50 dark:bg-zinc-800 rounded p-2 text-sm focus:ring-1 focus:ring-primary" value={personaDraft.age} onChange={e => setPersonaDraft({ ...personaDraft, age: e.target.value })}>
                                                <option value="">Select...</option><option value="Under 18">Under 18</option><option value="18-24">18-24</option><option value="25-34">25-34</option><option value="35-44">35-44</option><option value="45-54">45-54</option><option value="55-64">55-64</option><option value="65+">65+</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Education</label>
                                        <select className="w-full border bg-slate-50 dark:bg-zinc-800 rounded p-2 text-sm focus:ring-1 focus:ring-primary" value={personaDraft.education} onChange={e => setPersonaDraft({ ...personaDraft, education: e.target.value })}>
                                            <option value="">Select...</option><option value="High School">High School</option><option value="Bachelor's">Bachelor's</option><option value="Master's Degree">Master's Degree</option><option value="PhD">PhD</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Marital Status</label>
                                            <select className="w-full border bg-slate-50 dark:bg-zinc-800 rounded p-2 text-sm focus:ring-1 focus:ring-primary" value={personaDraft.marital} onChange={e => setPersonaDraft({ ...personaDraft, marital: e.target.value })}>
                                                <option value="">Select...</option><option value="Single">Single</option><option value="Married">Married</option><option value="Divorced">Divorced</option><option value="Widowed">Widowed</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Income</label>
                                            <select className="w-full border bg-slate-50 dark:bg-zinc-800 rounded p-2 text-sm focus:ring-1 focus:ring-primary" value={personaDraft.income} onChange={e => setPersonaDraft({ ...personaDraft, income: e.target.value })}>
                                                <option value="">Select...</option><option value="Under $25k">Under $25k</option><option value="$25k-$50k">$25k-$50k</option><option value="$50k-$75k">$50k-$75k</option><option value="$75k-$100k">$75k-$100k</option><option value="$100k-$150k">$100k-$150k</option><option value="$150k+">$150k+</option>
                                            </select>
                                        </div>
                                    </div>

                                    <h4 className="font-semibold text-sm pt-4 border-t mt-4 mb-2 text-primary">Technical & Knowledge</h4>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Tech Expertise</label>
                                        <select className="w-full border bg-slate-50 dark:bg-zinc-800 rounded p-2 text-sm focus:ring-1 focus:ring-primary" value={personaDraft.expertise} onChange={e => setPersonaDraft({ ...personaDraft, expertise: e.target.value })}>
                                            <option value="">Select...</option><option value="Low">Low expertise</option><option value="Medium">Medium expertise</option><option value="High">High expertise</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Internet Usage</label>
                                        <select className="w-full border bg-slate-50 dark:bg-zinc-800 rounded p-2 text-sm focus:ring-1 focus:ring-primary" value={personaDraft.internet} onChange={e => setPersonaDraft({ ...personaDraft, internet: e.target.value })}>
                                            <option value="">Select...</option><option value="0-10 hours/week">0-10 hours/week</option><option value="10-20 hours/week">10-20 hours/week</option><option value="20-40 hours/week">20-40 hours/week</option><option value="40+ hours/week">40+ hours/week</option>
                                        </select>
                                    </div>
                                    <div><label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Favorite Sites</label><input type="text" placeholder="e.g. Notion, Medium" className="w-full border bg-slate-50 dark:bg-zinc-800 rounded p-2 text-sm focus:ring-1 focus:ring-primary" value={personaDraft.sites} onChange={e => setPersonaDraft({ ...personaDraft, sites: e.target.value })} /></div>
                                    <div><label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Knowledge Profile</label><textarea className="w-full border bg-slate-50 dark:bg-zinc-800 rounded p-2 text-sm min-h-[100px] focus:ring-1 focus:ring-primary" value={personaDraft.knowledgeProfile} onChange={e => setPersonaDraft({ ...personaDraft, knowledgeProfile: e.target.value })} /></div>

                                    <div className="mt-6 flex justify-end gap-2 pt-4 border-t">
                                        <Button variant="outline" onClick={() => setSelectedNode(null)}>Cancel</Button>
                                        <Button onClick={savePersonaDraft}>Save Persona</Button>
                                    </div>
                                </>
                            )}
                            {/* Editor fields for Functionalities */}
                            {selectedNode.type === 'FunctionalityForm' && (
                                <>
                                    <div><label className="text-xs font-semibold text-muted-foreground mb-1 block">Functionality Name</label><input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.name} onChange={(e) => setSelectedNode({ ...selectedNode, name: e.target.value })} autoFocus /></div>
                                    <div><label className="text-xs font-semibold text-muted-foreground mb-1 block">Description</label><textarea className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary min-h-[80px]" value={selectedNode.description || ''} onChange={(e) => setSelectedNode({ ...selectedNode, description: e.target.value })} /></div>

                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground mb-2 block">Associated Screen/Components</label>
                                        <div className="border border-border bg-slate-50 dark:bg-zinc-800 rounded-md p-2 h-72 overflow-y-auto space-y-0.5">
                                            {(() => {
                                                const renderCheckboxTree = (parentId: string, depth: number = 0): React.ReactNode => {
                                                    const children = parentId === 'body'
                                                        ? graph.nodes?.screens?.filter((s: any) => s.parent === 'body') || []
                                                        : graph.nodes?.components?.filter((c: any) => c.parent === parentId) || [];

                                                    return children.map((n: any) => {
                                                        const isSelected = selectedNode.relatedNodes?.includes(n.id);
                                                        return (
                                                            <React.Fragment key={n.id}>
                                                                <label
                                                                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 py-1.5 pr-2 rounded transition-colors"
                                                                    style={{ marginLeft: `${depth * 12}px`, borderLeft: depth > 0 ? '1px dashed rgba(150,150,150,0.3)' : 'none', paddingLeft: depth > 0 ? '8px' : '4px' }}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={(e) => {
                                                                            const newRelated = e.target.checked
                                                                                ? [...(selectedNode.relatedNodes || []), n.id]
                                                                                : selectedNode.relatedNodes.filter((id: string) => id !== n.id);
                                                                            setSelectedNode({ ...selectedNode, relatedNodes: newRelated });
                                                                        }}
                                                                        className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                                                                    />
                                                                    <span className="truncate font-medium flex-1">{n.name}</span>
                                                                    {depth === 0 && <span className="opacity-40 text-[9px] uppercase tracking-wider">Screen</span>}
                                                                </label>
                                                                {renderCheckboxTree(n.id, depth + 1)}
                                                            </React.Fragment>
                                                        );
                                                    });
                                                };
                                                return renderCheckboxTree('body', 0);
                                            })()}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t flex justify-end gap-2 mt-4">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)}>Cancel</Button>
                                        <Button size="sm" onClick={() => {
                                            if (!selectedNode.name) return;
                                            setGraph((prev: any) => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                if (!next.metadata) next.metadata = {};
                                                if (!next.metadata.functionalities) next.metadata.functionalities = [];

                                                const newFunc = { name: selectedNode.name, description: selectedNode.description, relatedNodes: selectedNode.relatedNodes || [] };

                                                if (selectedNode.isNew) {
                                                    next.metadata.functionalities.push(newFunc);
                                                } else {
                                                    const idx = next.metadata.functionalities.findIndex((f: any) => f.name === selectedNode.originalName);
                                                    if (idx > -1) next.metadata.functionalities[idx] = newFunc;
                                                }
                                                return next;
                                            });
                                            setActiveFunction(selectedNode.name);
                                            setSelectedNode(null);
                                        }}>Save</Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
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
        <div className="flex flex-col h-full bg-white">
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
                </div>

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