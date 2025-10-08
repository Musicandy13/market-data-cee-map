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
import "./App.css"; // Ensure your CSS file is in the correct location

/* ===== Helpers ===== */
function fmtNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtMoney(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPercent(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  // If the number is a decimal (e.g., 0.075), format as percentage
  if (Math.abs(n) <= 1 && n !== 0) return (n * 100).toFixed(2) + "%";
  // If the number is already a percentage (e.g., 7.5), treat it as such
  return Number(n).toFixed(2) + "%";
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

function Row({ label, value }) {
  return (
    <div className="row">
      <div className="row-label">{label}</div>
      <div className="row-value">{value}</div>
    </div>
  );
}

const sortPeriods = (a, b) => {
  const [qa, ya] = a.split(" ");
  const [qb, yb] = b.split(" ");
  if (ya !== yb) return Number(ya) - Number(yb);
  return Number(qa.replace("Q", "")) - Number(qb.replace("Q", ""));
};

/* ===== Build historical series ===== */
function buildTrendSeries(raw, country, city, submarket, metric) {
  const periodsObj = raw?.countries?.[country]?.cities?.[city]?.periods;
  if (!periodsObj) return [];
  
  const periods = Object.keys(periodsObj);
  const out = [];
  
  for (const p of periods.sort(sortPeriods)) {
    const cityData = periodsObj[p];
    if (!cityData) continue;
    
    const subMarketData = cityData.subMarkets?.[submarket] || {};
    const marketData = cityData.market || {};
    const leasingSub = cityData.subMarkets?.[submarket]?.leasing || {};
    const leasingCity = cityData.leasing || {};
    
    const merged = { ...marketData, ...leasingCity, ...subMarketData, ...leasingSub };
    let val = coerceNumber(merged[metric]);
    
    if (val === null) continue;
    
    // For chart display: Convert decimal percentages (e.g., 0.075) to whole numbers (e.g., 7.5) for better Y-axis scaling
    if (metric === "vacancyRate" || metric === "primeYield") {
      if (Math.abs(val) <= 1) val = val * 100;
    }
    
    out.push({ period: p, value: val });
  }
  return out;
}

/* ===== Tooltip for Chart ===== */
const SingleTooltip = ({ active, payload, label, metric }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    let text = fmtNumber(val);
    
    // Reformat the value back to its displayed percentage/money format
    if (metric === "vacancyRate" || metric === "primeYield") {
      // The chart value is the percentage number (e.g., 7.5), so divide by 100 for fmtPercent
      text = fmtPercent(val / 100); 
    }
    if (
      metric === "primeRentEurSqmMonth" ||
      metric === "averageRentEurSqmMonth" ||
      metric === "serviceChargeEurSqmMonth"
    )
      text = fmtMoney(val);
      
    return (
      <div style={{ background: "white", border: "1px solid #ccc", padding: "4px 8px", fontSize: "12px" }}>
        <strong>{label}</strong>
        <div>{text}</div>
      </div>
    );
  }
  return null;
};

/* ===== Chart ===== */
function BarTrendChart({ data, metric }) {
  if (!data || data.length === 0) return <div style={{ marginTop: 10 }}>No data for this metric.</div>;

  // Formatter for YAxis and LabelList
  const formatValue = (v) => {
    // If it's a percentage metric, the value 'v' is already the number (e.g., 7.5), so we format it as a percentage
    if (metric === "vacancyRate" || metric === "primeYield") return fmtPercent(v / 100);
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
        {/* Y-axis formatter */}
        <YAxis tickFormatter={(v) => formatValue(v)} /> 
        {/* Tooltip uses its own formatting logic */}
        <Tooltip content={<SingleTooltip metric={metric} />} />
        <Line type="monotone" dataKey="value" stroke="#999" strokeDasharray="4 4" dot={{ r: 3, fill: "#666" }} />
        <Bar dataKey="value" fill="#003366" radius={[4, 4, 0, 0]}>
          {/* LabelList formatter */}
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

/* ===== Independent Comparison Block ===== */
function ComparisonBlock({ raw }) {
  if (!raw) return null;
  const countries = Object.keys(raw.countries || {});
  const results = [];

  for (const c of countries) {
    const cities = Object.keys(raw.countries[c]?.cities || {});
    for (const ct of cities) {
      const periods = Object.keys(raw.countries[c].cities[ct]?.periods || {});
      if (periods.length === 0) continue;
      
      const sortedPeriods = periods.sort(sortPeriods);
      const latest = sortedPeriods[sortedPeriods.length - 1]; // Find the latest period
      const data = raw.countries[c].cities[ct].periods[latest];
      
      const market = data.market || {}; 
      
      const val = coerceNumber(market.primeRentEurSqmMonth);
      if (val) results.push({ country: c, city: ct, rent: val, period: latest });
    }
  }

  results.sort((a, b) => b.rent - a.rent);

  return (
    <div className="section-box">
      <div className="section-header">
        <span>⚖️</span> Comparison of Prime Rents (Latest Period)
      </div>
      {results.map((r) => (
        <div key={`${r.city}-${r.period}`} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
          <div>{r.city} ({r.country}) <span style={{fontSize: '0.8em', color: '#666'}}>— {r.period}</span></div>
          <div>{fmtMoney(r.rent)} €/sqm/month</div>
        </div>
      ))}
    </div>
  );
}

/* ===== Main App ===== */
export default function DataExplorerApp() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState(null);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [submarket, setSubmarket] = useState("");
  const [period, setPeriod] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("primeRentEurSqmMonth");

  /* === Load JSON and Set Initial State === */
  useEffect(() => {
    setLoading(true);
    // Assuming market_data.json is accessible via the relative path
    fetch("/market_data.json") 
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setRaw(json);
        setLoading(false);
        
        const countries = Object.keys(json?.countries || {});
        if (countries.length) {
            const firstCountry = countries[0];
            setCountry(firstCountry);
            
            const firstCity = Object.keys(json.countries[firstCountry]?.cities || {})[0] || "";
            setCity(firstCity);
            
            // Get and sort periods to ensure the first one is the earliest
            const periods = Object.keys(json.countries[firstCountry]?.cities?.[firstCity]?.periods || {});
            const firstPeriod = periods.sort(sortPeriods)[0] || ""; 
            setPeriod(firstPeriod);
            
            const firstSubmarkets = firstPeriod
                ? Object.keys(json.countries[firstCountry]?.cities?.[firstCity]?.periods?.[firstPeriod]?.subMarkets || {})
                : [];
            setSubmarket(firstSubmarkets[0] || "");
        }
      })
      .catch((err) => {
        setErrorLoading(err.message || String(err));
        setLoading(false);
      });
  }, []); 

  if (loading) return <div style={{ padding: 30 }}>Loading…</div>;
  if (errorLoading)
    return (
      <div style={{ padding: 30, color: "crimson" }}>
        Error loading data: {errorLoading}
      </div>
    );

  /* === Data Access on Render (Safely) === */
  const countries = Object.keys(raw?.countries || {});
  const currentCities = country ? Object.keys(raw.countries[country]?.cities || {}) : [];
  // Sort periods for the selector
  const currentPeriods = city ? Object.keys(raw.countries[country]?.cities?.[city]?.periods || {}).sort(sortPeriods) : [];

  const periodObj = raw.countries[country]?.cities?.[city]?.periods?.[period];
  const subs = periodObj ? Object.keys(periodObj.subMarkets || {}) : [];

  // Getter function: Submarket data overrides market data
  const g = (k) => periodObj?.subMarkets?.[submarket]?.[k] ?? periodObj?.market?.[k] ?? null;

  // Leasing data access: Submarket leasing > City leasing
  const leasing = periodObj?.subMarkets?.[submarket]?.leasing ?? periodObj?.leasing ?? {};

  /* === Cascading Selector Handlers: Fix for state synchronization crash === */
  
  const handleCountryChange = (e) => {
    const c = e.target.value;
    setCountry(c);
    
    // Calculate and set all dependent values immediately
    const nextCities = Object.keys(raw.countries[c]?.cities || {});
    const nextCity = nextCities[0] || "";
    setCity(nextCity);

    const nextPeriods = Object.keys(raw.countries[c]?.cities?.[nextCity]?.periods || {}).sort(sortPeriods);
    const nextPeriod = nextPeriods[0] || "";
    setPeriod(nextPeriod);

    const nextSubmarkets = nextPeriod 
        ? Object.keys(raw.countries[c]?.cities?.[nextCity]?.periods?.[nextPeriod]?.subMarkets || {}) 
        : [];
    setSubmarket(nextSubmarkets[0] || "");
  };

  const handleCityChange = (e) => {
    const cityVal = e.target.value;
    setCity(cityVal);
    
    // Calculate and set dependent values immediately
    const nextPeriods = Object.keys(raw.countries[country]?.cities?.[cityVal]?.periods || {}).sort(sortPeriods);
    const nextPeriod = nextPeriods[0] || "";
    setPeriod(nextPeriod);

    const nextSubmarkets = nextPeriod 
        ? Object.keys(raw.countries[country]?.cities?.[cityVal]?.periods?.[nextPeriod]?.subMarkets || {}) 
        : [];
    setSubmarket(nextSubmarkets[0] || "");
  };
  
  const handlePeriodChange = (e) => {
      const p = e.target.value;
      setPeriod(p);
      
      // Recalculate submarkets for the new period
      const nextSubmarkets = p 
        ? Object.keys(raw.countries[country]?.cities?.[city]?.periods?.[p]?.subMarkets || {}) 
        : [];
      // If the current submarket is no longer valid, default to the first one
      if (!nextSubmarkets.includes(submarket)) {
          setSubmarket(nextSubmarkets[0] || "");
      }
  }


  /* === Render === */
  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1>{city} Office Market</h1>

      {/* Selectors */}
      <div>
        <select value={country} onChange={handleCountryChange}>
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={city} onChange={handleCityChange}>
          {currentCities.map((ct) => (
            <option key={ct}>{ct}</option>
          ))}
        </select>
        <select value={submarket} onChange={(e) => setSubmarket(e.target.value)}>
          {subs.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={period} onChange={handlePeriodChange}>
          {currentPeriods.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      <h2>
        {city} — {period} — {submarket || "City total"}
      </h2>

      {/* ---- Market Metrics (The previously error-prone section is now correct) ---- */}
      <div className="section-box">
        <div className="section-header">
          <span>📊</span> Market Metrics
        </div>
        <Row label="Total Stock (sqm)" value={fmtNumber(g("totalStock"))} />
        <Row label="Vacancy (sqm)" value={fmtNumber(g("vacancy"))} />
        <Row label="Vacancy Rate (%)" value={fmtPercent(g("vacancyRate"))} />
        <Row label="Take-up (sqm)" value={fmtNumber(g("takeUp"))} />
        <Row label="Net Absorption (sqm, YTD)" value={fmtNumber(g("netAbsorption"))} />
        <Row label="Completed (sqm, YTD)" value={fmtNumber(g("completionsYTD"))} />
        <Row label="Under Construction (sqm)" value={fmtNumber(g("underConstruction"))} />
        <Row label="Prime Rent (€/sqm/month)" value={fmtMoney(g("primeRentEurSqmMonth"))} />
        <Row label="Average Rent (€/sqm/month)" value={fmtMoney(g("averageRentEurSqmMonth"))} />
        <Row label="Prime Yield (%)" value={fmtPercent(g("primeYield"))} />
      </div>
      
      {/* ---- Leasing ---- */}
      <div className="section-box">
        <div className="section-header">
          <span>📝</span> Leasing Conditions
        </div>
        <Row label="Rent-free period (month/year)" value={fmtNumber(leasing?.rentFreeMonthPerYear)} />
        <Row label="Lease length (months)" value={fmtNumber(leasing?.leaseLengthMonths)} />
        <Row label="Fit-out (€/sqm)" value={fmtNumber(leasing?.fitOutEurSqmShellCore)} />
        <Row label="Service charge (€/sqm/month)" value={fmtMoney(leasing?.serviceChargeEurSqmMonth)} />
      </div>

      {/* ---- Historical Trend ---- */}
      <div className="section-box">
        <div className="section-header">
          <span>📈</span> Historical Trend
        </div>
        <div style={{ padding: "10px" }}>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              fontSize: "15px",
              marginBottom: "10px",
            }}
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

      {/* ---- Independent Comparison ---- */}
      <ComparisonBlock raw={raw} />
    </div>
  );
}
