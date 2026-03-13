import { ipcMain } from "electron";
import { db } from "../../db";
import { chats, messages } from "../../db/schema";
import { eq, and, like, desc } from "drizzle-orm";
import type { GuidedBuildReviewResult, GuidedBuildFinding } from "../ipc_types";
import { activeStreams } from "@/ipc/handlers/chat_stream_handlers";

export function registerGuidedBuildHandlers() {
  ipcMain.handle("get-latest-guided-build", async (event, appId: number) => {
    if (!appId) {
      throw new Error("App ID is required");
    }

    // Query for the most recent message with Guided Build / Gap Analysis findings
    // We look for the <dyad-gap-analysis> tag
    const result = await db
      .select({
        id: messages.id,
        content: messages.content,
        createdAt: messages.createdAt,
        chatId: messages.chatId,
      })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(
        and(
          eq(chats.appId, appId),
          eq(messages.role, "assistant"),
          like(messages.content, "%<dyad-gap-analysis%"),
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(1);

    if (result.length === 0) {
      throw new Error("No guided build analysis found for this app");
    }

    let messageContent = result[0].content;
    let contentChanged = false;

    // 1. INJECTION LOGIC: If the message doesn't have tracking tags, inject them and save.
    if (!messageContent.includes("<dyad-check-build>")) {
      messageContent = messageContent.replace(
        /<\/dyad-gap-analysis>/g,
        "<dyad-check-build>false</dyad-check-build>\n<dyad-check-completion>false</dyad-check-completion>\n<dyad-guided-build-in-progress>false</dyad-guided-build-in-progress>\n</dyad-gap-analysis>"
      );
      contentChanged = true;
    }

    // 2. SELF-HEALING LOGIC: Ghost Lock Cleanup
    // If no AI streams are running, but the DB says something is in progress, it's a crash leftover.
    if (
      activeStreams.size === 0 && 
      messageContent.includes("<dyad-guided-build-in-progress>true</dyad-guided-build-in-progress>")
    ) {
      messageContent = messageContent.replace(
        /<dyad-guided-build-in-progress>true<\/dyad-guided-build-in-progress>/g,
        "<dyad-guided-build-in-progress>false</dyad-guided-build-in-progress>"
      );
      contentChanged = true;
      console.log(`[Guided Build] Cleaned up stale locks for App ID: ${appId}`);
    }

    // 3. Save back to DB only if we injected or healed something
    if (contentChanged){
      // Persist the injected tags back to the database
      await db
        .update(messages)
        .set({ content: messageContent })
        .where(eq(messages.id, result[0].id));
    }

    // Now parse the (potentially newly injected) content
    const findings = parseGapAnalysisFindings(messageContent);

    if (findings.length === 0) {
      throw new Error("No findings parsed from the latest analysis");
    }

    // Reuse GuidedBuildReviewResult type as the structure is compatible
    return {
      findings,
      timestamp: result[0].createdAt.toISOString(),
      chatId: result[0].chatId,
    } satisfies GuidedBuildReviewResult;
  });

  ipcMain.handle(
    "update-guided-build-finding",
    async (event, appId: number, originalTitle: string, updatedFinding: GuidedBuildFinding) => {
      if (!appId) throw new Error("App ID is required");

      // 1. Fetch the exact message that contains the current gap analysis
      const result = await db
        .select({
          id: messages.id,
          content: messages.content,
        })
        .from(messages)
        .innerJoin(chats, eq(messages.chatId, chats.id))
        .where(
          and(
            eq(chats.appId, appId),
            eq(messages.role, "assistant"),
            like(messages.content, "%<dyad-gap-analysis%")
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(1);

      if (result.length === 0) {
        throw new Error("No guided build analysis found to update.");
      }

      const message = result[0];

      // 2. Escape the original title to use safely in a regex
      const escapedTitle = originalTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Matches the entire <dyad-gap-analysis title="Original Title" ...> ... </dyad-gap-analysis> block
      const blockRegex = new RegExp(
        `<dyad-gap-analysis[^>]*title=["']${escapedTitle}["'][^>]*>[\\s\\S]*?<\\/dyad-gap-analysis>`,
        "i"
      );

      // 3. Construct the new replacement block
      const newBlock = `<dyad-gap-analysis title="${updatedFinding.title}" status="${updatedFinding.level}">
                      ${updatedFinding.description}
                      <dyad-check-build>${updatedFinding.isBuilt ?? false}</dyad-check-build>
                      <dyad-check-completion>${updatedFinding.isVerified ?? false}</dyad-check-completion>
                      <dyad-guided-build-in-progress>${updatedFinding.isInProgress ?? false}</dyad-guided-build-in-progress>
                      </dyad-gap-analysis>`;

      // 4. Replace the old block with the new block in the message content
      const newContent = message.content.replace(blockRegex, newBlock);

      // 5. Save it back to the database
      await db
        .update(messages)
        .set({ content: newContent })
        .where(eq(messages.id, message.id));

      return true;
    }
  );
}

function parseGapAnalysisFindings(content: string): GuidedBuildFinding[] {
  const findings: GuidedBuildFinding[] = [];

  // Regex to match dyad-gap-analysis tags
  // Example: <dyad-gap-analysis title="Missing Timer" status="missing"> ... </dyad-gap-analysis>
  const regex =
    /<dyad-gap-analysis\s+title="([^"]+)"\s+status="(missing|partial|violation)">([\s\S]*?)<\/dyad-gap-analysis>/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const [, title, status, rawDescription] = match;

    // Extract the tracking boolean flags
    const isBuiltMatch = rawDescription.match(/<dyad-check-build>(.*?)<\/dyad-check-build>/);
    const isCompletionMatch = rawDescription.match(/<dyad-check-completion>(.*?)<\/dyad-check-completion>/);
    const inProgressMatch = rawDescription.match(/<dyad-guided-build-in-progress>(.*?)<\/dyad-guided-build-in-progress>/);

    const isBuilt = isBuiltMatch ? isBuiltMatch[1].trim() === "true" : false;
    const isVerified = isCompletionMatch ? isCompletionMatch[1].trim() === "true" : false;
    const isInProgress = inProgressMatch ? inProgressMatch[1].trim() === "true" : false;

    // Clean up the description:
    // 1. Convert <dyad-tasks> tags into a Markdown bold header for better UI rendering
    // 2. Trim whitespace
    let cleanDescription = rawDescription
      .replace(/<dyad-tasks>/g, "\n\n**Actionable Tasks:**\n")
      .replace(/<\/dyad-tasks>/g, "")
      .replace(/<dyad-check-build>.*?<\/dyad-check-build>/g, "")
      .replace(/<dyad-check-completion>.*?<\/dyad-check-completion>/g, "")
      .replace(/<dyad-guided-build-in-progress>.*?<\/dyad-guided-build-in-progress>/g, "")
      .trim();

    findings.push({
      title: title.trim(),
      // We map the 'status' from the prompt to the 'level' field in the type
      // The UI component handles the color mapping for these specific strings
      level: status as any,
      description: cleanDescription,
      isBuilt,
      isVerified,
      isInProgress,
    } as GuidedBuildFinding);
  }
  return findings;
}