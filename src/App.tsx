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
   HELPER FUNCTIONS
========================= */

// Extract product handle from Shopify URL
function getProductHandle(url: string): string | null {
    try {
        const match = url.match(/\/products\/([^?]+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

// Construct Shopify product image URL
function getShopifyImageUrl(product: any): string {
    const handle = product.product_handle || getProductHandle(product.url);
    if (handle) {
        return `https://book.hafla.com/cdn/shop/files/${handle}.png`;
    }
    return 'https://via.placeholder.com/300x224?text=No+Image';
}

/* =========================
   CUSTOM UI COMPONENTS
========================= */


function ProductListing({ products }: { products: any[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((p) => {
                // Handle price display
                let priceDisplay = '';
                if (p.price !== undefined) {
                    priceDisplay = `AED ${p.price}`;
                } else if (p.price_range) {
                    const min = p.price_range.min;
                    const max = p.price_range.max;
                    if (min === max) {
                        priceDisplay = `AED ${min}`;
                    } else {
                        priceDisplay = `AED ${min} - ${max}`;
                    }
                }

                const image = p.image || getShopifyImageUrl(p);

                return (
                    <div
                        key={p.product_id || p.id}
                        className="rounded-2xl border bg-white shadow-sm hover:shadow-lg transition overflow-visible"
                    >
                        <img
                            src={image}
                            className="h-56 w-full object-cover bg-gray-100"
                            alt={p.title}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (target.src.endsWith('.png')) {
                                    target.src = target.src.replace('.png', '.jpg');
                                } else if (target.src.endsWith('.jpg')) {
                                    target.src = target.src.replace('.jpg', '.webp');
                                } else {
                                    target.src = 'https://via.placeholder.com/300x224?text=No+Image';
                                }
                            }}
                        />
                        <div className="p-4 space-y-1">
                            <p className="text-xs text-gray-500 uppercase">Hafla</p>
                            <h3 className="font-semibold text-lg">{p.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2">
                                {p.description || p.product_type || 'Premium catering option'}
                            </p>
                            <p className="font-semibold mt-2">{priceDisplay}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ProductDetails({ product }: { product: any }) {
    // Handle both mock and real API data structures
    const image = product.image || getShopifyImageUrl(product);
    const description = product.description || 'No description available';

    // Get variants - either from variants array or from options/availabilityMatrix
    const variants = product.variants || [];
    const hasOptions = product.options && product.options.length > 0;

    // Price handling: real API has price_range, mock has price
    let priceDisplay = '';
    if (product.price) {
        priceDisplay = `AED ${product.price}`;
    } else if (product.price_range) {
        const min = product.price_range.min;
        const max = product.price_range.max;
        if (min === max) {
            priceDisplay = `AED ${min}`;
        } else {
            priceDisplay = `AED ${min} - ${max}`;
        }
    } else if (product.selectedOrFirstAvailableVariant?.price) {
        priceDisplay = `AED ${product.selectedOrFirstAvailableVariant.price}`;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white rounded-3xl shadow-lg p-8">
            <img
                src={image}
                className="rounded-2xl object-cover w-full h-[560px] bg-gray-100"
                alt={product.title}
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.endsWith('.png')) {
                        target.src = target.src.replace('.png', '.jpg');
                    } else if (target.src.endsWith('.jpg')) {
                        target.src = target.src.replace('.jpg', '.webp');
                    } else {
                        target.src = 'https://via.placeholder.com/560x560?text=No+Image';
                    }
                }}
            />
            <div className="space-y-5">
                <p className="text-xs text-gray-500 uppercase">Hafla</p>
                <h1 className="text-3xl font-bold">{product.title}</h1>
                <p className="text-gray-600">{description}</p>

                {/* Show available variants */}
                {variants.length > 0 && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="font-semibold mb-3">Available Options</h3>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {variants.map((variant: any, idx: number) => (
                                <div
                                    key={variant.variant_id || idx}
                                    className="flex justify-between items-center p-2 bg-white rounded border text-sm"
                                >
                                    <span className="font-medium">{variant.title}</span>
                                    <span className="text-gray-700">
                                        {variant.currency || 'AED'} {variant.price}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Show options if no variants array */}
                {!variants.length && hasOptions && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="font-semibold mb-3">Options</h3>
                        {product.options.map((option: any, idx: number) => {
                            const optionName = Object.keys(option)[0];
                            const optionValues = option[optionName];
                            return (
                                <div key={idx} className="mb-3">
                                    <p className="text-sm font-medium text-gray-600">{optionName}:</p>
                                    <p className="text-sm text-gray-700">{optionValues.join(', ')}</p>
                                </div>
                            );
                        })}
                    </div>
                )}

                {product.selectedOrFirstAvailableVariant && variants.length === 0 && (
                    <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                        Selected: {product.selectedOrFirstAvailableVariant.title}
                    </div>
                )}
                <div className="text-2xl font-semibold">
                    {priceDisplay}
                </div>
                {product.url && (
                    <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-3 rounded-xl bg-black text-white text-center hover:bg-gray-800 transition"
                    >
                        View Full Details
                    </a>
                )}
            </div>
        </div>
    );
}

function CartView({ cart }: { cart: any }) {
    // Handle both mock and real API data structures
    const items = cart.items || cart.lines || [];

    // Calculate total from real API structure or use mock total
    let total = 0;
    if (cart.total !== undefined) {
        total = cart.total;
    } else if (cart.cost?.total_amount?.amount) {
        total = parseFloat(cart.cost.total_amount.amount);
    }

    const currency = cart.cost?.total_amount?.currency || 'AED';
    const checkoutUrl = cart.checkout_url;

    return (
        <div className="bg-white rounded-3xl shadow-lg p-8 space-y-6 max-w-2xl">
            <h2 className="text-2xl font-bold">Your cart</h2>
            {items.length === 0 ? (
                <p className="text-gray-500">Your cart is empty</p>
            ) : (
                items.map((item: any, index: number) => {
                    // Extract data based on structure (real API vs mock)
                    const title = item.title || item.merchandise?.product?.title || 'Product';
                    const quantity = item.quantity || 1;
                    const itemId = item.productId || item.id || index;

                    // Price calculation
                    let price = 0;
                    if (item.price !== undefined) {
                        price = item.price;
                    } else if (item.cost?.total_amount?.amount) {
                        price = parseFloat(item.cost.total_amount.amount);
                    }

                    const variantTitle = item.merchandise?.title;

                    return (
                        <div
                            key={itemId}
                            className="flex justify-between border-b pb-4"
                        >
                            <div>
                                <p className="font-semibold">{title}</p>
                                {variantTitle && (
                                    <p className="text-xs text-gray-500">{variantTitle}</p>
                                )}
                                <p className="text-sm text-gray-500">
                                    Qty: {quantity}
                                </p>
                            </div>
                            <p className="font-semibold">{currency} {price.toFixed(2)}</p>
                        </div>
                    );
                })
            )}
            <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{currency} {total.toFixed(2)}</span>
            </div>
            {checkoutUrl ? (
                <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 rounded-xl bg-black text-white text-center hover:bg-gray-800 transition"
                >
                    Proceed to Checkout
                </a>
            ) : (
                <button className="w-full py-3 rounded-xl bg-black text-white">
                    Checkout
                </button>
            )}
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
        options: {
            interruptionThreshold: 0.5, // 0.5s of user audio will stop the AI
        },

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
            console.log("🔧 Tool Name:", toolCall.tool_name);
            console.log("� Tool Arguments:", toolCall.arguments);
            console.log("�📥 Tool Result:", toolCall.result);

            // Extract JSON data from text-type results
            const textResult = toolCall.result?.find((r: any) => r.type === "text");
            let jsonData: any = null;

            if (textResult?.text) {
                try {
                    jsonData = JSON.parse(textResult.text);
                    console.log("📊 Parsed JSON Data:", jsonData);
                } catch (e) {
                    console.error("❌ Failed to parse text result:", e);
                }
            }

            // Extract resource URLs (for UIResourceRenderer fallback)
            const resources: UIResource[] =
                toolCall.result
                    ?.filter((r: any) => r.type === "resource")
                    .map((r: any) => r.resource) ?? [];

            console.log("📦 Extracted Resources:", resources);
            console.log("📊 Resource Count:", resources.length);

            switch (toolCall.tool_name) {
                // 🔍 SEARCH RESULTS PAGE
                case "search_shop_catalog": {
                    setView("results");

                    // Inject instructions into the tool result text (Heba's knowledge source)
                    const textResult = toolCall.result?.find((r: any) => r.type === "text");
                    if (textResult) {
                        try {
                            const p = JSON.parse(textResult.text);
                            p.instructions = "DISPLAY ONLY. Do NOT narrate names/prices. Just say: 'I found these options.'";
                            textResult.text = JSON.stringify(p);
                        } catch (e) { }
                    }

                    setUiResources(resources);
                    setActiveResource(null);
                    break;
                }

                // 📄 PRODUCT DETAILS PAGE
                case "get_product_details": {
                    setView("product");

                    const textResult = toolCall.result?.find((r: any) => r.type === "text");
                    if (textResult) {
                        try {
                            const p = JSON.parse(textResult.text);
                            p.instructions = "Summarize briefly. Tell users they can choose specific packages (variants).";
                            textResult.text = JSON.stringify(p);
                        } catch (e) { }
                    }

                    setUiResources(resources);
                    setActiveResource(resources[0]);
                    break;
                }

                // 🛒 CART PAGE
                case "update_cart": {
                    setView("cart");
                    setUiResources(resources);
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
                className="relative text-white px-6 py-24 md:px-12 md:py-20 flex flex-col md:flex-row items-center text-center md:text-left overflow-hidden"
                style={{
                    backgroundImage:
                        "linear-gradient(86.7deg, #e58023 -30.01%, #cf578f 95.46%, #e03d24 206.73%)",
                }}
            >
                <div className="max-w-xl space-y-6 z-10 w-full flex flex-col items-center md:items-start">
                    <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
                        Experience AI Powered
                        <br />
                        Event Planning
                    </h1>
                    <p className="opacity-90 text-sm md:text-base">
                        By expert planners, with professional partners,
                        <br />
                        for everything for your entire event
                    </p>
                    <button
                        onClick={
                            (conversation.status === "connected" || conversation.status === "connecting")
                                ? () => conversation.endSession()
                                : handlePlanWithAI
                        }
                        className={`
                                ${(conversation.status === "connected" || conversation.status === "connecting")
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-white text-black hover:bg-black hover:text-white"}
                                px-8
                                py-3
                                rounded-full
                                font-semibold
                                cursor-pointer
                                transition-all
                                duration-300
                                hover:shadow-xl
                                active:scale-95
                            `}
                    >
                        {conversation.status === "connecting" ? "Connecting..." :
                            conversation.status === "connected" ? "End Conversation ●" :
                                "Plan with Heba AI →"}
                    </button>
                </div>
                <img
                    src="/images/hero-woman.png"
                    className="hidden md:block absolute right-16 bottom-0 w-[640px] h-[420px]"
                />

                {/* Wavy divider for mobile */}
                <div className="md:hidden absolute bottom-0 left-0 w-full overflow-hidden leading-none">
                    <svg
                        viewBox="0 0 1200 120"
                        preserveAspectRatio="none"
                        className="relative block w-[calc(100%+2px)] -left-[1px] h-[60px] translate-y-[1px]"
                    >
                        <path
                            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5,73.84-4.34,147.54,16.9,218.2,35.28,69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V120H0Z"
                            fill="#FFFFFF"
                        ></path>
                    </svg>
                </div>
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
                className={`px-6 pb-20 view-${view}`}>
                {uiResources.map((res, i) => {
                    console.log("🔍 RAW RESOURCE:", res);

                    let parsed: any = null;
                    if (res.mimeType === "application/json" && res.text) {
                        try {
                            parsed = JSON.parse(res.text);
                            console.log("📦 PARSED DATA:", parsed);
                        } catch (e) {
                            console.error("❌ Failed to parse JSON:", e);
                        }
                    }

                    // COMMENTED OUT: Custom component rendering - using MCP UIResourceRenderer instead
                    // if (parsed?.products) {
                    //     console.log("✅ Rendering ProductListing");
                    //     return <ProductListing key={i} products={parsed.products} />;
                    // }

                    // if (parsed?.product) {
                    //     console.log("✅ Rendering ProductDetails");
                    //     return <ProductDetails key={i} product={parsed.product} />;
                    // }

                    // if (parsed?.cart) {
                    //     console.log("✅ Rendering CartView");
                    //     return <CartView key={i} cart={parsed.cart} />;
                    // }

                    console.log("⚡ Using MCP UIResourceRenderer");

                    return (
                        <div
                            key={i}
                            className="w-full rounded-xl border shadow-sm bg-white overflow-visible"
                            style={{ minHeight: 'auto' }}
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
            {/* ================= FLOATING CALL STATUS ================= */}
            {conversation.status === "connected" && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-4 py-3 md:px-6 rounded-full shadow-2xl flex items-center gap-3 md:gap-4 animate-bounce-subtle w-auto max-w-[95vw] sm:max-w-max whitespace-nowrap">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                        <span className="text-xs md:text-sm font-medium">Heba is listening...</span>
                    </div>
                    <div className="w-px h-4 bg-gray-700 hidden xs:block" />
                    <button
                        onClick={() => conversation.endSession()}
                        className="text-xs md:text-sm font-bold text-red-400 hover:text-red-300 transition"
                    >
                        End <span className="hidden xs:inline">Conversation</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// Add simple CSS animation for the status bar
const style = document.createElement('style');
style.textContent = `
    @keyframes bounce-subtle {
        0%, 100% { transform: translate(-50%, 0); }
        50% { transform: translate(-50%, -6px); }
    }
    .animate-bounce-subtle {
        animation: bounce-subtle 2s ease-in-out infinite;
    }
`;
document.head.appendChild(style);

