import React, { useState } from "react";

export default function DataExplorer({ data }) {
  const [selectedCountry, setSelectedCountry] = useState(Object.keys(data.countries)[0]);
  const [selectedCity, setSelectedCity] = useState(Object.keys(data.countries[selectedCountry].cities)[0]);
  const [selectedPeriod, setSelectedPeriod] = useState(
    Object.keys(data.countries[selectedCountry].cities[selectedCity].periods)[0]
  );
  const [selectedSubmarket, setSelectedSubmarket] = useState(
    Object.keys(
      data.countries[selectedCountry].cities[selectedCity].periods[selectedPeriod].subMarkets
    )[0]
  );

  const country = data.countries[selectedCountry];
  const city = country.cities[selectedCity];
  const period = city.periods[selectedPeriod];
  const subMarket = period.subMarkets[selectedSubmarket];

  return (
    <div className="max-w-md mx-auto p-4">
      {/* --- DROPDOWNS --- */}
      <div className="space-y-3 mb-6">
        <select
          value={selectedCountry}
          onChange={(e) => {
            const c = e.target.value;
            setSelectedCountry(c);
            const firstCity = Object.keys(data.countries[c].cities)[0];
            setSelectedCity(firstCity);
            const firstPeriod = Object.keys(data.countries[c].cities[firstCity].periods)[0];
            setSelectedPeriod(firstPeriod);
            const firstSub = Object.keys(
              data.countries[c].cities[firstCity].periods[firstPeriod].subMarkets
            )[0];
            setSelectedSubmarket(firstSub);
          }}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          {Object.keys(data.countries).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={selectedCity}
          onChange={(e) => {
            const city = e.target.value;
            setSelectedCity(city);
            const firstPeriod = Object.keys(
              data.countries[selectedCountry].cities[city].periods
            )[0];
            setSelectedPeriod(firstPeriod);
            const firstSub = Object.keys(
              data.countries[selectedCountry].cities[city].periods[firstPeriod].subMarkets
            )[0];
            setSelectedSubmarket(firstSub);
          }}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          {Object.keys(country.cities).map((city) => (
            <option key={city}>{city}</option>
          ))}
        </select>

        <select
          value={selectedSubmarket}
          onChange={(e) => setSelectedSubmarket(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          {Object.keys(period.subMarkets).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          {Object.keys(city.periods).map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* --- TITEL --- */}
      <h2 className="text-xl font-bold text-center mb-2">
        {selectedCity} Office Market — {selectedPeriod} — {selectedSubmarket}
      </h2>

      {/* --- MARKET METRICS --- */}
      <div className="bg-blue-900 text-white font-semibold px-3 py-1 rounded-t-md">
        📊 Market Metrics
      </div>
      <div className="border border-t-0 border-blue-900 rounded-b-md overflow-hidden divide-y divide-gray-200">
        {renderMetric("Total Stock (sqm)", subMarket.totalStock)}
        {renderMetric("Vacancy (sqm)", subMarket.vacancy)}
        {renderMetric("Vacancy Rate (%)", (subMarket.vacancyRate * 100).toFixed(2) + "%")}
        {renderMetric("Take-up (sqm)", subMarket.takeUp)}
        {renderMetric("Net Absorption (sqm)", subMarket.netAbsorption)}
        {renderMetric("Completions YTD (sqm)", subMarket.completionsYTD)}
        {renderMetric("Under Construction (sqm)", subMarket.underConstruction)}
        {renderMetric("Prime Rent (€/sqm/month)", subMarket.primeRentEurSqmMonth)}
        {renderMetric("Average Rent (€/sqm/month)", subMarket.averageRentEurSqmMonth)}
        {renderMetric("Prime Yield (%)", (subMarket.primeYield * 100).toFixed(2) + "%")}
      </div>

      {/* --- LEASING CONDITIONS --- */}
      <div className="bg-blue-900 text-white font-semibold px-3 py-1 mt-6 rounded-t-md">
        📝 Leasing Conditions
      </div>
      <div className="border border-t-0 border-blue-900 rounded-b-md overflow-hidden divide-y divide-gray-200">
        {renderMetric("Rent-free period (month/year)", period.leasing.rentFreeMonthPerYear)}
        {renderMetric("Lease length (months)", period.leasing.leaseLengthMonths)}
        {renderMetric("Fit-out (€/sqm)", period.leasing.fitOutEurSqmShellCore)}
        {renderMetric("Service charge (€/sqm/month)", period.leasing.serviceChargeEurSqmMonth)}
      </div>
    </div>
  );
}

/* Helper-Komponente für jede Zeile */
function renderMetric(label, value) {
  const displayValue =
    value === null || value === undefined || value === "" ? "n/a" : value;

  return (
    <div className="flex justify-between items-start px-3 py-1.5 bg-white even:bg-gray-50">
      <span className="text-sm leading-tight whitespace-normal break-words max-w-[70%]">
        {label}
      </span>
      <span className="text-sm text-right font-medium ml-2 whitespace-nowrap">
        {displayValue}
      </span>
    </div>
  );
}
