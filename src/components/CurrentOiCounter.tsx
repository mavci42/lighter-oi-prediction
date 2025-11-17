import React from "react";

type CurrentOiCounterProps = {
  value: number;
  label?: string;
};

const formatCurrencyTrLong = (value: number) => {
  // 1814816024 -> "$1.814.816.024"
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
    border: "1px solid rgba(31, 41, 55, 1)", // koyu gri çerçeve (theme'e uygun)
    background:
      "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(17,24,39,1) 40%, rgba(30,64,175,0.35) 100%)",
    padding: "12px 16px",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.45)",
    boxSizing: "border-box",
  };

  const trackStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 8px",
    borderRadius: 10,
    backgroundColor: "#020617", // çok koyu şerit (odometre rayı)
    border: "1px solid rgba(75, 85, 99, 0.8)",
    boxShadow: "inset 0 0 4px rgba(0,0,0,0.9)",
  };

  const digitBoxStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
    height: 26,
    marginRight: 2,
    borderRadius: 4,
    backgroundColor: "#020617",
    border: "1px solid rgba(55, 65, 81, 0.9)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.7)",
  };

  const digitTextStyle: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: 16,
    color: "#E5E7EB",
    lineHeight: 1,
  };

  const labelStyle: React.CSSProperties = {
    marginTop: 6,
    fontSize: 12,
    color: "#9CA3AF", // nötr gri label
  };

  return (
    <div style={containerStyle}>
      <div style={trackStyle}>
        {formatted.split("").map((ch, idx) => (
          <div key={idx} style={digitBoxStyle}>
            <span style={digitTextStyle}>{ch}</span>
          </div>
        ))}
      </div>
      <div>
        <span style={labelStyle}>{label}</span>
      </div>
    </div>
  );
};