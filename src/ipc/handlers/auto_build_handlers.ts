import { ipcMain } from "electron";
import { db } from "../../db";
import { chats, messages } from "../../db/schema";
import { eq, and, like, desc } from "drizzle-orm";
import type { SecurityReviewResult, SecurityFinding } from "../ipc_types";

export function registerAutoBuildHandlers() {
  ipcMain.handle("get-latest-auto-build", async (event, appId: number) => {
    if (!appId) {
      throw new Error("App ID is required");
    }

    // Query for the most recent message with Auto Build / Gap Analysis findings
    // We look for the <dyad-gap-analysis> tag
    const result = await db
      .select({
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
      throw new Error("No auto build analysis found for this app");
    }

    const message = result[0];
    const findings = parseGapAnalysisFindings(message.content);

    if (findings.length === 0) {
      throw new Error("No findings parsed from the latest analysis");
    }

    // Reuse SecurityReviewResult type as the structure is compatible
    return {
      findings,
      timestamp: message.createdAt.toISOString(),
      chatId: message.chatId,
    } satisfies SecurityReviewResult;
  });
}

function parseGapAnalysisFindings(content: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  // Regex to match dyad-gap-analysis tags
  // Example: <dyad-gap-analysis title="Missing Timer" status="missing"> ... </dyad-gap-analysis>
  const regex =
    /<dyad-gap-analysis\s+title="([^"]+)"\s+status="(missing|partial|violation)">([\s\S]*?)<\/dyad-gap-analysis>/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const [, title, status, rawDescription] = match;

    // Clean up the description:
    // 1. Convert <dyad-tasks> tags into a Markdown bold header for better UI rendering
    // 2. Trim whitespace
    let cleanDescription = rawDescription
      .replace(/<dyad-tasks>/g, "\n\n**Actionable Tasks:**\n")
      .replace(/<\/dyad-tasks>/g, "")
      .trim();

    findings.push({
      title: title.trim(),
      // We map the 'status' from the prompt to the 'level' field in the type
      // The UI component handles the color mapping for these specific strings
      level: status as any,
      description: cleanDescription,
    });
  }

  return findings;
}