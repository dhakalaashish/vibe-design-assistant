import { useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { selectedChatIdAtom, chatNavigationStackAtom } from "@/atoms/chatAtoms";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useStreamChat } from "@/hooks/useStreamChat";
import { IpcClient } from "@/ipc/ipc_client";
import { showError } from "@/lib/toast";
import { designCreationModeAtom } from "@/atoms/designAtoms";
import { v4 as uuidv4 } from "uuid";

export const DESIGN_BUILD_GREETING = "Let's build your app's Design Semantic File together. I will act as your UX Lead and interview you about your app's core purpose, user flows, and critical design rules. \n\nOnce we have a solid blueprint, I will generate the file for you. If the design matches your vision, click the **'Done'** button below to lock it in.\n\n**To get started: In one sentence, what is the single most important thing a user must be able to do in your app?**";
export const PROMPT_IMPROVEMENT_GREETING = "I will help you refine your requirements to ensure the best possible UX/UI outcome. We will iterate on your prompt together to catch edge cases and design flaws.\n\nWhen you are satisfied with the refined prompt, click **'Done'** to finalize it.\n\n**I see you have an idea. Let's analyze it.**";

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
      const uuid = uuidv4();
      await IpcClient.getInstance().updateChat({
        chatId: newChatId,
        title: `${PROMPT_IMPROVEMENT_TITLE_PREFIX} ${uuid}`,
      });
      // 3. Insert the Assistant's greeting directly into the DB
      // This ensures it appears "on top" as the first message
      await IpcClient.getInstance().insertMessage({
        chatId: newChatId,
        role: "assistant",
        content: PROMPT_IMPROVEMENT_GREETING  ,
      });
      // navigate to the new chat
      await navigate({ to: "/chat", search: { id: newChatId } });
      // await streamMessage({
      //   prompt: "Let's build your app's Design Semantic File together. I will act as your UX Lead and interview you about your app's core purpose, user flows, and critical design rules. \n \n Once we have a solid blueprint, I will generate the file for you. If the design matches your vision, click the 'Done' button below to lock it in \n \n To get started: In one sentence, what is the single most important thing a user must be able to do in your app?",
      //   chatId: newChatId,
      // });
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
      await new Promise((resolve) => setTimeout(resolve, 3000));
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

  const handlePromptImprovement = async () => {
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
      const uuid = uuidv4();
      await IpcClient.getInstance().updateChat({
        chatId: newChatId,
        title: `${DESIGN_BUILD_TITLE_PREFIX} ${uuid}`,
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
      // await streamMessage({
      //   prompt: "Let's build your app's Design Semantic File together. I will act as your UX Lead and interview you about your app's core purpose, user flows, and critical design rules. \n \n Once we have a solid blueprint, I will generate the file for you. If the design matches your vision, click the 'Done' button below to lock it in \n \n To get started: In one sentence, what is the single most important thing a user must be able to do in your app?",
      //   chatId: newChatId,
      // });
    } catch (err) {
      showError(err);
    }
    setDesignMode(null);
  };

  return { handlePromptImprovement };
}

