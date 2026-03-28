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
import { Circle, Save, RefreshCw, Layout, Code, MousePointerClick, ArrowRight, ArrowLeft, ArrowDown, ZoomInIcon, ZoomOutIcon, Briefcase, Edit2, Trash2, ChevronRight, ChevronDown, Plus, Globe, GripVertical, ListTodo, AlertCircle, XCircle, AlertTriangle, Lightbulb } from "lucide-react";
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
type NavRuleType = 'global' | 'local' | 'contextual' | 'supplementary' | 'courtesy' | 'remote';
const navTypes: NavRuleType[] = ['global', 'local', 'contextual', 'supplementary', 'courtesy', 'remote'];

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

// --- Strategy Section ---
interface Persona {
    name: string;
    demographics: {
        gender: string;
        age: number;
        education_level: string;
        marital_status: string;
        annual_income: number;
    };
    technicalProfile: {
        expertise_level: string;
        internet_usage: number;
        favourite_sites: string;
    };
    knowledgeProfile: string;
}

interface Strategy {
    productDescription: string;
    objectives: {
        forUsers: string;
        forCreator: string;
    };
    personas: Persona[];
    outOfScope: string[];
}

// --- Structure Section ---
interface NodeStyle {
    layout?: {
        mobile: string;
        tablet: string;
        desktop: string;
        grid: string;
    };
    color?: string;
    typography?: string;
}

interface GraphNode {
    id: string;
    parent: string;
    name: string;
    purpose: string;
    styles?: NodeStyle;
}

interface NavRule {
    name?: string;
    purpose?: string;
    layouts?: Record<string, string>;
    order_of_screens?: string[];
    display_in?: string[];
    where?: string;
    description?: string;
    target?: string;
}

interface Structure {
    nodes: {
        screens: GraphNode[];
        components: GraphNode[];
    };
    edges: {
        navigationRules: {
            global: NavRule[];
            local: NavRule[];
            contextual: NavRule[];
            supplementary: NavRule[];
            courtesy: NavRule[];
            remote: NavRule[];
        };
        navigation: Array<{
            fromComponentId: string;
            toScreenId: string;
        }>;
        flows: Array<{
            name: string;
            description: string;
            steps: string[];
        }>;
    };
    functionalities: Array<{
        name: string;
        description: string;
        relatedNodes: string[];
    }>;
}

// --- Surface Section ---
interface TypographyDetail {
    element: string;
    size: string;
    weight: string;
    lineHeight: string;
    usage: string;
}

interface Surface {
    all_styles: {
        purpose: string;
        colors: Record<string, { name: string; color: string }>;
        typography: {
            family: string;
            hierarchy: Record<string, TypographyDetail>;
        };
    };
    global_styles: {
        purpose: string;
        color: string;
        typography: string;
        background_color: string;
        layout: NodeStyle['layout'];
        interactions: string[];
        accessibility: {
            keyboard: string[];
            visualHierarchy: string;
        };
    };
}

// --- Root Object ---
export interface ProductGraph {
    strategy: Strategy;
    structure: Structure;
    surface: Surface;
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
    const [flowToDelete, setFlowToDelete] = useState<string | null>(null);
    const [activeFlow, setActiveFlow] = useState<string | null>(null);
    const [activeFunction, setActiveFunction] = useState<string | null>(null);

    const [functionToDelete, setFunctionToDelete] = useState<string | null>(null);
    const [editingFlowTitle, setEditingFlowTitle] = useState<boolean>(false);
    const [editingFlowDesc, setEditingFlowDesc] = useState<boolean>(false);
    const [flowDraft, setFlowDraft] = useState<{ name: string, description: string } | null>(null);

    const [editingFuncTitle, setEditingFuncTitle] = useState<boolean>(false);
    const [editingFuncDesc, setEditingFuncDesc] = useState<boolean>(false);
    const [funcDraft, setFuncDraft] = useState<{ name: string, description: string } | null>(null);
    const [navRuleDraft, setNavRuleDraft] = useState({ type: 'local', target: '', description: '' });

    const NAV_TYPES = [
        { id: 'global', label: 'Global', desc: 'Provides access to the broad sweep of the entire site.' },
        { id: 'local', label: 'Local', desc: 'Provides access to what’s "nearby" in the architecture.' },
        { id: 'supplementary', label: 'Supplementary', desc: 'Shortcuts to related content not readily accessible through global/local nav.' },
        { id: 'contextual', label: 'Contextual', desc: 'Embedded in content to support users’ tasks. Avoid cluttering with too many links.' },
        { id: 'courtesy', label: 'Courtesy', desc: 'Access to common convenience items (e.g., contact info, feedback forms, policies).' },
        { id: 'remote', label: 'Remote', desc: 'Independent fallback devices (e.g., sitemap, index) for when users are frustrated/confused.' }
    ];

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
    const [graph, setGraph] = useState<ProductGraph | null>(null);

    const [draggedFlowIndex, setDraggedFlowIndex] = useState<number | null>(null);
    const [liveSteps, setLiveSteps] = useState<string[] | null>(null); // Holds the live preview array
    const [insertFlowContext, setInsertFlowContext] = useState<{ index: number, selectedScreen: string, selectedComponent: string } | null>(null);

    const [parseError, setParseError] = useState<string | null>(null);

    const [expandedNavSections, setExpandedNavSections] = useState<Set<string>>(new Set(['global'])); // Default local open
    const [expandedStyleSections, setExpandedStyleSections] = useState<Set<string>>(new Set([]));

    const [isAppWideNavExpanded, setIsAppWideNavExpanded] = useState<boolean>(true);
    const [isAllStylesExpanded, setIsAllStylesExpanded] = useState<boolean>(true);

    const toggleStyleSection = (id: string) => {
        setExpandedStyleSections(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getInheritedStyles = (nodeId: string): { source: string, styles: any } => {
        let currentId = nodeId;
        while (currentId && currentId !== 'body') {
            const node = getNodeById(currentId);
            // If the node has styles and it's not empty, return them (skip checking itself on the first pass)
            if (node && node.styles && Object.keys(node.styles).length > 0 && currentId !== nodeId) {
                return { source: node.name, styles: node.styles };
            }
            currentId = node?.parent || 'body';
        }
        return { source: 'App Wide Styles', styles: graph?.surface?.global_styles || {} };
    };

    useEffect(() => {
        try {
            const match = content.match(/```json\n([\s\S]*?)\n```/);
            const parsedGraph = match && match[1] ? JSON.parse(match[1]) : JSON.parse(content);
            setGraph(parsedGraph);
            if (parsedGraph.structure?.edges?.flows?.length > 0) {
                setActiveFlow(parsedGraph.structure?.edges.flows[0].name);
            }
            if (expandedNodes.size === 0 && parsedGraph.structure?.nodes?.screens) {
                setExpandedNodes(new Set());
            }
        } catch (e: any) {
            console.error("Failed to parse Design Semantic JSON", e);
            setParseError(e.message);
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
            const node = [...(graph.structure?.nodes?.screens || []), ...(graph.structure?.nodes?.components || [])].find((n: any) => n.id === id);
            if (!node) return 0;
            const d = calcDepth(node.parent) + 1;
            map.set(id, d);
            return d;
        };
        [...(graph.structure?.nodes?.screens || []), ...(graph.structure?.nodes?.components || [])].forEach((n: any) => calcDepth(n.id));
        return map;
    }, [graph]);

    const nodesWithChildren = useMemo(() => {
        if (!graph) return new Set();
        return new Set([...(graph.structure?.nodes?.screens || []), ...(graph.structure?.nodes?.components || [])].map((n: any) => n.parent));
    }, [graph]);

    if (!graph) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                <Layout className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground">No Graph Data Found</h3>
                {parseError && (
                    <p className="text-sm text-red-500 mt-2 bg-red-50 p-2 rounded border border-red-100">
                        JSON Error: {parseError}
                    </p>
                )}
            </div>
        );
    }

    const canZoomIn = [...(graph?.structure?.nodes?.screens || []), ...(graph?.structure?.nodes?.components || [])].some((n: any) => nodesWithChildren.has(n.id) && !expandedNodes.has(n.id));
    const canZoomOut = expandedNodes.size > 0;

    const handleZoomIn = () => {
        const expandedDepths = Array.from(expandedNodes).map(id => depthMap.get(id) || 0);
        const currentMaxDepth = expandedDepths.length > 0 ? Math.max(...expandedDepths) : -1;
        const targetDepth = currentMaxDepth + 1;
        const nodesToExpand = [...(graph.structure?.nodes?.screens || []), ...(graph.structure?.nodes?.components || [])].filter((n: any) => depthMap.get(n.id) === targetDepth && nodesWithChildren.has(n.id)).map((n: any) => n.id);
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
                const arrayToUpdate = isScreen ? next.structure.nodes.screens : next.structure.nodes.components;
                const index = arrayToUpdate.findIndex((n: any) => n.id === selectedNode.id);
                if (index !== -1) arrayToUpdate[index] = { ...arrayToUpdate[index], [field]: value };
            }
            else if (selectedNode.type === 'Project') {
                if (field === 'description') next.strategy.productDescription = value;
                if (field === 'objectiveUsers') next.strategy.objectives.forUsers = value;
                if (field === 'objectiveCreator') next.strategy.objectives.forCreator = value;
                if (field === 'outOfScope') next.strategy.outOfScope = value.split('\n').filter((l: string) => l.trim() !== '');
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
                if (!next.strategy.outOfScope) next.strategy.outOfScope = [];
                if (inlineEdit.index !== undefined) {
                    next.strategy.outOfScope[inlineEdit.index] = inlineEdit.value;
                } else {
                    next.strategy.outOfScope.push(inlineEdit.value);
                }
            }
            if (['globalNavName', 'globalNavPurpose', 'globalNavMobile', 'globalNavTablet', 'globalNavDesktop'].includes(inlineEdit.field)) {
                // 1. Ensure the deep nested structure exists
                if (!next.structure.edges) next.structure.edges = {};
                if (!next.structure.edges.navigationRules) next.structure.edges.navigationRules = {};
                if (!Array.isArray(next.structure.edges.navigationRules.global)) {
                    next.structure.edges.navigationRules.global = [{}];
                }
                if (!next.structure.edges.navigationRules.global[0]) {
                    next.structure.edges.navigationRules.global[0] = {};
                }

                const globalRule = next.structure.edges.navigationRules.global[0];

                // 2. Save to the correct property
                if (inlineEdit.field === 'globalNavName') {
                    globalRule.name = inlineEdit.value;
                } else if (inlineEdit.field === 'globalNavPurpose') {
                    globalRule.purpose = inlineEdit.value;
                } else {
                    // Mobile, Tablet, Desktop live inside the `layouts` object now
                    if (!globalRule.layouts) globalRule.layouts = {};
                    const key = inlineEdit.field.replace('globalNav', '').toLowerCase();
                    globalRule.layouts[key] = inlineEdit.value;
                }
            }

            // --- NEW: Handle Global Styles Inline Editing ---
            if (inlineEdit.field.startsWith('globalStyle_')) {
                if (!next.surface) next.surface = {};
                if (!next.surface.global_styles) next.surface.global_styles = {};

                if (inlineEdit.field === 'globalStyle_accessibility_keyboard' || inlineEdit.field === 'globalStyle_interactions') {
                    if (inlineEdit.field === 'globalStyle_accessibility_keyboard') {
                        if (!next.surface.global_styles.accessibility) next.surface.global_styles.accessibility = {};
                        if (!next.surface.global_styles.accessibility.keyboard) next.surface.global_styles.accessibility.keyboard = [];
                        if (inlineEdit.index !== undefined) next.surface.global_styles.accessibility.keyboard[inlineEdit.index] = inlineEdit.value;
                        else next.surface.global_styles.accessibility.keyboard.push(inlineEdit.value);
                    } else {
                        if (!next.surface.global_styles.interactions) next.surface.global_styles.interactions = [];
                        if (inlineEdit.index !== undefined) next.surface.global_styles.interactions[inlineEdit.index] = inlineEdit.value;
                        else next.surface.global_styles.interactions.push(inlineEdit.value);
                    }
                } else {
                    // Split the path (e.g., 'layout_mobile' becomes ['layout', 'mobile'])
                    const path = inlineEdit.field.replace('globalStyle_', '').split('_');
                    if (path.length === 1) {
                        next.surface.global_styles[path[0]] = inlineEdit.value;
                    } else if (path.length === 2) {
                        if (!next.surface.global_styles[path[0]]) next.surface.global_styles[path[0]] = {};
                        next.surface.global_styles[path[0]][path[1]] = inlineEdit.value;
                    }
                }
            }

            return next;
        });
        setInlineEdit(null);
    };

    const deleteConstraint = (index: number) => {
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            next.strategy.outOfScope.splice(index, 1);
            return next;
        });
    };

    const handleAddChild = (parentId: string, isScreenParent: boolean) => {
        const newId = `comp-new-${Date.now()}`;
        const newComp = { id: newId, parent: parentId, name: "New Component", purpose: "Describe purpose...", styles: "Inherited from Global" };
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            next.structure.nodes.components.push(newComp);
            return next;
        });
        setExpandedNodes(prev => new Set([...prev, parentId]));
    };

    const handleDeleteNode = () => {
        if (!nodeToDelete) return;
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            const deleteRecursive = (id: string) => {
                next.structure.nodes.screens = next.structure.nodes.screens.filter((s: any) => s.id !== id);
                next.structure.nodes.components = next.structure.nodes.components.filter((c: any) => c.id !== id);
                const children = [...(next.structure.nodes.screens || []), ...(next.structure.nodes.components || [])].filter(c => c.parent === id);
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
            // Map Age
            let mappedAge = p.demographics?.age || '';
            if (typeof mappedAge === 'number') {
                if (mappedAge < 18) mappedAge = 'Under 18';
                else if (mappedAge <= 24) mappedAge = '18-24';
                else if (mappedAge <= 34) mappedAge = '25-34';
                else if (mappedAge <= 44) mappedAge = '35-44';
                else if (mappedAge <= 54) mappedAge = '45-54';
                else if (mappedAge <= 64) mappedAge = '55-64';
                else mappedAge = '65+';
            }

            // Map Income
            let mappedIncome = p.demographics?.annual_income || '';
            if (typeof mappedIncome === 'number') {
                if (mappedIncome < 25000) mappedIncome = 'Under $25k';
                else if (mappedIncome <= 50000) mappedIncome = '$25k-$50k';
                else if (mappedIncome <= 75000) mappedIncome = '$50k-$75k';
                else if (mappedIncome <= 100000) mappedIncome = '$75k-$100k';
                else if (mappedIncome <= 150000) mappedIncome = '$100k-$150k';
                else mappedIncome = '$150k+';
            }

            // Map Internet Usage
            let mappedInternet = p.technicalProfile?.internet_usage || '';
            if (typeof mappedInternet === 'number') {
                if (mappedInternet <= 10) mappedInternet = '0-10 hours/week';
                else if (mappedInternet <= 20) mappedInternet = '10-20 hours/week';
                else if (mappedInternet <= 40) mappedInternet = '20-40 hours/week';
                else mappedInternet = '40+ hours/week';
            }

            setPersonaDraft({
                isNew: false, index, name: p.name || '',
                gender: p.demographics?.gender || '',
                age: mappedAge,
                education: p.demographics?.education_level || '',
                marital: p.demographics?.marital_status || '',
                income: mappedIncome,
                expertise: p.technicalProfile?.expertise_level || '',
                internet: mappedInternet,
                sites: p.technicalProfile?.favourite_sites || '',
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
            const p = {
                name: personaDraft.name,
                demographics: {
                    gender: personaDraft.gender,
                    age: personaDraft.age,
                    education_level: personaDraft.education,
                    marital_status: personaDraft.marital,
                    annual_income: personaDraft.income
                },
                technicalProfile: {
                    expertise_level: personaDraft.expertise,
                    internet_usage: personaDraft.internet,
                    favourite_sites: personaDraft.sites
                },
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
        if (checked && !activeFunction && graph?.structure?.functionalities?.length > 0) {
            setActiveFunction(graph.structure.functionalities[0].name);
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

    const handleDragOverContainer = (e: React.DragEvent) => {
        e.preventDefault();
        const container = flowContainerRef.current;
        if (!container || draggedFlowIndex === null) return;

        const scrollSpeed = 6;
        const threshold = 80;
        const rect = container.getBoundingClientRect();

        if (e.clientY - rect.top < threshold) {
            container.scrollTop -= scrollSpeed;
        } else if (rect.bottom - e.clientY < threshold) {
            container.scrollTop += scrollSpeed;
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (liveSteps) {
            // Commit the temporary live preview to the actual Graph state
            setGraph((prev: any) => {
                const next = JSON.parse(JSON.stringify(prev));
                const flowIndex = next.structure.edges.flows.findIndex((f: any) => f.name === activeFlow);
                if (flowIndex > -1) {
                    next.structure.edges.flows[flowIndex].steps = liveSteps;
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
            const flowIndex = next.structure.edges.flows.findIndex((f: any) => f.name === activeFlow);
            if (flowIndex > -1) {
                next.structure.edges.flows[flowIndex].steps.splice(insertFlowContext.index + 1, 0, targetId);
            }
            return next;
        });
        setInsertFlowContext(null);
        setSelectedNode(null);
    };

    const toggleNavSection = (id: string) => {
        setExpandedNavSections(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleReorderNavRule = (type: string, oldIndex: number, newIndex: number) => {
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            const rules = next.structure.edges.navigationRules[type];
            const [movedItem] = rules.splice(oldIndex, 1);
            rules.splice(newIndex, 0, movedItem);
            return next;
        });
    };

    const getNodeById = (id: string) => {
        const screen = graph.structure?.nodes?.screens?.find((s: any) => s.id === id);
        if (screen) return { ...screen, isScreen: true };
        const comp = graph.structure?.nodes?.components?.find((c: any) => c.id === id);
        if (comp) return { ...comp, isScreen: false };
        return null;
    };

    const isNodeActive = (id: string): boolean => {
        if (!graph) return true; // Add this guard

        if (mode === 'structure') {
            if (showFunctionality && activeFunction) {
                const func = graph.structure.functionalities.find(f => f.name === activeFunction);
                if (!func) return true;
                if (func.relatedNodes.includes(id)) return true;

                const hasActiveChild = (nodeId: string): boolean => {
                    const children = graph.structure.nodes.components.filter(c => c.parent === nodeId);
                    return children.some(c => func.relatedNodes.includes(c.id) || hasActiveChild(c.id));
                };
                return hasActiveChild(id);
            }
            return true;
        }

        if (mode === 'flows' && activeFlow) {
            const flow = graph.structure.edges.flows.find(f => f.name === activeFlow);
            // Use ?? false to ensure a boolean is always returned
            return flow?.steps.includes(id) ?? false;
        }
        return true;
    };

    const renderInlineField = (title: string, field: string, currentValue: string, isTextarea = false) => {
        const isEditing = inlineEdit?.field === field;
        return (
            <div
                className="group/field relative"
                onMouseEnter={() => setHoveredNodeId(`inline-${field}`)}
                onMouseLeave={() => setHoveredNodeId(null)}
            >
                <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">{title}</span>
                </div>
                {isEditing ? (
                    <div className="relative mt-1 -mx-2 p-2 border border-primary/50 rounded-md bg-white dark:bg-zinc-900 shadow-sm">
                        {isTextarea ? (
                            <textarea
                                className="w-full bg-transparent border-none text-sm p-0 focus:ring-0 outline-none resize-none leading-relaxed overflow-hidden block m-0"
                                value={inlineEdit.value}
                                onChange={(e) => {
                                    setInlineEdit({ ...inlineEdit, value: e.target.value });
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                onFocus={(e) => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                }}
                                onBlur={saveInlineEdit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        saveInlineEdit();
                                    } else if (e.key === 'Escape') {
                                        setInlineEdit(null);
                                    }
                                }}
                                autoFocus
                            />
                        ) : (
                            <input
                                className="w-full bg-transparent border-none text-sm p-0 focus:ring-0 outline-none leading-relaxed block m-0"
                                value={inlineEdit.value}
                                onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                                onBlur={saveInlineEdit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        saveInlineEdit();
                                    } else if (e.key === 'Escape') {
                                        setInlineEdit(null);
                                    }
                                }}
                                autoFocus
                            />
                        )}
                    </div>
                ) : (
                    <div
                        className="group relative cursor-text transition-colors hover:bg-black/5 dark:hover:bg-white/5 border border-transparent rounded-md flex justify-between items-start mt-1 -mx-2 p-2"
                        onClick={() => setInlineEdit({ field, value: currentValue })}
                        title="Click to edit"
                    >
                        <p className="text-sm leading-relaxed w-full whitespace-pre-wrap m-0 p-0">{currentValue}</p>
                        <div className="opacity-0 group-hover:opacity-50 transition-opacity text-muted-foreground flex-shrink-0 ml-2">
                            <Edit2 size={12} />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderStandardNode = (node: any, currentDepth: number) => {
        const active = isNodeActive(node.id);
        const children = graph.structure?.nodes.components.filter((c: any) => c.parent === node.id);
        const incomingNavs = graph.structure?.edges?.navigation?.filter((n: any) => n.toScreenId === node.id || n.toComponentId === node.id) || [];
        const outgoingNavs = graph.structure?.edges?.navigation?.filter((n: any) => n.fromComponentId === node.id) || [];

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
                    <div className="flex items-center gap-1 truncate pr-2">
                        {hasChildren && (
                            <div onClick={toggleExpand} className="cursor-pointer p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded flex-shrink-0">
                                {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                            </div>
                        )}
                        <span className="truncate">{node.name}</span>
                    </div>

                    {/* Screen/Component Label */}
                    <span className="text-[10px] uppercase font-bold opacity-50 ml-auto mr-2 flex-shrink-0">
                        {isScreen ? 'Screen' : 'Component'}
                    </span>

                    {/* Hover Tools - Hidden in Flows or Functionality modes */}
                    {!(mode === 'flows' && activeFlow) && !(showFunctionality && activeFunction) && (
                        <div className="opacity-0 group-hover/header:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded absolute right-1 z-10 shadow-sm border border-border/50">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900" onClick={(e) => { e.stopPropagation(); setSelectedNode({ type: 'NewNode', isScreen: false, parent: node.id, name: '', purpose: '', styles: '', connectedTo: '' }); setExpandedNodes(prev => new Set([...prev, node.id])); }}>
                                        <Plus size={8} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Add Nested Component</TooltipContent>
                            </Tooltip>

                            <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900" onClick={(e) => { e.stopPropagation(); setSelectedNode({ type: isScreen ? 'Screen' : 'Component', ...node }); }}>
                                <Edit2 size={8} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900" onClick={(e) => { e.stopPropagation(); setNodeToDelete(node); }}>
                                <Trash2 size={8} />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Purpose */}
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-dashed border-border/50 bg-white/50 dark:bg-zinc-900/50">
                    {node.purpose || "No description provided."}
                </div>

                <div className="px-3 py-1 space-y-1 mt-1">
                    {showNav && incomingNavs.length > 0 && incomingNavs.map((n: any, i: number) => (
                        <div key={i} className="text-[10px] text-blue-600 font-medium">→ Comes from {getNodeById(n.fromComponentId)?.name || 'Unknown'}</div>
                    ))}
                    {showNav && outgoingNavs.length > 0 && outgoingNavs.map((n: any, i: number) => (
                        <div key={i} className="text-[10px] text-emerald-600 font-medium">Goes to {getNodeById(n.toScreenId)?.name || 'Unknown'} →</div>
                    ))}
                    {showNav && (
                        navTypes.flatMap(type => {
                            const rules = graph.structure?.edges?.navigationRules?.[type] || [];
                            return rules
                                .filter((r) => r.where === node.id)
                                .map((r, i: number) => {
                                    const colors: any = { local: "text-blue-500 border-blue-300", contextual: "text-blue-600 border-blue-400", supplementary: "text-blue-700 border-blue-500", courtesy: "text-indigo-500 border-indigo-400", remote: "text-cyan-600 border-cyan-400" };
                                    return (
                                        <div key={`${type}-${i}`} className={`text-[10px] font-medium flex items-start gap-1.5 mt-1 ${colors[type] || 'text-muted-foreground border-muted-foreground'}`}>
                                            <span className="uppercase opacity-80 border px-1 rounded-[3px] text-[8px] leading-tight mt-[1px] flex-shrink-0 bg-white/50">{type}</span>
                                            <span className="leading-tight break-words whitespace-normal">{r.description}</span>
                                            {r.target && <span className="opacity-70">→ {getNodeById(r.target)?.name || r.target}</span>}
                                        </div>
                                    );
                                });
                        })
                    )}
                    {showStyles && (() => {
                        const inherited = getInheritedStyles(node.id);

                        // Filter out non-style metadata
                        const ignoreKeys = ['purpose', 'interactions', 'accessibility'];
                        const validOwnKeys = Object.keys(node.styles || {}).filter(k => !ignoreKeys.includes(k));
                        const hasOwn = validOwnKeys.length > 0;

                        const sourceName = hasOwn ? 'Own' : inherited.source;

                        return (
                            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                                {/* Show either the inheritance text OR the unique styles header BEFORE mapping */}
                                {!hasOwn ? (
                                    <span className="text-[9px] opacity-70 italic font-sans text-muted-foreground flex-shrink-0">
                                        ↳ Inherits styles from {sourceName}
                                    </span>
                                ) : (
                                    <span className="text-[9px] opacity-70 italic font-sans text-muted-foreground flex-shrink-0">
                                        ↳ Unique Styles for this and its children:
                                    </span>
                                )}

                                {/* Only map and show badges if the node has its own styles */}
                                {hasOwn && Object.entries(node.styles || {})
                                    .filter(([k]) => !ignoreKeys.includes(k))
                                    .map(([k, v], idx) => {
                                        // Safely extract a clean string if the value is an object or array
                                        let displayVal = String(v);
                                        if (typeof v === 'object' && v !== null) {
                                            if (Array.isArray(v)) {
                                                displayVal = `[${v.length} items]`;
                                            } else {
                                                const obj = v as any; // Cast to 'any' to bypass TS error
                                                displayVal = obj.desktop || obj.mobile || obj.element || '{...}';
                                            }
                                        }

                                        // Condense long keys (e.g., 'background_color' -> 'background')
                                        const shortKey = k.replace('_color', '');

                                        return (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px] border border-amber-200/60 dark:border-amber-800/50 font-mono"
                                                title={typeof v === 'string' ? v : 'Complex object'}
                                            >
                                                <span className="opacity-50 mr-1">[{shortKey}]</span>
                                                <span className="truncate max-w-[80px]">{displayVal}</span>
                                            </span>
                                        );
                                    })}
                            </div>
                        );
                    })()}
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

    const handleFlowEditSave = () => {
        if (!flowDraft?.name) {
            setEditingFlowTitle(false);
            setEditingFlowDesc(false);
            return;
        }
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            const flowIndex = next.structure.edges.flows.findIndex((f: any) => f.name === activeFlow);
            if (flowIndex > -1) {
                next.structure.edges.flows[flowIndex].name = flowDraft.name;
                next.structure.edges.flows[flowIndex].description = flowDraft.description;
            }
            return next;
        });
        if (flowDraft.name !== activeFlow) setActiveFlow(flowDraft.name);
        setEditingFlowTitle(false);
        setEditingFlowDesc(false);
    };

    const handleFlowKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            (e.target as HTMLElement).blur(); // Trigger the blur event to save
        } else if (e.key === 'Escape') {
            setEditingFlowTitle(false);
            setEditingFlowDesc(false);
            setFlowDraft(null);
        }
    };

    const handleFuncEditSave = () => {
        if (!funcDraft?.name) {
            setEditingFuncTitle(false);
            setEditingFuncDesc(false);
            return;
        }
        setGraph((prev: any) => {
            const next = JSON.parse(JSON.stringify(prev));
            const funcIndex = next.structure.functionalities.findIndex((f: any) => f.name === activeFunction);
            if (funcIndex > -1) {
                next.structure.functionalities[funcIndex].name = funcDraft.name;
                next.structure.functionalities[funcIndex].description = funcDraft.description;
            }
            return next;
        });
        if (funcDraft.name !== activeFunction) setActiveFunction(funcDraft.name);
        setEditingFuncTitle(false);
        setEditingFuncDesc(false);
    };

    const handleFuncKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            (e.target as HTMLElement).blur();
        } else if (e.key === 'Escape') {
            setEditingFuncTitle(false);
            setEditingFuncDesc(false);
            setFuncDraft(null);
        }
    };

    const renderFlowSequence = () => {
        const flow = graph.structure?.edges?.flows?.find((f: any) => f.name === activeFlow);
        if (!flow) return <div className="text-muted-foreground m-auto">Select a flow to view sequence.</div>;

        // USE LIVE PREVIEW IF DRAGGING, OTHERWISE USE GRAPH DATA
        const displaySteps = liveSteps || flow.steps || [];

        // --- NEW: EMPTY STATE FOR 0 STEPS ---
        if (displaySteps.length === 0) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center" onDragOver={handleDragOverContainer}>
                    <div className="flex flex-col items-center text-muted-foreground animate-in zoom-in-95 duration-300">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-16 w-16 rounded-full border-dashed border-2 border-primary text-primary hover:bg-primary hover:text-white hover:border-solid transition-all bg-background shadow-sm mb-4"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setInsertFlowContext({ index: -1, selectedScreen: '', selectedComponent: '' });
                                        setSelectedNode({ type: 'InsertFlowStep' });
                                    }}
                                >
                                    <Plus size={32} strokeWidth={2} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add a flow node here</TooltipContent>
                        </Tooltip>
                        <p className="text-sm font-medium text-foreground">Flow is empty</p>
                        <p className="text-xs mt-1">Click the button to add your first screen</p>
                    </div>
                </div>
            );
        }

        const rows = [];
        for (let i = 0; i < displaySteps.length; i += itemsPerRow) {
            rows.push(displaySteps.slice(i, i + itemsPerRow)); // Slices based on live data
        }

        return (
            <div ref={flowContainerRef} className="w-full h-full flex justify-center overflow-y-auto pt-12 px-4" onDragOver={handleDragOverContainer}>
                <div className="flex flex-col inline-flex pb-12">
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
                                        const incomingNavs = showNav ? (graph.structure?.edges?.navigation?.filter((n: any) => n.toScreenId === node.id || n.toComponentId === node.id) || []) : [];
                                        const outgoingNavs = showNav ? (graph.structure?.edges?.navigation?.filter((n: any) => n.fromComponentId === node.id) || []) : [];

                                        return (
                                            <React.Fragment key={`${stepId}-${colIndex}-${absoluteIndex}`}>
                                                {/* 1. START CAP (Before the very first node) */}
                                                {absoluteIndex === 0 && (
                                                    <div className="flex-shrink-0 flex items-center justify-center w-16">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-8 w-8 rounded-full border-dashed border-2 border-primary text-primary hover:bg-primary hover:text-white hover:border-solid transition-all z-10 bg-background flex-shrink-0"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setInsertFlowContext({ index: -1, selectedScreen: '', selectedComponent: '' });
                                                                        setSelectedNode({ type: 'InsertFlowStep' });
                                                                    }}
                                                                >
                                                                    <Plus size={16} strokeWidth={3} />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Add a flow node here</TooltipContent>
                                                        </Tooltip>
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

                                                        {/* Only show delete if NOT dragging */}
                                                        {hoveredNodeId === node.id && draggedFlowIndex === null && (
                                                            <div className="flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 p-0 rounded absolute right-1 top-1 z-10 shadow-sm border border-border/50">
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 rounded hover:text-red-700 hover:bg-red-100" onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setGraph((prev: any) => {
                                                                        const next = JSON.parse(JSON.stringify(prev));
                                                                        const flowIndex = next.structure.edges.flows.findIndex((f: any) => f.name === activeFlow);
                                                                        if (flowIndex > -1) {
                                                                            next.structure.edges.flows[flowIndex].steps.splice(absoluteIndex, 1);
                                                                        }
                                                                        return next;
                                                                    });
                                                                }}>
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
                                                            {showStyles && (() => {
                                                                const inherited = getInheritedStyles(node.id);

                                                                // Filter out non-style metadata
                                                                const ignoreKeys = ['purpose', 'interactions', 'accessibility'];
                                                                const validOwnKeys = Object.keys(node.styles || {}).filter(k => !ignoreKeys.includes(k));
                                                                const hasOwn = validOwnKeys.length > 0;

                                                                const sourceName = hasOwn ? 'Own' : inherited.source;

                                                                return (
                                                                    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                                                                        {/* Show either the inheritance text OR the unique styles header BEFORE mapping */}
                                                                        {!hasOwn ? (
                                                                            <span className="text-[9px] opacity-70 italic font-sans text-muted-foreground flex-shrink-0">
                                                                                ↳ Inherits styles from {sourceName}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[9px] opacity-70 italic font-sans text-muted-foreground flex-shrink-0">
                                                                                ↳ Unique Styles for this and its children:
                                                                            </span>
                                                                        )}

                                                                        {/* Only map and show badges if the node has its own styles */}
                                                                        {hasOwn && Object.entries(node.styles || {})
                                                                            .filter(([k]) => !ignoreKeys.includes(k))
                                                                            .map(([k, v], idx) => {
                                                                                // Safely extract a clean string if the value is an object or array
                                                                                let displayVal = String(v);
                                                                                if (typeof v === 'object' && v !== null) {
                                                                                    if (Array.isArray(v)) {
                                                                                        displayVal = `[${v.length} items]`;
                                                                                    } else {
                                                                                        const obj = v as any; // Cast to 'any' to bypass TS error
                                                                                        displayVal = obj.desktop || obj.mobile || obj.element || '{...}';
                                                                                    }
                                                                                }

                                                                                // Condense long keys (e.g., 'background_color' -> 'background')
                                                                                const shortKey = k.replace('_color', '');

                                                                                return (
                                                                                    <span
                                                                                        key={idx}
                                                                                        className="inline-flex items-center bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px] border border-amber-200/60 dark:border-amber-800/50 font-mono"
                                                                                        title={typeof v === 'string' ? v : 'Complex object'}
                                                                                    >
                                                                                        <span className="opacity-50 mr-1">[{shortKey}]</span>
                                                                                        <span className="truncate max-w-[80px]">{displayVal}</span>
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                {!isLastInRow && (
                                                    <div className="flex-shrink-0 text-muted-foreground flex items-center justify-center w-16 relative group/arrow">
                                                        <div className="h-px flex-1 bg-border"></div>
                                                        {isEven ? <ArrowRight className="w-5 h-5 text-primary mx-1 group-hover/arrow:opacity-0 transition-opacity" /> : <ArrowLeft className="w-5 h-5 text-primary mx-1 group-hover/arrow:opacity-0 transition-opacity" />}
                                                        <div className="h-px flex-1 bg-border"></div>

                                                        {/* Hover Plus Button */}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
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
                                                            </TooltipTrigger>
                                                            <TooltipContent>Add a flow node here</TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                )}

                                                {/* 2. END CAP (After the very last node) */}
                                                {absoluteIndex === flow.steps.length - 1 && (
                                                    <div className="flex-shrink-0 flex items-center justify-center w-16">
                                                        {isEven && <div className="h-px flex-1 border-t-2 border-dashed border-primary/50"></div>}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
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
                                                            </TooltipTrigger>
                                                            <TooltipContent>Add a flow node here</TooltipContent>
                                                        </Tooltip>
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
                                            <Tooltip>
                                                <TooltipTrigger asChild>
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
                                                </TooltipTrigger>
                                                <TooltipContent>Add a flow node here</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                    {/* EXPLICIT SPACER: Forces the browser to respect bottom scroll space */}
                    <div className="h-12 w-full flex-shrink-0" />
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

            {/* Modal for Flow Deletion Confirmation */}
            {flowToDelete && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xl max-w-sm w-full border">
                        <h3 className="text-lg font-bold mb-2">Delete Flow?</h3>
                        <p className="text-sm text-muted-foreground mb-6">Are you sure you want to delete the flow "{flowToDelete}"?</p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setFlowToDelete(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => {
                                setGraph((prev: any) => {
                                    const next = JSON.parse(JSON.stringify(prev));
                                    next.structure.edges.flows = next.structure.edges.flows.filter((f: any) => f.name !== flowToDelete);
                                    return next;
                                });
                                // Automatically switch to another flow if available
                                setActiveFlow(graph.structure?.edges?.flows?.find((f: any) => f.name !== flowToDelete)?.name || null);
                                setFlowToDelete(null);
                                setSelectedNode(null);
                            }}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Functionality Deletion Confirmation */}
            {functionToDelete && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xl max-w-sm w-full border">
                        <h3 className="text-lg font-bold mb-2">Delete Functionality?</h3>
                        <p className="text-sm text-muted-foreground mb-6">Are you sure you want to delete "{functionToDelete}"?</p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setFunctionToDelete(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => {
                                setGraph((prev: any) => {
                                    const next = JSON.parse(JSON.stringify(prev));
                                    next.structure.functionalities = next.structure.functionalities.filter((f: any) => f.name !== functionToDelete);
                                    return next;
                                });
                                // Automatically switch to another functionality if available
                                const remaining = graph.structure?.functionalities?.filter((f: any) => f.name !== functionToDelete);
                                setActiveFunction(remaining?.length > 0 ? remaining[0].name : null);
                                setFunctionToDelete(null);
                            }}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Mode Switcher (TOP BAR) */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-zinc-900 z-10 min-h-[56px]">
                {/* Left Side: Mode Buttons (Segmented Control) */}
                <div className="flex items-center p-1 bg-muted/50 dark:bg-zinc-800/50 rounded-lg border border-border/50 flex-shrink-0">
                    <button
                        onClick={() => setMode('project')}
                        className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                            mode === 'project'
                                ? 'bg-white dark:bg-zinc-700 text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    >
                        <Briefcase className="w-3.5 h-3.5 mr-1.5" /> Project
                    </button>
                    <button
                        onClick={() => setMode('structure')}
                        className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                            mode === 'structure'
                                ? 'bg-white dark:bg-zinc-700 text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    >
                        <Layout className="w-3.5 h-3.5 mr-1.5" /> Screen
                    </button>
                    <button
                        onClick={() => setMode('flows')}
                        className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                            mode === 'flows'
                                ? 'bg-white dark:bg-zinc-700 text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    >
                        <MousePointerClick className="w-3.5 h-3.5 mr-1.5" /> Flows
                    </button>
                </div>

                {/* Right Side: View Controls (Unified Row with Truncation) */}
                {mode !== 'project' && (
                    <div className="flex items-center gap-4 animate-in fade-in duration-200 overflow-hidden ml-4">
                        {/* Dropdowns Group with Truncation Logic */}
                        <div className="flex items-center gap-2 min-w-0">
                            {mode === 'flows' && (
                                <div className="flex items-center gap-2">
                                    <select
                                        className="bg-muted/50 border border-border rounded-md px-2 py-1 text-xs outline-none font-medium w-full max-w-[350px] truncate"
                                        value={activeFlow || ""}
                                        onChange={(e) => setActiveFlow(e.target.value)}
                                    >
                                        <option value="" disabled>Select a flow...</option>
                                        {graph.structure?.edges?.flows?.map((f: any) => (
                                            <option key={f.name} value={f.name}>
                                                {f.name.length > 50 ? `${f.name.substring(0, 45)}...` : f.name}
                                            </option>
                                        ))}
                                    </select>

                                    <Button variant="outline" size="sm" className="h-7 text-xs border-dashed text-primary hover:bg-primary hover:text-white" onClick={() => {
                                        // 1. Generate a default name based on current flow count
                                        const currentFlows = graph.structure?.edges?.flows || [];
                                        const newFlowName = `New Flow ${currentFlows.length + 1}`;

                                        // 2. Instantly add the blank flow to the graph data
                                        setGraph((prev: any) => {
                                            const next = JSON.parse(JSON.stringify(prev));
                                            if (!next.structure.edges) next.structure.edges = {};
                                            if (!next.structure.edges.flows) next.structure.edges.flows = [];
                                            next.structure.edges.flows.push({ name: newFlowName, description: '', steps: [] });
                                            return next;
                                        });

                                        // 3. Set it as active, clear the sidebar, and open the inline editor
                                        setActiveFlow(newFlowName);
                                        setFlowDraft({ name: newFlowName, description: '' });
                                        setEditingFlowTitle(true);
                                        setSelectedNode(null);
                                    }}>
                                        <Plus size={12} className="mr-1" /> New
                                    </Button>
                                </div>
                            )}
                            {mode === 'structure' && showFunctionality && (
                                <div className="flex items-center gap-2">
                                    <select
                                        className="bg-muted/50 border border-border rounded-md px-2 py-1 text-xs outline-none font-medium w-full max-w-[300px] truncate"
                                        value={activeFunction || ""}
                                        onChange={(e) => setActiveFunction(e.target.value)}
                                    >
                                        {graph.structure?.functionalities?.map((f: any) => (
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
                                                onClick={() => {
                                                    const currentFuncs = graph.structure?.functionalities || [];
                                                    const newFuncName = `New Functionality ${currentFuncs.length + 1}`;

                                                    setGraph((prev: any) => {
                                                        const next = JSON.parse(JSON.stringify(prev));
                                                        if (!next.structure.functionalities) next.structure.functionalities = [];
                                                        next.structure.functionalities.push({ name: newFuncName, description: '', relatedNodes: [] });
                                                        return next;
                                                    });

                                                    setActiveFunction(newFuncName);
                                                    setFuncDraft({ name: newFuncName, description: '' });
                                                    setEditingFuncTitle(true);
                                                    setSelectedNode(null); // Keeps sidebar closed
                                                }}
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
                            {mode !== 'flows' && (
                                <>
                                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                                        <input type="checkbox" checked={showNav} onChange={(e) => setShowNav(e.target.checked)} className="rounded text-primary focus:ring-primary h-3.5 w-3.5" /> Nav
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                                        <input type="checkbox" checked={showStyles} onChange={(e) => setShowStyles(e.target.checked)} className="rounded text-primary focus:ring-primary h-3.5 w-3.5" /> Styles
                                    </label>
                                </>
                            )}
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
                                <div className="flex items-center gap-4 mb-4">
                                    <h2 className="text-xl font-bold">Target Personas</h2>
                                    <Button variant="outline" size="sm" onClick={() => openPersonaEditor()}>+ Add Persona</Button>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {graph.strategy?.personas?.map((p: any, i: number) => {
                                        // --- 1. FORMAT RAW DATA FOR DISPLAY ---
                                        let displayAge = p.demographics?.age || 'Unknown';
                                        if (typeof displayAge === 'number') {
                                            if (displayAge < 18) displayAge = 'Under 18';
                                            else if (displayAge <= 24) displayAge = '18-24';
                                            else if (displayAge <= 34) displayAge = '25-34';
                                            else if (displayAge <= 44) displayAge = '35-44';
                                            else if (displayAge <= 54) displayAge = '45-54';
                                            else if (displayAge <= 64) displayAge = '55-64';
                                            else displayAge = '65+';
                                        }

                                        let displayIncome = p.demographics?.annual_income || 'Unknown';
                                        if (typeof displayIncome === 'number') {
                                            if (displayIncome < 25000) displayIncome = 'Under $25k';
                                            else if (displayIncome <= 50000) displayIncome = '$25k-$50k';
                                            else if (displayIncome <= 75000) displayIncome = '$50k-$75k';
                                            else if (displayIncome <= 100000) displayIncome = '$75k-$100k';
                                            else if (displayIncome <= 150000) displayIncome = '$100k-$150k';
                                            else displayIncome = '$150k+';
                                        }

                                        let displayInternet = p.technicalProfile?.internet_usage || 'Unknown';
                                        if (typeof displayInternet === 'number') {
                                            if (displayInternet <= 10) displayInternet = '0-10 hrs/week';
                                            else if (displayInternet <= 20) displayInternet = '10-20 hrs/week';
                                            else if (displayInternet <= 40) displayInternet = '20-40 hrs/week';
                                            else displayInternet = '40+ hrs/week';
                                        }

                                        // --- 2. RENDER THE CARD ---
                                        return (
                                            <div
                                                key={i}
                                                onMouseEnter={() => setHoveredNodeId(`persona-${i}`)}
                                                onMouseLeave={() => setHoveredNodeId(null)}
                                                className={`p-5 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm transition-all relative ${selectedNode?.type === 'PersonaForm' && personaDraft?.index === i ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-primary/50'}`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="font-bold text-lg text-primary">{p.name}</h3>
                                                    {hoveredNodeId === `persona-${i}` && (
                                                        <div className="flex gap-1 absolute right-3 top-3 bg-white/90 p-1 rounded shadow-sm border border-border/50">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); openPersonaEditor(p, i); }}><Edit2 size={12} /></Button>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:bg-red-100" onClick={(e) => { e.stopPropagation(); deletePersona(i); }}><Trash2 size={12} /></Button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-sm space-y-3">
                                                    <div>
                                                        <span className="font-semibold text-xs uppercase text-muted-foreground block mb-1">Demographics</span>
                                                        {/* Make the display explicit and well-formatted */}
                                                        <p className="text-xs text-foreground/90 leading-relaxed">
                                                            <span className="font-medium">{p.demographics?.gender}</span>, Age <span className="font-medium">{displayAge}</span> • {p.demographics?.education_level} • {p.demographics?.marital_status} • <span className="font-medium">{displayIncome}</span>
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-xs uppercase text-muted-foreground block mb-1">Technical Profile</span>
                                                        {/* Explicitly state what the internet hours mean */}
                                                        <p className="text-xs text-foreground/90 leading-relaxed">
                                                            <span className="font-medium">{p.technicalProfile?.expertise_level}</span> Expertise • Internet Usage: <span className="font-medium">{displayInternet}</span> • Top Sites: <span className="italic">{p.technicalProfile?.favourite_sites}</span>
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-xs uppercase text-muted-foreground block mb-1">Knowledge Profile</span>
                                                        <p className="text-xs text-foreground/90 leading-relaxed">{p.knowledgeProfile}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Out of Scope Constraints Card */}
                            <div className="p-6 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm border-border">
                                <h2 className="text-xl font-bold mb-5 flex items-center">Out of Scope Constraints</h2>
                                <div className="space-y-2">
                                    {graph.strategy?.outOfScope?.map((item: string, i: number) => {
                                        const isEditing = inlineEdit?.field === 'constraint' && inlineEdit.index === i;
                                        return isEditing ? (
                                            <div key={item} className="relative p-2 -mx-2 border border-primary/50 rounded-lg bg-white dark:bg-zinc-900 shadow-sm flex items-start">
                                                <textarea
                                                    className="w-full bg-transparent border-none text-sm leading-relaxed p-0 pr-8 focus:ring-0 outline-none resize-none overflow-hidden block m-0"
                                                    value={inlineEdit.value}
                                                    rows={1}
                                                    onChange={e => {
                                                        setInlineEdit({ ...inlineEdit, value: e.target.value });
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                                    }}
                                                    onFocus={e => {
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                                    }}
                                                    onBlur={saveInlineEdit}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            saveInlineEdit();
                                                        } else if (e.key === 'Escape') {
                                                            setInlineEdit(null);
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                key={item}
                                                className="group relative flex justify-between items-start p-2 -mx-2 rounded-lg cursor-text hover:bg-black/5 dark:hover:bg-white/5 border border-transparent transition-colors"
                                                onClick={() => setInlineEdit({ field: 'constraint', value: item, index: i })}
                                                title="Click to edit constraint"
                                            >
                                                <p className="text-sm leading-relaxed text-muted-foreground w-full pr-8 m-0 p-0 whitespace-pre-wrap">{item}</p>
                                                <div className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-6 w-6 text-red-600 hover:bg-red-100"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Stops it from opening the editor when you click trash!
                                                            deleteConstraint(i);
                                                        }}
                                                        title="Delete constraint"
                                                    >
                                                        <Trash2 size={12} />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {inlineEdit?.field === 'constraint' && inlineEdit.index === undefined ? (
                                        <div className="relative p-2 -mx-2 mt-1 border border-primary/50 rounded-lg bg-white dark:bg-zinc-900 shadow-sm flex items-start">
                                            <textarea
                                                className="w-full bg-transparent border-none text-sm leading-relaxed p-0 pr-8 focus:ring-0 outline-none resize-none overflow-hidden block m-0"
                                                placeholder="New constraint..."
                                                value={inlineEdit.value}
                                                rows={1}
                                                onChange={e => {
                                                    setInlineEdit({ ...inlineEdit, value: e.target.value });
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                                }}
                                                onFocus={e => {
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                                }}
                                                onBlur={saveInlineEdit}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        saveInlineEdit();
                                                    } else if (e.key === 'Escape') {
                                                        setInlineEdit(null);
                                                    }
                                                }}
                                                autoFocus
                                            />
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
                        <div className="flex flex-col w-full h-full relative">
                            {activeFlow && (
                                <>
                                    {/* --- STICKY FLOW HEADER & SEAMLESS INLINE EDITING --- */}
                                    <div
                                        className="sticky -top-8 z-40 -mt-8 -mx-8 px-8 pt-6 pb-4 mb-8 bg-slate-50/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-border/50 flex flex-col items-center animate-in fade-in slide-in-from-top-2"
                                        onBlur={(e) => {
                                            // If focus moves outside the header entirely, save!
                                            if (!e.currentTarget.contains(e.relatedTarget)) {
                                                if (editingFlowTitle || editingFlowDesc) handleFlowEditSave();
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            {/* Decoupled Title Edit */}
                                            {editingFlowTitle ? (
                                                <input
                                                    className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full outline-none focus:ring-2 focus:ring-primary/50 min-w-[250px] text-center border-transparent"
                                                    value={flowDraft?.name || ''}
                                                    onChange={(e) => setFlowDraft(prev => prev ? { ...prev, name: e.target.value } : null)}
                                                    onKeyDown={handleFlowKeyDown}
                                                    autoFocus
                                                />
                                            ) : (
                                                <div
                                                    className="group flex items-center gap-2 cursor-text"
                                                    onClick={() => {
                                                        const flow = graph.structure?.edges?.flows?.find((f: any) => f.name === activeFlow);
                                                        if (flow) {
                                                            setFlowDraft({ name: flow.name, description: flow.description || '' });
                                                            setEditingFlowTitle(true);
                                                        }
                                                    }}
                                                    title="Click to edit title"
                                                >
                                                    <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-colors group-hover:bg-primary/20 border border-transparent group-hover:border-primary/30">
                                                        {activeFlow}
                                                    </span>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground flex-shrink-0">
                                                        <Edit2 size={12} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions (Delete is always visible) */}
                                            <div className="flex items-center gap-1 bg-white/50 dark:bg-zinc-900/50 rounded-full px-1 border border-border/50">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-red-600 hover:bg-red-100" onClick={() => setFlowToDelete(activeFlow)}>
                                                            <Trash2 size={12} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom">Delete Flow</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        {/* Decoupled Description Edit */}
                                        {editingFlowDesc ? (
                                            <textarea
                                                className="text-sm text-foreground max-w-2xl w-full text-center bg-white/50 dark:bg-zinc-900/50 border border-border/60 rounded-md outline-none focus:ring-1 focus:ring-primary resize-none px-4 py-2 m-0 overflow-hidden leading-relaxed shadow-sm transition-all"
                                                value={flowDraft?.description || ''}
                                                onChange={(e) => setFlowDraft(prev => prev ? { ...prev, description: e.target.value } : null)}
                                                onKeyDown={handleFlowKeyDown}
                                                rows={Math.max(1, (flowDraft?.description?.split('\n').length || 1))}
                                                placeholder="Add a description for this flow... (Shift+Enter for new line)"
                                                autoFocus
                                            />
                                        ) : (
                                            <div
                                                className="group relative cursor-text max-w-2xl w-full px-4 py-2 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-border/50 text-center flex justify-center items-center"
                                                onClick={() => {
                                                    const flow = graph.structure?.edges?.flows?.find((f: any) => f.name === activeFlow);
                                                    if (flow) {
                                                        setFlowDraft({ name: flow.name, description: flow.description || '' });
                                                        setEditingFlowDesc(true);
                                                    }
                                                }}
                                                title="Click to edit description"
                                            >
                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    {graph?.structure?.edges?.flows?.find((f: any) => f.name === activeFlow)?.description || "No description provided."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="w-full flex-1 border-2 border-dashed border-border/60 rounded-xl bg-white/50 dark:bg-zinc-900/50 flex overflow-hidden">
                                {renderFlowSequence()}
                            </div>
                        </div>
                    )}
                    {mode === 'structure' && (
                        <div className="flex flex-col w-full h-full relative">
                            {/* --- STICKY FUNCTIONALITY HEADER & INLINE EDITING --- */}
                            {showFunctionality && activeFunction && (
                                <div
                                    className="sticky -top-8 z-40 -mt-8 -mx-8 px-8 pt-6 pb-4 mb-8 bg-slate-50/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-border/50 flex flex-col items-center animate-in fade-in slide-in-from-top-2"
                                    onBlur={(e) => {
                                        if (!e.currentTarget.contains(e.relatedTarget)) {
                                            if (editingFuncTitle || editingFuncDesc) handleFuncEditSave();
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        {/* Decoupled Title Edit */}
                                        {editingFuncTitle ? (
                                            <input
                                                className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full outline-none focus:ring-2 focus:ring-primary/50 min-w-[250px] text-center border-transparent"
                                                value={funcDraft?.name || ''}
                                                onChange={(e) => setFuncDraft(prev => prev ? { ...prev, name: e.target.value } : null)}
                                                onKeyDown={handleFuncKeyDown}
                                                autoFocus
                                            />
                                        ) : (
                                            <div
                                                className="group flex items-center gap-2 cursor-text"
                                                onClick={() => {
                                                    const func = graph.structure?.functionalities?.find((f: any) => f.name === activeFunction);
                                                    if (func) {
                                                        setFuncDraft({ name: func.name, description: func.description || '' });
                                                        setEditingFuncTitle(true);
                                                    }
                                                }}
                                                title="Click to edit title"
                                            >
                                                <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-colors group-hover:bg-primary/20 border border-transparent group-hover:border-primary/30">
                                                    {activeFunction}
                                                </span>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground flex-shrink-0">
                                                    <Edit2 size={12} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions (Delete is always visible) */}
                                        <div className="flex items-center gap-1 bg-white/50 dark:bg-zinc-900/50 rounded-full px-1 border border-border/50">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-red-600 hover:bg-red-100" onClick={() => setFunctionToDelete(activeFunction)}>
                                                        <Trash2 size={12} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">Delete Functionality</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>

                                    {/* Decoupled Description Edit */}
                                    {editingFuncDesc ? (
                                        <textarea
                                            className="text-sm text-foreground max-w-2xl w-full text-center bg-white/50 dark:bg-zinc-900/50 border border-border/60 rounded-md outline-none focus:ring-1 focus:ring-primary resize-none px-4 py-2 m-0 overflow-hidden leading-relaxed shadow-sm transition-all"
                                            value={funcDraft?.description || ''}
                                            onChange={(e) => setFuncDraft(prev => prev ? { ...prev, description: e.target.value } : null)}
                                            onKeyDown={handleFuncKeyDown}
                                            rows={Math.max(1, (funcDraft?.description?.split('\n').length || 1))}
                                            placeholder="Add a description for this functionality... (Shift+Enter for new line)"
                                            autoFocus
                                        />
                                    ) : (
                                        <div
                                            className="group relative cursor-text max-w-2xl w-full px-4 py-2 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-border/50 text-center flex justify-center items-center"
                                            onClick={() => {
                                                const func = graph.structure?.functionalities?.find((f: any) => f.name === activeFunction);
                                                if (func) {
                                                    setFuncDraft({ name: func.name, description: func.description || '' });
                                                    setEditingFuncDesc(true);
                                                }
                                            }}
                                            title="Click to edit description"
                                        >
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {graph?.structure?.functionalities?.find((f: any) => f.name === activeFunction)?.description || "No description provided."}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-8 items-start pb-20 justify-center">
                                {/* --- NEW: EMPTY STATE FOR 0 FUNCTIONALITY NODES --- */}
                                {showFunctionality && activeFunction && (!graph.structure?.functionalities?.find((f: any) => f.name === activeFunction)?.relatedNodes?.length) ? (
                                    <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center">
                                        <div className="flex flex-col items-center text-muted-foreground animate-in zoom-in-95 duration-300">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-16 w-16 rounded-full border-dashed border-2 border-primary text-primary hover:bg-primary hover:text-white hover:border-solid transition-all bg-background shadow-sm mb-4"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const func = graph.structure?.functionalities?.find((f: any) => f.name === activeFunction);
                                                            setSelectedNode({ type: 'FunctionalityForm', isNew: false, originalName: activeFunction, ...func });
                                                        }}
                                                    >
                                                        <Plus size={32} strokeWidth={2} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Add nodes to this functionality</TooltipContent>
                                            </Tooltip>
                                            <p className="text-sm font-medium text-foreground">Functionality is empty</p>
                                            <p className="text-xs mt-1">Click the button to link screens and components</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center w-full gap-4 max-w-4xl mx-auto">
                                        {(!showFunctionality || !activeFunction) && showNav && (
                                            <div className="w-full bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-sm mb-8 overflow-hidden">
                                                <div
                                                    className="bg-slate-50 dark:bg-zinc-800/50 px-4 py-3 border-b flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                                    onClick={() => setIsAppWideNavExpanded(!isAppWideNavExpanded)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isAppWideNavExpanded ? <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
                                                        <Globe size={16} className="text-primary" />
                                                        <h3 className="text-xs font-bold uppercase tracking-widest">App Wide Navigation</h3>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground italic font-medium">Click rules to edit</span>
                                                </div>

                                                {isAppWideNavExpanded && (
                                                    <div className="divide-y divide-border/40">
                                                        {NAV_TYPES.map((navType) => {
                                                            // 1. Get all rules, then filter non-globals to ONLY show 'app-wide'
                                                            const allTypeRules = graph.structure?.edges?.navigationRules?.[navType.id as NavRuleType] || [];
                                                            const displayRules = navType.id === 'global'
                                                                ? allTypeRules
                                                                : allTypeRules.filter((r: any) => r.where === 'app-wide');

                                                            const isExpanded = expandedNavSections.has(navType.id);

                                                            return (
                                                                <div key={navType.id} className="group/section">
                                                                    {/* Header with rearranged badge and new Add button */}
                                                                    <div className="w-full px-4 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => toggleNavSection(navType.id)}>
                                                                        {isExpanded ? <ChevronDown size={14} className="flex-shrink-0" /> : <ChevronRight size={14} className="flex-shrink-0" />}
                                                                        <span className="text-xs font-semibold flex-shrink-0">{navType.label}</span>
                                                                        <span className="bg-muted text-[10px] px-1.5 py-0.5 rounded-full opacity-60 flex-shrink-0">{displayRules.length}</span>

                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="ml-auto h-6 px-2 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0 font-medium"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation(); // Don't trigger the accordion toggle

                                                                                const newIndex = allTypeRules.length; // Append to original array
                                                                                const newRule = navType.id === 'global'
                                                                                    ? { name: `New ${navType.label}`, purpose: '', layouts: { mobile: 'Bottom Tab Bar', tablet: 'Sidebar', desktop: 'Top Nav' }, order_of_screens: [], display_in: [] }
                                                                                    : { where: 'app-wide', description: `New ${navType.label} Rule`, target: '' };

                                                                                setGraph((prev: any) => {
                                                                                    const next = JSON.parse(JSON.stringify(prev));
                                                                                    if (!next.structure.edges.navigationRules[navType.id]) {
                                                                                        next.structure.edges.navigationRules[navType.id] = [];
                                                                                    }
                                                                                    next.structure.edges.navigationRules[navType.id].push(newRule);
                                                                                    return next;
                                                                                });

                                                                                // Ensure section is open and open the editor
                                                                                setExpandedNavSections(prev => new Set(prev).add(navType.id));
                                                                                setSelectedNode({ type: 'NavRuleEdit', ruleType: navType.id, index: newIndex, rule: newRule });
                                                                            }}
                                                                        >
                                                                            <Plus size={10} className="mr-1" />
                                                                            Add New
                                                                        </Button>
                                                                    </div>

                                                                    {isExpanded && (
                                                                        <div className="px-4 pb-3 space-y-1 animate-in slide-in-from-top-1 duration-200">
                                                                            <p className="text-[10px] text-muted-foreground italic mb-2 px-1">{navType.desc}</p>

                                                                            {displayRules.length === 0 && (
                                                                                <div className="text-[10px] text-muted-foreground italic p-2 text-center border border-dashed rounded-md bg-slate-50/50 dark:bg-zinc-800/50">
                                                                                    No app-wide rules for {navType.label} Navigation
                                                                                </div>
                                                                            )}

                                                                            {displayRules.map((rule: any, idx: number) => {
                                                                                // Find the real index in the unfiltered array so the sidebar editor updates the correct rule
                                                                                const realIndex = allTypeRules.findIndex((r: any) => r === rule);

                                                                                return (
                                                                                    <div
                                                                                        key={`${navType.id}-${idx}`}
                                                                                        onClick={() => setSelectedNode({ type: 'NavRuleEdit', rule, ruleType: navType.id, index: realIndex })}
                                                                                        className="flex items-center gap-3 p-2 rounded-md border border-transparent hover:border-primary/20 hover:bg-primary/5 cursor-pointer group/rule active:scale-[0.99] transition-all"
                                                                                    >
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <div className="text-[11px] font-medium truncate">{rule.name || rule.description || 'New Navigation Rule'}</div>
                                                                                            <div className="flex gap-2 mt-0.5 flex-wrap">
                                                                                                {navType.id === 'global' ? (
                                                                                                    <span className="text-[9px] text-muted-foreground">• {rule.layouts?.desktop || 'No layout'} (Desktop)</span>
                                                                                                ) : (
                                                                                                    <>
                                                                                                        {rule.target && <span className="text-[9px] text-blue-500 font-bold">→ {getNodeById(rule.target)?.name || 'External'}</span>}
                                                                                                        <span className="text-[9px] text-muted-foreground">• Shown in: App-Wide</span>
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* --- ALL STYLES (LIBRARY) --- */}
                                        {(!showFunctionality || !activeFunction) && showStyles && (
                                            <div className="w-full bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-sm mb-4 overflow-hidden">
                                                <div
                                                    className="bg-slate-50 dark:bg-zinc-800/50 px-4 py-3 border-b flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                                    onClick={() => setIsAllStylesExpanded(!isAllStylesExpanded)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isAllStylesExpanded ? <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
                                                        <span className="text-amber-500">🎨</span>
                                                        <h3 className="text-xs font-bold uppercase tracking-widest">All Styles</h3>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground italic font-medium">Style Library</span>
                                                </div>

                                                {isAllStylesExpanded && (
                                                    <div className="divide-y divide-border/40">
                                                        {/* Colors */}
                                                        <div className="group/section">
                                                            <div className="w-full px-4 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => toggleStyleSection('colors')}>
                                                                {expandedStyleSections.has('colors') ? <ChevronDown size={14} className="flex-shrink-0" /> : <ChevronRight size={14} className="flex-shrink-0" />}
                                                                <span className="text-xs font-semibold flex-shrink-0">Colors</span>
                                                                <span className="bg-muted text-[10px] px-1.5 py-0.5 rounded-full opacity-60 ml-auto">{Object.keys(graph.surface?.all_styles?.colors || {}).length}</span>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0" onClick={(e) => { e.stopPropagation(); setExpandedStyleSections(prev => new Set(prev).add('colors')); setSelectedNode({ type: 'ColorStyleEdit', isNew: true, colorKey: '', colorData: { name: 'New Color', color: '#000000' } }); }}>
                                                                    <Plus size={12} />
                                                                </Button>
                                                            </div>
                                                            {expandedStyleSections.has('colors') && (
                                                                <div className="px-4 pb-3 space-y-1 animate-in slide-in-from-top-1">
                                                                    {Object.entries(graph.surface?.all_styles?.colors || {}).map(([k, v]: any) => (
                                                                        <div key={k} onClick={() => setSelectedNode({ type: 'ColorStyleEdit', isNew: false, colorKey: k, colorData: v })} className="flex items-center gap-3 p-2 rounded-md hover:bg-primary/5 cursor-pointer border border-transparent hover:border-primary/20 transition-all">
                                                                            <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: v.color }}></div>
                                                                            <div className="text-[11px] font-bold">{v.name} <span className="text-[9px] font-normal text-muted-foreground ml-1">({k})</span></div>
                                                                            <div className="text-[10px] font-mono text-muted-foreground ml-auto">{v.color}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Typography */}
                                                        <div className="group/section">
                                                            <div className="w-full px-4 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => toggleStyleSection('typography')}>
                                                                {expandedStyleSections.has('typography') ? <ChevronDown size={14} className="flex-shrink-0" /> : <ChevronRight size={14} className="flex-shrink-0" />}
                                                                <span className="text-xs font-semibold flex-shrink-0">Typography</span>
                                                                <span className="bg-muted text-[10px] px-1.5 py-0.5 rounded-full opacity-60 ml-auto">{Object.keys(graph.surface?.all_styles?.typography?.hierarchy || {}).length}</span>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0" onClick={(e) => { e.stopPropagation(); setExpandedStyleSections(prev => new Set(prev).add('typography')); setSelectedNode({ type: 'TypographyStyleEdit', isNew: true, typoKey: '', typoData: { element: 'New Element', size: '16px', weight: 'Regular', lineHeight: '1.5', usage: '' } }); }}>
                                                                    <Plus size={12} />
                                                                </Button>
                                                            </div>
                                                            {expandedStyleSections.has('typography') && (
                                                                <div className="px-4 pb-3 space-y-1 animate-in slide-in-from-top-1">
                                                                    <div className="text-[10px] text-muted-foreground mb-2 px-1 flex justify-between">
                                                                        <span>Family: <strong>{graph.surface?.all_styles?.typography?.family || 'Inter'}</strong></span>
                                                                    </div>
                                                                    {Object.entries(graph.surface?.all_styles?.typography?.hierarchy || {}).map(([k, v]: any) => (
                                                                        <div key={k} onClick={() => setSelectedNode({ type: 'TypographyStyleEdit', isNew: false, typoKey: k, typoData: v })} className="flex flex-col gap-1 p-2 rounded-md hover:bg-primary/5 cursor-pointer border border-transparent hover:border-primary/20 transition-all">
                                                                            <div className="flex justify-between items-center">
                                                                                <div className="text-[11px] font-bold">{v.element} <span className="text-[9px] font-normal text-muted-foreground">({k})</span></div>
                                                                                <div className="text-[9px] bg-muted/50 px-1.5 py-0.5 rounded font-mono">{v.size} / {v.weight}</div>
                                                                            </div>
                                                                            <div className="text-[10px] text-muted-foreground truncate">{v.usage}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* --- APP WIDE STYLES (DEFAULTS) --- */}
                                        {(!showFunctionality || !activeFunction) && showStyles && (
                                            <div className="w-full bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-sm mb-8 overflow-hidden">
                                                {/* Clickable Header for Collapsing/Expanding */}
                                                <div
                                                    className="bg-slate-50 dark:bg-zinc-800/50 px-4 py-3 border-b flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                                    onClick={() => toggleStyleSection('global_styles')}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {expandedStyleSections.has('global_styles') ? <ChevronDown size={14} className="flex-shrink-0 text-muted-foreground" /> : <ChevronRight size={14} className="flex-shrink-0 text-muted-foreground" />}
                                                        <span className="text-emerald-500">✨</span>
                                                        <h3 className="text-xs font-bold uppercase tracking-widest">App Wide Styles</h3>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground italic font-medium">Default Theme: Every screen or component inherits their nearest parent's styles, if not this default</span>
                                                </div>

                                                {/* Collapsible Content Body */}
                                                {expandedStyleSections.has('global_styles') && (
                                                    <div className="p-6 space-y-6 animate-in slide-in-from-top-1 duration-200">
                                                        {/* Base Theme Attributes */}
                                                        <div onClick={() => setSelectedNode({ type: 'GlobalStyleEdit', data: graph.surface?.global_styles })} className="p-3 rounded-md hover:bg-primary/5 border border-border/50 cursor-pointer transition-all bg-slate-50/50 dark:bg-zinc-800/50">
                                                            <div className="text-[11px] font-bold mb-2 text-primary flex items-center justify-between">Base Theme Attributes <Edit2 size={10} /></div>
                                                            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                                                                <div className="bg-white dark:bg-zinc-900 p-1.5 rounded border shadow-sm">Primary Color: <strong className="text-foreground">{graph.surface?.global_styles?.color}</strong></div>
                                                                <div className="bg-white dark:bg-zinc-900 p-1.5 rounded border shadow-sm">Background: <strong className="text-foreground">{graph.surface?.global_styles?.background_color}</strong></div>
                                                                <div className="bg-white dark:bg-zinc-900 p-1.5 rounded border shadow-sm col-span-2">Typography: <strong className="text-foreground">{graph.surface?.global_styles?.typography}</strong></div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                            {/* Layouts */}
                                                            <div className="space-y-4">
                                                                <h4 className="text-sm font-bold border-b pb-2">Layout</h4>
                                                                {renderInlineField("Mobile (< 768px)", "globalStyle_layout_mobile", graph.surface?.global_styles?.layout?.mobile || '', true)}
                                                                {renderInlineField("Tablet (768px - 1024px)", "globalStyle_layout_tablet", graph.surface?.global_styles?.layout?.tablet || '', true)}
                                                                {renderInlineField("Desktop (> 1024px)", "globalStyle_layout_desktop", graph.surface?.global_styles?.layout?.desktop || '', true)}
                                                                {renderInlineField("Grid System", "globalStyle_layout_grid", graph.surface?.global_styles?.layout?.grid || '', true)}
                                                            </div>

                                                            {/* Interactions */}
                                                            <div className="space-y-4 pt-2">
                                                                <h4 className="text-sm font-bold border-b pb-2">Interactions</h4>
                                                                <div>
                                                                    <div className="space-y-2">
                                                                        {graph.surface?.global_styles?.interactions?.map((item: string, i: number) => {
                                                                            const isEditing = inlineEdit?.field === 'globalStyle_interactions' && inlineEdit.index === i;
                                                                            return isEditing ? (
                                                                                <div key={i} className="relative p-2 -mx-2 border border-primary/50 rounded-lg bg-white dark:bg-zinc-900 shadow-sm flex items-start">
                                                                                    <textarea
                                                                                        className="w-full bg-transparent border-none text-sm leading-relaxed p-0 pr-8 focus:ring-0 outline-none resize-none overflow-hidden block m-0"
                                                                                        value={inlineEdit.value}
                                                                                        rows={1}
                                                                                        onChange={e => {
                                                                                            setInlineEdit({ ...inlineEdit, value: e.target.value });
                                                                                            e.target.style.height = 'auto';
                                                                                            e.target.style.height = `${e.target.scrollHeight}px`;
                                                                                        }}
                                                                                        onFocus={e => {
                                                                                            e.target.style.height = 'auto';
                                                                                            e.target.style.height = `${e.target.scrollHeight}px`;
                                                                                        }}
                                                                                        onBlur={saveInlineEdit}
                                                                                        onKeyDown={(e) => {
                                                                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInlineEdit(); }
                                                                                            else if (e.key === 'Escape') setInlineEdit(null);
                                                                                        }}
                                                                                        autoFocus
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <div
                                                                                    key={i}
                                                                                    className="group relative flex justify-between items-start p-2 -mx-2 rounded-lg cursor-text hover:bg-black/5 dark:hover:bg-white/5 border border-transparent transition-colors"
                                                                                    onClick={() => setInlineEdit({ field: 'globalStyle_interactions', value: item, index: i })}
                                                                                    title="Click to edit rule"
                                                                                >
                                                                                    <p className="text-sm leading-relaxed text-muted-foreground w-full pr-8 m-0 p-0 whitespace-pre-wrap">• {item}</p>
                                                                                    <div className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                                        <Button
                                                                                            size="icon" variant="ghost" className="h-6 w-6 text-red-600 hover:bg-red-100"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setGraph((prev: any) => {
                                                                                                    const next = JSON.parse(JSON.stringify(prev));
                                                                                                    next.surface.global_styles.interactions.splice(i, 1);
                                                                                                    return next;
                                                                                                });
                                                                                            }}
                                                                                        >
                                                                                            <Trash2 size={12} />
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}

                                                                        {inlineEdit?.field === 'globalStyle_interactions' && inlineEdit.index === undefined ? (
                                                                            <div className="relative p-2 -mx-2 mt-1 border border-primary/50 rounded-lg bg-white dark:bg-zinc-900 shadow-sm flex items-start">
                                                                                <textarea
                                                                                    className="w-full bg-transparent border-none text-sm leading-relaxed p-0 pr-8 focus:ring-0 outline-none resize-none overflow-hidden block m-0"
                                                                                    placeholder="New interaction rule..."
                                                                                    value={inlineEdit.value}
                                                                                    rows={1}
                                                                                    onChange={e => {
                                                                                        setInlineEdit({ ...inlineEdit, value: e.target.value });
                                                                                        e.target.style.height = 'auto';
                                                                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                                                                    }}
                                                                                    onFocus={e => {
                                                                                        e.target.style.height = 'auto';
                                                                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                                                                    }}
                                                                                    onBlur={saveInlineEdit}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInlineEdit(); }
                                                                                        else if (e.key === 'Escape') setInlineEdit(null);
                                                                                    }}
                                                                                    autoFocus
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <Button variant="outline" size="sm" className="mt-2 w-full border-dashed" onClick={() => setInlineEdit({ field: 'globalStyle_interactions', value: '' })}>+ Add Interaction</Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Accessibility */}
                                                        <div className="space-y-4 pt-2">
                                                            <h4 className="text-sm font-bold border-b pb-2">Accessibility</h4>
                                                            {renderInlineField("Visual Hierarchy", "globalStyle_accessibility_visualHierarchy", graph.surface?.global_styles?.accessibility?.visualHierarchy || '', true)}

                                                            <div>
                                                                <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider block mb-2">Keyboard Navigation Rules</span>
                                                                <div className="space-y-2">
                                                                    {graph.surface?.global_styles?.accessibility?.keyboard?.map((item: string, i: number) => {
                                                                        const isEditing = inlineEdit?.field === 'globalStyle_accessibility_keyboard' && inlineEdit.index === i;
                                                                        return isEditing ? (
                                                                            <div key={i} className="relative p-2 -mx-2 border border-primary/50 rounded-lg bg-white dark:bg-zinc-900 shadow-sm flex items-start">
                                                                                <textarea
                                                                                    className="w-full bg-transparent border-none text-sm leading-relaxed p-0 pr-8 focus:ring-0 outline-none resize-none overflow-hidden block m-0"
                                                                                    value={inlineEdit.value}
                                                                                    rows={1}
                                                                                    onChange={e => {
                                                                                        setInlineEdit({ ...inlineEdit, value: e.target.value });
                                                                                        e.target.style.height = 'auto';
                                                                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                                                                    }}
                                                                                    onFocus={e => {
                                                                                        e.target.style.height = 'auto';
                                                                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                                                                    }}
                                                                                    onBlur={saveInlineEdit}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInlineEdit(); }
                                                                                        else if (e.key === 'Escape') setInlineEdit(null);
                                                                                    }}
                                                                                    autoFocus
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <div
                                                                                key={i}
                                                                                className="group relative flex justify-between items-start p-2 -mx-2 rounded-lg cursor-text hover:bg-black/5 dark:hover:bg-white/5 border border-transparent transition-colors"
                                                                                onClick={() => setInlineEdit({ field: 'globalStyle_accessibility_keyboard', value: item, index: i })}
                                                                                title="Click to edit rule"
                                                                            >
                                                                                <p className="text-sm leading-relaxed text-muted-foreground w-full pr-8 m-0 p-0 whitespace-pre-wrap">• {item}</p>
                                                                                <div className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                                    <Button
                                                                                        size="icon" variant="ghost" className="h-6 w-6 text-red-600 hover:bg-red-100"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setGraph((prev: any) => {
                                                                                                const next = JSON.parse(JSON.stringify(prev));
                                                                                                next.surface.global_styles.accessibility.keyboard.splice(i, 1);
                                                                                                return next;
                                                                                            });
                                                                                        }}
                                                                                    >
                                                                                        <Trash2 size={12} />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}

                                                                    {inlineEdit?.field === 'globalStyle_accessibility_keyboard' && inlineEdit.index === undefined ? (
                                                                        <div className="relative p-2 -mx-2 mt-1 border border-primary/50 rounded-lg bg-white dark:bg-zinc-900 shadow-sm flex items-start">
                                                                            <textarea
                                                                                className="w-full bg-transparent border-none text-sm leading-relaxed p-0 pr-8 focus:ring-0 outline-none resize-none overflow-hidden block m-0"
                                                                                placeholder="New keyboard rule..."
                                                                                value={inlineEdit.value}
                                                                                rows={1}
                                                                                onChange={e => {
                                                                                    setInlineEdit({ ...inlineEdit, value: e.target.value });
                                                                                    e.target.style.height = 'auto';
                                                                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                                                                }}
                                                                                onFocus={e => {
                                                                                    e.target.style.height = 'auto';
                                                                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                                                                }}
                                                                                onBlur={saveInlineEdit}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInlineEdit(); }
                                                                                    else if (e.key === 'Escape') setInlineEdit(null);
                                                                                }}
                                                                                autoFocus
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <Button variant="outline" size="sm" className="mt-2 w-full border-dashed" onClick={() => setInlineEdit({ field: 'globalStyle_accessibility_keyboard', value: '' })}>+ Add Keyboard Rule</Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-8 items-start justify-center w-full">
                                            {graph.structure?.nodes?.screens?.filter((s: any) => {
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
                                                    /* Changed min-h-[150px] to min-h-[124px] so it perfectly matches an empty screen card */
                                                    className="w-80 self-stretch border-2 border-dashed border-border hover:border-primary/50 rounded-xl flex items-center justify-center p-6 cursor-pointer text-muted-foreground hover:text-primary transition-colors min-h-[124px]"
                                                >
                                                    + Add Screen
                                                </div>
                                            )}
                                        </div>
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
                        <div className="sticky -top-5 z-30 bg-white dark:bg-zinc-900 -mx-5 -mt-5 px-5 pt-5 pb-4 mb-6 border-b flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">
                                {selectedNode.type === 'PersonaForm' ? (personaDraft?.isNew ? 'Add Persona' : 'Edit Persona') :
                                    selectedNode.type === 'FunctionalityForm' ? (selectedNode.isNew ? 'Add Functionality' : 'Edit Functionality') :
                                        selectedNode.type === 'FlowForm' ? (selectedNode.isNew ? 'Add Flow' : 'Edit Flow') :
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

                                    {/* --- COMPREHENSIVE & GENERALIZED STYLES UI --- */}
                                    {(() => {
                                        // Helper to handle flat keys
                                        const updateStyle = (key: string, value: string | string[] | null) => {
                                            const newStyles = { ...(selectedNode.styles || {}) };
                                            if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                                                delete newStyles[key];
                                            } else {
                                                newStyles[key] = value;
                                            }

                                            if (selectedNode.type === 'NewNode') setSelectedNode({ ...selectedNode, styles: newStyles });
                                            else handleUpdateNode('styles', newStyles);
                                        };

                                        // Helper to handle nested keys (e.g., layout.mobile)
                                        const updateNestedStyle = (category: string, key: string, value: string | any[] | null) => {
                                            const newStyles = JSON.parse(JSON.stringify(selectedNode.styles || {}));
                                            if (!newStyles[category]) newStyles[category] = {};

                                            if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                                                delete newStyles[category][key];
                                                if (Object.keys(newStyles[category]).length === 0) delete newStyles[category];
                                            } else {
                                                newStyles[category][key] = value;
                                            }

                                            if (selectedNode.type === 'NewNode') setSelectedNode({ ...selectedNode, styles: newStyles });
                                            else handleUpdateNode('styles', newStyles);
                                        };

                                        // Custom properties helper
                                        const updateStyleKey = (oldKey: string, newKey: string, value: string) => {
                                            if (oldKey === newKey) return;
                                            const newStyles = { ...(selectedNode.styles || {}) };
                                            delete newStyles[oldKey];
                                            if (newKey.trim() !== '') newStyles[newKey] = value;

                                            if (selectedNode.type === 'NewNode') setSelectedNode({ ...selectedNode, styles: newStyles });
                                            else handleUpdateNode('styles', newStyles);
                                        };

                                        // Reserved keys that have dedicated UI
                                        const reservedKeys = ['color', 'background_color', 'typography', 'layout', 'interactions', 'accessibility'];
                                        const customStyles = Object.entries(selectedNode.styles || {}).filter(([k]) => !reservedKeys.includes(k));

                                        return (
                                            <div className="space-y-4 border-t pt-4 mt-4">
                                                <span className="text-xs font-bold uppercase text-primary tracking-wider">Appearance & Styles</span>

                                                {/* 1. Theme Connections */}
                                                <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border/50">
                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Theme Connections</h4>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Text Color</label>
                                                            <select className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" value={selectedNode.styles?.color || ''} onChange={(e) => updateStyle('color', e.target.value)}>
                                                                <option value="">Inherit Default</option>
                                                                {Object.entries(graph.surface?.all_styles?.colors || {}).map(([k, v]: any) => <option key={k} value={k}>{v.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Background</label>
                                                            <select className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" value={selectedNode.styles?.background_color || ''} onChange={(e) => updateStyle('background_color', e.target.value)}>
                                                                <option value="">Inherit Default</option>
                                                                {Object.entries(graph.surface?.all_styles?.colors || {}).map(([k, v]: any) => <option key={k} value={k}>{v.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Typography</label>
                                                            <select className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" value={selectedNode.styles?.typography || ''} onChange={(e) => updateStyle('typography', e.target.value)}>
                                                                <option value="">Inherit Default</option>
                                                                {Object.entries(graph.surface?.all_styles?.typography?.hierarchy || {}).map(([k, v]: any) => <option key={k} value={k}>{v.element}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 2. Layout */}
                                                <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border/50">
                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Layout & Grids</h4>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Mobile (&lt; 768px)</label>
                                                            <input className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" placeholder="Override mobile layout..." value={selectedNode.styles?.layout?.mobile || ''} onChange={(e) => updateNestedStyle('layout', 'mobile', e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Tablet (768px - 1024px)</label>
                                                            <input className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" placeholder="Override tablet layout..." value={selectedNode.styles?.layout?.tablet || ''} onChange={(e) => updateNestedStyle('layout', 'tablet', e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Desktop (&gt; 1024px)</label>
                                                            <input className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" placeholder="Override desktop layout..." value={selectedNode.styles?.layout?.desktop || ''} onChange={(e) => updateNestedStyle('layout', 'desktop', e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Grid System</label>
                                                            <input className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" placeholder="e.g. 8px baseline grid" value={selectedNode.styles?.layout?.grid || ''} onChange={(e) => updateNestedStyle('layout', 'grid', e.target.value)} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 3. Interactions */}
                                                <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border/50">
                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex justify-between items-center">
                                                        Interactions
                                                        <span className="text-primary cursor-pointer hover:underline bg-primary/10 px-1.5 py-0.5 rounded normal-case" onClick={() => {
                                                            const currentInteractions = selectedNode.styles?.interactions || [];
                                                            updateStyle('interactions', [...currentInteractions, "New interaction"]);
                                                        }}>+ Add</span>
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {(!selectedNode.styles?.interactions || selectedNode.styles?.interactions.length === 0) && (
                                                            <div className="text-[10px] text-muted-foreground italic">Inherits from App Wide Styles.</div>
                                                        )}
                                                        {selectedNode.styles?.interactions?.map((rule: string, i: number) => (
                                                            <div key={i} className="flex gap-1 mb-1 items-start">
                                                                <input
                                                                    className="flex-1 bg-white dark:bg-zinc-900 border rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-primary"
                                                                    value={rule}
                                                                    onChange={(e) => {
                                                                        const newArr = [...selectedNode.styles.interactions];
                                                                        newArr[i] = e.target.value;
                                                                        updateStyle('interactions', newArr);
                                                                    }}
                                                                />
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-100 flex-shrink-0" onClick={() => {
                                                                    const newArr = [...selectedNode.styles.interactions];
                                                                    newArr.splice(i, 1);
                                                                    updateStyle('interactions', newArr);
                                                                }}>
                                                                    <Trash2 size={10} />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* 4. Accessibility */}
                                                <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border/50">
                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Accessibility</h4>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Visual Hierarchy</label>
                                                            <input className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" placeholder="Override visual hierarchy rules..." value={selectedNode.styles?.accessibility?.visualHierarchy || ''} onChange={(e) => updateNestedStyle('accessibility', 'visualHierarchy', e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-2 flex justify-between items-center">
                                                                Keyboard Navigation
                                                                <span className="text-primary cursor-pointer hover:underline bg-primary/10 px-1.5 py-0.5 rounded" onClick={() => {
                                                                    const currentKeyboard = selectedNode.styles?.accessibility?.keyboard || [];
                                                                    updateNestedStyle('accessibility', 'keyboard', [...currentKeyboard, "New keyboard rule"]);
                                                                }}>+ Add</span>
                                                            </label>
                                                            {(!selectedNode.styles?.accessibility?.keyboard || selectedNode.styles?.accessibility?.keyboard.length === 0) && (
                                                                <div className="text-[10px] text-muted-foreground italic mb-2">Inherits from App Wide Styles.</div>
                                                            )}
                                                            {selectedNode.styles?.accessibility?.keyboard?.map((rule: string, i: number) => (
                                                                <div key={i} className="flex gap-1 mb-1 items-start">
                                                                    <input
                                                                        className="flex-1 bg-white dark:bg-zinc-900 border rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-primary"
                                                                        value={rule}
                                                                        onChange={(e) => {
                                                                            const newKeyboard = [...selectedNode.styles.accessibility.keyboard];
                                                                            newKeyboard[i] = e.target.value;
                                                                            updateNestedStyle('accessibility', 'keyboard', newKeyboard);
                                                                        }}
                                                                    />
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-100 flex-shrink-0" onClick={() => {
                                                                        const newKeyboard = [...selectedNode.styles.accessibility.keyboard];
                                                                        newKeyboard.splice(i, 1);
                                                                        updateNestedStyle('accessibility', 'keyboard', newKeyboard);
                                                                    }}>
                                                                        <Trash2 size={10} />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 5. Custom Properties */}
                                                <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border/50">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase">Custom Properties</h4>
                                                        <Button
                                                            variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] text-primary hover:bg-primary/10"
                                                            onClick={() => {
                                                                const baseKey = "new_property";
                                                                let key = baseKey;
                                                                let counter = 1;
                                                                while (selectedNode.styles?.[key] !== undefined) { key = `${baseKey}_${counter}`; counter++; }
                                                                updateStyle(key, "value");
                                                            }}
                                                        >
                                                            <Plus size={10} className="mr-1" /> Add Rule
                                                        </Button>
                                                    </div>

                                                    {customStyles.length === 0 ? (
                                                        <div className="text-[10px] text-muted-foreground italic text-center py-2 border border-dashed rounded border-border/50">
                                                            No custom styles applied.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {customStyles.map(([k, v], idx) => (
                                                                <div key={idx} className="flex gap-2 items-center group">
                                                                    <input
                                                                        className="w-[40%] bg-white dark:bg-zinc-900 border rounded px-2 py-1 text-[10px] font-mono focus:ring-1 focus:ring-primary"
                                                                        value={k} placeholder="e.g. padding"
                                                                        onChange={(e) => updateStyleKey(k, e.target.value, typeof v === 'string' ? v : JSON.stringify(v))}
                                                                    />
                                                                    <span className="text-muted-foreground text-[10px]">:</span>
                                                                    <input
                                                                        className="flex-1 bg-white dark:bg-zinc-900 border rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-primary"
                                                                        value={typeof v === 'string' ? v : JSON.stringify(v)} placeholder="e.g. 16px"
                                                                        onChange={(e) => updateStyle(k, e.target.value)}
                                                                    />
                                                                    <Button
                                                                        variant="ghost" size="icon" className="h-5 w-5 text-red-500 hover:bg-red-100 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => updateStyle(k, null)}
                                                                    >
                                                                        <Trash2 size={10} />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* --- NAVIGATION RULES UI --- */}
                                    <div className="mt-6 border-t pt-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold uppercase text-primary tracking-wider">Navigation Rules</span>
                                        </div>

                                        {/* Display Existing Rules */}
                                        <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
                                            {navTypes.flatMap(type => {
                                                const rules = graph.structure?.edges?.navigationRules?.[type] || [];
                                                return rules
                                                    .map((r, i: number) => ({ ...r, type, index: i }))
                                                    .filter((r) => r.where === selectedNode.id)
                                                    .map((r) => (
                                                        <div key={`${r.type}-${r.index}`} className="flex justify-between items-start bg-slate-50 dark:bg-zinc-800 border rounded p-2 text-xs">
                                                            <div className="flex-1 pr-2">
                                                                <div className="uppercase text-[9px] font-bold text-primary mb-0.5">{NAV_TYPES.find(t => t.id === r.type)?.label || r.type}</div>
                                                                <div className="text-muted-foreground leading-tight">{r.description}</div>
                                                                {r.target && <div className="text-[10px] text-blue-500 mt-1">→ {getNodeById(r.target)?.name || r.target}</div>}
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500 hover:bg-red-100 flex-shrink-0" onClick={() => {
                                                                setGraph((prev: any) => {
                                                                    const next = JSON.parse(JSON.stringify(prev));
                                                                    next.structure.edges.navigationRules[r.type].splice(r.index, 1);
                                                                    return next;
                                                                });
                                                            }}>
                                                                <Trash2 size={10} />
                                                            </Button>
                                                        </div>
                                                    ));
                                            })}
                                        </div>

                                        {/* Add New Rule Form */}
                                        <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border/50 space-y-3">
                                            <p className="text-[10px] text-muted-foreground leading-tight">Add links/routes originating from this node.</p>

                                            <div>
                                                <select
                                                    className="w-full bg-white dark:bg-zinc-800 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary"
                                                    value={navRuleDraft.type}
                                                    onChange={(e) => setNavRuleDraft({ ...navRuleDraft, type: e.target.value })}
                                                >
                                                    {NAV_TYPES.filter(t => t.id !== 'global').map(t => (
                                                        <option key={t.id} value={t.id}>{t.label}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[9px] text-muted-foreground mt-1 ml-1 italic">{NAV_TYPES.find(t => t.id === navRuleDraft.type)?.desc}</p>
                                            </div>

                                            <select
                                                className="w-full bg-white dark:bg-zinc-800 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary"
                                                value={navRuleDraft.target}
                                                onChange={(e) => setNavRuleDraft({ ...navRuleDraft, target: e.target.value })}
                                            >
                                                <option value="">No specific target (External/Dynamic)</option>
                                                {[...(graph.structure?.nodes?.screens || []), ...(graph.structure?.nodes?.components || [])].map(n => (
                                                    <option key={n.id} value={n.id}>{n.name}</option>
                                                ))}
                                            </select>

                                            <textarea
                                                placeholder="Description (e.g., Link to Help Center)"
                                                className="w-full bg-white dark:bg-zinc-800 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary min-h-[50px]"
                                                value={navRuleDraft.description}
                                                onChange={(e) => setNavRuleDraft({ ...navRuleDraft, description: e.target.value })}
                                            />

                                            <Button size="sm" variant="secondary" className="w-full text-xs h-7 border border-border" disabled={!navRuleDraft.description} onClick={() => {
                                                setGraph((prev: any) => {
                                                    const next = JSON.parse(JSON.stringify(prev));
                                                    if (!next.structure.edges.navigationRules) next.structure.edges.navigationRules = {};
                                                    if (!next.structure.edges.navigationRules[navRuleDraft.type]) next.structure.edges.navigationRules[navRuleDraft.type] = [];

                                                    next.structure.edges.navigationRules[navRuleDraft.type].push({
                                                        where: selectedNode.parent === 'body' ? { screen: selectedNode.id } : { component: selectedNode.id },
                                                        description: navRuleDraft.description,
                                                        ...(navRuleDraft.target ? { target: navRuleDraft.target } : {})
                                                    });
                                                    return next;
                                                });
                                                setNavRuleDraft({ type: 'local', target: '', description: '' });
                                            }}>+ Add Rule</Button>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t flex justify-end gap-2 mt-4">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)}>Close</Button>
                                    </div>
                                </>
                            )}

                            {/* Editor fields for CREATING a New Node */}
                            {selectedNode.type === 'NewNode' && (
                                <>
                                    <div><label className="text-xs font-semibold text-muted-foreground mb-1 block">Name</label><input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.name} onChange={(e) => setSelectedNode({ ...selectedNode, name: e.target.value })} autoFocus /></div>
                                    <div><label className="text-xs font-semibold text-muted-foreground mb-1 block">Purpose</label><textarea className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary min-h-[80px]" value={selectedNode.purpose} onChange={(e) => setSelectedNode({ ...selectedNode, purpose: e.target.value })} /></div>

                                    {/* --- COMPREHENSIVE & GENERALIZED STYLES UI --- */}
                                    {(() => {
                                        // Helper to handle flat keys
                                        const updateStyle = (key: string, value: string | string[] | null) => {
                                            const newStyles = { ...(selectedNode.styles || {}) };
                                            if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                                                delete newStyles[key];
                                            } else {
                                                newStyles[key] = value;
                                            }

                                            if (selectedNode.type === 'NewNode') setSelectedNode({ ...selectedNode, styles: newStyles });
                                            else handleUpdateNode('styles', newStyles);
                                        };

                                        // Helper to handle nested keys (e.g., layout.mobile)
                                        const updateNestedStyle = (category: string, key: string, value: string | any[] | null) => {
                                            const newStyles = JSON.parse(JSON.stringify(selectedNode.styles || {}));
                                            if (!newStyles[category]) newStyles[category] = {};

                                            if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                                                delete newStyles[category][key];
                                                if (Object.keys(newStyles[category]).length === 0) delete newStyles[category];
                                            } else {
                                                newStyles[category][key] = value;
                                            }

                                            if (selectedNode.type === 'NewNode') setSelectedNode({ ...selectedNode, styles: newStyles });
                                            else handleUpdateNode('styles', newStyles);
                                        };

                                        // Custom properties helper
                                        const updateStyleKey = (oldKey: string, newKey: string, value: string) => {
                                            if (oldKey === newKey) return;
                                            const newStyles = { ...(selectedNode.styles || {}) };
                                            delete newStyles[oldKey];
                                            if (newKey.trim() !== '') newStyles[newKey] = value;

                                            if (selectedNode.type === 'NewNode') setSelectedNode({ ...selectedNode, styles: newStyles });
                                            else handleUpdateNode('styles', newStyles);
                                        };

                                        // Reserved keys that have dedicated UI
                                        const reservedKeys = ['color', 'background_color', 'typography', 'layout', 'interactions', 'accessibility'];
                                        const customStyles = Object.entries(selectedNode.styles || {}).filter(([k]) => !reservedKeys.includes(k));

                                        return (
                                            <div className="space-y-4 border-t pt-4 mt-4">
                                                <span className="text-xs font-bold uppercase text-primary tracking-wider">Appearance & Styles</span>

                                                {/* 1. Theme Connections */}
                                                <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border/50">
                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Theme Connections</h4>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Text Color</label>
                                                            <select className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" value={selectedNode.styles?.color || ''} onChange={(e) => updateStyle('color', e.target.value)}>
                                                                <option value="">Inherit Default</option>
                                                                {Object.entries(graph.surface?.all_styles?.colors || {}).map(([k, v]: any) => <option key={k} value={k}>{v.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Background</label>
                                                            <select className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" value={selectedNode.styles?.background_color || ''} onChange={(e) => updateStyle('background_color', e.target.value)}>
                                                                <option value="">Inherit Default</option>
                                                                {Object.entries(graph.surface?.all_styles?.colors || {}).map(([k, v]: any) => <option key={k} value={k}>{v.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Typography</label>
                                                            <select className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" value={selectedNode.styles?.typography || ''} onChange={(e) => updateStyle('typography', e.target.value)}>
                                                                <option value="">Inherit Default</option>
                                                                {Object.entries(graph.surface?.all_styles?.typography?.hierarchy || {}).map(([k, v]: any) => <option key={k} value={k}>{v.element}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 2. Layout */}
                                                <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border/50">
                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Layout & Grids</h4>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Mobile (&lt; 768px)</label>
                                                            <input className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" placeholder="Override mobile layout..." value={selectedNode.styles?.layout?.mobile || ''} onChange={(e) => updateNestedStyle('layout', 'mobile', e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Tablet (768px - 1024px)</label>
                                                            <input className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" placeholder="Override tablet layout..." value={selectedNode.styles?.layout?.tablet || ''} onChange={(e) => updateNestedStyle('layout', 'tablet', e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Desktop (&gt; 1024px)</label>
                                                            <input className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" placeholder="Override desktop layout..." value={selectedNode.styles?.layout?.desktop || ''} onChange={(e) => updateNestedStyle('layout', 'desktop', e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Grid System</label>
                                                            <input className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" placeholder="e.g. 8px baseline grid" value={selectedNode.styles?.layout?.grid || ''} onChange={(e) => updateNestedStyle('layout', 'grid', e.target.value)} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 3. Interactions */}
                                                <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border/50">
                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex justify-between items-center">
                                                        Interactions
                                                        <span className="text-primary cursor-pointer hover:underline bg-primary/10 px-1.5 py-0.5 rounded normal-case" onClick={() => {
                                                            const currentInteractions = selectedNode.styles?.interactions || [];
                                                            updateStyle('interactions', [...currentInteractions, "New interaction"]);
                                                        }}>+ Add</span>
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {(!selectedNode.styles?.interactions || selectedNode.styles?.interactions.length === 0) && (
                                                            <div className="text-[10px] text-muted-foreground italic">Inherits from App Wide Styles.</div>
                                                        )}
                                                        {selectedNode.styles?.interactions?.map((rule: string, i: number) => (
                                                            <div key={i} className="flex gap-1 mb-1 items-start">
                                                                <input
                                                                    className="flex-1 bg-white dark:bg-zinc-900 border rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-primary"
                                                                    value={rule}
                                                                    onChange={(e) => {
                                                                        const newArr = [...selectedNode.styles.interactions];
                                                                        newArr[i] = e.target.value;
                                                                        updateStyle('interactions', newArr);
                                                                    }}
                                                                />
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-100 flex-shrink-0" onClick={() => {
                                                                    const newArr = [...selectedNode.styles.interactions];
                                                                    newArr.splice(i, 1);
                                                                    updateStyle('interactions', newArr);
                                                                }}>
                                                                    <Trash2 size={10} />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* 4. Accessibility */}
                                                <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border/50">
                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Accessibility</h4>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Visual Hierarchy</label>
                                                            <input className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary" placeholder="Override visual hierarchy rules..." value={selectedNode.styles?.accessibility?.visualHierarchy || ''} onChange={(e) => updateNestedStyle('accessibility', 'visualHierarchy', e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-2 flex justify-between items-center">
                                                                Keyboard Navigation
                                                                <span className="text-primary cursor-pointer hover:underline bg-primary/10 px-1.5 py-0.5 rounded" onClick={() => {
                                                                    const currentKeyboard = selectedNode.styles?.accessibility?.keyboard || [];
                                                                    updateNestedStyle('accessibility', 'keyboard', [...currentKeyboard, "New keyboard rule"]);
                                                                }}>+ Add</span>
                                                            </label>
                                                            {(!selectedNode.styles?.accessibility?.keyboard || selectedNode.styles?.accessibility?.keyboard.length === 0) && (
                                                                <div className="text-[10px] text-muted-foreground italic mb-2">Inherits from App Wide Styles.</div>
                                                            )}
                                                            {selectedNode.styles?.accessibility?.keyboard?.map((rule: string, i: number) => (
                                                                <div key={i} className="flex gap-1 mb-1 items-start">
                                                                    <input
                                                                        className="flex-1 bg-white dark:bg-zinc-900 border rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-primary"
                                                                        value={rule}
                                                                        onChange={(e) => {
                                                                            const newKeyboard = [...selectedNode.styles.accessibility.keyboard];
                                                                            newKeyboard[i] = e.target.value;
                                                                            updateNestedStyle('accessibility', 'keyboard', newKeyboard);
                                                                        }}
                                                                    />
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-100 flex-shrink-0" onClick={() => {
                                                                        const newKeyboard = [...selectedNode.styles.accessibility.keyboard];
                                                                        newKeyboard.splice(i, 1);
                                                                        updateNestedStyle('accessibility', 'keyboard', newKeyboard);
                                                                    }}>
                                                                        <Trash2 size={10} />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 5. Custom Properties */}
                                                <div className="space-y-2 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border/50">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase">Custom Properties</h4>
                                                        <Button
                                                            variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] text-primary hover:bg-primary/10"
                                                            onClick={() => {
                                                                const baseKey = "new_property";
                                                                let key = baseKey;
                                                                let counter = 1;
                                                                while (selectedNode.styles?.[key] !== undefined) { key = `${baseKey}_${counter}`; counter++; }
                                                                updateStyle(key, "value");
                                                            }}
                                                        >
                                                            <Plus size={10} className="mr-1" /> Add Rule
                                                        </Button>
                                                    </div>

                                                    {customStyles.length === 0 ? (
                                                        <div className="text-[10px] text-muted-foreground italic text-center py-2 border border-dashed rounded border-border/50">
                                                            No custom styles applied.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {customStyles.map(([k, v], idx) => (
                                                                <div key={idx} className="flex gap-2 items-center group">
                                                                    <input
                                                                        className="w-[40%] bg-white dark:bg-zinc-900 border rounded px-2 py-1 text-[10px] font-mono focus:ring-1 focus:ring-primary"
                                                                        value={k} placeholder="e.g. padding"
                                                                        onChange={(e) => updateStyleKey(k, e.target.value, typeof v === 'string' ? v : JSON.stringify(v))}
                                                                    />
                                                                    <span className="text-muted-foreground text-[10px]">:</span>
                                                                    <input
                                                                        className="flex-1 bg-white dark:bg-zinc-900 border rounded px-2 py-1 text-[10px] focus:ring-1 focus:ring-primary"
                                                                        value={typeof v === 'string' ? v : JSON.stringify(v)} placeholder="e.g. 16px"
                                                                        onChange={(e) => updateStyle(k, e.target.value)}
                                                                    />
                                                                    <Button
                                                                        variant="ghost" size="icon" className="h-5 w-5 text-red-500 hover:bg-red-100 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => updateStyle(k, null)}
                                                                    >
                                                                        <Trash2 size={10} />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="pt-4 border-t flex justify-end gap-2 mt-6">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)}>Cancel</Button>
                                        <Button size="sm" onClick={() => {
                                            if (!selectedNode.name) return;
                                            setGraph((prev: any) => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                const newId = selectedNode.isScreen ? `screen-new-${Date.now()}` : `comp-new-${Date.now()}`;
                                                const newNode = { id: newId, parent: selectedNode.parent, name: selectedNode.name, purpose: selectedNode.purpose, styles: selectedNode.styles || {} };

                                                if (selectedNode.isScreen) next.structure.nodes.screens.push(newNode);
                                                else next.structure.nodes.components.push(newNode);

                                                return next;
                                            });
                                            setSelectedNode(null);
                                        }}>Create Node</Button>
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
                                            {graph.structure?.nodes?.screens?.filter((s: any) => s.parent === 'body').map((n: any) => (
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
                                                {graph.structure?.nodes?.components?.filter((c: any) => {
                                                    const checkParent = (id: string): boolean => {
                                                        if (id === insertFlowContext.selectedScreen) return true;
                                                        const node = graph.structure?.nodes.components.find((comp: any) => comp.id === id);
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
                            {/* Inside your Sidebar rendering logic */}
                            {selectedNode.type === 'NavRuleEdit' && (
                                <div className="space-y-6">
                                    {selectedNode.ruleType === 'global' ? (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Menu Name</label>
                                                <input
                                                    className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm"
                                                    value={selectedNode.rule.name || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setGraph((prev: any) => {
                                                            const next = JSON.parse(JSON.stringify(prev));
                                                            next.structure.edges.navigationRules.global[selectedNode.index].name = val;
                                                            return next;
                                                        });
                                                        setSelectedNode((prev: any) => ({ ...prev, rule: { ...prev.rule, name: val } }));
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Purpose</label>
                                                <textarea
                                                    className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm min-h-[60px]"
                                                    value={selectedNode.rule.purpose || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setGraph((prev: any) => {
                                                            const next = JSON.parse(JSON.stringify(prev));
                                                            next.structure.edges.navigationRules.global[selectedNode.index].purpose = val;
                                                            return next;
                                                        });
                                                        setSelectedNode((prev: any) => ({ ...prev, rule: { ...prev.rule, purpose: val } }));
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Layouts</label>
                                                <div className="space-y-2">
                                                    {['mobile', 'tablet', 'desktop'].map((device) => (
                                                        <div key={device} className="flex items-center gap-2">
                                                            <span className="text-[10px] uppercase w-16 text-muted-foreground">{device}:</span>
                                                            <input
                                                                className="flex-1 bg-slate-50 dark:bg-zinc-800 border rounded-md px-2 py-1 text-xs"
                                                                value={selectedNode.rule.layouts?.[device] || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setGraph((prev: any) => {
                                                                        const next = JSON.parse(JSON.stringify(prev));
                                                                        if (!next.structure.edges.navigationRules.global[selectedNode.index].layouts) {
                                                                            next.structure.edges.navigationRules.global[selectedNode.index].layouts = {};
                                                                        }
                                                                        next.structure.edges.navigationRules.global[selectedNode.index].layouts[device] = val;
                                                                        return next;
                                                                    });
                                                                    setSelectedNode((prev: any) => ({
                                                                        ...prev,
                                                                        rule: { ...prev.rule, layouts: { ...prev.rule.layouts, [device]: val } }
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Display Location</label>
                                                <select
                                                    className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm"
                                                    value={selectedNode.rule.where || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setGraph((prev: any) => {
                                                            const next = JSON.parse(JSON.stringify(prev));
                                                            next.structure.edges.navigationRules[selectedNode.ruleType][selectedNode.index].where = val;
                                                            return next;
                                                        });
                                                        setSelectedNode((prev: any) => ({ ...prev, rule: { ...prev.rule, where: val } }));
                                                    }}
                                                >
                                                    <option value="app-wide">Everywhere (App-Wide)</option>
                                                    <optgroup label="Specific Screens">
                                                        {graph.structure?.nodes?.screens?.map((s: any) => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </optgroup>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Description</label>
                                                <textarea
                                                    className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm min-h-[100px]"
                                                    value={selectedNode.rule.description || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setGraph((prev: any) => {
                                                            const next = JSON.parse(JSON.stringify(prev));
                                                            next.structure.edges.navigationRules[selectedNode.ruleType][selectedNode.index].description = val;
                                                            return next;
                                                        });
                                                        setSelectedNode((prev: any) => ({ ...prev, rule: { ...prev.rule, description: val } }));
                                                    }}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <Button variant="destructive" size="sm" className="w-full" onClick={() => {
                                        setGraph((prev: any) => {
                                            const next = JSON.parse(JSON.stringify(prev));
                                            next.structure.edges.navigationRules[selectedNode.ruleType].splice(selectedNode.index, 1);
                                            return next;
                                        });
                                        setSelectedNode(null);
                                    }}>
                                        Delete Navigation Rule
                                    </Button>
                                </div>
                            )}
                            {/* Editor fields for Functionalities */}
                            {selectedNode.type === 'ColorStyleEdit' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Color Key (ID)</label>
                                        <input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.colorKey} onChange={(e) => setSelectedNode({ ...selectedNode, colorKey: e.target.value })} disabled={!selectedNode.isNew} placeholder="e.g. primary, success" />
                                        {!selectedNode.isNew && <p className="text-[9px] text-muted-foreground mt-1">Key cannot be changed after creation.</p>}
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Display Name</label>
                                        <input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.colorData.name} onChange={(e) => setSelectedNode({ ...selectedNode, colorData: { ...selectedNode.colorData, name: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Hex Code</label>
                                        <div className="flex gap-2">
                                            <input type="color" className="h-9 w-9 rounded border cursor-pointer p-0 shrink-0" value={selectedNode.colorData.color} onChange={(e) => setSelectedNode({ ...selectedNode, colorData: { ...selectedNode.colorData, color: e.target.value } })} />
                                            <input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm uppercase font-mono focus:ring-1 focus:ring-primary" value={selectedNode.colorData.color} onChange={(e) => setSelectedNode({ ...selectedNode, colorData: { ...selectedNode.colorData, color: e.target.value } })} />
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t flex justify-end gap-2 mt-6">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)}>Cancel</Button>
                                        <Button size="sm" onClick={() => {
                                            if (!selectedNode.colorKey) return;
                                            setGraph((prev: any) => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                if (!next.surface) next.surface = {};
                                                if (!next.surface.all_styles) next.surface.all_styles = {};
                                                if (!next.surface.all_styles.colors) next.surface.all_styles.colors = {};
                                                next.surface.all_styles.colors[selectedNode.colorKey] = selectedNode.colorData;
                                                return next;
                                            });
                                            setSelectedNode(null);
                                        }}>Save Color</Button>
                                    </div>
                                    {!selectedNode.isNew && (
                                        <Button variant="destructive" size="sm" className="w-full mt-2" onClick={() => {
                                            setGraph((prev: any) => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                delete next.surface.all_styles.colors[selectedNode.colorKey];
                                                return next;
                                            });
                                            setSelectedNode(null);
                                        }}>Delete Color</Button>
                                    )}
                                </div>
                            )}

                            {selectedNode.type === 'TypographyStyleEdit' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Typo Key (ID)</label>
                                        <input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.typoKey} onChange={(e) => setSelectedNode({ ...selectedNode, typoKey: e.target.value })} disabled={!selectedNode.isNew} placeholder="e.g. h1, body" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Element / Name</label>
                                        <input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.typoData.element} onChange={(e) => setSelectedNode({ ...selectedNode, typoData: { ...selectedNode.typoData, element: e.target.value } })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Size</label>
                                            <input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.typoData.size} onChange={(e) => setSelectedNode({ ...selectedNode, typoData: { ...selectedNode.typoData, size: e.target.value } })} placeholder="e.g. 16px" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Weight</label>
                                            <input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.typoData.weight} onChange={(e) => setSelectedNode({ ...selectedNode, typoData: { ...selectedNode.typoData, weight: e.target.value } })} placeholder="e.g. Bold" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Usage Context</label>
                                        <textarea className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.typoData.usage} onChange={(e) => setSelectedNode({ ...selectedNode, typoData: { ...selectedNode.typoData, usage: e.target.value } })} />
                                    </div>
                                    <div className="pt-4 border-t flex justify-end gap-2 mt-6">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)}>Cancel</Button>
                                        <Button size="sm" onClick={() => {
                                            if (!selectedNode.typoKey) return;
                                            setGraph((prev: any) => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                if (!next.surface) next.surface = {};
                                                if (!next.surface.all_styles) next.surface.all_styles = {};
                                                if (!next.surface.all_styles.typography) next.surface.all_styles.typography = { hierarchy: {} };
                                                if (!next.surface.all_styles.typography.hierarchy) next.surface.all_styles.typography.hierarchy = {};
                                                next.surface.all_styles.typography.hierarchy[selectedNode.typoKey] = selectedNode.typoData;
                                                return next;
                                            });
                                            setSelectedNode(null);
                                        }}>Save Typography</Button>
                                    </div>
                                    {!selectedNode.isNew && (
                                        <Button variant="destructive" size="sm" className="w-full mt-2" onClick={() => {
                                            setGraph((prev: any) => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                delete next.surface.all_styles.typography.hierarchy[selectedNode.typoKey];
                                                return next;
                                            });
                                            setSelectedNode(null);
                                        }}>Delete Typography</Button>
                                    )}
                                </div>
                            )}

                            {selectedNode.type === 'GlobalStyleEdit' && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-3 rounded text-xs leading-relaxed border border-blue-200 dark:border-blue-800/50 mb-4">
                                        These are the default styles applied App-Wide. If a Screen or Component does not have custom styles, it will inherit these.
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Default Primary Color</label>
                                        <select className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.data?.color || ''} onChange={(e) => setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, color: e.target.value } })}>
                                            <option value="">Select...</option>
                                            {Object.entries(graph.surface?.all_styles?.colors || {}).map(([k, v]: any) => <option key={k} value={k}>{v.name} ({k})</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Default Background</label>
                                        <select className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.data?.background_color || ''} onChange={(e) => setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, background_color: e.target.value } })}>
                                            <option value="">Select...</option>
                                            {Object.entries(graph.surface?.all_styles?.colors || {}).map(([k, v]: any) => <option key={k} value={k}>{v.name} ({k})</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase block mb-2">Default Typography</label>
                                        <select className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.data?.typography || ''} onChange={(e) => setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, typography: e.target.value } })}>
                                            <option value="">Select...</option>
                                            {Object.entries(graph.surface?.all_styles?.typography?.hierarchy || {}).map(([k, v]: any) => <option key={k} value={k}>{v.element} ({k})</option>)}
                                        </select>
                                    </div>

                                    <div className="pt-4 border-t flex justify-end gap-2 mt-6">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)}>Cancel</Button>
                                        <Button size="sm" onClick={() => {
                                            setGraph((prev: any) => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                if (!next.surface) next.surface = {};
                                                next.surface.global_styles = selectedNode.data;
                                                return next;
                                            });
                                            setSelectedNode(null);
                                        }}>Save Defaults</Button>
                                    </div>
                                </div>
                            )}
                            {selectedNode.type === 'FunctionalityForm' && (
                                <>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground mb-2 block">Associated Screen/Components</label>
                                        <div className="border border-border bg-slate-50 dark:bg-zinc-800 rounded-md p-2 h-72 overflow-y-auto space-y-0.5">
                                            {(() => {
                                                const renderCheckboxTree = (parentId: string, depth: number = 0): React.ReactNode => {
                                                    const children = parentId === 'body'
                                                        ? graph.structure?.nodes?.screens?.filter((s: any) => s.parent === 'body') || []
                                                        : graph.structure?.nodes?.components?.filter((c: any) => c.parent === parentId) || [];

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
                                                if (!next.structure.functionalities) next.structure.functionalities = [];

                                                const newFunc = { name: selectedNode.name, description: selectedNode.description, relatedNodes: selectedNode.relatedNodes || [] };

                                                if (selectedNode.isNew) {
                                                    next.structure.functionalities.push(newFunc);
                                                } else {
                                                    const idx = next.structure.functionalities.findIndex((f: any) => f.name === selectedNode.originalName);
                                                    if (idx > -1) next.structure.functionalities[idx] = newFunc;
                                                }
                                                return next;
                                            });
                                            setActiveFunction(selectedNode.name);
                                            setSelectedNode(null);
                                        }}>Save</Button>
                                    </div>
                                </>
                            )}
                            {/* Editor fields for Flows */}
                            {selectedNode.type === 'FlowForm' && (
                                <>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Flow Name</label>
                                        <input className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary" value={selectedNode.name} onChange={(e) => setSelectedNode({ ...selectedNode, name: e.target.value })} autoFocus />
                                    </div>
                                    <div className="mt-4">
                                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Description</label>
                                        <textarea className="w-full bg-slate-50 dark:bg-zinc-800 border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary min-h-[80px]" value={selectedNode.description || ''} onChange={(e) => setSelectedNode({ ...selectedNode, description: e.target.value })} />
                                    </div>

                                    <div className="mt-4 border-t pt-4">
                                        <label className="text-xs font-semibold text-muted-foreground mb-2 block">Flow Sequence</label>

                                        {/* Display ordered list of steps */}
                                        <div className="border border-border bg-slate-50 dark:bg-zinc-800 rounded-md p-2 max-h-64 overflow-y-auto space-y-1 mb-3">
                                            {(!selectedNode.steps || selectedNode.steps.length === 0) && <div className="text-xs text-muted-foreground italic p-1">No steps added yet. Select below to build the sequence.</div>}
                                            {selectedNode.steps?.map((stepId: string, idx: number) => {
                                                const nodeInfo = getNodeById(stepId);
                                                return (
                                                    <div key={`${stepId}-${idx}`} className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-border/50 rounded px-2 py-1.5 text-xs shadow-sm">
                                                        <div className="flex items-center gap-2 truncate pr-2">
                                                            <span className="bg-primary/10 text-primary font-mono text-[9px] px-1.5 rounded">{idx + 1}</span>
                                                            <span className="truncate font-medium">{nodeInfo?.name || stepId}</span>
                                                            <span className="text-[9px] uppercase opacity-50">{nodeInfo?.isScreen ? 'Screen' : 'Component'}</span>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-5 w-5 text-red-600 hover:bg-red-100 flex-shrink-0" onClick={() => {
                                                            const newSteps = [...selectedNode.steps];
                                                            newSteps.splice(idx, 1);
                                                            setSelectedNode({ ...selectedNode, steps: newSteps });
                                                        }}>
                                                            <Trash2 size={10} />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Dropdown to append new steps */}
                                        <div className="flex gap-2">
                                            <select
                                                className="w-full bg-white dark:bg-zinc-900 border rounded-md px-2 py-1.5 text-xs focus:ring-1 focus:ring-primary"
                                                id="flow-step-select"
                                            >
                                                <option value="">Add screen/component to flow...</option>
                                                {[...(graph.structure?.nodes?.screens || []), ...(graph.structure?.nodes?.components || [])].map(n => (
                                                    <option key={n.id} value={n.id}>{n.name} ({n.id.startsWith('screen') ? 'Screen' : 'Component'})</option>
                                                ))}
                                            </select>
                                            <Button size="sm" variant="secondary" className="text-xs h-auto py-1 px-3 border border-border" onClick={() => {
                                                const selectEl = document.getElementById('flow-step-select') as HTMLSelectElement;
                                                if (selectEl && selectEl.value) {
                                                    setSelectedNode({ ...selectedNode, steps: [...(selectedNode.steps || []), selectEl.value] });
                                                    selectEl.value = ""; // Reset dropdown after pushing
                                                }
                                            }}>
                                                Add
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t flex justify-end gap-2 mt-4">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)}>Cancel</Button>
                                        <Button size="sm" onClick={() => {
                                            if (!selectedNode.name) return;
                                            setGraph((prev: any) => {
                                                const next = JSON.parse(JSON.stringify(prev));
                                                if (!next.structure.edges) next.structure.edges = {};
                                                if (!next.structure.edges.flows) next.structure.edges.flows = [];

                                                const newFlow = { name: selectedNode.name, description: selectedNode.description, steps: selectedNode.steps || [] };

                                                if (selectedNode.isNew) {
                                                    next.structure.edges.flows.push(newFlow);
                                                } else {
                                                    const idx = next.structure.edges.flows.findIndex((f: any) => f.name === selectedNode.originalName);
                                                    if (idx > -1) next.structure.edges.flows[idx] = newFlow;
                                                }
                                                return next;
                                            });
                                            setActiveFlow(selectedNode.name);
                                            setSelectedNode(null);
                                        }}>Save Flow</Button>
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

    // --- ADD THIS BLOCK ---
    const [isTasklistStale, setIsTasklistStale] = useState<boolean>(true);

    // Convert issues to state so we can populate it on click
    const [issues, setIssues] = useState<any[]>([]);
    const [hasUncheckedChanges, setHasUncheckedChanges] = useState<boolean>(false);

    // --- NEW: State for the dropdown panel ---
    const [isIssuesPanelOpen, setIsIssuesPanelOpen] = useState<boolean>(false);

    // --- UPGRADED: Semantic Issue Structure ---
    const dummyIssuesPayload = [
        {
            id: 1,
            severity: "error",
            element: "Global Navigation",
            title: "Missing Mobile Layout Constraint",
            impact: "Without a defined mobile layout, the AI might hallucinate a dense desktop navbar on smaller screens, causing overlapping text and broken tap targets.",
            suggestion: "Add a 'Bottom Tab Bar' or 'Hamburger Menu' to the mobile layout property."
        },
        {
            id: 2,
            severity: "warning",
            element: "Checkout Flow",
            title: "Empty User Flow",
            impact: "This flow is declared but has 0 steps. If the AI tries to build this feature, it will lack the structural sequence needed to connect the right components.",
            suggestion: "Click '+ Add Screen' in the Flow Sequence to map out the user journey."
        },
        {
            id: 3,
            severity: "info",
            element: "New Persona",
            title: "Incomplete Demographics",
            impact: "Missing age and tech expertise metrics. The AI won't know whether to optimize for power users (dense UI) or casual users (large text, simple UI).",
            suggestion: "Fill out the Demographics and Technical Profile for this persona."
        }
    ];

    const DESIGN_FILE = "DESIGN_SEMANTIC.md";

    const designFilePath = app?.files?.find(
        (file) => file === DESIGN_FILE
    );
    const { content } = useLoadAppFile(app?.id ?? null, designFilePath || "");

    // Automatically mark the tasklist as stale and flag unchecked changes if the file updates
    useEffect(() => {
        if (content) {
            setIsTasklistStale(true);
            setHasUncheckedChanges(true);
            setIssues([]);
            setIsIssuesPanelOpen(false); // Close panel on new edits
        }
    }, [content]);

    const handleCheckIssues = () => {
        setIssues(dummyIssuesPayload);
        setHasUncheckedChanges(false);
        setIsIssuesPanelOpen(true); // Auto-open the panel to show what went wrong
    };

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
                <div className="flex items-center space-x-3">
                    {/* 1. Refresh Button */}
                    <button
                        onClick={() => refreshApp()}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors text-muted-foreground cursor-pointer"
                        disabled={loading || !app?.id}
                        title="Refresh Design File"
                    >
                        <RefreshCw size={16} />
                    </button>

                    <div className="h-4 w-px bg-border mx-1"></div>

                    {/* 2. Generate Tasklist Button */}
                    <Button
                        variant={isTasklistStale ? "default" : "outline"}
                        size="sm"
                        className={`h-7 text-xs transition-colors cursor-pointer ${isTasklistStale ? 'bg-amber-500 hover:bg-amber-600 text-white border-transparent shadow-sm' : 'text-muted-foreground'}`}
                        onClick={() => setIsTasklistStale(false)}
                    >
                        <ListTodo size={14} className="mr-1.5" />
                        {isTasklistStale ? 'Generate Tasklist ✨' : 'Tasklist Up-to-date'}
                    </Button>

                    {/* 3. Check Issues Button (Visible if edits detected) */}
                    {hasUncheckedChanges && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs border-dashed border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                            onClick={handleCheckIssues}
                        >
                            <AlertCircle size={14} className="mr-1.5" />
                            Edit detected, check issues
                        </Button>
                    )}

                    {/* 4. Issues Button */}
                    {issues.length > 0 && (
                        <Button
                            variant={isIssuesPanelOpen ? "default" : "outline"}
                            size="sm"
                            className={`h-7 text-xs relative transition-colors cursor-pointer ${isIssuesPanelOpen ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-900/50' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setIsIssuesPanelOpen(!isIssuesPanelOpen)}
                        >
                            <AlertCircle size={14} className={`mr-1.5 ${isIssuesPanelOpen ? 'text-red-600' : 'text-red-500'}`} />
                            Issues
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-950">
                                {issues.length}
                            </span>
                        </Button>
                    )}
                </div>

                <div className="flex bg-muted p-1 rounded-md">
                    <button
                        onClick={() => setViewMode('canvas')}
                        className={`px-3 py-1 text-xs font-medium rounded-sm flex items-center gap-1 transition-all cursor-pointer ${viewMode === 'canvas' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                    >
                        <Layout size={14} /> UI Canvas
                    </button>
                    <button
                        onClick={() => setViewMode('code')}
                        className={`px-3 py-1 text-xs font-medium rounded-sm flex items-center gap-1 transition-all cursor-pointer ${viewMode === 'code' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                    >
                        <Code size={14} /> Raw File
                    </button>
                </div>
            </div>

            {/* --- SEMANTIC ISSUES PANEL --- */}
            {isIssuesPanelOpen && issues.length > 0 && (
                <div className="absolute top-[115px] right-6 w-[450px] max-h-[calc(100%-140px)] z-50 bg-white dark:bg-zinc-950 border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-top-4 fade-in duration-200">
                    <div className="bg-slate-50 dark:bg-zinc-900 border-b px-4 py-3 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                Design Semantics Review
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Understanding why these issues affect your app's UX</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsIssuesPanelOpen(false)}>✕</Button>
                    </div>

                    <div className="overflow-y-auto p-2 space-y-2">
                        {issues.map((issue) => {
                            const isError = issue.severity === 'error';
                            const isWarning = issue.severity === 'warning';
                            
                            return (
                                <div key={issue.id} className={`p-4 rounded-lg border ${isError ? 'bg-red-50/50 border-red-100 dark:bg-red-950/10 dark:border-red-900/30' : isWarning ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30' : 'bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/30'}`}>
                                    
                                    {/* Header: Severity & Location */}
                                    <div className="flex items-start gap-2 mb-2">
                                        <div className="mt-0.5">
                                            {isError ? <XCircle size={14} className="text-red-500" /> : 
                                             isWarning ? <AlertTriangle size={14} className="text-amber-500" /> : 
                                             <AlertCircle size={14} className="text-blue-500" />}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`text-xs font-bold ${isError ? 'text-red-700 dark:text-red-400' : isWarning ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'}`}>
                                                {issue.title}
                                            </h4>
                                            <span className="text-[10px] font-mono text-muted-foreground bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border mt-1 inline-block">
                                                in {issue.element}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Semantic Impact (The "Why") */}
                                    <div className="ml-5 mt-3 space-y-3">
                                        <div>
                                            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">UX Impact</div>
                                            <p className="text-[11px] leading-relaxed text-foreground/80">
                                                {issue.impact}
                                            </p>
                                        </div>
                                        
                                        {/* Resolution Suggestion */}
                                        <div className="bg-white dark:bg-zinc-900 rounded p-2 border border-border/50 flex gap-2 items-start">
                                            <Lightbulb size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Suggested Fix</div>
                                                <p className="text-[11px] text-foreground/90">{issue.suggestion}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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