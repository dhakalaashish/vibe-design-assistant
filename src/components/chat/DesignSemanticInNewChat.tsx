import { useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useStreamChat } from "@/hooks/useStreamChat";
import { IpcClient } from "@/ipc/ipc_client";
import { showError } from "@/lib/toast";
import { designCreationModeAtom } from "@/atoms/designAtoms";

export function useDesignSemanticInNewChat() {
  const chatId = useAtomValue(selectedChatIdAtom);
  const appId = useAtomValue(selectedAppIdAtom);
  const { streamMessage } = useStreamChat();
  const setDesignMode = useSetAtom(designCreationModeAtom);
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
      const newChatId = await IpcClient.getInstance().createChat(appId);
      // navigate to new chat
      await navigate({ to: "/chat", search: { id: newChatId } });
    //   await streamMessage({
    //     prompt: "Summarize from chat-id=" + chatId,
    //     chatId: newChatId,
    //   });
    } catch (err) {
      showError(err);
    }
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
      // const newChatId = await IpcClient.getInstance().createChat(appId);
      // navigate to new chat
      // await navigate({ to: "/chat", search: { id: newChatId } });
    //   await streamMessage({
    //     prompt: "Summarize from chat-id=" + chatId,
    //     chatId: newChatId,
    //   });
    // TODO: wait for 3 seconds
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (err) {
      showError(err);
    }
    setDesignMode(null);
  };

  return { handleDesignSemanticBuild, handleDesignSemanticInfer };
}
