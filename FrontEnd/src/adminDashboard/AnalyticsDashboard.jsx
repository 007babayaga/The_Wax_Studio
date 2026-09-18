import React, { useEffect, useState } from "react";

const INVENTORY_ENDPOINT = "http://localhost:5400/api/v1/admin/getProducts";
const LOW_STOCK_THRESHOLD = 10;

const salesTrend = [
    { day: "Mon", value: 42 },
    { day: "Tue", value: 58 },
    { day: "Wed", value: 36 },
    { day: "Thu", value: 70 },
    { day: "Fri", value: 88 },
    { day: "Sat", value: 95 },
    { day: "Sun", value: 76 }
];

const recentSales = [
    { customer: "Priya S.", product: "Vanilla Bloom", amount: "₹1,240", time: "2 hrs ago" },
    { customer: "Rohit K.", product: "Amber Night", amount: "₹1,980", time: "4 hrs ago" },
    { customer: "Aisha M.", product: "Rose Petal", amount: "₹1,520", time: "Today" },
    { customer: "Karan V.", product: "Sandalwood Calm", amount: "₹2,100", time: "Today" }
];

const styles = {
    wrap: {
        marginTop: 20,
        background: "#fff",
        border: "1px solid #DED4C1",
        borderRadius: 12,
        padding: 20
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginBottom: 18,
        flexWrap: "wrap"
    },
    title: {
        fontSize: 20,
        fontWeight: 700,
        color: "#2A2118",
        fontFamily: "'Playfair Display', serif"
    },
    chip: {
        fontSize: 11,
        padding: "6px 10px",
        borderRadius: 999,
        background: "#EFE3C9",
        color: "#7A5B12",
        fontWeight: 700
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        marginBottom: 18
    },
    statCard: {
        background: "#F9F4ED",
        border: "1px solid #E8DDCC",
        borderRadius: 10,
        padding: 14
    },
    statLabel: {
        fontSize: 12,
        color: "#6B5E4F",
        marginBottom: 6
    },
    statValue: {
        fontSize: 26,
        fontWeight: 700,
        color: "#2A2118"
    },
    statChange: {
        fontSize: 11,
        marginTop: 6,
        fontWeight: 600,
        color: "#3E6E4C"
    },
    contentGrid: {
        display: "grid",
        gridTemplateColumns: "1.3fr 1fr",
        gap: 18,
        marginBottom: 16
    },
    panel: {
        background: "#F9F4ED",
        border: "1px solid #E8DDCC",
        borderRadius: 10,
        padding: 16
    },
    panelTitle: {
        fontSize: 15,
        fontWeight: 700,
        color: "#2A2118",
        marginBottom: 14
    },
    chartWrap: {
        display: "flex",
        alignItems: "flex-end",
        gap: 10,
        height: 170,
        paddingTop: 8
    },
    barCol: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
        gap: 8
    },
    bar: {
        width: "100%",
        maxWidth: 28,
        borderRadius: 8,
        background: "linear-gradient(180deg, #7A5B12 0%, #6E2A2E 100%)",
        minHeight: 20
    },
    barLabel: {
        fontSize: 10,
        color: "#6B5E4F"
    },
    table: {
        width: "100%",
        borderCollapse: "collapse"
    },
    th: {
        textAlign: "left",
        padding: "8px 6px",
        fontSize: 11,
        color: "#6B5E4F",
        borderBottom: "1px solid #DED4C1"
    },
    td: {
        padding: "8px 6px",
        fontSize: 13,
        color: "#2A2118",
        borderBottom: "1px solid #F0E7DA"
    },
    badge: {
        display: "inline-block",
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase"
    },
    salesList: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginTop: 8
    },
    saleRow: {
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        alignItems: "center",
        background: "#fff",
        border: "1px solid #F0E7DA",
        borderRadius: 8,
        padding: "10px 12px"
    },
    saleMeta: {
        fontSize: 12,
        color: "#6B5E4F"
    },
    saleAmount: {
        fontWeight: 700,
        color: "#2A2118"
    }
};

const getStatusStyle = (status) => {
    if (status === "Critical") return { background: "#F9D7D7", color: "#B23A2E" };
    if (status === "Low") return { background: "#F8E7C5", color: "#7A5B12" };
    return { background: "#DCEFE1", color: "#3E6E4C" };
};

export default function AnalyticsDashboard() {
    const [stockItems, setStockItems] = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [inventoryError, setInventoryError] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadInventory() {
            try {
                const response = await fetch(INVENTORY_ENDPOINT, { credentials: "include" });
                const result = await response.json();

                if (!response.ok || !result.isSuccess) {
                    throw new Error(result.message || "Unable to load inventory");
                }

                if (isMounted) {
                    setStockItems((result.products || []).filter((product) => product.isActive !== false).map((product) => ({
                        name: product.name,
                        stock: product.stock || 0,
                        status: (product.stock || 0) <= 0 ? "Critical" : (product.stock || 0) <= LOW_STOCK_THRESHOLD ? "Low" : "Healthy"
                    })));
                }
            } catch (error) {
                if (isMounted) setInventoryError(error.message);
            } finally {
                if (isMounted) setInventoryLoading(false);
            }
        }

        loadInventory();
        return () => {
            isMounted = false;
        };
    }, []);

    const lowStockCount = stockItems.filter((item) => item.status !== "Healthy").length;

    return (
        <div style={{ ...styles.wrap, overflowX: "auto" }}>
            <div style={styles.header}>
                <div style={styles.title}>Analytics dashboard</div>
                <span style={styles.chip}>This month</span>
            </div>

            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Total revenue</div>
                    <div style={styles.statValue}>₹48.2K</div>
                    <div style={styles.statChange}>+18.4% vs last month</div>
                </div>

                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Orders</div>
                    <div style={styles.statValue}>312</div>
                    <div style={styles.statChange}>+12.1% growth</div>
                </div>

                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Avg. order value</div>
                    <div style={styles.statValue}>₹1,550</div>
                    <div style={styles.statChange}>+6.7% uplift</div>
                </div>

                <div style={styles.statCard}>
                    <div style={styles.statLabel}>Low stock alerts</div>
                    <div style={styles.statValue}>{inventoryLoading ? "..." : lowStockCount}</div>
                    <div style={styles.statChange}>Live inventory data</div>
                </div>
            </div>

            <div style={{ ...styles.contentGrid, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                <div style={styles.panel}>
                    <div style={styles.panelTitle}>Sales trend</div>
                    <div style={styles.chartWrap}>
                        {salesTrend.map((item) => (
                            <div key={item.day} style={styles.barCol}>
                                <div
                                    style={{
                                        ...styles.bar,
                                        height: `${item.value}%`
                                    }}
                                />
                                <span style={styles.barLabel}>{item.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.panel}>
                    <div style={styles.panelTitle}>Stock overview</div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Product</th>
                                <th style={styles.th}>Stock</th>
                                <th style={styles.th}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventoryLoading && (
                                <tr><td style={styles.td} colSpan="3">Loading inventory...</td></tr>
                            )}
                            {!inventoryLoading && inventoryError && (
                                <tr><td style={styles.td} colSpan="3">{inventoryError}</td></tr>
                            )}
                            {!inventoryLoading && !inventoryError && stockItems.length === 0 && (
                                <tr><td style={styles.td} colSpan="3">No active products found.</td></tr>
                            )}
                            {!inventoryLoading && !inventoryError && stockItems.map((item) => (
                                <tr key={item.name}>
                                    <td style={styles.td}>{item.name}</td>
                                    <td style={styles.td}>{item.stock}</td>
                                    <td style={styles.td}>
                                        <span style={{ ...styles.badge, ...getStatusStyle(item.status) }}>{item.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={styles.panel}>
                <div style={styles.panelTitle}>Recent sales</div>
                <div style={styles.salesList}>
                    {recentSales.map((sale) => (
                        <div key={`${sale.customer}-${sale.product}`} style={styles.saleRow}>
                            <div>
                                <div style={{ fontWeight: 700, color: "#2A2118" }}>{sale.customer}</div>
                                <div style={styles.saleMeta}>{sale.product} • {sale.time}</div>
                            </div>
                            <div style={styles.saleAmount}>{sale.amount}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
