import chatApi from "../docs/chat-utils.js";
import { handleChat, handleSnapshot } from "./chat-server.js";

const SNAPSHOTS = new Set(["/data/menus.json", "/data/prices.json", "/data/matches.json"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/chat") {
      try {
        return await handleChat(request, env, chatApi);
      } catch (error) {
        return Response.json({ error: error.message || "Unexpected chat error" }, { status: 500 });
      }
    }
    if (SNAPSHOTS.has(url.pathname) && request.method === "GET") {
      const snapshot = await handleSnapshot(request, env);
      if (snapshot) return snapshot;
    }
    if (!env.ASSETS) return new Response("Not found", { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
