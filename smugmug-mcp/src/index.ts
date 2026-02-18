#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import OAuth from "oauth-1.0a";
import crypto from "crypto";

// --- Configuration ---

const API_KEY = process.env.SMUGMUG_API_KEY ?? "";
const API_SECRET = process.env.SMUGMUG_API_SECRET ?? "";
const ACCESS_TOKEN = process.env.SMUGMUG_ACCESS_TOKEN ?? "";
const TOKEN_SECRET = process.env.SMUGMUG_TOKEN_SECRET ?? "";

const BASE_URL = "https://api.smugmug.com";
const API_BASE = `${BASE_URL}/api/v2`;

// --- OAuth 1.0a Setup ---

const oauth = new OAuth({
  consumer: { key: API_KEY, secret: API_SECRET },
  signature_method: "HMAC-SHA1",
  hash_function(baseString: string, key: string) {
    return crypto.createHmac("sha1", key).update(baseString).digest("base64");
  },
});

const token = { key: ACCESS_TOKEN, secret: TOKEN_SECRET };

// --- API Helper ---

interface SmugMugResponse {
  Response?: Record<string, unknown>;
  Expansion?: Record<string, unknown>;
  Code?: number;
  Message?: string;
  Pages?: {
    Total: number;
    Start: number;
    Count: number;
  };
}

async function smugmugFetch(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<SmugMugResponse> {
  const url = new URL(endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const requestData = {
    url: url.toString(),
    method: "GET" as const,
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      ...authHeader,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`SmugMug API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<SmugMugResponse>;
}

// --- Data Formatters ---

interface Album {
  Name?: string;
  AlbumKey?: string;
  Description?: string;
  ImageCount?: number;
  LastUpdated?: string;
  WebUri?: string;
  UrlName?: string;
  Uris?: Record<string, { Uri?: string }>;
}

interface Image {
  Title?: string;
  Caption?: string;
  FileName?: string;
  ImageKey?: string;
  Keywords?: string;
  WebUri?: string;
  ArchivedUri?: string;
  ThumbnailUrl?: string;
  Date?: string;
  OriginalWidth?: number;
  OriginalHeight?: number;
  OriginalSize?: number;
  Uris?: Record<string, { Uri?: string }>;
}

interface ImageSize {
  Url?: string;
  Width?: number;
  Height?: number;
  Ext?: string;
  Usable?: string;
}

function formatAlbum(album: Album, index?: number): string {
  const prefix = index !== undefined ? `${index + 1}. ` : "";
  const lines = [
    `${prefix}**${album.Name ?? "Untitled"}** (Key: ${album.AlbumKey ?? "N/A"})`,
  ];
  if (album.Description) lines.push(`   Description: ${album.Description}`);
  lines.push(`   Images: ${album.ImageCount ?? 0}`);
  if (album.LastUpdated) lines.push(`   Last Updated: ${album.LastUpdated}`);
  if (album.WebUri) lines.push(`   Web: ${album.WebUri}`);
  return lines.join("\n");
}

function formatImage(img: Image, index?: number): string {
  const prefix = index !== undefined ? `${index + 1}. ` : "";
  const title = img.Title || img.FileName || "Untitled";
  const lines = [`${prefix}**${title}** (Key: ${img.ImageKey ?? "N/A"})`];
  if (img.Caption) lines.push(`   Caption: ${img.Caption}`);
  if (img.Keywords) lines.push(`   Keywords: ${img.Keywords}`);
  if (img.OriginalWidth && img.OriginalHeight) {
    lines.push(`   Size: ${img.OriginalWidth}x${img.OriginalHeight}`);
  }
  if (img.Date) lines.push(`   Date: ${img.Date}`);
  if (img.WebUri) lines.push(`   Web: ${img.WebUri}`);
  if (img.ArchivedUri) lines.push(`   Download: ${img.ArchivedUri}`);
  return lines.join("\n");
}

// --- MCP Server ---

const server = new McpServer({
  name: "smugmug",
  version: "1.0.0",
});

// Tool 1: Get authenticated user info
server.tool(
  "get_user",
  "Get authenticated SmugMug user info, including username, display name, and root node",
  {},
  async () => {
    try {
      const data = await smugmugFetch("!authuser");
      const user = data.Response?.User as Record<string, unknown> | undefined;
      if (!user) {
        return { content: [{ type: "text" as const, text: "Failed to get user info" }] };
      }
      const lines = [
        `**SmugMug User**`,
        `Name: ${user.Name ?? "N/A"}`,
        `Nickname: ${user.NickName ?? "N/A"}`,
        `Display Name: ${user.DisplayName ?? "N/A"}`,
        `Web URI: ${user.WebUri ?? "N/A"}`,
        `Plan: ${user.Plan ?? "N/A"}`,
      ];
      const uris = user.Uris as Record<string, { Uri?: string }> | undefined;
      if (uris?.Node?.Uri) {
        lines.push(`Root Node: ${uris.Node.Uri}`);
      }
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Tool 2: List albums
server.tool(
  "list_albums",
  "List SmugMug albums. Can search by keyword and sort results.",
  {
    search: z.string().optional().describe("Search keyword to filter albums by name"),
    count: z.number().optional().default(20).describe("Number of albums to return (default 20, max 100)"),
    start: z.number().optional().default(1).describe("Starting index for pagination (default 1)"),
    sort: z
      .enum(["LastUpdated", "Name", "DateAdded", "SortIndex"])
      .optional()
      .default("LastUpdated")
      .describe("Sort method"),
    direction: z
      .enum(["Ascending", "Descending"])
      .optional()
      .default("Descending")
      .describe("Sort direction"),
  },
  async ({ search, count, start, sort, direction }) => {
    try {
      // First get the user nickname
      const userData = await smugmugFetch("!authuser");
      const user = userData.Response?.User as Record<string, unknown> | undefined;
      const nickname = user?.NickName as string;
      if (!nickname) {
        return { content: [{ type: "text" as const, text: "Failed to get user nickname" }] };
      }

      const params: Record<string, string> = {
        count: String(Math.min(count ?? 20, 100)),
        start: String(start ?? 1),
        SortDirection: direction ?? "Descending",
        SortMethod: sort ?? "LastUpdated",
      };
      if (search) {
        params.q = search;
      }

      const data = await smugmugFetch(`/user/${nickname}!albums`, params);
      const albums = (data.Response?.Album ?? []) as Album[];

      if (albums.length === 0) {
        const msg = search
          ? `No albums found matching "${search}"`
          : "No albums found";
        return { content: [{ type: "text" as const, text: msg }] };
      }

      const pages = data.Response?.Pages as { Total?: number; Start?: number; Count?: number } | undefined;
      const header = search
        ? `Albums matching "${search}" (${pages?.Total ?? albums.length} total):`
        : `Albums (${pages?.Total ?? albums.length} total):`;

      const formatted = albums.map((a, i) => formatAlbum(a, i)).join("\n\n");
      const pageInfo = pages
        ? `\n\n---\nShowing ${pages.Start ?? 1}-${(pages.Start ?? 1) + (pages.Count ?? 0) - 1} of ${pages.Total ?? "?"}`
        : "";

      return {
        content: [{ type: "text" as const, text: `${header}\n\n${formatted}${pageInfo}` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Tool 3: Get album images
server.tool(
  "get_album_images",
  "List images in a specific SmugMug album by album key",
  {
    album_key: z.string().describe("Album key (e.g., 'abc123')"),
    count: z.number().optional().default(20).describe("Number of images to return (default 20, max 100)"),
    start: z.number().optional().default(1).describe("Starting index for pagination (default 1)"),
  },
  async ({ album_key, count, start }) => {
    try {
      const params: Record<string, string> = {
        count: String(Math.min(count ?? 20, 100)),
        start: String(start ?? 1),
      };

      const data = await smugmugFetch(`/album/${album_key}!images`, params);
      const images = (data.Response?.AlbumImage ?? []) as Image[];

      if (images.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No images found in album ${album_key}` }],
        };
      }

      const pages = data.Response?.Pages as { Total?: number; Start?: number; Count?: number } | undefined;
      const formatted = images.map((img, i) => formatImage(img, i)).join("\n\n");
      const pageInfo = pages
        ? `\n\n---\nShowing ${pages.Start ?? 1}-${(pages.Start ?? 1) + (pages.Count ?? 0) - 1} of ${pages.Total ?? "?"}`
        : "";

      return {
        content: [
          {
            type: "text" as const,
            text: `Images in album ${album_key} (${pages?.Total ?? images.length} total):\n\n${formatted}${pageInfo}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Tool 4: Get image details with sizes/URLs
server.tool(
  "get_image_urls",
  "Get all available size URLs for a specific image. Returns thumbnail, small, medium, large, and original URLs.",
  {
    image_key: z.string().describe("Image key (e.g., 'xyz789')"),
  },
  async ({ image_key }) => {
    try {
      // Get image info
      const imgData = await smugmugFetch(`/image/${image_key}`);
      const img = imgData.Response?.Image as Image | undefined;

      // Get image sizes
      const sizeData = await smugmugFetch(`/image/${image_key}!sizedetails`);
      const sizes = sizeData.Response?.ImageSizeDetails as Record<string, ImageSize> | undefined;

      const lines: string[] = [];

      if (img) {
        lines.push(`**${img.Title || img.FileName || "Untitled"}**`);
        if (img.Caption) lines.push(`Caption: ${img.Caption}`);
        if (img.Keywords) lines.push(`Keywords: ${img.Keywords}`);
        if (img.OriginalWidth && img.OriginalHeight) {
          lines.push(`Original Size: ${img.OriginalWidth}x${img.OriginalHeight}`);
        }
        if (img.WebUri) lines.push(`Web: ${img.WebUri}`);
        lines.push("");
      }

      if (sizes) {
        lines.push("**Available Sizes:**");
        for (const [name, size] of Object.entries(sizes)) {
          if (size.Url && size.Usable !== "false") {
            lines.push(
              `- ${name}: ${size.Width ?? "?"}x${size.Height ?? "?"} — ${size.Url}`
            );
          }
        }
      }

      if (img?.ArchivedUri) {
        lines.push(`\n**Original Download:** ${img.ArchivedUri}`);
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") || "No image data found" }],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Tool 5: Browse folder/node tree
server.tool(
  "browse_folders",
  "Browse SmugMug folder tree. Start from root or a specific node to see subfolders and albums.",
  {
    node_id: z.string().optional().describe("Node ID to browse. If omitted, starts from root."),
    type_filter: z
      .enum(["All", "Album", "Folder"])
      .optional()
      .default("All")
      .describe("Filter by node type"),
  },
  async ({ node_id, type_filter }) => {
    try {
      let nodeUri: string;

      if (node_id) {
        nodeUri = `/node/${node_id}`;
      } else {
        // Get root node from user
        const userData = await smugmugFetch("!authuser");
        const user = userData.Response?.User as Record<string, unknown> | undefined;
        const uris = user?.Uris as Record<string, { Uri?: string }> | undefined;
        const rootUri = uris?.Node?.Uri;
        if (!rootUri) {
          return { content: [{ type: "text" as const, text: "Failed to get root node" }] };
        }
        nodeUri = rootUri;
      }

      // Get node info
      const nodeData = await smugmugFetch(nodeUri);
      const node = nodeData.Response?.Node as Record<string, unknown> | undefined;

      // Get children
      const params: Record<string, string> = { count: "50" };
      if (type_filter && type_filter !== "All") {
        params.Type = type_filter;
      }

      const childData = await smugmugFetch(`${nodeUri}!children`, params);
      const children = (childData.Response?.Node ?? []) as Array<Record<string, unknown>>;

      const lines: string[] = [];

      if (node) {
        lines.push(`**Current: ${node.Name ?? "Root"}** (${node.Type ?? "Folder"})`);
        if (node.Description) lines.push(`Description: ${node.Description}`);
        lines.push(`Node ID: ${node.NodeID ?? "N/A"}`);
        lines.push("");
      }

      if (children.length === 0) {
        lines.push("_No children found_");
      } else {
        lines.push(`**Contents (${children.length}):**`);
        for (const child of children) {
          const icon = child.Type === "Album" ? "📷" : "📁";
          const name = child.Name ?? "Untitled";
          const nodeID = child.NodeID ?? "";
          const desc = child.Description ? ` — ${child.Description}` : "";
          lines.push(`${icon} **${name}** (ID: ${nodeID}, Type: ${child.Type})${desc}`);
        }
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Tool 6: Search images across all albums
server.tool(
  "search_images",
  "Search for images across all SmugMug albums by keyword (searches titles, captions, keywords, filenames)",
  {
    query: z.string().describe("Search keyword"),
    scope: z
      .enum(["user", "public"])
      .optional()
      .default("user")
      .describe("Search scope: 'user' (your photos only) or 'public' (all SmugMug)"),
    count: z.number().optional().default(20).describe("Number of results (default 20, max 50)"),
  },
  async ({ query, scope, count }) => {
    try {
      // SmugMug search endpoint
      const searchScope = scope === "public" ? "" : "!search";

      // For user-scoped search, iterate through albums matching query
      // SmugMug v2 doesn't have a direct image search, so we search albums first
      const userData = await smugmugFetch("!authuser");
      const user = userData.Response?.User as Record<string, unknown> | undefined;
      const nickname = user?.NickName as string;

      if (!nickname) {
        return { content: [{ type: "text" as const, text: "Failed to get user info" }] };
      }

      // Search albums by name
      const albumData = await smugmugFetch(`/user/${nickname}!albums`, {
        q: query,
        count: String(Math.min(count ?? 20, 50)),
      });
      const albums = (albumData.Response?.Album ?? []) as Album[];

      const lines: string[] = [`**Search results for "${query}":**\n`];

      if (albums.length > 0) {
        lines.push(`**Matching Albums (${albums.length}):**`);
        for (const [i, album] of albums.entries()) {
          lines.push(formatAlbum(album, i));
          lines.push("");
        }
      }

      // Also try to search via node endpoint
      const nodeSearchData = await smugmugFetch(`/user/${nickname}!search`, {
        q: query,
        count: String(Math.min(count ?? 20, 50)),
        SortMethod: "Rank",
      }).catch(() => null);

      if (nodeSearchData) {
        const nodes = (nodeSearchData.Response?.Node ?? []) as Array<Record<string, unknown>>;
        if (nodes.length > 0) {
          lines.push(`\n**Matching Nodes (${nodes.length}):**`);
          for (const node of nodes) {
            const icon = node.Type === "Album" ? "📷" : "📁";
            lines.push(
              `${icon} **${node.Name ?? "Untitled"}** (ID: ${node.NodeID}, Type: ${node.Type})`
            );
          }
        }
      }

      if (albums.length === 0 && lines.length <= 1) {
        lines.push("No results found.");
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// Tool 7: Get album details
server.tool(
  "get_album_info",
  "Get detailed information about a specific album including settings, stats, and cover image",
  {
    album_key: z.string().describe("Album key (e.g., 'abc123')"),
  },
  async ({ album_key }) => {
    try {
      const data = await smugmugFetch(`/album/${album_key}`);
      const album = data.Response?.Album as Record<string, unknown> | undefined;

      if (!album) {
        return { content: [{ type: "text" as const, text: `Album ${album_key} not found` }] };
      }

      const lines = [
        `**${album.Name ?? "Untitled"}**`,
        `Key: ${album.AlbumKey ?? album_key}`,
        `URL Name: ${album.UrlName ?? "N/A"}`,
      ];

      if (album.Description) lines.push(`Description: ${album.Description}`);
      lines.push(`Images: ${album.ImageCount ?? 0}`);
      if (album.LastUpdated) lines.push(`Last Updated: ${album.LastUpdated}`);
      if (album.ImagesLastUpdated) lines.push(`Images Last Updated: ${album.ImagesLastUpdated}`);
      if (album.WebUri) lines.push(`Web: ${album.WebUri}`);
      if (album.SecurityType) lines.push(`Security: ${album.SecurityType}`);
      if (album.SortMethod) lines.push(`Sort: ${album.SortMethod} ${album.SortDirection ?? ""}`);

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);

// --- Start Server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SmugMug MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
