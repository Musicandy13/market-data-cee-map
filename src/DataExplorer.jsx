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
  return `${Number(n).toFixed(2)}%`;
}

function coerceNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (s === "" || s === "–") return null;
  s = s.replace(/[€%\s]/g, "");
  if (s.indexOf(",") >= 0 && s.indexOf(".") >= 0)
    s = s.replace(/\./g, "").replace(",", ".");
  else if (s.indexOf(",") >= 0) s = s.replace(",", ".");
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

/* ===== Build historical series ===== */
function buildTrendSeries(raw, country, city, submarket, metric) {
  if (!raw?.countries?.[country]?.cities?.[city]) return [];
  const periods = Object.keys(raw.countries[country].cities[city].periods || {});
  const sortPeriods = (a, b) => {
    const [qa, ya] = a.split(" ");
    const [qb, yb] = b.split(" ");
    if (ya !== yb) return Number(ya) - Number(yb);
    return Number(qa.replace("Q", "")) - Number(qb.replace("Q", ""));
  };

  const out = [];
  for (const p of periods.sort(sortPeriods)) {
    const cityData = raw.countries[country].cities[city].periods[p];
    if (!cityData) continue;
    const subMarketData = cityData.subMarkets?.[submarket] || {};
    const marketData = cityData.market || {};
    const leasingSub = cityData.subMarkets?.[submarket]?.leasing || {};
    const leasingCity = cityData.leasing || {};
    const merged = { ...marketData, ...leasingCity, ...subMarketData, ...leasingSub };

    let val = coerceNumber(merged[metric]);
    if (val === null) continue;
    if (metric === "vacancyRate" || metric === "primeYield")
      val = Math.abs(val) <= 1 ? val * 100 : val;

    out.push({ period: p, value: val });
  }
  return out;
}

/* ===== Custom Tooltip ===== */
const SingleTooltip = ({ active, payload, label, metric }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    let text = fmtNumber(val);
    if (metric === "vacancyRate" || metric === "primeYield") text = fmtPercent(val);
    if (
      metric === "primeRentEurSqmMonth" ||
      metric === "averageRentEurSqmMonth" ||
      metric === "serviceChargeEurSqmMonth"
    )
      text = fmtMoney(val);
    return (
      <div
        style={{
          background: "white",
          border: "1px solid #ccc",
          padding: "4px 8px",
          fontSize: "12px",
        }}
      >
        <strong>{label}</strong>
        <div>{text}</div>
      </div>
    );
  }
  return null;
};

/* ===== Chart ===== */
function BarTrendChart({ data, metric }) {
  if (!data || data.length === 0)
    return <div style={{ marginTop: 10 }}>No data for this metric.</div>;

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
        <Line
          type="monotone"
          dataKey="value"
          stroke="#999"
          strokeDasharray="4 4"
          dot={{ r: 3, fill: "#666" }}
        />
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

/* ===== Independent Comparison Block ===== */
function ComparisonBlock({ raw, baseCountry, baseCity, baseSubmarket }) {
  const [country2, setCountry2] = useState("");
  const [city2, setCity2] = useState("");
  const [submarket2, setSubmarket2] = useState("");
  const [metric, setMetric] = useState("primeRentEurSqmMonth");

  useEffect(() => {
    if (!raw) return;
    const cList = Object.keys(raw.countries || {});
    if (cList.length) {
      const firstC = cList[0];
      const firstCity = Object.keys(raw.countries[firstC]?.cities || {})[0] || "";
      const periods = Object.keys(
        raw.countries[firstC]?.cities?.[firstCity]?.periods || {}
      );
      const firstSub =
        periods.length > 0
          ? Object.keys(
              raw.countries[firstC]?.cities?.[firstCity]?.periods?.[periods[0]]
                ?.subMarkets || {}
            )[0] || ""
          : "";
      setCountry2(firstC);
      setCity2(firstCity);
      setSubmarket2(firstSub);
    }
  }, [raw]);

  if (!raw) return null;
  const countries = Object.keys(raw.countries || {});
  const cities2 = country2 ? Object.keys(raw.countries[country2]?.cities || {}) : [];
  const submarkets2 = (() => {
    const firstPeriodKey = Object.keys(
      raw.countries[country2]?.cities?.[city2]?.periods || {}
    )[0];
    if (!firstPeriodKey) return [];
    return Object.keys(
      raw.countries[country2].cities[city2].periods[firstPeriodKey].subMarkets || {}
    );
  })();

  const baseData = buildTrendSeries(raw, baseCountry, baseCity, baseSubmarket, metric);
  const compData = buildTrendSeries(raw, country2, city2, submarket2, metric);

  const fmt = (v) => {
    if (metric === "vacancyRate" || metric === "primeYield") return fmtPercent(v);
    if (
      metric === "primeRentEurSqmMonth" ||
      metric === "averageRentEurSqmMonth" ||
      metric === "serviceChargeEurSqmMonth"
    )
      return fmtMoney(v);
    return fmtNumber(v);
  };

  const allPeriods = Array.from(
    new Set([...baseData.map((d) => d.period), ...compData.map((d) => d.period)])
  ).sort((a, b) => {
    const [qa, ya] = a.split(" ");
    const [qb, yb] = b.split(" ");
    if (ya !== yb) return Number(ya) - Number(yb);
    return Number(qa.replace("Q", "")) - Number(qb.replace("Q", ""));
  });

  const merged = allPeriods.map((p) => ({
    period: p,
    base: baseData.find((d) => d.period === p)?.value ?? null,
    comp: compData.find((d) => d.period === p)?.value ?? null,
  }));

  return (
    <div className="section-box" style={{ marginTop: "30px" }}>
      <div className="section-header">
        <span>🟦🟧</span> Market Comparison (Independent)
      </div>
      <div style={{ padding: "10px" }}>
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
            {cities2.map((ct) => (
              <option key={ct}>{ct}</option>
            ))}
          </select>
          <select value={submarket2} onChange={(e) => setSubmarket2(e.target.value)}>
            {submarkets2.map((sm) => (
              <option key={sm}>{sm}</option>
            ))}
          </select>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
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
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={merged} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip
              formatter={(v, name) =>
                `${fmt(v)} (${name === "base" ? baseCity : city2})`
              }
            />
            <Line type="monotone" dataKey="base" stroke="#004488" dot={false} />
            <Line type="monotone" dataKey="comp" stroke="#e67e22" dot={false} />
            <Bar dataKey="base" fill="#003366" barSize={20} />
            <Bar dataKey="comp" fill="#e67e22" barSize={20} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ===== Main App ===== */
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
        const firstC = Object.keys(json.countries || {})[0];
        const firstCity = Object.keys(json.countries[firstC]?.cities || {})[0] || "";
        const periods = Object.keys(
          json.countries[firstC]?.cities?.[firstCity]?.periods || {}
        );
        setCountry(firstC);
        setCity(firstCity);
        setPeriod(periods[0]);
        const firstSub =
          Object.keys(
            json.countries[firstC]?.cities?.[firstCity]?.periods?.[periods[0]]
              ?.subMarkets || {}
          )[0] || "";
        setSubmarket(firstSub);
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

  const countries = Object.keys(raw?.countries || {});
  const cities = country ? Object.keys(raw.countries[country]?.cities || {}) : [];
  const periods = Object.keys(raw.countries[country]?.cities?.[city]?.periods || {});
  const periodObj = raw.countries[country]?.cities?.[city]?.periods?.[period] || {};
  const subs = Object.keys(periodObj?.subMarkets || {});
  const g = (k) =>
    periodObj?.subMarkets?.[submarket]?.[k] ?? periodObj?.market?.[k] ?? null;
  const leasing =
    periodObj?.subMarkets?.[submarket]?.leasing ?? periodObj?.leasing ?? {};

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1>{city} Office Market</h1>

      {/* Selection */}
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
          {subs.map((s) => (
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
            Math.abs(coerceNumber(g("vacancyRate"))) <= 1
              ? coerceNumber(g("vacancyRate")) * 100
              : coerceNumber(g("vacancyRate"))
          )}
        />
        <Row label="Take-up (sqm)" value={fmtNumber(g("takeUp"))} />
        <Row label="Net Absorption (sqm, YTD)" value={fmtNumber(g("netAbsorption"))} />
        <Row label="Completed (sqm, YTD)" value={fmtNumber(g("completionsYTD"))} />
        <Row label="Under Construction (sqm)" value={fmtNumber(g("underConstruction"))} />
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
          value={fmtPercent(
            Math.abs(coerceNumber(g("primeYield"))) <= 1
              ? coerceNumber(g("primeYield")) * 100
              : coerceNumber(g("primeYield"))
          )}
        />
      </div>

      {/* ---- Leasing ---- */}
      <div className="section-box">
        <div className="section-header">
          <span>📝</span> Leasing Conditions
        </div>
        <Row
          label="Typical rent-free period (month/year)"
          value={fmtNumber(leasing?.rentFreeMonthPerYear)}
        />
        <Row label="Typical lease length (months)" value={fmtNumber(leasing?.leaseLengthMonths)} />
        <Row label="Fit-out (€/sqm)" value={fmtNumber(leasing?.fitOutEurSqmShellCore)} />
        <Row
          label="Service charge (€/sqm/month)"
          value={fmtMoney(leasing?.serviceChargeEurSqmMonth)}
        />
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
      <ComparisonBlock
        raw={raw}
        baseCountry={country}
        baseCity={city}
        baseSubmarket={submarket}
      />
    </div>
  );
}
