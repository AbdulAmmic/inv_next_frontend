"use client";

import { useState, useEffect, useRef } from "react";
import { getProducts, getShops } from "@/apiCalls"; // Using the main API file
import { QRCodeSVG } from "qrcode.react";
// import html2canvas from "html2canvas"; // Removed
import jsPDF from "jspdf";
import { Trash2, Printer, Search, Plus, QrCode, Menu, LayoutGrid } from "lucide-react";
import { toast } from "react-hot-toast";

// App Components
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

interface Product {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    price: number;
    stockQuantity: number;
}

// ... (Shop and LabelItem interfaces remain unchanged)

export default function QRLabelsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [queue, setQueue] = useState<{ product: Product; quantity: number }[]>([]);
    const [shopName, setShopName] = useState("Loading...");
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await getShops();
                if (res.data && res.data.length > 0) {
                    const shop = res.data[0];
                    setShopName(shop.name);
                    fetchProducts(shop.id);
                }
            } catch (e) {
                console.error(e);
                toast.error("Failed to load shop info");
            }
        };
        init();
    }, []);

    const fetchProducts = async (shopId: string) => {
        try {
            const res = await getProducts({ shop_id: shopId, include_stock: true });
            // Map response to handle stock structure
            const list = (res.data || []).map((p: any) => ({
                ...p,
                price: p.stock?.price ? Number(p.stock.price) : Number(p.price || 0),
                stockQuantity: p.stock?.quantity || 0
            }));
            setProducts(list);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load products");
        }
    };

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
    );

    const addToQueue = () => {
        if (!selectedProduct) return;
        if (quantity < 1) return;

        // Validation: Cannot exceed available stock
        if (quantity > selectedProduct.stockQuantity) {
            toast.error(`Cannot exceed available stock (${selectedProduct.stockQuantity})`);
            return;
        }

        setQueue((prev) => [...prev, { product: selectedProduct, quantity }]);
        setSelectedProduct(null);
        setSearch("");
        setQuantity(1);
        toast.success("Added to queue");
    };

    const removeFromQueue = (index: number) => {
        setQueue((prev) => prev.filter((_, i) => i !== index));
    };

    const clearQueue = () => {
        setQueue([]);
        toast.success("Queue cleared");
    };

    const downloadPDF = async () => {
        if (!printRef.current) return;

        try {
            toast.loading("Generating PDF...", { id: "pdf-gen" });

            // Dynamic import to avoid SSR issues if any
            const { toPng } = await import("html-to-image");

            const dataUrl = await toPng(printRef.current, {
                quality: 1.0,
                pixelRatio: 3, // High  resolution
                backgroundColor: "#ffffff"
            });

            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`labels-${shopName}.pdf`);
            toast.success("PDF Downloaded!", { id: "pdf-gen" });
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate PDF", { id: "pdf-gen" });
        }
    };

    // Expand queue into individual labels
    const allLabels = queue.flatMap((item) => Array(item.quantity).fill(item.product));

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* SIDEBAR */}
            <Sidebar
                isOpen={sidebarOpen}
                isMobile={false}
                toggleSidebar={() => setSidebarOpen((v) => !v)}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden transition-all duration-300">
                {/* HEADER */}
                <Header />

                <main className="flex-1 overflow-hidden p-4 md:p-6 flex flex-col md:flex-row gap-6">

                    {/* LEFT PANEL: CONTROLS */}
                    <div className="w-full md:w-96 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                                <QrCode className="w-5 h-5 text-purple-600" />
                                Generator Controls
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Shop: <span className="font-medium text-gray-700">{shopName}</span>
                            </p>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto space-y-5">

                            {/* Product Lookup */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add Product</label>
                                <div className="relative group">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white focus:border-transparent outline-none transition-all"
                                        placeholder="Search product..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />

                                    {/* Dropdown Results */}
                                    {search && (
                                        <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                            {filteredProducts.length === 0 ? (
                                                <div className="p-3 text-sm text-gray-400 text-center">No products found</div>
                                            ) : (
                                                filteredProducts.map((p) => (
                                                    <button
                                                        key={p.id}
                                                        className="w-full text-left px-4 py-3 hover:bg-purple-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                                                        onClick={() => {
                                                            setSelectedProduct(p);
                                                            setSearch(p.name);
                                                            setQuantity(p.stockQuantity || 0);
                                                        }}
                                                    >
                                                        <span className="text-sm font-medium text-gray-700 truncate">{p.name}</span>
                                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{p.sku || "N/A"}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Selection Config */}
                            {selectedProduct && (
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-semibold text-purple-900 text-sm">{selectedProduct.name}</h3>
                                            <p className="text-xs text-purple-600 mt-0.5">
                                                {selectedProduct.sku || selectedProduct.barcode} • Stock: {selectedProduct.stockQuantity}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-white rounded-lg border border-purple-200 p-1">
                                            <button
                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className="w-8 h-8 flex items-center justify-center text-purple-700 hover:bg-purple-100 rounded-md transition"
                                            >-</button>
                                            <input
                                                type="number"
                                                min="1"
                                                value={quantity}
                                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                                className="w-12 text-center font-bold text-purple-900 outline-none text-sm"
                                            />
                                            <button
                                                onClick={() => setQuantity(quantity + 1)}
                                                className="w-8 h-8 flex items-center justify-center text-purple-700 hover:bg-purple-100 rounded-md transition"
                                            >+</button>
                                        </div>
                                        <button
                                            onClick={addToQueue}
                                            className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm text-sm font-medium flex items-center justify-center gap-2"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Queue */}
                            <div className="border-t border-gray-100 pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-semibold text-gray-700 text-sm">Print Queue</h3>
                                    {queue.length > 0 && (
                                        <button onClick={clearQueue} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded transition">Clear All</button>
                                    )}
                                </div>

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {queue.length === 0 ? (
                                        <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                                            <LayoutGrid className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-xs text-gray-400">Add products to start</p>
                                        </div>
                                    ) : (
                                        queue.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-gray-50/80 rounded-lg group hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-gray-800 truncate">{item.product.name}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                                        <span className="bg-gray-200 px-1.5 rounded text-[10px]">{item.quantity}x</span>
                                                        <span>{item.product.sku}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromQueue(idx)}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-gray-50/30">
                            <button
                                onClick={downloadPDF}
                                disabled={allLabels.length === 0}
                                className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg transform active:scale-95 duration-200"
                            >
                                <Printer className="w-5 h-5" />
                                Download PDF
                            </button>
                        </div>
                    </div>

                    {/* RIGHT PANEL: PREVIEW */}
                    <div className="flex-1 bg-gray-100/50 rounded-2xl border border-gray-200 overflow-hidden flex flex-col relative">
                        <div className="absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 shadow-sm border border-gray-100 z-10">
                            A4 Preview • {allLabels.length} Labels
                        </div>

                        <div className="flex-1 overflow-auto p-8 flex justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                            <div className="origin-top scale-[0.6] md:scale-[0.7] lg:scale-[0.85] shadow-2xl transition-transform duration-300">
                                {/* A4 PAPER */}
                                <div
                                    ref={printRef}
                                    className="bg-white"
                                    style={{
                                        width: "210mm",
                                        height: "297mm",
                                        padding: "10mm", // Standard Margin
                                        display: "grid",
                                        gridTemplateColumns: "repeat(5, 1fr)", // 5 Columns!
                                        gridTemplateRows: "repeat(10, 1fr)", // ~10 Rows fit comfortably
                                        gap: "2mm",
                                        boxSizing: "border-box",
                                        alignContent: "start"
                                    }}
                                >
                                    {allLabels.slice(0, 50).map((product, idx) => (
                                        <div
                                            key={idx}
                                            className="border border-gray-800 rounded-md p-1 flex flex-col items-center justify-center text-center overflow-hidden bg-white"
                                            style={{ height: "26mm" }} // Fixed height constraint (~2.6cm)
                                        >
                                            {/* SHOP NAME HEADER */}
                                            <div className="text-[6px] font-bold uppercase tracking-wider text-black mb-0.5 truncate w-full px-0.5">
                                                {shopName}
                                            </div>

                                            {/* QR */}
                                            <div className="flex-shrink-0 mb-0.5">
                                                <QRCodeSVG
                                                    value={product.sku || product.barcode || product.id}
                                                    size={45} // Small QR ~12-15mm visual
                                                    level="L" // Low error correction for simpler pattern at small size
                                                />
                                            </div>

                                            {/* Product Info */}
                                            <div className="w-full px-0.5">
                                                <div className="text-[6px] font-bold leading-tight truncate">{product.name}</div>
                                                <div className="text-[5px] font-mono text-gray-600 truncate">{product.sku || "NO CODE"}</div>
                                                <div className="text-[6px] font-bold text-black mt-0.5">₦{(product.price || 0).toLocaleString()}</div>
                                                <div className="text-[4px] text-gray-400 mt-0.5 scale-75">Tuhanas System v.1.0</div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Visual Placeholders */}
                                    {Array.from({ length: Math.max(0, 50 - allLabels.length) }).map((_, idx) => (
                                        <div key={`empty-${idx}`} className="border border-dashed border-gray-200 rounded-md opacity-50" style={{ height: "26mm" }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}
