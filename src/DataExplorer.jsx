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
  if (Math.abs(n) >= 1000)
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function fmtMoney(n) {
  if (n === null || n === undefined || n === "" || Number.isNaN(n)) return "–";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function fmtPercent(n) {
  if (n === null || n === undefined || n === "" || Number.isNaN(n)) return "–";
  return Number(n).toFixed(2) + "%";
}
function coerceNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (s === "" || s === "–") return null;
  s = s.replace(/[€%\s]/g, "");
  if (s.indexOf(",") >= 0 && s.indexOf(".") >= 0) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    if (s.indexOf(",") >= 0) s = s.replace(",", ".");
  }
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

/* ===== Component ===== */
export default function DataExplorer() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState(null);

  /* primary selection */
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [submarket, setSubmarket] = useState("");
  const [period, setPeriod] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("primeRentEurSqmMonth");

  /* comparison selection */
  const [country2, setCountry2] = useState("");
  const [city2, setCity2] = useState("");
  const [submarket2, setSubmarket2] = useState("");

  /* --- load JSON --- */
  useEffect(() => {
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
          const first = countries[0];
          const firstCity =
            Object.keys(json.countries[first]?.cities || {})[0] || "";
          const periods = Object.keys(
            json.countries[first]?.cities?.[firstCity]?.periods || {}
          );
          setCountry(first);
          setCity(firstCity);
          if (periods.length) setPeriod(periods[0]);
          const firstSub =
            periods.length > 0
              ? Object.keys(
                  json.countries[first]?.cities?.[firstCity]?.periods?.[
                    periods[0]
                  ]?.subMarkets || {}
                )[0] || ""
              : "";
          setSubmarket(firstSub);
          /* default comparison = same country next city if exists */
          setCountry2(first);
          const cityList = Object.keys(json.countries[first]?.cities || {});
          setCity2(cityList[1] || firstCity);
          setSubmarket2(firstSub);
        }
      })
      .catch((err) => {
        setErrorLoading(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: 30 }}>Loading market data…</div>;
  if (errorLoading)
    return (
      <div style={{ padding: 30, color: "crimson" }}>
        Error loading data: {errorLoading}
      </div>
    );

  /* === helpers to read structure === */
  const countries = Object.keys(raw?.countries || {});
  const cities = country
    ? Object.keys(raw.countries[country]?.cities || {})
    : [];
  const periods = city
    ? Object.keys(raw.countries[country]?.cities?.[city]?.periods || {})
    : [];

  const submarketsFromJson =
    raw.countries?.[country]?.cities?.[city]?.periods?.[period]?.subMarkets
      ? Object.keys(
          raw.countries[country].cities[city].periods[period].subMarkets
        )
      : [];

  const metricSource =
    submarket &&
    raw.countries[country]?.cities?.[city]?.periods?.[period]?.subMarkets?.[
      submarket
    ]
      ? raw.countries[country].cities[city].periods[period].subMarkets[
          submarket
        ]
      : raw.countries[country].cities[city].periods[period]?.market || null;

  const leasingSource =
    (submarket &&
      raw.countries[country]?.cities?.[city]?.periods?.[period]?.subMarkets?.[
        submarket
      ]?.leasing) ||
    raw.countries[country]?.cities?.[city]?.periods?.[period]?.leasing ||
    {};

  const g = (key) => (metricSource ? metricSource[key] ?? null : null);

  /* === build historical data === */
  const trendData = buildTrendSeries(raw, country, city, submarket, selectedMetric);
  const trendData2 =
    country2 && city2
      ? buildTrendSeries(raw, country2, city2, submarket2, selectedMetric)
      : [];

  /* === render === */
  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 20 }}>
      <h1>{city} Office Market</h1>

      {/* Main selectors */}
      <div>
        <select value={country} onChange={(e) => setCountry(e.target.value)}>
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          {cities.map((ct) => (
            <option key={ct}>{ct}</option>
          ))}
        </select>
        <select value={submarket} onChange={(e) => setSubmarket(e.target.value)}>
          {submarketsFromJson.map((s) => (
            <option key={s}>{s}</option>
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

      {metricSource && (
        <>
          {/* Market Metrics */}
          <div className="section-box">
            <div className="section-header">
              <span>📊</span> Market Metrics
            </div>
            <Row label="Total Stock (sqm)" value={fmtNumber(g("totalStock"))} />
            <Row label="Vacancy (sqm)" value={fmtNumber(g("vacancy"))} />
            <Row
              label="Vacancy Rate (%)"
              value={fmtPercent(normalisePercent(g("vacancyRate")))}
            />
            <Row
              label="Prime Rent (€/sqm/month)"
              value={fmtMoney(coerceNumber(g("primeRentEurSqmMonth")))}
            />
            <Row
              label="Average Rent (€/sqm/month)"
              value={fmtMoney(coerceNumber(g("averageRentEurSqmMonth")))}
            />
            <Row
              label="Prime Yield (%)"
              value={fmtPercent(normalisePercent(g("primeYield")))}
            />
          </div>

          {/* Leasing */}
          <div className="section-box">
            <div className="section-header">
              <span>📝</span> Leasing Conditions
            </div>
            <Row
              label="Fit-out (€/sqm)"
              value={fmtNumber(coerceNumber(leasingSource?.fitOutEurSqmShellCore))}
            />
            <Row
              label="Service charge (€/sqm/month)"
              value={fmtMoney(coerceNumber(leasingSource?.serviceChargeEurSqmMonth))}
            />
          </div>

          {/* Historical Trend */}
          <div className="section-box">
            <div className="section-header">
              <span>📈</span> Historical Trend
            </div>
            <div style={{ padding: 10 }}>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                style={{ width: "100%", padding: 8, fontSize: 15, marginBottom: 10 }}
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
              <BarTrendChart data={trendData} metric={selectedMetric} />
            </div>
          </div>

          {/* === Comparison Chart === */}
          <div className="section-box">
            <div className="section-header">
              <span>🟦🟧</span> Market Comparison
            </div>
            <div style={{ padding: 10 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "6px",
                  marginBottom: "10px",
                }}
              >
                <select value={country2} onChange={(e) => setCountry2(e.target.value)}>
                  {countries.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select value={city2} onChange={(e) => setCity2(e.target.value)}>
                  {country2
                    ? Object.keys(raw.countries[country2]?.cities || {}).map((ct) => (
                        <option key={ct}>{ct}</option>
                      ))
                    : null}
                </select>
                <select value={submarket2} onChange={(e) => setSubmarket2(e.target.value)}>
                  {city2
                    ? Object.keys(
                        raw.countries[country2]?.cities?.[city2]?.periods?.[period]
                          ?.subMarkets || {}
                      ).map((sm) => <option key={sm}>{sm}</option>)
                    : null}
                </select>
              </div>
              <DualBarChart
                data1={trendData}
                data2={trendData2}
                metric={selectedMetric}
                label1={`${city} ${submarket}`}
                label2={`${city2} ${submarket2}`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* === utils === */
function normalisePercent(v) {
  const val = coerceNumber(v);
  if (val === null) return null;
  return Math.abs(val) <= 1 ? val * 100 : val;
}
function buildTrendSeries(raw, country, city, submarket, metric) {
  if (!raw?.countries?.[country]?.cities?.[city]) return [];
  const periods = Object.keys(raw.countries[country].cities[city].periods || {});
  const sortPeriods = (a, b) => {
    const [qa, ya] = a.split(" ");
    const [qb, yb] = b.split(" ");
    if (ya !== yb) return Number(ya) - Number(yb);
    return Number(qa.replace("Q", "")) - Number(qb.replace("Q", ""));
  };
  const arr = [];
  for (const p of periods.sort(sortPeriods)) {
    const cityData = raw.countries[country].cities[city].periods[p];
    const sub = cityData.subMarkets?.[submarket] || {};
    const merged = { ...cityData.market, ...cityData.leasing, ...sub, ...sub.leasing };
    let v = coerceNumber(merged[metric]);
    if (v === null) continue;
    if (metric === "vacancyRate" || metric === "primeYield")
      v = Math.abs(v) <= 1 ? v * 100 : v;
    arr.push({ period: p, value: v });
  }
  return arr;
}

/* === Single chart === */
function BarTrendChart({ data, metric }) {
  if (!data || !data.length)
    return <div style={{ marginTop: 10 }}>No data for this metric.</div>;
  const fmt = (v) =>
    metric === "vacancyRate" || metric === "primeYield"
      ? fmtPercent(v)
      : metric.includes("Rent") || metric.includes("Charge")
      ? fmtMoney(v)
      : fmtNumber(v);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip formatter={(v) => fmt(v)} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#999"
          strokeDasharray="4 4"
          dot={{ r: 3, fill: "#666" }}
        />
        <Bar dataKey="value" fill="#003366" radius={[4, 4, 0, 0]}>
          <LabelList dataKey="value" position="top" formatter={(v) => fmt(v)} />
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* === Dual comparison chart === */
function DualBarChart({ data1, data2, metric, label1, label2 }) {
  const fmt = (v) =>
    metric === "vacancyRate" || metric === "primeYield"
      ? fmtPercent(v)
      : metric.includes("Rent") || metric.includes("Charge")
      ? fmtMoney(v)
      : fmtNumber(v);

  const mergedPeriods = Array.from(
    new Set([...data1.map((d) => d.period), ...data2.map((d) => d.period)])
  ).sort((a, b) => {
    const [qa, ya] = a.split(" ");
    const [qb, yb] = b.split(" ");
    if (ya !== yb) return Number(ya) - Number(yb);
    return Number(qa.replace("Q", "")) - Number(qb.replace("Q", ""));
  });

  const combined = mergedPeriods.map((p) => ({
    period: p,
    value1: data1.find((d) => d.period === p)?.value || null,
    value2: data2.find((d) => d.period === p)?.value || null,
  }));

  if (!combined.length)
    return <div style={{ marginTop: 10 }}>No data for comparison.</div>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={combined} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip
          formatter={(v, name) =>
            [`${fmt(v)}`, name === "value1" ? label1 : label2]
          }
        />
        <Line
          type="monotone"
          dataKey="value1"
          stroke="#004488"
          strokeDasharray="4 4"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="value2"
          stroke="#e67e22"
          strokeDasharray="4 4"
          dot={false}
        />
        <Bar dataKey="value1" fill="#003366" radius={[4, 4, 0, 0]} barSize={20} />
        <Bar dataKey="value2" fill="#e67e22" radius={[4, 4, 0, 0]} barSize={20} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
