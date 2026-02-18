import { Client } from "@notionhq/client";

let notionClient: Client | null = null;

export function getNotionClient(): Client {
  if (!notionClient) {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
      throw new Error("NOTION_TOKEN 環境變數未設定");
    }
    notionClient = new Client({ auth: token });
  }
  return notionClient;
}

export function getDatabaseId(): string {
  const id = process.env.NOTION_DATABASE_ID;
  if (!id) {
    throw new Error("NOTION_DATABASE_ID 環境變數未設定");
  }
  return id;
}
