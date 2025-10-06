import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  ComposedChart,
} from "recharts";
import "./App.css";

/* === Formatting helpers === */
function fmtNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  if (Math.abs(n) >= 1000)
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtMoney(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPercent(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  if (Math.abs(n) <= 1) return (n * 100).toFixed(2) + "%";
  return Number(n).toFixed(2) + "%";
}

function Row({ label, value }) {
  return (
    <div className="row">
      <div className="row-label">{label}</div>
      <div className="row-value">{value}</div>
    </div>
  );
}

/* === Main Component === */
export default function DataExplorer() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState(null);

  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [submarket, setSubmarket] = useState("");
  const [period, setPeriod] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("primeRentEurSqmMonth");

  useEffect(() => {
    setLoading(true);
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
          const firstCity =
            Object.keys(json.countries[firstCountry]?.cities || {})[0] || "";
          setCity(firstCity);
          const periods = Object.keys(
            json.countries[firstCountry]?.cities?.[firstCity]?.periods || {}
          );
          if (periods.length) setPeriod(periods[0]);
          const firstSub =
            periods.length > 0
              ? Object.keys(
                  json.countries[firstCountry]?.cities?.[firstCity]?.periods?.[
                    periods[0]
                  ]?.subMarkets || {}
                )[0] || ""
              : "";
          setSubmarket(firstSub);
        }
      })
      .catch((err) => {
        setErrorLoading(err.message || String(err));
        setLoading(false);
      });
  }, []);

  const countries = Object.keys(raw?.countries || {});
  const cities = country
    ? Object.keys(raw?.countries?.[country]?.cities || {})
    : [];
  const periods = city
    ? Object.keys(raw?.countries?.[country]?.cities?.[city]?.periods || {})
    : [];

  const selectedPeriodObj =
    raw?.countries?.[country]?.cities?.[city]?.periods?.[period] || null;
  const submarketsFromJson = selectedPeriodObj?.subMarkets
    ? Object.keys(selectedPeriodObj.subMarkets)
    : [];

  const cityObj = raw?.countries?.[country]?.cities?.[city] || {};
  const metricSource =
    submarket && selectedPeriodObj?.subMarkets?.[submarket]
      ? selectedPeriodObj.subMarkets[submarket]
      : cityObj?.periods?.[period]?.market || null;

  const leasingSource =
    (submarket &&
      selectedPeriodObj?.subMarkets?.[submarket]?.leasing) ||
    cityObj?.periods?.[period]?.leasing ||
    {};

  const g = (key) => {
    if (!metricSource) return null;
    return metricSource[key] ?? null;
  };

  useEffect(() => {
    if (periods.length && !periods.includes(period)) setPeriod(periods[0]);
    if (submarketsFromJson.length && !submarketsFromJson.includes(submarket))
      setSubmarket(submarketsFromJson[0]);
  }, [city, country, raw, periods, submarketsFromJson]);

  if (loading) return <div style={{ padding: 30 }}>Loading market data…</div>;
  if (errorLoading)
    return (
      <div style={{ padding: 30, color: "crimson" }}>
        Error loading data: {errorLoading}
      </div>
    );

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1>{city} Office Market</h1>

      {/* --- Dropdowns --- */}
      <div>
        <select
          value={country}
          onChange={(e) => {
            const c = e.target.value;
            setCountry(c);
            const firstCity =
              Object.keys(raw?.countries?.[c]?.cities || {})[0] || "";
            setCity(firstCity);
            const newPeriods = Object.keys(
              raw?.countries?.[c]?.cities?.[firstCity]?.periods || {}
            );
            setPeriod(newPeriods[0] || "");
            const newSubs =
              newPeriods.length > 0
                ? Object.keys(
                    raw?.countries?.[c]?.cities?.[firstCity]?.periods?.[
                      newPeriods[0]
                    ]?.subMarkets || {}
                  )
                : [];
            setSubmarket(newSubs[0] || "");
          }}
        >
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={city}
          onChange={(e) => {
            const cityVal = e.target.value;
            setCity(cityVal);
            const newPeriods = Object.keys(
              raw?.countries?.[country]?.cities?.[cityVal]?.periods || {}
            );
            setPeriod(newPeriods[0] || "");
            const newSubs =
              newPeriods.length > 0
                ? Object.keys(
                    raw?.countries?.[country]?.cities?.[cityVal]?.periods?.[
                      newPeriods[0]
                    ]?.subMarkets || {}
                  )
                : [];
            setSubmarket(newSubs[0] || "");
          }}
        >
          {cities.map((ct) => (
            <option key={ct}>{ct}</option>
          ))}
        </select>

        <select value={submarket} onChange={(e) => setSubmarket(e.target.value)}>
          {submarketsFromJson.map((sm) => (
            <option key={sm}>{sm}</option>
          ))}
        </select>

        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {periods.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      <h2>
        {city} — {period} — {submarket}
      </h2>

      {!metricSource && <div>No data available for this selection.</div>}

      {metricSource && (
        <>
          {/* --- Market Metrics --- */}
          <div className="section-box">
            <div className="section-header">
              <span>📊</span> Market Metrics
            </div>
            <Row label="Total Stock (sqm)" value={fmtNumber(g("totalStock"))} />
            <Row label="Vacancy (sqm)" value={fmtNumber(g("vacancy"))} />
            <Row label="Vacancy Rate (%)" value={fmtPercent(g("vacancyRate"))} />
            <Row
              label="Prime Rent (€/sqm/month)"
              value={fmtMoney(g("primeRentEurSqmMonth"))}
            />
            <Row
              label="Average Rent (€/sqm/month)"
              value={fmtMoney(g("averageRentEurSqmMonth"))}
            />
            <Row label="Prime Yield (%)" value={fmtPercent(g("primeYield"))} />
          </div>

          {/* --- Leasing Conditions --- */}
          <div className="section-box">
            <div className="section-header">
              <span>📝</span> Leasing Conditions
            </div>
            <Row
              label="Fit-out (€/sqm)"
              value={fmtNumber(leasingSource?.fitOutEurSqmShellCore ?? null)}
            />
            <Row
              label="Service charge (€/sqm/month)"
              value={fmtMoney(leasingSource?.serviceChargeEurSqmMonth ?? null)}
            />
          </div>

          {/* --- Historical Trend Section --- */}
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
                  {
                    key: "primeRentEurSqmMonth",
                    label: "Prime Rent (€/sqm/month)",
                  },
                  {
                    key: "averageRentEurSqmMonth",
                    label: "Average Rent (€/sqm/month)",
                  },
                  { key: "primeYield", label: "Prime Yield (%)" },
                  { key: "fitOutEurSqmShellCore", label: "Fit-out (€/sqm)" },
                  {
                    key: "serviceChargeEurSqmMonth",
                    label: "Service charge (€/sqm/month)",
                  },
                ].map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>

              <BarTrendChart
                data={buildTrendDataFixed(raw, country, city, submarket, selectedMetric)}
                metric={selectedMetric}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* === Trend Builder (robust for submarkets) === */
function buildTrendDataFixed(raw, country, city, submarket, metric) {
  if (!raw?.countries?.[country]?.cities?.[city]) return [];
  const periods = Object.keys(raw.countries[country].cities[city].periods || {});

  const sortPeriods = (a, b) => {
    const [qa, ya] = a.split(" ");
    const [qb, yb] = b.split(" ");
    const qNum = (q) => Number(q.replace("Q", ""));
    if (ya !== yb) return Number(ya) - Number(yb);
    return qNum(qa) - qNum(qb);
  };

  const data = [];

  for (const p of periods.sort(sortPeriods)) {
    const cityData = raw.countries[country].cities[city].periods[p];
    if (!cityData) continue;

    const subMarketData = cityData.subMarkets?.[submarket] || {};
    const marketData = cityData.market || {};
    const leasingData = cityData.leasing || {};
    const leasingSub = cityData.subMarkets?.[submarket]?.leasing || {};

    // Merge everything but prioritise submarket level
    const combined = {
      ...marketData,
      ...leasingData,
      ...marketData,
      ...subMarketData,
      ...leasingData,
      ...leasingSub,
    };

    if (combined[metric] !== undefined && combined[metric] !== null) {
      data.push({ period: p, value: parseFloat(combined[metric]) });
    }
  }

  return data;
}

/* === Chart component (Bars + grey dashed line) === */
function BarTrendChart({ data, metric }) {
  if (!data || data.length === 0)
    return <div style={{ marginTop: 10 }}>No data for this metric.</div>;

  const formatValue = (v) => {
    if (metric.includes("Rate") || metric.includes("Yield")) return fmtPercent(v);
    if (metric.includes("Rent") || metric.includes("Charge")) return fmtMoney(v);
    if (metric.includes("fitOut")) return fmtNumber(v);
    return fmtNumber(v);
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip formatter={(v) => formatValue(v)} />

        {/* grey dashed trend line */}
        <Line
          type="monotone"
          dataKey="value"
          stroke="#999"
          strokeDasharray="4 4"
          dot={{ r: 3, fill: "#666" }}
        />

        {/* bars */}
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
