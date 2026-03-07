import React from "react";

export default function TestPage() {
    return (
        <div
            style={{
                padding: "48px 24px",
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div
                style={{
                    width: "min(820px, 100%)",
                    padding: "36px",
                    borderRadius: "20px",
                    background:
                        "linear-gradient(135deg, rgba(18, 14, 8, 0.9), rgba(28, 22, 12, 0.85))",
                    border: "1px solid rgba(212, 175, 55, 0.35)",
                    boxShadow:
                        "0 20px 50px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
                    color: "#F7E7B4",
                    fontFamily: '"Playfair Display", "Times New Roman", serif',
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px",
                        marginBottom: "20px",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: "28px",
                                fontWeight: 700,
                                letterSpacing: "0.4px",
                            }}
                        >
                            Test Suite
                        </div>
                        <div
                            style={{
                                marginTop: "6px",
                                color: "rgba(247, 231, 180, 0.75)",
                                fontSize: "14px",
                                fontFamily: '"Montserrat", "Arial", sans-serif',
                            }}
                        >
                            High-end gold controls for premium UI testing
                        </div>
                    </div>
                    <div
                        style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            background:
                                "radial-gradient(circle at 30% 30%, #F7E7B4, #D4AF37 55%, #8C6B12)",
                            boxShadow: "0 0 18px rgba(212, 175, 55, 0.5)",
                        }}
                    />
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "12px",
                        marginBottom: "18px",
                        fontFamily: '"Montserrat", "Arial", sans-serif',
                    }}
                >
                    <button
                        type="button"
                        style={{
                            background:
                                "linear-gradient(135deg, #F7E7B4, #D4AF37)",
                            color: "#1A1405",
                            border: "1px solid #B88918",
                            borderRadius: "12px",
                            padding: "12px 16px",
                            fontWeight: 600,
                            letterSpacing: "0.3px",
                            cursor: "pointer",
                            boxShadow:
                                "0 10px 22px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
                        }}
                    >
                        Gold Primary
                    </button>
                    <button
                        type="button"
                        style={{
                            background:
                                "linear-gradient(135deg, #FCECC2, #E7C86A)",
                            color: "#2A1F07",
                            border: "1px solid #C79A2E",
                            borderRadius: "12px",
                            padding: "12px 16px",
                            fontWeight: 600,
                            letterSpacing: "0.3px",
                            cursor: "pointer",
                            boxShadow:
                                "0 8px 18px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
                        }}
                    >
                        Gold Satin
                    </button>
                    <button
                        type="button"
                        style={{
                            backgroundColor: "transparent",
                            color: "#F7E7B4",
                            border: "1px solid rgba(247, 231, 180, 0.7)",
                            borderRadius: "12px",
                            padding: "12px 16px",
                            fontWeight: 600,
                            letterSpacing: "0.3px",
                            cursor: "pointer",
                            boxShadow: "inset 0 0 0 1px rgba(212, 175, 55, 0.5)",
                        }}
                    >
                        Gold Outline
                    </button>
                    <button
                        type="button"
                        style={{
                            background:
                                "linear-gradient(135deg, #3A2A0F, #1C1407)",
                            color: "#D4AF37",
                            border: "1px solid rgba(212, 175, 55, 0.45)",
                            borderRadius: "12px",
                            padding: "12px 16px",
                            fontWeight: 600,
                            letterSpacing: "0.3px",
                            cursor: "pointer",
                            boxShadow:
                                "0 12px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                        }}
                    >
                        Deep Bronze
                    </button>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px",
                        fontFamily: '"Montserrat", "Arial", sans-serif',
                        color: "rgba(247, 231, 180, 0.8)",
                        fontSize: "13px",
                        letterSpacing: "0.4px",
                        textTransform: "uppercase",
                    }}
                >
                    <div>Premium Controls</div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <span
                            style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "999px",
                                backgroundColor: "#D4AF37",
                                boxShadow: "0 0 10px rgba(212, 175, 55, 0.6)",
                            }}
                        />
                        <span
                            style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "999px",
                                backgroundColor: "#F7E7B4",
                                boxShadow: "0 0 8px rgba(247, 231, 180, 0.5)",
                            }}
                        />
                        <span
                            style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "999px",
                                backgroundColor: "#8C6B12",
                                boxShadow: "0 0 6px rgba(140, 107, 18, 0.5)",
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
