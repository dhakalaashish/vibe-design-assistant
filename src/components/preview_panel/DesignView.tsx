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
            <div className="flex w-full pt-2 px-2 gap-1 border-b border-border bg-muted/20 shadow-inner">
                <button
                    onClick={() => setPreviewMode("design")}
                    className={`flex-1 py-3 text-sm font-semibold rounded-t-xl transition-all duration-200 border relative cursor-pointer ${
                        activeTab === "design"
                            ? "bg-background text-primary border-border border-b-transparent shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)] z-10 -mb-px"
                            : "bg-black/5 dark:bg-white/5 text-muted-foreground border-transparent border-b-border hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground"
                    }`}
                >
                    DESIGN SEMANTICS
                </button>
                <button
                    onClick={() => setPreviewMode("heuristics")}
                    className={`flex-1 py-3 text-sm font-semibold rounded-t-xl transition-all duration-200 border relative cursor-pointer ${
                        activeTab === "heuristics"
                            ? "bg-background text-primary border-border border-b-transparent shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)] z-10 -mb-px"
                            : "bg-black/5 dark:bg-white/5 text-muted-foreground border-transparent border-b-border hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground"
                    }`}
                >
                    DESIGN HEURISTICS
                </button>
                <button
                    onClick={() => setPreviewMode("guided-build")}
                    className={`flex-1 py-3 text-sm font-semibold rounded-t-xl transition-all duration-200 border relative cursor-pointer ${
                        activeTab === "guided-build"
                            ? "bg-background text-primary border-border border-b-transparent shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)] z-10 -mb-px"
                            : "bg-black/5 dark:bg-white/5 text-muted-foreground border-transparent border-b-border hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground"
                    }`}
                >
                    GUIDED BUILD
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
