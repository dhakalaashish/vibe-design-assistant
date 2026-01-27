import { DesignFileEditor } from "./DesignFileEditor";
import { FileTree } from "./FileTree";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useLoadApp } from "@/hooks/useLoadApp";
import { useAtomValue, useAtom, useSetAtom } from "jotai";
import { selectedFileAtom } from "@/atoms/viewAtoms";
import { useDesignSemanticInNewChat } from "../chat/DesignSemanticInNewChat";
import { designCreationModeAtom } from "@/atoms/designAtoms";


interface App {
    id?: number;
    files?: string[];
}

export interface DesignViewProps {
    loading: boolean;
    app: App | null;
}

// Code view component that displays app files or status messages
export const DesignView = ({ loading, app }: DesignViewProps) => {
    const [designMode] = useAtom(designCreationModeAtom);
    const selectedFile = useAtomValue(selectedFileAtom);
    const { refreshApp } = useLoadApp(app?.id ?? null);

    const DESIGN_FILE = "DESIGN_SEMANTIC.md";

    const designFilePath = app?.files?.find(
        (file) => file === DESIGN_FILE
    );

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
            <div className="flex items-center p-2 border-b space-x-2">
                <button
                    onClick={() => refreshApp()}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                    disabled={loading || !app?.id}
                    title="Refresh Design File"
                >
                    <RefreshCw size={16} />
                </button>
                <div className="text-sm text-gray-500">
                    DESIGN_SEMANTIC.md
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
                <DesignFileEditor
                    appId={app?.id ?? null}
                    filePath={designFilePath}
                />
            </div>
        </div>
    );


};
