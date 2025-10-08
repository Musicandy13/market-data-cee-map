import React, { useEffect, useState } from "react";
import "./App.css"; // ✅ make sure styles are loaded

function fmtNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  if (Math.abs(n) >= 1000) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtMoney(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPercent(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  if (Math.abs(n) <= 1) {
    return (n * 100).toFixed(2) + "%";
  } else {
    return Number(n).toFixed(2) + "%";
  }
}

function Row({ label, value }) {
  return (
    <div className="row">
      <div className="row-label">{label}</div>
      <div className="row-value">{value}</div>
    </div>
  );
}

export default function DataExplorer() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState(null);

  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [submarket, setSubmarket] = useState("");
  const [period, setPeriod] = useState("");

  // initial load
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
          const firstCity = Object.keys(json.countries[firstCountry]?.cities || {})[0] || "";
          setCity(firstCity);
          const periods = Object.keys(json.countries[firstCountry]?.cities?.[firstCity]?.periods || {});
          if (periods.length) setPeriod(periods[0]);

          // ersten Submarkt setzen
          const firstSubmarkets =
            periods.length > 0
              ? Object.keys(json.countries[firstCountry]?.cities?.[firstCity]?.periods?.[periods[0]]?.subMarkets || {})
              : [];
          if (firstSubmarkets.length) setSubmarket(firstSubmarkets[0]);
        }
      })
      .catch((err) => {
        setErrorLoading(err.message || String(err));
        setLoading(false);
      });
  }, []);

  const countries = Object.keys(raw?.countries || {});
  const cities = country ? Object.keys(raw?.countries?.[country]?.cities || {}) : [];
  const periods = city ? Object.keys(raw?.countries?.[country]?.cities?.[city]?.periods || {}) : [];

  const selectedPeriodObj = raw?.countries?.[country]?.cities?.[city]?.periods?.[period] || null;
  const submarketsFromJson = selectedPeriodObj?.subMarkets ? Object.keys(selectedPeriodObj.subMarkets) : [];
  const submarketOptions = submarketsFromJson;

  const cityObj = raw?.countries?.[country]?.cities?.[city] || {};
  const leasingCity = cityObj?.leasing || {};

  const metricSource =
    submarket && selectedPeriodObj?.subMarkets?.[submarket]
      ? selectedPeriodObj.subMarkets[submarket]
      : cityObj?.periods?.[period]?.market || null;

  const leasingSource =
    (submarket && selectedPeriodObj?.subMarkets?.[submarket]?.leasing) ||
    (cityObj?.periods?.[period]?.leasing) ||
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

  // keep hook always at top-level
  useEffect(() => {
    if (periods.length && !periods.includes(period)) {
      setPeriod(periods[0]);
    }
    // wenn Submarket nicht mehr existiert → ersten aus JSON wählen
    if (submarketsFromJson.length && !submarketsFromJson.includes(submarket)) {
      setSubmarket(submarketsFromJson[0]);
    }
  }, [city, country, raw, periods, submarketsFromJson]); // eslint-disable-line

  if (loading) {
    return <div style={{ padding: 30 }}>Loading market data…</div>;
  }
  if (errorLoading) {
    return <div style={{ padding: 30, color: "crimson" }}>Error loading data: {errorLoading}</div>;
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1>{city} Office Market</h1>

      <div>
        <select
          value={country}
          onChange={(e) => {
            const c = e.target.value;
            setCountry(c);
            const firstCity = Object.keys(raw?.countries?.[c]?.cities || {})[0] || "";
            setCity(firstCity);
            const newPeriods = Object.keys(raw?.countries?.[c]?.cities?.[firstCity]?.periods || {});
            setPeriod(newPeriods[0] || "");
            const newSubmarkets =
              newPeriods.length > 0
                ? Object.keys(raw?.countries?.[c]?.cities?.[firstCity]?.periods?.[newPeriods[0]]?.subMarkets || {})
                : [];
            setSubmarket(newSubmarkets[0] || "");
          }}
        >
          {countries.map((c) => <option key={c}>{c}</option>)}
        </select>

        <select
          value={city}
          onChange={(e) => {
            const cityVal = e.target.value;
            setCity(cityVal);
            const newPeriods = Object.keys(raw?.countries?.[country]?.cities?.[cityVal]?.periods || {});
            setPeriod(newPeriods[0] || "");
            const newSubmarkets =
              newPeriods.length > 0
                ? Object.keys(raw?.countries?.[country]?.cities?.[cityVal]?.periods?.[newPeriods[0]]?.subMarkets || {})
                : [];
            setSubmarket(newSubmarkets[0] || "");
          }}
        >
          {cities.map((ct) => <option key={ct}>{ct}</option>)}
        </select>

        <select value={submarket} onChange={(e) => setSubmarket(e.target.value)}>
          {submarketOptions.map((sm) => <option key={sm}>{sm}</option>)}
        </select>

        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {periods.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      <h2>{city} Office Market — {period} — {submarket}</h2>

      {!metricSource && <div>No data available for this selection.</div>}

      {metricSource && (
        <>
          <div className="section-box">
            <div className="section-header">
              <span>📊</span> Market Metrics
            </div>
            <Row label="Total Stock (sqm)" value={fmtNumber(g("totalStock"))} />
            <Row label="Vacancy (sqm)" value={fmtNumber(g("vacancy"))} />
            <Row label="Vacancy Rate (%)" value={fmtPercent(g("vacancyRate"))} />
            <Row label="YTD Take-Up (sqm)" value={fmtNumber(g("takeUp"))} />
            <Row label="Net Absorption (sqm)" value={fmtNumber(g("netAbsorption"))} />
            <Row label="YTD Completions (sqm)" value={fmtNumber(g("completionsYTD"))} />
            <Row label="Under Construction (sqm)" value={fmtNumber(g("underConstruction"))} />
            <Row label="Prime Rent (€/sqm/month)" value={fmtMoney(g("primeRentEurSqmMonth"))} />
            <Row label="Average Rent (€/sqm/month)" value={fmtMoney(g("averageRentEurSqmMonth"))} />
            <Row label="Prime Yield (%)" value={fmtPercent(g("primeYield"))} />
          </div>

          <div className="section-box">
            <div className="section-header">
              <span>📝</span> Leasing Conditions
            </div>
            <Row
              label="Rent-free period (month/year)"
              value={fmtMoney(leasingSource?.rentFreeMonthPerYear ?? null)}
            />
            <Row label="Lease length (months)" value={fmtNumber(leasingSource?.leaseLengthMonths ?? null)} />
            <Row label="Fit-out (€/sqm)" value={fmtNumber(leasingSource?.fitOutEurSqmShellCore ?? null)} />
            <Row
              label="Service charge (€/sqm/month)"
              value={fmtMoney(leasingSource?.serviceChargeEurSqmMonth ?? null)}
            />
          </div>
        </>
      )}
    </div>
  );
}
