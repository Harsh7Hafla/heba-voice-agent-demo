"use client";

import { useConversation } from "@elevenlabs/react";
import { UIResourceRenderer } from "@mcp-ui/client";
import { useState } from "react";
import { flushSync } from "react-dom";

/* =========================
   CONFIG
========================= */

const USE_MOCK_MODE = false;

/* =========================
   TYPES
========================= */

type UIResource = {
    uri?: string;
    mimeType?: string;
    text?: string;
};

/* =========================
   MOCK DATA
========================= */

const MOCK_LISTING_RESOURCES: UIResource[] = [
    {
        uri: "ui://search/results",
        mimeType: "application/json",
        text: JSON.stringify({
            products: [
                {
                    product_id: "1",
                    title: "Chiavari Chairs",
                    description: "Elegant chairs for weddings & events",
                    price: 13,
                    image: "https://book.hafla.com/cdn/shop/files/golden-chiavari-chair.png",
                },
                {
                    product_id: "2",
                    title: "Lowell Chair",
                    description: "Minimalist wooden chair",
                    price: 18,
                    image: "https://book.hafla.com/cdn/shop/files/lowell-chair.png",
                },
            ],
        }),
    },
];

const MOCK_PRODUCT_DETAILS_RESOURCE: UIResource[] = [
    {
        uri: "ui://product/details",
        mimeType: "application/json",
        text: JSON.stringify({
            product: {
                title: "Chiavari Chairs",
                description:
                    "Lightweight, sturdy, and aesthetically appealing chairs ideal for indoor and outdoor events.",
                price: 13,
                image: "https://book.hafla.com/cdn/shop/files/golden-chiavari-chair.png",
            },
        }),
    },
];

const MOCK_CART_RESOURCE: UIResource[] = [
    {
        uri: "ui://cart/current",
        mimeType: "application/json",
        text: JSON.stringify({
            cart: {
                items: [
                    {
                        productId: "1",
                        title: "Chiavari Chairs",
                        quantity: 10,
                        price: 130,
                    },
                ],
                total: 130,
            },
        }),
    },
];

/* =========================
   CUSTOM UI COMPONENTS
========================= */

function ProductListing({ products }: { products: any[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((p) => (
                <div
                    key={p.product_id}
                    className="rounded-2xl border bg-white shadow-sm hover:shadow-lg transition overflow-visible"
                >
                    <img
                        src={p.image}
                        className="h-56 w-full object-cover"
                        alt={p.title}
                    />
                    <div className="p-4 space-y-1">
                        <p className="text-xs text-gray-500 uppercase">Hafla</p>
                        <h3 className="font-semibold text-lg">{p.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                            {p.description}
                        </p>
                        <p className="font-semibold mt-2">AED {p.price}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ProductDetails({ product }: { product: any }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white rounded-3xl shadow-lg p-8">
            <img
                src={product.image}
                className="rounded-2xl object-cover w-full h-[560px]"
                alt={product.title}
            />
            <div className="space-y-5">
                <p className="text-xs text-gray-500 uppercase">Hafla</p>
                <h1 className="text-3xl font-bold">{product.title}</h1>
                <p className="text-gray-600">{product.description}</p>
                <div className="text-2xl font-semibold">
                    AED {product.price}
                </div>
                <button className="w-full py-3 rounded-xl bg-black text-white">
                    Add to cart
                </button>
            </div>
        </div>
    );
}

function CartView({ cart }: { cart: any }) {
    return (
        <div className="bg-white rounded-3xl shadow-lg p-8 space-y-6 max-w-2xl">
            <h2 className="text-2xl font-bold">Your cart</h2>
            {cart.items.map((item: any) => (
                <div
                    key={item.productId}
                    className="flex justify-between border-b pb-4"
                >
                    <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-sm text-gray-500">
                            Qty: {item.quantity}
                        </p>
                    </div>
                    <p className="font-semibold">AED {item.price}</p>
                </div>
            ))}
            <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>AED {cart.total}</span>
            </div>
            <button className="w-full py-3 rounded-xl bg-black text-white">
                Checkout
            </button>
        </div>
    );
}

type View =
    | "idle"
    | "results"
    | "product"
    | "cart";

/* =========================
   APP
========================= */

export default function App() {
    const [page, setPage] = useState<"home" | "listing" | "product" | "cart">("listing");
    const [connected, setConnected] = useState(false);

    // UI state machine (THIS is the magic)
    const [view, setView] = useState<View>("idle");

    // For search + cart
    const [uiResources, setUiResources] = useState<UIResource[]>([]);

    // For single product page
    const [activeResource, setActiveResource] =
        useState<UIResource | null>(null);
    const conversation = useConversation({
        connectionType: "webrtc",
        enabled: !USE_MOCK_MODE,

        clientTools: {
            addProductToCart: async ({ productId, quantity = 1 }) => {
                console.log("🛒 addProductToCart", productId, quantity);
                return `Added ${quantity} item(s) to cart`;
            },

            browseProductIdByName: async ({ name }) => {
                console.log("🔎 browseProductIdByName", name);
                return name;
            },
            open_cart: async ({ cartUrl }: { cartUrl: string }) => {
                window.open(cartUrl, "_blank", "noopener,noreferrer");
                return "Opened cart";
            },
            redirect_to_checkout: async ({ url }: { url: string }) => {
                window.open(url, "_blank", "noopener,noreferrer");
                return "Redirected to checkout";
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

    const loadMockListing = () => {
        setPage("listing");
        setUiResources(MOCK_LISTING_RESOURCES);
    };

    const loadMockProductDetails = () => {
        setPage("product");
        setUiResources(MOCK_PRODUCT_DETAILS_RESOURCE);
    };

    const loadMockCart = () => {
        setPage("cart");
        setUiResources(MOCK_CART_RESOURCE);
    };

    const handlePlanWithAI = async () => {
        console.log("🔥 Plan with Hafla AI clicked");

        if (USE_MOCK_MODE) {
            loadMockListing();

            setTimeout(() => {
                document
                    .getElementById("mcp-ui")
                    ?.scrollIntoView({ behavior: "smooth" });
            }, 100);

            return;
        }

        // real ElevenLabs mode (optional, if you already have it)
        await conversation.startSession({
            agentId: "agent_2101kfg9w7pnf4dvrqpt3jkd7s5a",
            connectionType: "webrtc",
        });
    };

    return (
        <div className="font-montserrat min-h-screen bg-white">
            {/* ================= HERO ================= */}
            <section
                className="relative text-white px-12 py-20 flex items-center"
                style={{
                    backgroundImage:
                        "linear-gradient(86.7deg, #e58023 -30.01%, #cf578f 95.46%, #e03d24 206.73%)",
                }}
            >
                <div className="max-w-xl space-y-6">
                    <h1 className="text-5xl font-semibold leading-tight">
                        Experience AI Powered
                        <br />
                        Event Planning
                    </h1>
                    <p className="opacity-90">
                        By expert planners, with professional partners,
                        <br />
                        for everything for your entire event
                    </p>
                        <button
                            onClick={handlePlanWithAI}
                            className="
                                bg-white
                                text-black
                                px-8
                                py-3
                                rounded-full
                                font-semibold
                                cursor-pointer
                                transition-all
                                duration-300
                                hover:bg-black
                                hover:text-white
                                hover:shadow-xl
                                active:scale-95
                            "
                        >
                            Plan with Hafla AI →
                        </button>

                </div>
                <img
                    src="/images/hero-woman.png"
                    className="absolute right-16 bottom-0 w-[640px] h-[420px]"
                />
            </section>

            {/* ================= MOCK CONTROLS ================= */}
            {USE_MOCK_MODE && (
                <div className="p-6 flex gap-4 border-b">
                    <button onClick={loadMockListing} className="btn">
                        Mock Listing
                    </button>
                    <button onClick={loadMockProductDetails} className="btn">
                        Mock Product Details
                    </button>
                    <button onClick={loadMockCart} className="btn">
                        Mock Cart
                    </button>
                </div>
            )}


            {/* ================= PAGE TITLE ================= */}
            <h2 className="px-6 py-4 text-xl font-semibold">
                {page === "home"}
                {page === "listing" && "Recommended options"}
                {page === "product" && "Product details"}
                {page === "cart" && "Your cart"}
            </h2>

            {/* ================= CONTENT ================= */}
            <div
                id="mcp-ui"
                className="px-6 pb-20">
                {uiResources.map((res, i) => {
                    let parsed: any = null;
                    try {
                        parsed = res.text ? JSON.parse(res.text) : null;
                    } catch { }

                    if (parsed?.products) {
                        return <ProductListing key={i} products={parsed.products} />;
                    }

                    if (parsed?.product) {
                        return <ProductDetails key={i} product={parsed.product} />;
                    }

                    if (parsed?.cart) {
                        return <CartView key={i} cart={parsed.cart} />;
                    }

                    return (
                        <div
                            key={i}
                            className="rounded-xl border shadow-sm bg-white min-h-[600px] overflow-hidden"
                        >
                            <UIResourceRenderer
                                resource={{
                                    uri: res.uri,
                                    mimeType: res.mimeType,
                                    text: res.text,
                                }}
                                onUIAction={async (action) => {
                                    console.log("⚡ UI ACTION", action);

                                    // ================= MOCK MODE =================
                                    if (USE_MOCK_MODE) {
                                        if (
                                            action?.type === "prompt" &&
                                            action.payload?.prompt?.toLowerCase().includes("checkout")
                                        ) {
                                            window.open(
                                                "https://book.hafla.com/checkout",
                                                "_blank",
                                                "noopener,noreferrer"
                                            );
                                        }
                                        return;
                                    }

                                    // ================= PROD MODE =================
                                    if (action?.type === "prompt") {
                                        await conversation.sendUserMessage(
                                            action.payload?.prompt
                                        );
                                    }
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
