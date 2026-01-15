
import React, { useRef } from 'react';
import { ShoppingBag, MapPin, Phone, Mail, Printer, Download, Copy, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface SaleItem {
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface SaleData {
    id: string;
    sale_number: string;
    shop_name: string;
    shop_address?: string;
    shop_phone?: string;
    staff_name: string;
    customer_name: string;
    created_at: string;
    items: SaleItem[];
    subtotal: number;
    discount: number;
    total: number;
    payment_method: string;
}

interface ReceiptComponentProps {
    sale: SaleData;
    onClose: () => void;
}

export default function ReceiptComponent({ sale, onClose }: ReceiptComponentProps) {
    const receiptRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const printContent = receiptRef.current;
        if (printContent) {
            const originalContents = document.body.innerHTML;
            const printContents = printContent.innerHTML;

            // Create a print window
            document.body.innerHTML = printContents;

            // Add specific print styles
            const style = document.createElement('style');
            style.innerHTML = `
                @media print {
                    body { 
                        font-family: 'Courier New', Courier, monospace; 
                        width: 80mm; 
                        margin: 0;
                        padding: 5px;
                        color: black;
                    }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    
                    /* Reset defaults */
                    * { box-sizing: border-box; }
                    
                    /* Helper overrides for print readability */
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .text-sm { font-size: 12px; }
                    .text-xs { font-size: 10px; }
                    .border-b { border-bottom: 1px dashed #000; }
                    .border-t { border-top: 1px dashed #000; }
                    .mb-2 { margin-bottom: 0.5rem; }
                    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
                    
                    /* Ensure grid works as 12-col via tailwind, don't override generic .grid */
                    /* If specific layout needed, use specific classes */
                }
            `;
            document.head.appendChild(style);

            window.print();

            // Restore original state
            document.body.innerHTML = originalContents;
            window.location.reload(); // Simplest way to restore React state cleanly after body nuke
        }
    };

    const handleDownload = async () => {
        if (receiptRef.current) {
            const canvas = await html2canvas(receiptRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');

            // For a longer receipt, we might want a different format, but A4 PDF or vertical image is standard
            const pdf = new jsPDF({
                unit: 'mm',
                format: [80, 200] // 80mm width (POS standard), arbitrary height
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`receipt-${sale.sale_number}.pdf`);
        }
    };

    const handleCopy = () => {
        const text = `
Receipt: ${sale.sale_number}
Shop: ${sale.shop_name}
Date: ${new Date(sale.created_at).toLocaleString()}
--------------------------------
${sale.items.map(item => `${item.product_name} x${item.quantity} - ₦${item.total_price.toLocaleString()}`).join('\n')}
--------------------------------
Total: ₦${sale.total.toLocaleString()}
        `.trim();

        navigator.clipboard.writeText(text);
        alert("Receipt copied to clipboard!");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col w-full max-w-sm sm:max-w-md">

                {/* Header Actions */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-700">Receipt Preview</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Receipt Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-100 flex justify-center">
                    <div
                        ref={receiptRef}
                        className="bg-white p-6 shadow-sm w-full font-mono text-sm leading-relaxed"
                        style={{ maxWidth: '80mm', minHeight: '300px' }} // 80mm printer simulation
                    >
                        {/* Store Info */}
                        <div className="text-center mb-6">
                            <div className="flex justify-center mb-2">
                                <ShoppingBag className="w-8 h-8 text-black" />
                            </div>
                            <h2 className="text-xl font-bold uppercase tracking-wider mb-1">{sale.shop_name}</h2>
                            {sale.shop_address && <p className="text-xs text-gray-500 mb-1">{sale.shop_address}</p>}
                            {sale.shop_phone && <p className="text-xs text-gray-500">{sale.shop_phone}</p>}
                        </div>

                        {/* Transaction Details */}
                        <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4 text-xs">
                            <div className="flex justify-between mb-1">
                                <span className="text-gray-500">Receipt No:</span>
                                <span className="font-bold">{sale.sale_number}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span className="text-gray-500">Date:</span>
                                <span>{new Date(sale.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span className="text-gray-500">Staff:</span>
                                <span>{sale.staff_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Customer:</span>
                                <span>{sale.customer_name}</span>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="mb-4">
                            <div className="grid grid-cols-12 gap-2 font-bold border-b border-gray-200 pb-2 mb-2 text-xs uppercase">
                                <div className="col-span-6">Item</div>
                                <div className="col-span-2 text-center">Qty</div>
                                <div className="col-span-4 text-right">Price</div>
                            </div>
                            <div className="space-y-2">
                                {sale.items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 text-xs">
                                        <div className="col-span-6 break-words">{item.product_name}</div>
                                        <div className="col-span-2 text-center">x{item.quantity}</div>
                                        <div className="col-span-4 text-right font-medium">₦{item.total_price.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="border-t-2 border-dashed border-gray-300 pt-4 mb-6">
                            <div className="flex justify-between mb-1 text-xs">
                                <span className="text-gray-600">Subtotal</span>
                                <span>₦{sale.subtotal.toLocaleString()}</span>
                            </div>
                            {sale.discount > 0 && (
                                <div className="flex justify-between mb-1 text-xs text-green-600">
                                    <span>Discount</span>
                                    <span>-₦{sale.discount.toLocaleString()}</span>
                                </div>
                            )}

                            <div className="flex justify-between mt-3 text-lg font-bold border-t border-gray-200 pt-3">
                                <span>Total</span>
                                <span>₦{sale.total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between mt-1 text-xs text-gray-500">
                                <span>Payment Method</span>
                                <span className="uppercase">{sale.payment_method}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center text-xs text-gray-400 mt-8 space-y-1">
                            <p>Thank you for your patronage!</p>
                            <p>Please come again.</p>
                            <div className="pt-4 opacity-50">
                                <p>Powered by Tuhans Inventory</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t bg-white flex justify-between gap-3">
                    <button
                        onClick={handleCopy}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline">Copy Text</span>
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Save Image</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg hover:shadow-xl"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Print POS</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
