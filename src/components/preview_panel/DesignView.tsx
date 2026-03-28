import { useAtom } from "jotai";
import { GuidedBuildTab } from "./GuidedBuildTab";
import { previewModeAtom } from "@/atoms/appAtoms";
import { DesignSemanticsTab } from "./DesignSemanticTab";
import { DesignHeuristicsTab } from "./DesignHeuristicsTab";

interface App {
    id?: number;
    files?: string[];
}

export interface DesignViewProps {
    loading: boolean;
    app: App | null;
}

export const DesignView = ({ loading, app }: DesignViewProps) => {
    const [previewMode, setPreviewMode] = useAtom(previewModeAtom);

    // Default to 'design' if somehow an invalid mode slips through
    const activeTab = ["design", "guided-build", "heuristics"].includes(previewMode) 
        ? previewMode 
        : "design";

    return (
        <div className="flex flex-col h-full bg-[var(--background)]">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-[var(--background-lightest)]">
                <button
                    onClick={() => setPreviewMode("design")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        activeTab === "design"
                            ? "bg-[var(--background)] shadow-sm text-foreground border border-border"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                    }`}
                >
                    Design Semantics
                </button>
                <button
                    onClick={() => setPreviewMode("heuristics")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        activeTab === "heuristics"
                            ? "bg-[var(--background)] shadow-sm text-foreground border border-border"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                    }`}
                >
                    Design Heuristics
                </button>
                <button
                    onClick={() => setPreviewMode("guided-build")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        activeTab === "guided-build"
                            ? "bg-[var(--background)] shadow-sm text-foreground border border-border"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                    }`}
                >
                    Guided Build
                </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === "design" && <DesignSemanticsTab loading={loading} app={app} />}
                
                {activeTab === "heuristics" && <DesignHeuristicsTab app={app} />}
                
                {activeTab === "guided-build" && <GuidedBuildTab />}
            </div>
        </div>
    );
};
