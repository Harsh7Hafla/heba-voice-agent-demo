"use client";

import { useConversation } from "@elevenlabs/react";
import { useState } from "react";
import { UIResourceRenderer } from "@mcp-ui/client";
import { motion, AnimatePresence } from "framer-motion";

/* ---------------------------------------
   Types
----------------------------------------*/

type UIResource = {
    uri?: string;
    mimeType?: string;
    text?: string;
};

type View =
    | "idle"
    | "results"
    | "product"
    | "cart";

/* ---------------------------------------
   Component
----------------------------------------*/

export default function ConversationalCommerce() {
    const [connected, setConnected] = useState(false);

    // UI state machine (THIS is the magic)
    const [view, setView] = useState<View>("idle");

    // For search + cart
    const [uiResources, setUiResources] = useState<UIResource[]>([]);

    // For single product page
    const [activeResource, setActiveResource] =
        useState<UIResource | null>(null);

    /* ---------------------------------------
       Conversation Hook
    ----------------------------------------*/

    const conversation = useConversation({
        connectionType: "webrtc",

        /**
         * ⚠️ IMPORTANT
         * Having ANY clientTools enables
         * client-side MCP forwarding
         */
        clientTools: {
            addProductToCart: async ({ productId, quantity = 1 }) => {
                console.log("🛒 addProductToCart", productId, quantity);
                return `Added ${quantity} item(s) to cart`;
            },

            browseProductIdByName: async ({ name }) => {
                console.log("🔎 browseProductIdByName", name);
                return name;
            },
        },

        /**
         * 🔥 CORE MCP HANDLER
         * This is what creates the “page navigation” illusion
         */
        onMCPToolCall: (toolCall: any) => {
            console.log("✅ MCP TOOL CALL", toolCall);

            const resources: UIResource[] =
                toolCall.result
                    ?.filter((r: any) => r.type === "resource")
                    .map((r: any) => r.resource) ?? [];

            if (resources.length === 0) return;

            switch (toolCall.tool_name) {
                // 🔍 SEARCH RESULTS PAGE
                case "search_shop_catalog": {
                    setView("results");
                    setUiResources(resources); // REPLACE
                    setActiveResource(null);
                    break;
                }

                // 📄 PRODUCT DETAILS PAGE
                case "get_product_details": {
                    setView("product");
                    setActiveResource(resources[0]); // SINGLE PAGE
                    break;
                }

                // 🛒 CART PAGE
                case "update_cart": {
                    setView("cart");
                    setUiResources(resources); // Cart summary UI
                    setActiveResource(null);
                    break;
                }
            }
        },

        onConnect: () => {
            console.log("🟢 CONNECTED");
            setConnected(true);
            setView("idle");
        },

        onDisconnect: () => {
            console.log("🔴 DISCONNECTED");
            setConnected(false);
            setView("idle");
            setUiResources([]);
            setActiveResource(null);
        },

        onMessage: (message: any) => {
            console.log("💬 MESSAGE", message);
        },

        onError: (err: any) => {
            console.error("❌ CONVERSATION ERROR", err);
        },
    });

    /* ---------------------------------------
       Controls
    ----------------------------------------*/

    const toggleConversation = async () => {
        if (connected) {
            await conversation.endSession();
        } else {
            await conversation.startSession({
                agentId: "agent_7601kcnkqfntev8tb1b3a5ez089g",
                connectionType: "webrtc",
            });
        }
    };

    /* ---------------------------------------
       Render
    ----------------------------------------*/

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Top Action */}
            <button
                onClick={toggleConversation}
                className="px-6 py-3 rounded-xl bg-black text-white font-medium"
            >
                {connected ? "Stop Conversation" : "Start Conversation"}
            </button>

            {/* Page Title */}
            <div className="mt-8 mb-6">
                <h1 className="text-2xl font-semibold">
                    {view === "idle" && "🎙 Talk to Heba"}
                    {view === "results" && "🍽 Recommended options"}
                    {view === "product" && "📄 Product details"}
                    {view === "cart" && "🛒 Your cart"}
                </h1>
            </div>

            {/* ----------------------------
          VIEW SWITCHER
      -----------------------------*/}
            <AnimatePresence mode="wait">

                {/* 🔍 SEARCH RESULTS */}
                {view === "results" && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                        {uiResources.map((resource, i) => (
                            <motion.div
                                key={i}
                                className="h-[420px] bg-white rounded-2xl shadow border overflow-hidden"
                            >
                                <UIResourceRenderer
                                    resource={resource}
                                    onUIAction={async (action) => {
                                        console.log("⚡ UI ACTION", action);

                                        if (action?.type === "prompt") {
                                            await conversation.sendUserMessage(
                                                action.payload?.prompt
                                            );
                                        }

                                        return true; // ✅ satisfies Promise<unknown>
                                    }}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* 📄 PRODUCT DETAILS */}
                {view === "product" && activeResource && (
                    <motion.div
                        key="product"
                        initial={{ opacity: 0, x: 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="max-w-6xl mx-auto h-[75vh] bg-white rounded-3xl shadow-xl border overflow-hidden"
                    >
                        <UIResourceRenderer
                            resource={activeResource}
                            onUIAction={async (action) => {
                                console.log("⚡ UI ACTION", action);

                                if (action?.type === "prompt") {
                                    await conversation.sendUserMessage(
                                        action.payload?.prompt
                                    );
                                }

                                return true; // ✅ satisfies Promise<unknown>
                            }}
                        />
                    </motion.div>
                )}

                {/* 🛒 CART */}
                {view === "cart" && (
                    <motion.div
                        key="cart"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-6"
                    >
                        <div className="space-y-6">
                            {uiResources.map((resource, i) => (
                                <UIResourceRenderer
                                    key={i}
                                    resource={resource}
                                    onUIAction={async (action) => {
                                        console.log("⚡ UI ACTION", action);

                                        if (action?.type === "prompt") {
                                            await conversation.sendUserMessage(
                                                action.payload?.prompt
                                            );
                                        }

                                        return true; // ✅ satisfies Promise<unknown>
                                    }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}
