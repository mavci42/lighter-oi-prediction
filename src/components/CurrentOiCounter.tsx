import React from "react";

type CurrentOiCounterProps = {
  value: number;
  label?: string;
};

const formatCurrencyTrLong = (value: number) => {
  // 1731286402 -> "$1.731.286.402"
  return (
    "$" +
    new Intl.NumberFormat("tr-TR", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      useGrouping: true,
    }).format(Math.round(value))
  );
};

export const CurrentOiCounter: React.FC<CurrentOiCounterProps> = ({
  value,
  label = "Current OI (USD)",
}) => {
  const formatted = formatCurrencyTrLong(value);

  const containerStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 16,
    border: "1px solid rgba(254, 202, 202, 1)", // yumuşak kırmızı çerçeve
    backgroundColor: "#FFE4E6", // pastel açık kırmızı
    padding: "12px 16px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    boxSizing: "border-box",
  };

  const numberChipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "6px 14px",
    backgroundColor: "#FB7185", // daha koyu kırmızı şerit
    marginBottom: 4,
  };

  const numberTextStyle: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: "18px",
    letterSpacing: "0.12em",
    color: "#FEF2F2",
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "#9F1239", // koyu kırmızı ton
  };

  return (
    <div style={containerStyle}>
      <div style={numberChipStyle}>
        <span style={numberTextStyle}>{formatted}</span>
      </div>
      <div>
        <span style={labelStyle}>{label}</span>
      </div>
    </div>
  );
};