import { useAtomValue, useSetAtom } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { useGuidedBuild } from "@/hooks/useGuidedBuild";
import { IpcClient } from "@/ipc/ipc_client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Hammer,
    AlertTriangle,
    AlertCircle,
    CheckCircle2,
    Info,
    ChevronDown,
    Pencil,
    Wrench,
    Construction,
    Check,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useStreamChat } from "@/hooks/useStreamChat";
import { showError, showSuccess, showWarning } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { GuidedBuildFinding, GuidedBuildReviewResult } from "@/ipc/ipc_types"; // You'll likely define GuidedBuildFinding types later
import { useState, useEffect } from "react";
import { VanillaMarkdownParser } from "@/components/chat/DyadMarkdownParser";
import { useLoadAppFile } from "@/hooks/useLoadAppFile";
import { useQueryClient } from "@tanstack/react-query";
import { 
    GUIDED_BUILD_TASK_TITLE_PREFIX, 
    GUIDED_VERIFICATION_TITLE_PREFIX 
} from "@/components/chat/ChatInput";
import { improvePromptInNewChat } from "@/components/chat/DesignInNewChat";

// --- ADAPTED TYPES & HELPERS FOR GUIDED BUILD ---
export const GUIDED_BUILD_TITLE_PREFIX = "# Guided Build"

// Mapping "status" from the prompt (missing, partial, violation) to UI
const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case "violation":
            return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
        case "missing":
            return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800";
        case "partial":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800";
    }
};

const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
        case "violation":
            return <AlertTriangle className="h-4 w-4" />;
        case "missing":
            return <AlertCircle className="h-4 w-4" />;
        case "partial":
            return <Construction className="h-4 w-4" />;
        default:
            return <Info className="h-4 w-4" />;
    }
};

const DESCRIPTION_PREVIEW_LENGTH = 150;

// Reusing the GuidedBuildFinding type structure for now, assuming 
// 'level' maps to 'status' (violation/missing/partial)
const createFindingKey = (finding: {
    title: string;
    level: string; // This holds the status
    description: string;
}): string => {
    return JSON.stringify({
        title: finding.title,
        level: finding.level,
        description: finding.description,
    });
};

const formatTimeAgo = (input: string | number | Date): string => {
    const timestampMs = new Date(input).getTime();
    const nowMs = Date.now();
    const diffMs = Math.max(0, nowMs - timestampMs);

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) {
        return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
};

function StatusBadge({ status }: { status: string }) {
    return (
        <Badge
            variant="outline"
            className={`${getStatusColor(status)} uppercase text-xs font-semibold flex items-center gap-1 w-fit`}
        >
            <span className="flex-shrink-0">{getStatusIcon(status)}</span>
            <span>{status}</span>
        </Badge>
    );
}

function RunGuidedBuildButton({
    isRunning,
    onRun,
    hasFindings,
}: {
    isRunning: boolean;
    onRun: () => void;
    hasFindings: boolean;
}) {
    return (
        <Button onClick={onRun} className="gap-2" disabled={isRunning}>
            {isRunning ? (
                <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    Analyzing Gaps...
                </>
            ) : (
                <>
                    <Hammer className="w-4 h-4" />
                    {hasFindings ? "Re-Run Guided Build Analysis" : "Run Guided Build Analysis"}
                </>
            )}
        </Button>
    );
}

function ReviewSummary({ data }: { data: GuidedBuildReviewResult }) {
    const counts = data.findings.reduce(
        (acc, finding) => {
            // finding.level here corresponds to 'status' (violation, missing, etc.)
            acc[finding.level] = (acc[finding.level] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>,
    );

    // Define the order we want to show in summary
    const statuses = ["violation", "missing", "partial"];

    return (
        <div className="space-y-1 mt-1">
            <div className="text-sm text-gray-600 dark:text-gray-400">
                Last analyzed {formatTimeAgo(data.timestamp)}
            </div>
            <div className="flex items-center gap-3 text-sm">
                {statuses
                    .filter((s) => counts[s] > 0 || counts[s.toUpperCase()] > 0) // Handle case sensitivity if backend returns uppercase
                    .map((status) => {
                        // Normalized count lookup
                        const count = counts[status] || counts[status.toUpperCase()] || 0;
                        return (
                            <span key={status} className="flex items-center gap-1.5">
                                <span className="flex-shrink-0">{getStatusIcon(status)}</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {count}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400 capitalize">
                                    {status}
                                </span>
                            </span>
                        );
                    })}
            </div>
        </div>
    );
}

function GuidedBuildHeader({
    isRunning,
    onRun,
    data,
    hasFindings,
    onOpenEditDesign,
}: {
    isRunning: boolean;
    onRun: () => void;
    data?: GuidedBuildReviewResult | undefined;
    hasFindings: boolean;
    onOpenEditDesign: () => void;
}) {
    return (
        <div className="sticky top-0 z-10 bg-background pt-3 pb-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                        <Hammer className="w-5 h-5" />
                        Guided Build
                    </h1>
                    <div className="text-sm">
                        <p className="text-gray-500">
                            Analyzes codebase against Design Semantics
                        </p>
                    </div>
                    {data && data.findings.length > 0 && <ReviewSummary data={data} />}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Button variant="outline" onClick={onOpenEditDesign}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit Design Semantic
                    </Button>
                    <RunGuidedBuildButton isRunning={isRunning} onRun={onRun} hasFindings={hasFindings} />
                </div>
            </div>
        </div>
    );
}

function LoadingView() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4">
                Analyzing Codebase...
            </h2>
        </div>
    );
}

function NoAppSelectedView() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Hammer className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No App Selected
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Select an app to run Guided Build analysis.
            </p>
        </div>
    );
}

function RunningAnalysisCard() {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                        <svg
                            className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Performing Gap Analysis
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        Comparing DESIGN_SEMANTIC.md with your codebase...
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function NoReviewCard({
    isRunning,
    onRun,
}: {
    isRunning: boolean;
    onRun: () => void;
}) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                        <Hammer className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        No Analysis Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Run Guided Build to find missing features and deviations from your design specs.
                    </p>
                    <RunGuidedBuildButton isRunning={isRunning} onRun={onRun} hasFindings={false} />
                </div>
            </CardContent>
        </Card>
    );
}

function AllClearCard({ data }: { data?: GuidedBuildReviewResult }) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        All Systems Go
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        Your codebase matches the Design Semantic specifications perfectly.
                    </p>
                    {data && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                            Last analyzed {formatTimeAgo(data.timestamp)}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function FindingsTable({
    findings,
    onEditManually,
    onDiscussPrompt,
    onTestCompletion,
    onFix,
    fixingFindingKey,
}: {
    findings: GuidedBuildFinding[];
    onEditManually: (finding: GuidedBuildFinding) => void;
    onDiscussPrompt: (finding: GuidedBuildFinding) => void;
    onTestCompletion: (finding: GuidedBuildFinding) => void;
    onFix: (finding: GuidedBuildFinding) => void;
    fixingFindingKey?: string | null;
}) {
    // Local state to track which rows are expanded in-place
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

    // GLOBAL LOCK CHECK: Returns true if ANY finding is currently processing
    const isAnyTaskInProgress = findings.some((f) => f.isInProgress);

    const toggleExpand = (key: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <div className="border rounded-lg overflow-hidden" data-testid="guidedbuild-findings-table">
            <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        {/* Removed Checkmark & Status Columns */}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Gap Detected</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-40">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {findings.map((finding, index) => {
                        const findingKey = createFindingKey(finding);
                        const isExpanded = expandedKeys.has(findingKey);
                        const isLongDescription = finding.description.length > DESCRIPTION_PREVIEW_LENGTH;
                        const displayDescription = (isLongDescription && !isExpanded)
                            ? finding.description.substring(0, DESCRIPTION_PREVIEW_LENGTH) + "..."
                            : finding.description;

                        const isFixing = fixingFindingKey === findingKey;

                        return (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">

                                {/* 1. GAP DETECTED DETAILS COLUMN */}
                                <td className="px-4 py-4">
                                    <div className="space-y-3">
                                        <div className="flex flex-col items-start gap-1.5">
                                            {/* Status Badge moved above the title */}
                                            <StatusBadge status={finding.level} />
                                            <div className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                                                {finding.title}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
                                            <VanillaMarkdownParser content={displayDescription} />
                                        </div>
                                        {isLongDescription && (
                                            <Button
                                                onClick={(e) => toggleExpand(findingKey, e)}
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 py-0 gap-1 mt-1 text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            >
                                                {isExpanded ? <ChevronDown className="w-3 h-3 rotate-180" /> : <ChevronDown className="w-3 h-3" />}
                                                {isExpanded ? "Show less" : "Show more"}
                                            </Button>
                                        )}
                                    </div>
                                </td>

                                {/* 2. ACTION BUTTONS COLUMN */}
                                <td className="px-4 py-4 align-top text-right">
                                    <div className="flex flex-col gap-2 items-end">
                                        {finding.isBuilt && finding.isVerified ? (
                                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 uppercase gap-1 py-1.5 px-3">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Verified
                                            </Badge>
                                        ) : finding.isBuilt ? (
                                            <Button
                                                onClick={() => onTestCompletion(finding)}
                                                size="sm"
                                                variant="secondary"
                                                disabled={isAnyTaskInProgress}
                                                className={`w-full gap-2 transition-all ${isAnyTaskInProgress
                                                        ? "cursor-not-allowed opacity-50"
                                                        : "cursor-pointer hover:bg-secondary/80 hover:shadow-sm active:scale-95"
                                                    }`}
                                            >
                                                <Check className="w-4 h-4" />
                                                Check Completion
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    onClick={() => onFix(finding)}
                                                    size="sm"
                                                    variant="default"
                                                    disabled={isAnyTaskInProgress || isFixing}
                                                    className={`w-full gap-2 ${isAnyTaskInProgress || isFixing
                                                            ? "cursor-not-allowed opacity-50"
                                                            : "cursor-pointer"
                                                        }`}
                                                >
                                                    {isFixing ? (
                                                        <>
                                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                            </svg>
                                                            Building...
                                                        </>
                                                    ) : (
                                                        "Build This"
                                                    )}
                                                </Button>
                                                <Button
                                                    onClick={() => onEditManually(finding)}
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isAnyTaskInProgress}
                                                    className={`w-full ${isAnyTaskInProgress ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                                                        }`}
                                                >
                                                    Edit Manually
                                                </Button>
                                                <Button
                                                    onClick={() => onDiscussPrompt(finding)}
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isAnyTaskInProgress}
                                                    className={`w-full ${isAnyTaskInProgress ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                                                        }`}
                                                >
                                                    Discuss Prompt
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </td>

                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function EditFindingDialog({
    open,
    finding,
    onClose,
    onSave,
}: {
    open: boolean;
    finding: GuidedBuildFinding | null;
    onClose: (open: boolean) => void;
    onSave: (updatedFinding: GuidedBuildFinding) => void;
}) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    // Sync state when a new finding is selected
    useEffect(() => {
        if (finding) {
            setTitle(finding.title);
            setDescription(finding.description);
        }
    }, [finding]);

    const handleSave = () => {
        if (finding) {
            onSave({ ...finding, title, description });
            onClose(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[80vw] md:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 pr-4">
                        Edit Task Prompt
                        {finding && <StatusBadge status={finding.level} />}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                        <input
                            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2 flex-grow">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description / Prompt</label>
                        <textarea
                            className="w-full h-64 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSave}>Save Edits</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export const GuidedBuildPanel = () => {
    const selectedAppId = useAtomValue(selectedAppIdAtom);
    const setSelectedChatId = useSetAtom(selectedChatIdAtom);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { streamMessage } = useStreamChat({ hasChatId: false });
    const { data, isLoading, error, refetch } = useGuidedBuild(selectedAppId);

    // Force a fresh DB pull every time this tab is opened!
    useEffect(() => {
        refetch();
    }, [refetch]);

    const [isRunningReview, setIsRunningReview] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsFinding, setDetailsFinding] = useState<GuidedBuildFinding | null>(
        null,
    );
    const [isEditDesignOpen, setIsEditDesignOpen] = useState(false);
    const [designContent, setDesignContent] = useState("");
    const [fixingFindingKey, setFixingFindingKey] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [completedFindings, setCompletedFindings] = useState<Set<string>>(new Set());
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingFinding, setEditingFinding] = useState<GuidedBuildFinding | null>(null);
    const [editedFindings, setEditedFindings] = useState<Record<string, GuidedBuildFinding>>({});

    // Derive merged findings by overriding raw data with local edits
    const activeFindings = data?.findings.map(finding => {
        const key = createFindingKey(finding);
        return editedFindings[key] || finding;
    }) || [];

    const handleEditManually = (finding: GuidedBuildFinding) => {
        setEditingFinding(finding);
        setEditModalOpen(true);
    };

    const handleSaveFindingEdit = async (updatedFinding: GuidedBuildFinding) => {
        if (!selectedAppId || !editingFinding) return;

        try {
            // Keep UI responsive by optimistically updating local state first
            const originalKey = createFindingKey(editingFinding);
            setEditedFindings(prev => ({
                ...prev,
                [originalKey]: updatedFinding
            }));

            // Push the permanent edit to the SQLite database
            await IpcClient.getInstance().updateGuidedBuildFinding(
                selectedAppId,
                editingFinding.title, // Use the original title to find it in the regex
                updatedFinding
            );

            // Refetch to ensure the UI is perfectly synced with the database
            refetch();
        } catch (err) {
            showError(`Failed to save edit to database: ${err}`);
        }
    };

    const handleDiscussPrompt = async (finding: GuidedBuildFinding) => {
        if (!selectedAppId) return;
        try {
            // No need to lock or unlock here, only when the edit is done then we can automatically build this prompt
            // Todo: rename the chat to # Discuss Tasklist Prompt, such that when it is done here, then the VDA knows how to update
            const chatId = await IpcClient.getInstance().createChat(selectedAppId);
            setSelectedChatId(chatId);
            await navigate({ to: "/chat", search: { id: chatId } });

            const prompt = `I want to discuss this feature gap from the Guided Build analysis before building it:

                            **${finding.title}**
                            ${finding.description}

                            Can we review the requirements and approach?`;

            await streamMessage({ prompt, chatId });
        } catch (err) {
            showError(`Failed to create discussion chat: ${err}`);
        }
    };

    const handleTestCompletion = async (finding: GuidedBuildFinding) => {
        if (!selectedAppId) return;
        try {
            // 1. Lock
            await IpcClient.getInstance().updateGuidedBuildFinding(selectedAppId, finding.title, { ...finding, isInProgress: true });
            await refetch();

            const chatId = await IpcClient.getInstance().createChat(selectedAppId);

            // 2. Set verification title prefix
            await IpcClient.getInstance().updateChat({
                chatId,
                title: `${GUIDED_VERIFICATION_TITLE_PREFIX}${finding.title}`
            });

            setSelectedChatId(chatId);
            await navigate({ to: "/chat", search: { id: chatId } });

            const prompt = `I have completed building the following feature:
                            **${finding.title}**

                            Please review the codebase and test it to verify that this gap is fully resolved based on our Design Semantics.`;

            await streamMessage({
                prompt,
                chatId,
                // onSettled: async () => {
                //     // Flip the isVerified flag to true in the DB
                //     await IpcClient.getInstance().updateGuidedBuildFinding(
                //         selectedAppId,
                //         finding.title,
                //         { ...finding, isVerified: true, isInProgress: false }
                //     );
                //     refetch();
                // },
            });
        } catch (err) {
            showError(`Failed to create test chat: ${err}`);
            await IpcClient.getInstance().updateGuidedBuildFinding(selectedAppId, finding.title, { ...finding, isInProgress: false });
            refetch();
        }
    };

    // Load DESIGN_SEMANTIC.md instead of SECURITY_RULES.md
    const {
        content: fetchedDesign,
        loading: isFetchingDesign,
        refreshFile: refetchDesign,
    } = useLoadAppFile(
        isEditDesignOpen && selectedAppId ? selectedAppId : null,
        isEditDesignOpen ? "DESIGN_SEMANTIC.md" : null,
    );

    useEffect(() => {
        if (fetchedDesign !== null) {
            setDesignContent(fetchedDesign);
        }
    }, [fetchedDesign]);

    // Clear selections when data changes
    useEffect(() => {
        setCompletedFindings(new Set());
    }, [data]);

    const handleSaveDesign = async () => {
        if (!selectedAppId) {
            showError("No app selected");
            return;
        }

        try {
            setIsSaving(true);
            const ipcClient = IpcClient.getInstance();
            const { warning } = await ipcClient.editAppFile(
                selectedAppId,
                "DESIGN_SEMANTIC.md",
                designContent,
            );
            await queryClient.invalidateQueries({
                queryKey: ["versions", selectedAppId],
            });
            if (warning) {
                showWarning(warning);
            } else {
                showSuccess("Design Semantics saved");
            }
            setIsEditDesignOpen(false);
            refetchDesign();
        } catch (err: any) {
            showError(`Failed to save design semantics: ${err.message || err}`);
        } finally {
            setIsSaving(false);
        }
    };

    const openFindingDetails = (finding: GuidedBuildFinding) => {
        setDetailsFinding(finding);
        setDetailsOpen(true);
    };

    const handleRunGuidedBuild = async () => {
        if (!selectedAppId) {
            showError("No app selected");
            return;
        }

        try {
            setIsRunningReview(true);

            // Create a new chat
            const chatId = await IpcClient.getInstance().createChat(selectedAppId);
            // Rename the new chat to 
            await IpcClient.getInstance().updateChat({
                chatId: chatId,
                title: `${GUIDED_BUILD_TITLE_PREFIX}`,
            });
            // Navigate to the new chat
            setSelectedChatId(chatId);
            await navigate({ to: "/chat", search: { id: chatId } });

            // Stream the guided-build prompt (maps to CONTINUE_USING_DESIGN_SEMANTIC in backend)
            await streamMessage({
                prompt: "/guided-build",
                chatId,
                onSettled: () => {
                    refetch(); // Refetch findings
                    setIsRunningReview(false);
                    setCompletedFindings(new Set());
                },
            });
        } catch (err) {
            showError(`Failed to run guided build analysis: ${err}`);
            setIsRunningReview(false);
        }
    };

    const handleBuildFeature = async (finding: GuidedBuildFinding) => {
        if (!selectedAppId) {
            showError("No app selected");
            return;
        }

        try {
            // 1. Lock the finding in the database
            await IpcClient.getInstance().updateGuidedBuildFinding(selectedAppId, finding.title, { ...finding, isInProgress: true });
            await refetch();

            const chatId = await IpcClient.getInstance().createChat(selectedAppId);

            // 2. Set the strict title prefix so the Chat UI knows what mode it is in
            await IpcClient.getInstance().updateChat({
                chatId,
                title: `${GUIDED_BUILD_TASK_TITLE_PREFIX}${finding.title}`
            });

            // Navigate to the new chat
            setSelectedChatId(chatId);
            await navigate({ to: "/chat", search: { id: chatId } });

            // Extract the tasks from the description (assuming the backend puts <dyad-tasks> inside description)
            // or construct a generic prompt if not explicit.
            const prompt = `I am ready to implement this feature gap identified in the Guided Build analysis:

                            **${finding.title}** (${finding.level})

                            ${finding.description}

                            Please implement the tasks defined above.`;

            await streamMessage({
                prompt,
                chatId,
                // onSettled: async () => {
                //     // Mark this specific finding as completed
                //     // setCompletedFindings((prev) => {
                //     //     const newSet = new Set(prev);
                //     //     newSet.add(key);
                //     //     return newSet;
                //     // });
                //     // Flip the isBuilt flag to true in the DB
                //     await IpcClient.getInstance().updateGuidedBuildFinding(
                //         selectedAppId,
                //         finding.title,
                //         { ...finding, isBuilt: true, isInProgress: false }
                //     );
                //     refetch(); // Pull the fresh DB state so the UI swaps the buttons
                // },
            });
        } catch (err) {
            showError(`Failed to create build chat: ${err}`);
            // Fallback unlock if it crashes before stream starts
            await IpcClient.getInstance().updateGuidedBuildFinding(selectedAppId, finding.title, { ...finding, isInProgress: false });
            refetch();
        }
    };

    if (isLoading) {
        return <LoadingView />;
    }

    if (!selectedAppId) {
        return <NoAppSelectedView />;
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <div className="p-4 pt-0 space-y-4">
                <GuidedBuildHeader
                    isRunning={isRunningReview}
                    onRun={handleRunGuidedBuild}
                    data={data}
                    hasFindings={activeFindings.length > 0}
                    onOpenEditDesign={() => {
                        setIsEditDesignOpen(true);
                        if (selectedAppId) {
                            refetchDesign();
                        }
                    }}
                />

                {isRunningReview ? (
                    <RunningAnalysisCard />
                ) : error ? (
                    <NoReviewCard
                        isRunning={isRunningReview}
                        onRun={handleRunGuidedBuild}
                    />
                ) : data && data.findings.length > 0 ? (
                    <FindingsTable
                        findings={activeFindings}
                        onEditManually={handleEditManually}
                        onDiscussPrompt={handleDiscussPrompt}
                        onTestCompletion={handleTestCompletion}
                        onFix={handleBuildFeature}
                        fixingFindingKey={fixingFindingKey}
                    />
                ) : (
                    <AllClearCard data={data} />
                )}
                <EditFindingDialog
                    open={editModalOpen}
                    finding={editingFinding}
                    onClose={setEditModalOpen}
                    onSave={handleSaveFindingEdit}
                />
                <Dialog open={isEditDesignOpen} onOpenChange={setIsEditDesignOpen}>
                    <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Edit Design Semantics</DialogTitle>
                        </DialogHeader>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            This defines the core requirements and invariants for your application.
                            Changes here will affect future Guided Build analyses. Saved to{" "}
                            <code className="text-xs">DESIGN_SEMANTIC.md</code>.
                        </div>
                        <div className="mt-3">
                            <textarea
                                className="w-full h-72 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                value={designContent}
                                onChange={(e) => setDesignContent(e.target.value)}
                                placeholder="# DESIGN_SEMANTIC.md\n\n**Product Summary**\n..."
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                onClick={handleSaveDesign}
                                disabled={isSaving || isFetchingDesign}
                            >
                                {isSaving ? "Saving..." : "Save"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};