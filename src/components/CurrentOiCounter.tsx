import React from "react";

type CurrentOiCounterProps = {
  value: number;
  label?: string;
};

const formatCurrencyTr = (value: number) => {
  return (
    "$" +
    new Intl.NumberFormat("tr-TR", {
      maximumFractionDigits: 0,
    }).format(Math.round(value))
  );
};

export const CurrentOiCounter: React.FC<CurrentOiCounterProps> = ({
  value,
  label = "24sa Açık Pozisyon",
}) => {
  const formatted = formatCurrencyTr(value);

  return (
    <div className="w-full rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 shadow-sm select-none">
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center">
          <div className="inline-flex rounded-xl bg-rose-500/90 px-3 py-1">
            <span className="font-mono text-lg leading-none tracking-[0.18em] text-rose-50">
              {formatted}
            </span>
          </div>
        </div>
        <div>
          <span className="text-[12px] text-rose-700/80">{label}</span>
        </div>
      </div>
    </div>
  );
};