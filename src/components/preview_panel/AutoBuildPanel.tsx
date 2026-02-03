import { useAtomValue, useSetAtom } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
// You might need to create a useAutoBuild hook similar to useSecurityReview,
// or reuse useSecurityReview if the backend returns the same structure but with different data.
// For now, I'll assume we adapt useSecurityReview or you rename it later.
import { useAutoBuild } from "@/hooks/useAutoBuild";
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
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useStreamChat } from "@/hooks/useStreamChat";
import { showError, showSuccess, showWarning } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { SecurityFinding, SecurityReviewResult } from "@/ipc/ipc_types"; // You'll likely define AutoBuildFinding types later
import { useState, useEffect } from "react";
import { VanillaMarkdownParser } from "@/components/chat/DyadMarkdownParser";
import { useLoadAppFile } from "@/hooks/useLoadAppFile";
import { useQueryClient } from "@tanstack/react-query";

// --- ADAPTED TYPES & HELPERS FOR AUTO BUILD ---
export const AUTO_BUILD_TITLE_PREFIX = "# Auto Build"

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

// Reusing the SecurityFinding type structure for now, assuming 
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

const getStatusOrder = (status: string): number => {
    switch (status.toLowerCase()) {
        case "violation":
            return 0;
        case "missing":
            return 1;
        case "partial":
            return 2;
        default:
            return 3;
    }
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

function RunAutoBuildButton({
    isRunning,
    onRun,
}: {
    isRunning: boolean;
    onRun: () => void;
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
                    Run Auto Build Analysis
                </>
            )}
        </Button>
    );
}

function ReviewSummary({ data }: { data: SecurityReviewResult }) {
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

function AutoBuildHeader({
    isRunning,
    onRun,
    data,
    onOpenEditDesign,
    selectedCount,
    onFixSelected,
    isFixingSelected,
}: {
    isRunning: boolean;
    onRun: () => void;
    data?: SecurityReviewResult | undefined;
    onOpenEditDesign: () => void;
    selectedCount: number;
    onFixSelected: () => void;
    isFixingSelected: boolean;
}) {
    const [isButtonVisible, setIsButtonVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (selectedCount > 0) {
            setShouldRender(true);
            setTimeout(() => setIsButtonVisible(true), 10);
        } else {
            setIsButtonVisible(false);
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [selectedCount]);

    return (
        <div className="sticky top-0 z-10 bg-background pt-3 pb-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                        <Hammer className="w-5 h-5" />
                        Auto Build
                        <Badge variant="secondary" className="uppercase tracking-wide">
                            beta
                        </Badge>
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
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={onFixSelected}
                            className="gap-2 transition-all duration-300"
                            disabled={isFixingSelected}
                            style={{
                                visibility: shouldRender ? "visible" : "hidden",
                                opacity: isButtonVisible ? 1 : 0,
                                transform: isButtonVisible
                                    ? "translateY(0)"
                                    : "translateY(-8px)",
                                pointerEvents: shouldRender ? "auto" : "none",
                            }}
                        >
                            {isFixingSelected ? (
                                <>
                                    <svg
                                        className="w-4 h-4 animate-spin"
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
                                    Building {selectedCount} Task{selectedCount !== 1 ? "s" : ""}...
                                </>
                            ) : (
                                <>
                                    <Wrench className="w-4 h-4" />
                                    Build {selectedCount} Task{selectedCount !== 1 ? "s" : ""}
                                </>
                            )}
                        </Button>
                        <RunAutoBuildButton isRunning={isRunning} onRun={onRun} />
                    </div>
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
                Select an app to run Auto Build analysis.
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
                        Run Auto Build to find missing features and deviations from your design specs.
                    </p>
                    <RunAutoBuildButton isRunning={isRunning} onRun={onRun} />
                </div>
            </CardContent>
        </Card>
    );
}

function AllClearCard({ data }: { data?: SecurityReviewResult }) {
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
    onOpenDetails,
    onFix,
    fixingFindingKey,
    selectedFindings,
    onToggleSelection,
    onToggleSelectAll,
}: {
    findings: SecurityFinding[];
    onOpenDetails: (finding: SecurityFinding) => void;
    onFix: (finding: SecurityFinding) => void;
    fixingFindingKey?: string | null;
    selectedFindings: Set<string>;
    onToggleSelection: (findingKey: string) => void;
    onToggleSelectAll: () => void;
}) {
    const sortedFindings = [...findings].sort(
        (a, b) => getStatusOrder(a.level) - getStatusOrder(b.level),
    );

    const allSelected =
        sortedFindings.length > 0 &&
        sortedFindings.every((finding) =>
            selectedFindings.has(createFindingKey(finding)),
        );

    return (
        <div
            className="border rounded-lg overflow-hidden"
            data-testid="autobuild-findings-table"
        >
            <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-12">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={onToggleSelectAll}
                                aria-label="Select all issues"
                            />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">
                            Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Gap Detected
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-32">
                            Action
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedFindings.map((finding, index) => {
                        const isLongDescription =
                            finding.description.length > DESCRIPTION_PREVIEW_LENGTH;
                        const displayDescription = isLongDescription
                            ? finding.description.substring(0, DESCRIPTION_PREVIEW_LENGTH) +
                            "..."
                            : finding.description;
                        const findingKey = createFindingKey(finding);
                        const isFixing = fixingFindingKey === findingKey;
                        const isSelected = selectedFindings.has(findingKey);

                        return (
                            <tr
                                key={index}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                            >
                                <td className="px-4 py-4 align-top">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => onToggleSelection(findingKey)}
                                        aria-label={`Select ${finding.title}`}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </td>
                                <td className="px-4 py-4 align-top">
                                    <StatusBadge status={finding.level} />
                                </td>
                                <td className="px-4 py-4">
                                    <div
                                        className="space-y-2 cursor-pointer"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onOpenDetails(finding)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                onOpenDetails(finding);
                                            }
                                        }}
                                    >
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            {finding.title}
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
                                            <VanillaMarkdownParser content={displayDescription} />
                                        </div>
                                        {isLongDescription && (
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenDetails(finding);
                                                }}
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 py-0 gap-1"
                                            >
                                                <ChevronDown className="w-3 h-3" />
                                                Show more
                                            </Button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 align-top text-right">
                                    <Button
                                        onClick={() => onFix(finding)}
                                        size="sm"
                                        variant="default"
                                        className="gap-2"
                                        disabled={isFixing}
                                    >
                                        {isFixing ? (
                                            <>
                                                <svg
                                                    className="w-4 h-4 animate-spin"
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
                                                Building...
                                            </>
                                        ) : (
                                            <>Build This</>
                                        )}
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function FindingDetailsDialog({
    open,
    finding,
    onClose,
    onFix,
    fixingFindingKey,
}: {
    open: boolean;
    finding: SecurityFinding | null;
    onClose: (open: boolean) => void;
    onFix: (finding: SecurityFinding) => void;
    fixingFindingKey?: string | null;
}) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[80vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between gap-3 pr-4">
                        <span className="truncate">{finding?.title}</span>
                        {finding && <StatusBadge status={finding.level} />}
                    </DialogTitle>
                </DialogHeader>
                <div className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none break-words max-h-[60vh] overflow-auto">
                    {finding && <VanillaMarkdownParser content={finding.description} />}
                </div>
                <DialogFooter>
                    <Button
                        onClick={() => {
                            if (finding) {
                                onFix(finding);
                                onClose(false);
                            }
                        }}
                        disabled={
                            finding ? fixingFindingKey === createFindingKey(finding) : false
                        }
                    >
                        {finding && fixingFindingKey === createFindingKey(finding) ? (
                            <>
                                <svg
                                    className="w-4 h-4 animate-spin mr-2"
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
                                Building Feature...
                            </>
                        ) : (
                            <>Build This</>
                        )}
                    </Button>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export const AutoBuildPanel = () => {
    const selectedAppId = useAtomValue(selectedAppIdAtom);
    const setSelectedChatId = useSetAtom(selectedChatIdAtom);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { streamMessage } = useStreamChat({ hasChatId: false });
    // Using useSecurityReview hook but interpreting the data as AutoBuild data
    const { data, isLoading, error, refetch } = useAutoBuild(selectedAppId);
    const [isRunningReview, setIsRunningReview] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsFinding, setDetailsFinding] = useState<SecurityFinding | null>(
        null,
    );
    const [isEditDesignOpen, setIsEditDesignOpen] = useState(false);
    const [designContent, setDesignContent] = useState("");
    const [fixingFindingKey, setFixingFindingKey] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedFindings, setSelectedFindings] = useState<Set<string>>(
        new Set(),
    );
    const [isFixingSelected, setIsFixingSelected] = useState(false);

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
        setSelectedFindings(new Set());
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

    const openFindingDetails = (finding: SecurityFinding) => {
        setDetailsFinding(finding);
        setDetailsOpen(true);
    };

    const handleRunAutoBuild = async () => {
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
                title: `${AUTO_BUILD_TITLE_PREFIX}`,
            });
            // Navigate to the new chat
            setSelectedChatId(chatId);
            await navigate({ to: "/chat", search: { id: chatId } });

            // Stream the auto-build prompt (maps to CONTINUE_USING_DESIGN_SEMANTIC in backend)
            await streamMessage({
                prompt: "/auto-build",
                chatId,
                onSettled: () => {
                    refetch(); // Refetch findings
                    setIsRunningReview(false);
                },
            });
        } catch (err) {
            showError(`Failed to run auto build analysis: ${err}`);
            setIsRunningReview(false);
        }
    };

    const handleBuildFeature = async (finding: SecurityFinding) => {
        if (!selectedAppId) {
            showError("No app selected");
            return;
        }

        try {
            const key = createFindingKey(finding);
            setFixingFindingKey(key);

            const chatId = await IpcClient.getInstance().createChat(selectedAppId);

            // Navigate to the new chat
            setSelectedChatId(chatId);
            await navigate({ to: "/chat", search: { id: chatId } });

            // Extract the tasks from the description (assuming the backend puts <dyad-tasks> inside description)
            // or construct a generic prompt if not explicit.
            const prompt = `I am ready to implement this feature gap identified in the Auto Build analysis:

**${finding.title}** (${finding.level})

${finding.description}

Please implement the tasks defined above.`;

            await streamMessage({
                prompt,
                chatId,
                onSettled: () => {
                    setFixingFindingKey(null);
                },
            });
        } catch (err) {
            showError(`Failed to create build chat: ${err}`);
            setFixingFindingKey(null);
        }
    };

    const handleToggleSelection = (findingKey: string) => {
        setSelectedFindings((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(findingKey)) {
                newSet.delete(findingKey);
            } else {
                newSet.add(findingKey);
            }
            return newSet;
        });
    };

    const handleToggleSelectAll = () => {
        if (!data?.findings) return;

        const sortedFindings = [...data.findings].sort(
            (a, b) => getStatusOrder(a.level) - getStatusOrder(b.level),
        );

        const allKeys = sortedFindings.map((finding) => createFindingKey(finding));
        const allSelected = allKeys.every((key) => selectedFindings.has(key));

        if (allSelected) {
            setSelectedFindings(new Set());
        } else {
            setSelectedFindings(new Set(allKeys));
        }
    };

    const handleBuildSelected = async () => {
        if (!selectedAppId || selectedFindings.size === 0 || !data?.findings) {
            showError("No tasks selected");
            return;
        }

        try {
            setIsFixingSelected(true);

            const findingsToBuild = data.findings.filter((finding) =>
                selectedFindings.has(createFindingKey(finding)),
            );

            const chatId = await IpcClient.getInstance().createChat(selectedAppId);

            setSelectedChatId(chatId);
            await navigate({ to: "/chat", search: { id: chatId } });

            const issuesList = findingsToBuild
                .map(
                    (finding, index) =>
                        `${index + 1}. **${finding.title}** (${finding.level})\n${finding.description}`,
                )
                .join("\n\n");

            const prompt = `Please implement the following ${findingsToBuild.length} feature gap${findingsToBuild.length !== 1 ? "s" : ""} identified in the Auto Build analysis:

${issuesList}`;

            await streamMessage({
                prompt,
                chatId,
                onSettled: () => {
                    setIsFixingSelected(false);
                    setSelectedFindings(new Set());
                },
            });
        } catch (err) {
            showError(`Failed to create build chat: ${err}`);
            setIsFixingSelected(false);
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
                <AutoBuildHeader
                    isRunning={isRunningReview}
                    onRun={handleRunAutoBuild}
                    data={data}
                    onOpenEditDesign={() => {
                        setIsEditDesignOpen(true);
                        if (selectedAppId) {
                            refetchDesign();
                        }
                    }}
                    selectedCount={selectedFindings.size}
                    onFixSelected={handleBuildSelected}
                    isFixingSelected={isFixingSelected}
                />

                {isRunningReview ? (
                    <RunningAnalysisCard />
                ) : error ? (
                    <NoReviewCard
                        isRunning={isRunningReview}
                        onRun={handleRunAutoBuild}
                    />
                ) : data && data.findings.length > 0 ? (
                    <FindingsTable
                        findings={data.findings}
                        onOpenDetails={openFindingDetails}
                        onFix={handleBuildFeature}
                        fixingFindingKey={fixingFindingKey}
                        selectedFindings={selectedFindings}
                        onToggleSelection={handleToggleSelection}
                        onToggleSelectAll={handleToggleSelectAll}
                    />
                ) : (
                    <AllClearCard data={data} />
                )}
                <FindingDetailsDialog
                    open={detailsOpen}
                    finding={detailsFinding}
                    onClose={setDetailsOpen}
                    onFix={handleBuildFeature}
                    fixingFindingKey={fixingFindingKey}
                />
                <Dialog open={isEditDesignOpen} onOpenChange={setIsEditDesignOpen}>
                    <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Edit Design Semantics</DialogTitle>
                        </DialogHeader>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            This defines the core requirements and invariants for your application.
                            Changes here will affect future Auto Build analyses. Saved to{" "}
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