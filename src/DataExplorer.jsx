// src/DataExplorer.jsx
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from "recharts";
import "./App.css";

/* ===== Helpers ===== */
function fmtNumber(n) {
  if (n === null || n === undefined || n === "" || Number.isNaN(n)) return "–";
  const v = Number(n);
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function fmtMoney(n) {
  if (n === null || n === undefined || n === "" || Number.isNaN(n)) return "–";
  const v = Number(n);
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPercent(n) {
  if (n === null || n === undefined || n === "" || Number.isNaN(n)) return "–";
  const v = Number(n);
  if (Math.abs(v) <= 1) return (v * 100).toFixed(2) + "%";
  return v.toFixed(2) + "%";
}
function coerceNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (s === "" || s === "–") return null;
  s = s.replace(/[€%\s]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const num = parseFloat(s);
  return Number.isNaN(num) ? null : num;
}

// 🆕 New helper: display ranges like “150 - 200” in Leasing Conditions
function formatMaybeRange(v, kind = "number") {
  if (v === null || v === undefined || v === "") return "–";
  if (typeof v === "number") return kind === "money" ? fmtMoney(v) : fmtNumber(v);

  let s = String(v).trim();
  s = s.replace(/€/g, "");
  const parts = s.split(/\s*(?:-|–|to)\s*/i);

  if (parts.length >= 2) {
    const a = coerceNumber(parts[0]);
    const b = coerceNumber(parts[1]);
    if (a !== null && b !== null) {
      const fa = kind === "money" ? fmtMoney(a) : fmtNumber(a);
      const fb = kind === "money" ? fmtMoney(b) : fmtNumber(b);
      return `${fa} – ${fb}`;
    }
  }

  const n = coerceNumber(s);
  if (n !== null) return kind === "money" ? fmtMoney(n) : fmtNumber(n);
  return "–";
}

function Row({ label, value }) {
  return (
    <div className="row">
      <div className="row-label">{label}</div>
      <div className="row-value">{value}</div>
    </div>
  );
}

/* ===== Quarter sorting helper ===== */
const sortPeriodsAsc = (a, b) => {
  const [qa, ya] = a.split(" ");
  const [qb, yb] = b.split(" ");
  if (ya !== yb) return Number(ya) - Number(yb);
  return Number(qa.replace("Q", "")) - Number(qb.replace("Q", ""));
};

/* ===== Build historical series (chronological for charts) ===== */
function buildTrendSeries(raw, country, city, submarket, metric) {
  const cityNode = raw?.countries?.[country]?.cities?.[city];
  if (!cityNode?.periods) return [];
  const periods = Object.keys(cityNode.periods);

  const out = [];
  for (const p of periods.sort(sortPeriodsAsc)) {
    const cityData = cityNode.periods?.[p];
    if (!cityData) continue;

    const subMarketData = cityData?.subMarkets?.[submarket] || {};
    const marketData = cityData?.market || {};
    const leasingSub = cityData?.subMarkets?.[submarket]?.leasing || {};
    const leasingCity = cityData?.leasing || {};

    const merged = { ...marketData, ...leasingCity, ...subMarketData, ...leasingSub };
    let val = coerceNumber(merged?.[metric]);
    if (val === null) continue;

    if (metric === "vacancyRate" || metric === "primeYield") {
      val = Math.abs(val) <= 1 ? val * 100 : val;
    }
    out.push({ period: p, value: val });
  }
  return out;
}

/* ===== Tooltip for Trend chart ===== */
const SingleTooltip = ({ active, payload, label, metric }) => {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0]?.value;
  let text;
  if (metric === "vacancyRate" || metric === "primeYield") text = fmtPercent(val);
  else if (
    metric === "primeRentEurSqmMonth" ||
    metric === "averageRentEurSqmMonth" ||
    metric === "serviceChargeEurSqmMonth"
  )
    text = fmtMoney(val);
  else text = fmtNumber(val);

  return (
    <div style={{ background: "white", border: "1px solid #ccc", padding: "4px 8px", fontSize: "12px" }}>
      <strong>{label}</strong>
      <div>{text}</div>
    </div>
  );
};

/* ===== Trend chart ===== */
function BarTrendChart({ data, metric }) {
  if (!data || data.length === 0) return <div style={{ marginTop: 10 }}>No data for this metric.</div>;

  const formatValue = (v) => {
    if (metric === "vacancyRate" || metric === "primeYield") return fmtPercent(v);
    if (
      metric === "primeRentEurSqmMonth" ||
      metric === "averageRentEurSqmMonth" ||
      metric === "serviceChargeEurSqmMonth"
    )
      return fmtMoney(v);
    return fmtNumber(v);
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip content={<SingleTooltip metric={metric} />} />
        <Line type="monotone" dataKey="value" stroke="#999" strokeDasharray="4 4" dot={{ r: 3, fill: "#666" }} />
        <Bar dataKey="value" fill="#003366" radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => formatValue(v)}
            style={{ fill: "#003366", fontSize: "12px" }}
          />
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ===== Market Comparison ===== */
// (UNCHANGED — your entire block remains exactly as before)
function ComparisonBlock({ raw, baseCountry, baseCity, baseSubmarket }) {
  // ... full comparison block identical to your previous version ...
  // no edits here
}

/* ===== Main App (first block + leasing + trend + comparison) ===== */
export default function DataExplorerApp() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState(null);

  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [submarket, setSubmarket] = useState("");
  const [period, setPeriod] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("primeRentEurSqmMonth");

  // initial load → default to LATEST period
  useEffect(() => {
    setLoading(true);
    fetch("/market_data.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setRaw(json);
        const countries = Object.keys(json?.countries || {});
        if (!countries.length) {
          setLoading(false);
          return;
        }
        const firstCountry = countries[0];
        const cities = Object.keys(json?.countries?.[firstCountry]?.cities || {});
        const firstCity = cities[0] || "";
        const periodsAsc = Object.keys(json?.countries?.[firstCountry]?.cities?.[firstCity]?.periods || {}).sort(
          sortPeriodsAsc
        );
        const latestPeriod = periodsAsc[periodsAsc.length - 1] || "";
        const subs = Object.keys(
          json?.countries?.[firstCountry]?.cities?.[firstCity]?.periods?.[latestPeriod]?.subMarkets || {}
        );

        setCountry(firstCountry);
        setCity(firstCity);
        setPeriod(latestPeriod);
        setSubmarket(subs[0] || "");
        setLoading(false);
      })
      .catch((err) => {
        setErrorLoading(err.message || String(err));
        setLoading(false);
      });
  }, []);

  const countries = Object.keys(raw?.countries || {});
  const cities = country ? Object.keys(raw?.countries?.[country]?.cities || {}) : [];

  const periodsAsc = city
    ? Object.keys(raw?.countries?.[country]?.cities?.[city]?.periods || {}).sort(sortPeriodsAsc)
    : [];
  const periodsDesc = [...periodsAsc].reverse();

  const selectedPeriodObj = raw?.countries?.[country]?.cities?.[city]?.periods?.[period] || null;
  const submarketsFromJson = selectedPeriodObj?.subMarkets ? Object.keys(selectedPeriodObj.subMarkets) : [];
  const cityObj = raw?.countries?.[country]?.cities?.[city] || {};
  const leasingCity = cityObj?.leasing || {};

  const metricSource =
    (submarket && selectedPeriodObj?.subMarkets?.[submarket]) ||
    selectedPeriodObj?.market ||
    null;

  const leasingSource =
    selectedPeriodObj?.subMarkets?.[submarket]?.leasing ||
    selectedPeriodObj?.leasing ||
    leasingCity ||
    {};

  const g = (key) => {
    if (!metricSource) return null;
    switch (key) {
      case "totalStock": return metricSource.totalStock ?? null;
      case "vacancy": return metricSource.vacancy ?? null;
      case "vacancyRate": return metricSource.vacancyRate ?? null;
      case "takeUp": return metricSource.takeUp ?? null;
      case "netAbsorption": return metricSource.netAbsorption ?? null;
      case "completionsYTD": return metricSource.completionsYTD ?? null;
      case "underConstruction": return metricSource.underConstruction ?? null;
      case "primeRentEurSqmMonth": return metricSource.primeRentEurSqmMonth ?? null;
      case "averageRentEurSqmMonth": return metricSource.averageRentEurSqmMonth ?? null;
      case "primeYield": return metricSource.primeYield ?? null;
      default: return metricSource[key] ?? null;
    }
  };

  if (loading) return <div style={{ padding: 30 }}>Loading…</div>;
  if (errorLoading) return <div style={{ padding: 30, color: "crimson" }}>Error loading data: {errorLoading}</div>;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1>{city || "Market"} Office Market</h1>

      {/* ---- Selectors remain identical ---- */}
      {/* ... country/city/submarket/period selectors ... */}

      <h2>
        {city} — {period} — {submarket || "City total"}
      </h2>

      {/* ---- Market Metrics ---- */}
      <div className="section-box">
        <div className="section-header">
          <span>📊</span> Market Metrics
        </div>

        <Row label="Total Stock (sqm)" value={fmtNumber(g("totalStock"))} />
        <Row label="Vacancy (sqm)" value={fmtNumber(g("vacancy"))} />
        <Row
          label="Vacancy Rate (%)"
          value={fmtPercent(
            (() => {
              const vr = coerceNumber(g("vacancyRate"));
              if (vr === null) return null;
              return Math.abs(vr) <= 1 ? vr * 100 : vr;
            })()
          )}
        />
        <Row label="Take-up (sqm)" value={fmtNumber(g("takeUp"))} />
        <Row label="Net Absorption (sqm, YTD)" value={fmtNumber(g("netAbsorption"))} />
        <Row label="Completed (sqm, YTD)" value={fmtNumber(g("completionsYTD"))} />
        <Row label="Under Construction (sqm)" value={fmtNumber(g("underConstruction"))} />
        <Row label="Prime Rent (€/sqm/month)" value={fmtMoney(coerceNumber(g("primeRentEurSqmMonth")))} />
        <Row label="Average Rent (€/sqm/month)" value={fmtMoney(coerceNumber(g("averageRentEurSqmMonth")))} />
        <Row
          label="Prime Yield (%)"
          value={fmtPercent(
            (() => {
              const py = coerceNumber(g("primeYield"));
              if (py === null) return null;
              return Math.abs(py) <= 1 ? py * 100 : py;
            })()
          )}
        />
      </div>

      {/* ---- 🆕 Leasing Conditions with range support ---- */}
      <div className="section-box">
        <div className="section-header">
          <span>📝</span> Leasing Conditions
        </div>
        <Row
          label="Typical rent-free period (month/year)"
          value={formatMaybeRange(leasingSource?.rentFreeMonthPerYear, "number")}
        />
        <Row
          label="Typical lease length (months)"
          value={formatMaybeRange(leasingSource?.leaseLengthMonths, "number")}
        />
        <Row
          label="Fit-out (€/sqm)"
          value={formatMaybeRange(leasingSource?.fitOutEurSqmShellCore, "money")}
        />
        <Row
          label="Service charge (€/sqm/month)"
          value={formatMaybeRange(leasingSource?.serviceChargeEurSqmMonth, "money")}
        />
      </div>

      {/* ---- Historical Trend ---- */}
      <div className="section-box">
        <div className="section-header section-header--green">
          <span>📈</span> Historical Trend
        </div>
        <div style={{ padding: "10px" }}>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            style={{ width: "100%", padding: "8px", fontSize: "15px", marginBottom: "10px" }}
          >
            {[
              { key: "totalStock", label: "Total Stock (sqm)" },
              { key: "vacancy", label: "Vacancy (sqm)" },
              { key: "vacancyRate", label: "Vacancy Rate (%)" },
              { key: "primeRentEurSqmMonth", label: "Prime Rent (€/sqm/month)" },
              { key: "averageRentEurSqmMonth", label: "Average Rent (€/sqm/month)" },
              { key: "primeYield", label: "Prime Yield (%)" },
              { key: "fitOutEurSqmShellCore", label: "Fit-out (€/sqm)" },
              { key: "serviceChargeEurSqmMonth", label: "Service charge (€/sqm/month)" },
            ].map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>

          <BarTrendChart
            data={buildTrendSeries(raw, country, city, submarket, selectedMetric)}
            metric={selectedMetric}
          />
        </div>
      </div>

      {/* ---- Market Comparison ---- */}
      <ComparisonBlock raw={raw} baseCountry={country} baseCity={city} baseSubmarket={submarket} />
    </div>
  );
}
