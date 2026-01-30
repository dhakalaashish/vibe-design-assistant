import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useAutoBuild(appId: number | null) {
  return useQuery({
    queryKey: ["auto-build", appId], // Unique key for caching
    queryFn: async () => {
      if (!appId) {
        throw new Error("App ID is required");
      }
      const ipcClient = IpcClient.getInstance();
      // Assuming you will implement this method in IpcClient
      // It should return the gap analysis findings
      return ipcClient.getLatestAutoBuild(appId);
    },
    enabled: appId !== null,
    retry: false,
    meta: {
      showErrorToast: false, // Don't show error toast if no analysis found
    },
  });
}