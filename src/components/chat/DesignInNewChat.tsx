import { useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { selectedChatIdAtom, chatNavigationStackAtom } from "@/atoms/chatAtoms";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useStreamChat } from "@/hooks/useStreamChat";
import { IpcClient } from "@/ipc/ipc_client";
import { showError } from "@/lib/toast";
import { designCreationModeAtom } from "@/atoms/designAtoms";

export const DESIGN_BUILD_GREETING = "Let's build your app's Design Semantic File together. I will act as your UX Lead and interview you about your app's core purpose, user flows, and critical design rules. \n\nOnce we have a solid blueprint, I will generate the file for you. If the design matches your vision, click the **'Done'** button below to lock it in.\n\n**To get started:** What is your app about?";
export const PROMPT_IMPROVEMENT_GREETING = "I will help you refine your requirements to ensure the best possible UX/UI outcome. We will iterate on your prompt together to catch edge cases and design flaws.\n\nWhen you are satisfied with the refined prompt, click **'Done'** to finalize it.\n\n**I see you have an idea. Let's analyze it.**";
export const INFER_DESIGN_SEMANTIC_USER_MESSAGE = "Given the codebase, and any of the old messages, build the DESIGN_SEMANTIC.md file."

export const DESIGN_BUILD_TITLE_PREFIX = "# Design Semantic Build Together"
export const PROMPT_IMPROVEMENT_TITLE_PREFIX = "# Prompt Improvement For UX"

export function useDesignSemanticInNewChat() {
  const chatId = useAtomValue(selectedChatIdAtom);
  const appId = useAtomValue(selectedAppIdAtom);
  const { streamMessage } = useStreamChat();
  const setDesignMode = useSetAtom(designCreationModeAtom);

  const setNavigationStack = useSetAtom(chatNavigationStackAtom);

  const navigate = useNavigate();

  const handleDesignSemanticBuild = async () => {
    if (!appId) {
      console.error("No app id found");
      return;
    }
    if (!chatId) {
      console.error("No chat id found");
      return;
    }
    try {
      // PUSH TO STACK: Save the current chat ID to history
      setNavigationStack((prev) => [...prev, chatId]);
      // create a new chat
      const newChatId = await IpcClient.getInstance().createChat(appId);
      // Rename the chat immediately
      await IpcClient.getInstance().updateChat({
        chatId: newChatId,
        title: `${DESIGN_BUILD_TITLE_PREFIX}`,
      });
      // 3. Insert the Assistant's greeting directly into the DB
      // This ensures it appears "on top" as the first message
      await IpcClient.getInstance().insertMessage({
        chatId: newChatId,
        role: "assistant",
        content: DESIGN_BUILD_GREETING,
      });
      // navigate to the new chat
      await navigate({ to: "/chat", search: { id: newChatId } });

    } catch (err) {
      showError(err);
    }
    setDesignMode(null);
  };

  const handleDesignSemanticInfer = async () => {
    if (!appId) {
      console.error("No app id found");
      return;
    }
    if (!chatId) {
      console.error("No chat id found");
      return;
    }
    try {
      // TODO
      setTimeout(() => {
        streamMessage({
          prompt: INFER_DESIGN_SEMANTIC_USER_MESSAGE, // Run the improved prompt!
          chatId: chatId,
          redo: false,
        });
      }, 200);
    } catch (err) {
      showError(err);
    }
    setDesignMode(null);
  };

  return { handleDesignSemanticBuild, handleDesignSemanticInfer };
}

export function improvePromptInNewChat() {
  const chatId = useAtomValue(selectedChatIdAtom);
  const appId = useAtomValue(selectedAppIdAtom);
  const { streamMessage } = useStreamChat();
  const setDesignMode = useSetAtom(designCreationModeAtom);

  const setNavigationStack = useSetAtom(chatNavigationStackAtom);

  const navigate = useNavigate();

  const handlePromptImprovement = async (initialPrompt?: string) => {
    if (!appId) {
      console.error("No app id found");
      return;
    }
    if (!chatId) {
      console.error("No chat id found");
      return;
    }
    try {
      // PUSH TO STACK: Save the current chat ID to history
      setNavigationStack((prev) => [...prev, chatId]);
      // create a new chat
      const newChatId = await IpcClient.getInstance().createChat(appId);
      // Rename the chat immediately
      await IpcClient.getInstance().updateChat({
        chatId: newChatId,
        title: `${PROMPT_IMPROVEMENT_TITLE_PREFIX}`,
      });
      // 3. Insert the Assistant's greeting directly into the DB
      await IpcClient.getInstance().insertMessage({
        chatId: newChatId,
        role: "assistant",
        content: PROMPT_IMPROVEMENT_GREETING,
      });

      // navigate to the new chat
      await navigate({ to: "/chat", search: { id: newChatId } });

      // If there was a prompt, stream it immediately in the new chat
      if (initialPrompt && initialPrompt.trim()) {
        streamMessage({
          prompt: initialPrompt,
          chatId: newChatId,
          redo: false
        });
      }

    } catch (err) {
      showError(err);
    }
    setDesignMode(null);
  };

  return { handlePromptImprovement };
}