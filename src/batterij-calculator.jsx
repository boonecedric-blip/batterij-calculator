import React, { useState, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area } from 'recharts';

// =============================================
// BELPEX MARKTPRIJZEN DATA (2024-2025)
// =============================================
const BELPEX_HOURLY_2024 = {
  0: 70.08, 1: 63.71, 2: 60.18, 3: 56.25, 4: 54.71, 5: 58.85, 6: 70.42, 7: 84.05,
  8: 88.18, 9: 76.97, 10: 64.38, 11: 55.05, 12: 48.90, 13: 44.16, 14: 44.13, 15: 50.52,
  16: 60.82, 17: 78.16, 18: 95.39, 19: 106.41, 20: 101.99, 21: 91.38, 22: 86.14, 23: 76.85
};

const BELPEX_HOURLY_2025 = {
  0: 85.91, 1: 79.72, 2: 76.85, 3: 73.85, 4: 73.72, 5: 78.25, 6: 90.09, 7: 103.17,
  8: 105.87, 9: 88.30, 10: 69.33, 11: 56.41, 12: 47.46, 13: 41.21, 14: 43.45, 15: 54.67,
  16: 67.27, 17: 87.70, 18: 109.27, 19: 123.32, 20: 121.36, 21: 110.78, 22: 102.86, 23: 91.06
};

const MONTHLY_PV_FACTORS = {
  1: 0.032, 2: 0.052, 3: 0.082, 4: 0.108, 5: 0.128, 6: 0.138,
  7: 0.132, 8: 0.118, 9: 0.088, 10: 0.062, 11: 0.038, 12: 0.022
};

const SUN_TIMES = {
  1: [8.5, 17.0], 2: [7.8, 18.0], 3: [7.0, 19.0], 4: [6.5, 20.5],
  5: [5.8, 21.2], 6: [5.3, 22.0], 7: [5.5, 21.8], 8: [6.2, 21.0],
  9: [7.0, 20.0], 10: [7.8, 18.8], 11: [8.0, 17.2], 12: [8.5, 16.5]
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const calculatePVProduction = (datetime, annualProductionKwh = 10000) => {
  const hour = datetime.getHours() + datetime.getMinutes() / 60;
  const month = datetime.getMonth() + 1;
  const dayOfYear = Math.floor((datetime - new Date(datetime.getFullYear(), 0, 0)) / 86400000);
  
  const [sunrise, sunset] = SUN_TIMES[month];
  if (hour < sunrise || hour > sunset) return 0;
  
  const dayLength = sunset - sunrise;
  const dayPosition = (hour - sunrise) / dayLength;
  const dailyFactor = Math.sin(Math.PI * dayPosition);
  const monthlyFactor = MONTHLY_PV_FACTORS[month];
  const daysInMonth = new Date(datetime.getFullYear(), month, 0).getDate();
  const monthlyProduction = annualProductionKwh * monthlyFactor;
  const dailyProduction = monthlyProduction / daysInMonth;
  
  const seed = dayOfYear + datetime.getFullYear() * 1000;
  const weatherRand = seededRandom(seed);
  let weatherFactor;
  
  if ([6, 7, 8].includes(month)) {
    if (weatherRand < 0.65) weatherFactor = 0.9 + seededRandom(seed + 1) * 0.15;
    else if (weatherRand < 0.85) weatherFactor = 0.5 + seededRandom(seed + 2) * 0.3;
    else weatherFactor = 0.1 + seededRandom(seed + 3) * 0.3;
  } else {
    if (weatherRand < 0.4) weatherFactor = 0.85 + seededRandom(seed + 1) * 0.15;
    else if (weatherRand < 0.75) weatherFactor = 0.4 + seededRandom(seed + 2) * 0.35;
    else weatherFactor = 0.1 + seededRandom(seed + 3) * 0.25;
  }
  
  const hourVariation = 0.9 + seededRandom(datetime.getTime()) * 0.2;
  const intervalsPerDay = dayLength * 4;
  const basePerInterval = dailyProduction / (intervalsPerDay * 2 / Math.PI);
  
  return Math.max(0, dailyFactor * basePerInterval * weatherFactor * hourVariation);
};

const getMarketPrice = (datetime) => {
  const hour = datetime.getHours();
  const year = datetime.getFullYear();
  const priceProfile = year >= 2025 ? BELPEX_HOURLY_2025 : BELPEX_HOURLY_2024;
  return priceProfile[hour] / 1000;
};

const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length >= headers.length - 1) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      data.push(row);
    }
  }
  return data;
};

const processFluviusData = (data) => {
  const processed = [];
  
  for (const row of data) {
    const dateStr = row['Van (datum)'];
    const timeStr = row['Van (tijdstip)'];
    const register = row['Register'] || '';
    let volume = row['Volume'];
    
    if (!dateStr || !timeStr) continue;
    
    const dateParts = dateStr.split('-');
    if (dateParts.length !== 3) continue;
    
    const [day, month, year] = dateParts.map(Number);
    const timeParts = timeStr.split(':');
    const hours = parseInt(timeParts[0]) || 0;
    const minutes = parseInt(timeParts[1]) || 0;
    
    const datetime = new Date(year, month - 1, day, hours, minutes);
    if (isNaN(datetime.getTime())) continue;
    
    volume = parseFloat(String(volume).replace(',', '.')) || 0;
    
    const isAfname = register.toLowerCase().includes('afname');
    const isInjectie = register.toLowerCase().includes('injectie');
    
    let entry = processed.find(p => p.datetime.getTime() === datetime.getTime());
    if (!entry) {
      entry = { datetime, afname: 0, injectie: 0 };
      processed.push(entry);
    }
    
    if (isAfname) entry.afname += volume;
    if (isInjectie) entry.injectie += volume;
  }
  
  return processed.sort((a, b) => a.datetime - b.datetime);
};

// Extrapolatie functie om onvolledige data aan te vullen tot een volledig jaar
const extrapolateToFullYear = (data, targetYear) => {
  if (!data || data.length === 0) return data;
  
  // Bereken gemiddeld profiel per maand, weekdag en uur
  const profiles = {};
  
  data.forEach(row => {
    const month = row.datetime.getMonth();
    const weekday = row.datetime.getDay();
    const hour = row.datetime.getHours();
    const quarter = Math.floor(row.datetime.getMinutes() / 15);
    
    const key = `${month}-${weekday}-${hour}-${quarter}`;
    
    if (!profiles[key]) {
      profiles[key] = { afnameSum: 0, injectieSum: 0, count: 0 };
    }
    
    profiles[key].afnameSum += row.afname;
    profiles[key].injectieSum += row.injectie;
    profiles[key].count++;
  });
  
  // Bereken gemiddeldes
  Object.keys(profiles).forEach(key => {
    const p = profiles[key];
    p.avgAfname = p.afnameSum / p.count;
    p.avgInjectie = p.injectieSum / p.count;
  });
  
  // Fallback: algemeen gemiddelde per uur als specifiek profiel ontbreekt
  const hourlyFallback = {};
  for (let h = 0; h < 24; h++) {
    for (let q = 0; q < 4; q++) {
      const key = `${h}-${q}`;
      const matching = data.filter(r => r.datetime.getHours() === h && Math.floor(r.datetime.getMinutes() / 15) === q);
      if (matching.length > 0) {
        hourlyFallback[key] = {
          avgAfname: matching.reduce((s, r) => s + r.afname, 0) / matching.length,
          avgInjectie: matching.reduce((s, r) => s + r.injectie, 0) / matching.length
        };
      } else {
        hourlyFallback[key] = { avgAfname: 0.1, avgInjectie: 0 };
      }
    }
  }
  
  // Maak een set van bestaande timestamps voor snelle lookup
  const existingTimestamps = new Set(data.map(r => r.datetime.getTime()));
  
  // Genereer volledig jaar
  const fullYearData = [];
  const startDate = new Date(targetYear, 0, 1, 0, 0);
  const endDate = new Date(targetYear + 1, 0, 1, 0, 0);
  
  let currentDate = new Date(startDate);
  let extrapolatedCount = 0;
  
  while (currentDate < endDate) {
    const timestamp = currentDate.getTime();
    
    if (existingTimestamps.has(timestamp)) {
      // Gebruik bestaande data
      const existing = data.find(r => r.datetime.getTime() === timestamp);
      fullYearData.push({ ...existing, isExtrapolated: false });
    } else {
      // Extrapoleer
      const month = currentDate.getMonth();
      const weekday = currentDate.getDay();
      const hour = currentDate.getHours();
      const quarter = Math.floor(currentDate.getMinutes() / 15);
      
      const profileKey = `${month}-${weekday}-${hour}-${quarter}`;
      const hourKey = `${hour}-${quarter}`;
      
      let afname, injectie;
      
      if (profiles[profileKey] && profiles[profileKey].count >= 2) {
        // Gebruik specifiek profiel (maand + weekdag + uur)
        afname = profiles[profileKey].avgAfname;
        injectie = profiles[profileKey].avgInjectie;
      } else {
        // Fallback naar uur-gemiddelde met seizoenscorrectie
        const seasonFactor = getSeasonFactor(month);
        afname = hourlyFallback[hourKey].avgAfname * seasonFactor.afname;
        injectie = hourlyFallback[hourKey].avgInjectie * seasonFactor.injectie;
      }
      
      fullYearData.push({
        datetime: new Date(currentDate),
        afname: Math.max(0, afname),
        injectie: Math.max(0, injectie),
        isExtrapolated: true
      });
      extrapolatedCount++;
    }
    
    // Volgende kwartier
    currentDate = new Date(currentDate.getTime() + 15 * 60 * 1000);
  }
  
  // Voeg metadata toe
  fullYearData.extrapolationInfo = {
    originalCount: data.length,
    extrapolatedCount: extrapolatedCount,
    totalCount: fullYearData.length,
    coveragePercent: ((data.length / fullYearData.length) * 100).toFixed(1)
  };
  
  return fullYearData;
};

// Seizoensfactoren voor verbruik en injectie
const getSeasonFactor = (month) => {
  // Verbruik: hoger in winter, lager in zomer
  // Injectie (PV): hoger in zomer, lager in winter
  const factors = {
    0:  { afname: 1.3, injectie: 0.3 },  // Jan
    1:  { afname: 1.2, injectie: 0.5 },  // Feb
    2:  { afname: 1.1, injectie: 0.8 },  // Mrt
    3:  { afname: 1.0, injectie: 1.1 },  // Apr
    4:  { afname: 0.9, injectie: 1.3 },  // Mei
    5:  { afname: 0.8, injectie: 1.4 },  // Jun
    6:  { afname: 0.8, injectie: 1.3 },  // Jul
    7:  { afname: 0.8, injectie: 1.2 },  // Aug
    8:  { afname: 0.9, injectie: 0.9 },  // Sep
    9:  { afname: 1.0, injectie: 0.6 },  // Okt
    10: { afname: 1.2, injectie: 0.4 },  // Nov
    11: { afname: 1.3, injectie: 0.2 }   // Dec
  };
  return factors[month];
};

// =============================================
// BATTERY SIMULATION
// =============================================

const simulateDumbBattery = (data, config) => {
  const { capacityKwh, maxPowerKw, afnameTarief, injectieTarief } = config;
  const maxChargePerQuarter = maxPowerKw / 4;
  
  let soc = capacityKwh * 0.5;
  let totalAfnameNet = 0;
  let totalInjectieNet = 0;
  let totalCostAfname = 0;
  let totalRevenueInjectie = 0;
  
  const results = [];
  
  for (const row of data) {
    const { pv, verbruik } = row;
    
    const pvForHouse = Math.min(pv, verbruik);
    let pvRemaining = pv - pvForHouse;
    let houseRemaining = verbruik - pvForHouse;
    
    const maxCharge = Math.min(maxChargePerQuarter, capacityKwh - soc);
    const chargeFromPV = Math.min(pvRemaining, maxCharge);
    pvRemaining -= chargeFromPV;
    soc += chargeFromPV;
    
    const maxDischarge = Math.min(maxChargePerQuarter, soc);
    const dischargeForHouse = Math.min(houseRemaining, maxDischarge);
    soc -= dischargeForHouse;
    houseRemaining -= dischargeForHouse;
    
    const gridAfname = houseRemaining;
    const gridInjectie = pvRemaining;
    
    totalAfnameNet += gridAfname;
    totalInjectieNet += gridInjectie;
    totalCostAfname += gridAfname * afnameTarief;
    totalRevenueInjectie += gridInjectie * injectieTarief;
    
    results.push({ ...row, soc, gridAfname, gridInjectie });
  }
  
  return {
    results,
    totalAfnameKwh: totalAfnameNet,
    totalInjectieKwh: totalInjectieNet,
    totalCostAfname,
    totalRevenueInjectie,
    nettoKosten: totalCostAfname - totalRevenueInjectie
  };
};

const simulateSmartBattery = (data, config) => {
  const { capacityKwh, maxPowerKw } = config;
  const afnameToeslag = 0.14;
  const injectieKost = 0.0115;
  const arbitrageDrempel = 0.05;
  const maxChargePerQuarter = maxPowerKw / 4;
  const safetyMargin = 0.5;
  
  const totalPV = data.reduce((sum, r) => sum + r.pv, 0);
  const totalVerbruik = data.reduce((sum, r) => sum + r.verbruik, 0);
  const pvOvervloedig = totalPV > totalVerbruik * 1.1;
  
  const positivePrices = data.filter(r => (r.marketPrice - injectieKost) > 0).map(r => r.marketPrice - injectieKost);
  const highPriceThreshold = positivePrices.length > 0 
    ? positivePrices.sort((a, b) => a - b)[Math.floor(positivePrices.length * 0.75)] 
    : arbitrageDrempel;
  
  let soc = capacityKwh * 0.5;
  let totalAfnameNet = 0;
  let totalInjectieNet = 0;
  let totalCostAfname = 0;
  let totalRevenueInjectie = 0;
  let totalArbitrageKwh = 0;
  
  const futureDeficits = [];
  let runningConsumption = 0;
  let runningPV = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    runningConsumption += data[i].verbruik;
    runningPV += data[i].pv;
    futureDeficits[i] = Math.max(0, runningConsumption - runningPV);
  }
  
  const results = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const { pv, verbruik, marketPrice } = row;
    
    const prijsAfname = marketPrice + afnameToeslag;
    const prijsInjectie = marketPrice - injectieKost;
    const futureDeficit = futureDeficits[i];
    
    const maxCharge = Math.min(maxChargePerQuarter, capacityKwh - soc);
    const maxDischarge = Math.min(maxChargePerQuarter, soc);
    
    let charge = 0;
    let discharge = 0;
    let injectPV = 0;
    let injectArb = 0;
    let netAfname = 0;
    
    const pvForHouse = Math.min(pv, verbruik);
    let pvRemaining = pv - pvForHouse;
    let houseRemaining = verbruik - pvForHouse;
    
    charge = Math.min(pvRemaining, maxCharge);
    const pvAfterBattery = pvRemaining - charge;
    
    if (prijsInjectie >= 0) {
      injectPV = pvAfterBattery;
    }
    
    if (houseRemaining > 0) {
      const dischargeForHouse = Math.min(houseRemaining, maxDischarge);
      discharge += dischargeForHouse;
      netAfname = houseRemaining - dischargeForHouse;
    }
    
    if (prijsInjectie > arbitrageDrempel) {
      const neededReserve = futureDeficit + safetyMargin;
      const remainingDischargeCapacity = maxDischarge - discharge;
      const availableSoc = soc + charge - discharge;
      let sellable = Math.max(0, availableSoc - neededReserve);
      sellable = Math.min(sellable, remainingDischargeCapacity);
      
      if (sellable > 0 && prijsInjectie > highPriceThreshold) {
        const priceFactor = Math.min(1.0, (prijsInjectie - arbitrageDrempel) / arbitrageDrempel);
        injectArb = sellable * priceFactor;
        discharge += injectArb;
      }
    }
    
    if (!pvOvervloedig && futureDeficit > 0 && prijsAfname < 0) {
      const remainingCharge = maxCharge - charge;
      if (remainingCharge > 0 && soc < capacityKwh * 0.9) {
        const gridCharge = Math.min(remainingCharge, futureDeficit);
        charge += gridCharge;
        netAfname += gridCharge;
      }
    }
    
    soc = Math.max(0, Math.min(capacityKwh, soc + charge - discharge));
    
    const totalInjectie = injectPV + injectArb;
    
    totalAfnameNet += netAfname;
    totalInjectieNet += totalInjectie;
    totalCostAfname += netAfname * prijsAfname;
    totalRevenueInjectie += totalInjectie * prijsInjectie;
    totalArbitrageKwh += injectArb;
    
    results.push({ ...row, soc, gridAfname: netAfname, gridInjectie: totalInjectie, prijsAfname, prijsInjectie });
  }
  
  return {
    results,
    totalAfnameKwh: totalAfnameNet,
    totalInjectieKwh: totalInjectieNet,
    totalCostAfname,
    totalRevenueInjectie,
    totalArbitrageKwh,
    nettoKosten: totalCostAfname - totalRevenueInjectie,
    avgAfnamePrice: totalAfnameNet > 0 ? totalCostAfname / totalAfnameNet : 0,
    avgInjectiePrice: totalInjectieNet > 0 ? totalRevenueInjectie / totalInjectieNet : 0
  };
};

// =============================================
// MAIN COMPONENT
// =============================================

export default function BatterijCalculator() {
  const [csvData, setCsvData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('input');
  const [results, setResults] = useState(null);
  
  const [batteryCapacity, setBatteryCapacity] = useState(9);
  const [batteryPrice, setBatteryPrice] = useState(4500);
  const [annualPVProduction, setAnnualPVProduction] = useState(10000);
  const [afnameTarief, setAfnameTarief] = useState(0.36);
  const [injectieTarief, setInjectieTarief] = useState(0.02);

  const formatCurrency = (value) => `€${value.toFixed(2)}`;
  const formatNumber = (value, decimals = 0) => value.toFixed(decimals);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        const parsed = parseCSV(text);
        
        if (!parsed || parsed.length === 0) {
          throw new Error('Geen data gevonden in het bestand');
        }
        
        const cols = Object.keys(parsed[0]);
        if (!cols.some(c => c.includes('Van (datum)'))) {
          throw new Error('Onbekend CSV formaat. Gebruik een Fluvius export.');
        }
        
        const processed = processFluviusData(parsed);
        
        if (processed.length === 0) {
          throw new Error('Geen geldige meetdata gevonden');
        }
        
        // Bepaal beste jaar (meeste data van 2024 of 2025)
        const yearCounts = {};
        processed.forEach(row => {
          const year = row.datetime.getFullYear();
          if (year >= 2024) {
            yearCounts[year] = (yearCounts[year] || 0) + 1;
          }
        });
        
        const bestYear = Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        
        if (!bestYear) {
          throw new Error('Geen data van 2024 of 2025 gevonden');
        }
        
        const targetYear = parseInt(bestYear);
        const yearData = processed.filter(row => row.datetime.getFullYear() === targetYear);
        
        // Check of data compleet is (volledig jaar = 35040 kwartieren, schrikkeljaar = 35136)
        const expectedQuarters = (targetYear % 4 === 0) ? 35136 : 35040;
        const coverage = (yearData.length / expectedQuarters) * 100;
        
        let finalData;
        let extrapolationInfo = null;
        
        if (coverage < 95) {
          // Data is niet compleet, extrapoleer naar volledig jaar
          finalData = extrapolateToFullYear(yearData, targetYear);
          extrapolationInfo = finalData.extrapolationInfo;
        } else {
          // Data is (bijna) compleet
          finalData = yearData;
        }
        
        setCsvData({ 
          year: targetYear, 
          recordCount: yearData.length,
          extrapolationInfo: extrapolationInfo,
          coverage: coverage.toFixed(1)
        });
        setProcessedData(finalData);
        
      } catch (err) {
        setError(err.message);
        setCsvData(null);
        setProcessedData(null);
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.onerror = () => {
      setError('Fout bij het lezen van het bestand');
      setIsProcessing(false);
    };
    
    reader.readAsText(file, 'utf-8');
  }, []);

  const calculateScenarios = useCallback(() => {
    if (!processedData || processedData.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const energyProfile = processedData.map(row => {
        const pv = calculatePVProduction(row.datetime, annualPVProduction);
        const marketPrice = getMarketPrice(row.datetime);
        const effectivePV = Math.max(pv, row.injectie);
        const eigenverbruikPV = Math.max(0, effectivePV - row.injectie);
        const totaalVerbruik = row.afname + eigenverbruikPV;
        
        return {
          datetime: row.datetime,
          afnameOriginal: row.afname,
          injectieOriginal: row.injectie,
          pv: effectivePV,
          verbruik: totaalVerbruik,
          eigenverbruikPV,
          marketPrice
        };
      });
      
      const totalCalculatedPV = energyProfile.reduce((sum, r) => sum + r.pv, 0);
      const scaleFactor = annualPVProduction / (totalCalculatedPV || 1);
      
      energyProfile.forEach(row => {
        row.pv *= scaleFactor;
        row.eigenverbruikPV = Math.max(0, row.pv - row.injectieOriginal);
        row.verbruik = row.afnameOriginal + row.eigenverbruikPV;
      });
      
      // Scenario 1
      const scenario1 = {
        totalAfnameKwh: energyProfile.reduce((sum, r) => sum + r.afnameOriginal, 0),
        totalInjectieKwh: energyProfile.reduce((sum, r) => sum + r.injectieOriginal, 0),
        totalPVKwh: energyProfile.reduce((sum, r) => sum + r.pv, 0),
        totalVerbruikKwh: energyProfile.reduce((sum, r) => sum + r.verbruik, 0),
        eigenverbruikKwh: energyProfile.reduce((sum, r) => sum + r.eigenverbruikPV, 0),
      };
      scenario1.totalCostAfname = scenario1.totalAfnameKwh * afnameTarief;
      scenario1.totalRevenueInjectie = scenario1.totalInjectieKwh * injectieTarief;
      scenario1.nettoKosten = scenario1.totalCostAfname - scenario1.totalRevenueInjectie;
      scenario1.zelfconsumptiegraad = scenario1.totalPVKwh > 0 ? (scenario1.eigenverbruikKwh / scenario1.totalPVKwh * 100) : 0;
      scenario1.avgMarketPrice = energyProfile.reduce((sum, r) => sum + r.marketPrice, 0) / energyProfile.length;
      
      // Scenario 2
      const batteryPower = batteryCapacity / 2;
      const scenario2 = simulateDumbBattery(energyProfile, {
        capacityKwh: batteryCapacity,
        maxPowerKw: batteryPower,
        afnameTarief,
        injectieTarief
      });
      
      const scenario2PVUsed = scenario1.totalPVKwh - scenario2.totalInjectieKwh;
      scenario2.zelfconsumptiegraad = scenario1.totalPVKwh > 0 ? (scenario2PVUsed / scenario1.totalPVKwh * 100) : 0;
      
      // Scenario 3
      const scenario3 = simulateSmartBattery(energyProfile, {
        capacityKwh: batteryCapacity,
        maxPowerKw: batteryPower
      });
      
      const scenario3PVUsed = scenario1.totalPVKwh - scenario3.totalInjectieKwh;
      scenario3.zelfconsumptiegraad = scenario1.totalPVKwh > 0 ? (scenario3PVUsed / scenario1.totalPVKwh * 100) : 0;
      
      const savingsVsNoBattery2 = scenario1.nettoKosten - scenario2.nettoKosten;
      const savingsVsNoBattery3 = scenario1.nettoKosten - scenario3.nettoKosten;
      const savingsSmart = scenario2.nettoKosten - scenario3.nettoKosten;
      
      const paybackYears2 = savingsVsNoBattery2 > 0 ? batteryPrice / savingsVsNoBattery2 : Infinity;
      const paybackYears3 = savingsVsNoBattery3 > 0 ? batteryPrice / savingsVsNoBattery3 : Infinity;
      
      // Monthly data
      const monthlyData = {};
      energyProfile.forEach((row, idx) => {
        const monthKey = `${row.datetime.getFullYear()}-${String(row.datetime.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            original: { afnameKwh: 0, injectieKwh: 0, totalAfnameCost: 0, totalInjectieRevenue: 0 },
            dumb: { afnameKwh: 0, injectieKwh: 0, totalAfnameCost: 0, totalInjectieRevenue: 0 },
            smart: { afnameKwh: 0, injectieKwh: 0, totalAfnameCost: 0, totalInjectieRevenue: 0 }
          };
        }
        const m = monthlyData[monthKey];
        
        m.original.afnameKwh += row.afnameOriginal;
        m.original.injectieKwh += row.injectieOriginal;
        m.original.totalAfnameCost += row.afnameOriginal * afnameTarief;
        m.original.totalInjectieRevenue += row.injectieOriginal * injectieTarief;
        
        const s2 = scenario2.results[idx];
        if (s2) {
          m.dumb.afnameKwh += s2.gridAfname;
          m.dumb.injectieKwh += s2.gridInjectie;
          m.dumb.totalAfnameCost += s2.gridAfname * afnameTarief;
          m.dumb.totalInjectieRevenue += s2.gridInjectie * injectieTarief;
        }
        
        const s3 = scenario3.results[idx];
        if (s3) {
          m.smart.afnameKwh += s3.gridAfname;
          m.smart.injectieKwh += s3.gridInjectie;
          m.smart.totalAfnameCost += s3.gridAfname * s3.prijsAfname;
          m.smart.totalInjectieRevenue += s3.gridInjectie * s3.prijsInjectie;
        }
      });
      
      Object.values(monthlyData).forEach(m => {
        m.original.avgAfnamePrice = afnameTarief;
        m.original.avgInjectiePrice = injectieTarief;
        m.original.nettoKost = m.original.totalAfnameCost - m.original.totalInjectieRevenue;
        
        m.dumb.avgAfnamePrice = afnameTarief;
        m.dumb.avgInjectiePrice = injectieTarief;
        m.dumb.nettoKost = m.dumb.totalAfnameCost - m.dumb.totalInjectieRevenue;
        
        m.smart.avgAfnamePrice = m.smart.afnameKwh > 0 ? m.smart.totalAfnameCost / m.smart.afnameKwh : 0;
        m.smart.avgInjectiePrice = m.smart.injectieKwh > 0 ? m.smart.totalInjectieRevenue / m.smart.injectieKwh : 0;
        m.smart.nettoKost = m.smart.totalAfnameCost - m.smart.totalInjectieRevenue;
      });
      
      // Chart data
      const dailyData = {};
      energyProfile.forEach((row, idx) => {
        const dateKey = row.datetime.toISOString().split('T')[0];
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { date: dateKey, pv: 0, verbruik: 0, afnameSmart: 0, injectieSmart: 0, count: 0 };
        }
        const d = dailyData[dateKey];
        d.pv += row.pv;
        d.verbruik += row.verbruik;
        d.afnameSmart += scenario3.results[idx]?.gridAfname || 0;
        d.injectieSmart += scenario3.results[idx]?.gridInjectie || 0;
        d.count++;
      });
      
      const chartData = Object.values(dailyData).slice(0, 30);
      
      setResults({
        scenario1,
        scenario2: { ...scenario2, savingsVsNoBattery: savingsVsNoBattery2, paybackYears: paybackYears2 },
        scenario3: { ...scenario3, savingsVsNoBattery: savingsVsNoBattery3, savingsVsDumb: savingsSmart, paybackYears: paybackYears3 },
        monthlyData: Object.values(monthlyData),
        chartData,
        dataYear: csvData?.year
      });
      
      setActiveTab('results');
      
    } catch (err) {
      setError('Fout bij berekening: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [processedData, batteryCapacity, batteryPrice, annualPVProduction, afnameTarief, injectieTarief, csvData]);

  const generatePDF = () => {
    if (!results) return;
    
    const monthNames = ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
    
    let monthlyRows = '';
    results.monthlyData.forEach(month => {
      const mIdx = parseInt(month.month.split('-')[1]) - 1;
      const mName = monthNames[mIdx];
      
      monthlyRows += `
        <tr style="background:#f8fafc">
          <td rowspan="3" style="font-weight:bold">${mName}</td>
          <td>Huidige</td>
          <td style="text-align:right">${month.original.afnameKwh.toFixed(1)}</td>
          <td style="text-align:right">${month.original.injectieKwh.toFixed(1)}</td>
          <td style="text-align:right">${(month.original.avgAfnamePrice * 100).toFixed(1)}</td>
          <td style="text-align:right">${(month.original.avgInjectiePrice * 100).toFixed(1)}</td>
          <td style="text-align:right;color:#dc2626">${formatCurrency(month.original.nettoKost)}</td>
        </tr>
        <tr style="background:#eff6ff">
          <td>Dom</td>
          <td style="text-align:right">${month.dumb.afnameKwh.toFixed(1)}</td>
          <td style="text-align:right">${month.dumb.injectieKwh.toFixed(1)}</td>
          <td style="text-align:right">${(month.dumb.avgAfnamePrice * 100).toFixed(1)}</td>
          <td style="text-align:right">${(month.dumb.avgInjectiePrice * 100).toFixed(1)}</td>
          <td style="text-align:right;color:#3b82f6">${formatCurrency(month.dumb.nettoKost)}</td>
        </tr>
        <tr style="background:#ecfdf5">
          <td>Slim</td>
          <td style="text-align:right">${month.smart.afnameKwh.toFixed(1)}</td>
          <td style="text-align:right">${month.smart.injectieKwh.toFixed(1)}</td>
          <td style="text-align:right">${(month.smart.avgAfnamePrice * 100).toFixed(1)}</td>
          <td style="text-align:right">${(month.smart.avgInjectiePrice * 100).toFixed(1)}</td>
          <td style="text-align:right;color:#10b981">${formatCurrency(month.smart.nettoKost)}</td>
        </tr>
      `;
    });
    
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Batterij Rapport</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}
      h1{color:#10b981;border-bottom:3px solid #10b981;padding-bottom:10px}
      h2{margin-top:30px;color:#334155}
      table{width:100%;border-collapse:collapse;margin:20px 0;font-size:12px}
      th,td{padding:8px;border:1px solid #e2e8f0}
      th{background:#f1f5f9}
      .box{display:inline-block;width:30%;padding:15px;margin:1%;border-radius:8px;vertical-align:top}
      .box-gray{background:#f1f5f9;border:2px solid #cbd5e1}
      .box-blue{background:#eff6ff;border:2px solid #3b82f6}
      .box-green{background:#ecfdf5;border:2px solid #10b981}
      .cost{font-size:24px;font-weight:bold;margin:10px 0}
      @media print{body{padding:10px}.box{width:31%}}
    </style></head><body>
    <h1>Slimme Batterij Calculator - Rapport</h1>
    <p>Data: ${results.dataYear} | Batterij: ${batteryCapacity} kWh | Prijs: ${formatCurrency(batteryPrice)}</p>
    
    <h2>Jaarlijkse Vergelijking</h2>
    <div class="box box-gray">
      <h3>Huidige (Enkel PV)</h3>
      <div class="cost" style="color:#dc2626">${formatCurrency(results.scenario1.nettoKosten)}</div>
      <p>Afname: ${results.scenario1.totalAfnameKwh.toFixed(0)} kWh<br>
      Injectie: ${results.scenario1.totalInjectieKwh.toFixed(0)} kWh<br>
      Zelfconsumptie: ${results.scenario1.zelfconsumptiegraad.toFixed(1)}%</p>
    </div>
    <div class="box box-blue">
      <h3>Domme Batterij</h3>
      <div class="cost" style="color:#3b82f6">${formatCurrency(results.scenario2.nettoKosten)}</div>
      <p>Afname: ${results.scenario2.totalAfnameKwh.toFixed(0)} kWh<br>
      Injectie: ${results.scenario2.totalInjectieKwh.toFixed(0)} kWh<br>
      Besparing: ${formatCurrency(results.scenario2.savingsVsNoBattery)}/jaar<br>
      Terugverdientijd: ${results.scenario2.paybackYears === Infinity ? '∞' : results.scenario2.paybackYears.toFixed(1) + ' jaar'}</p>
    </div>
    <div class="box box-green">
      <h3>Slimme Batterij</h3>
      <div class="cost" style="color:#10b981">${formatCurrency(results.scenario3.nettoKosten)}</div>
      <p>Afname: ${results.scenario3.totalAfnameKwh.toFixed(0)} kWh<br>
      Injectie: ${results.scenario3.totalInjectieKwh.toFixed(0)} kWh<br>
      Besparing: ${formatCurrency(results.scenario3.savingsVsNoBattery)}/jaar<br>
      Terugverdientijd: ${results.scenario3.paybackYears === Infinity ? '∞' : results.scenario3.paybackYears.toFixed(1) + ' jaar'}<br>
      Extra vs dom: +${formatCurrency(results.scenario3.savingsVsDumb)}/jaar</p>
    </div>
    
    <h2>Maandelijks Overzicht</h2>
    <table>
      <tr><th>Maand</th><th>Scenario</th><th>Afname (kWh)</th><th>Injectie (kWh)</th><th>Gem. Afname (c/kWh)</th><th>Gem. Injectie (c/kWh)</th><th>Maandkost</th></tr>
      ${monthlyRows}
      <tr style="background:#f1f5f9;font-weight:bold">
        <td>TOTAAL</td><td>Huidige</td>
        <td style="text-align:right">${results.scenario1.totalAfnameKwh.toFixed(0)}</td>
        <td style="text-align:right">${results.scenario1.totalInjectieKwh.toFixed(0)}</td>
        <td style="text-align:right">${(afnameTarief*100).toFixed(1)}</td>
        <td style="text-align:right">${(injectieTarief*100).toFixed(1)}</td>
        <td style="text-align:right;color:#dc2626">${formatCurrency(results.scenario1.nettoKosten)}</td>
      </tr>
      <tr style="background:#eff6ff;font-weight:bold">
        <td></td><td>Dom</td>
        <td style="text-align:right">${results.scenario2.totalAfnameKwh.toFixed(0)}</td>
        <td style="text-align:right">${results.scenario2.totalInjectieKwh.toFixed(0)}</td>
        <td style="text-align:right">${(afnameTarief*100).toFixed(1)}</td>
        <td style="text-align:right">${(injectieTarief*100).toFixed(1)}</td>
        <td style="text-align:right;color:#3b82f6">${formatCurrency(results.scenario2.nettoKosten)}</td>
      </tr>
      <tr style="background:#ecfdf5;font-weight:bold">
        <td></td><td>Slim</td>
        <td style="text-align:right">${results.scenario3.totalAfnameKwh.toFixed(0)}</td>
        <td style="text-align:right">${results.scenario3.totalInjectieKwh.toFixed(0)}</td>
        <td style="text-align:right">${(results.scenario3.avgAfnamePrice*100).toFixed(1)}</td>
        <td style="text-align:right">${(results.scenario3.avgInjectiePrice*100).toFixed(1)}</td>
        <td style="text-align:right;color:#10b981">${formatCurrency(results.scenario3.nettoKosten)}</td>
      </tr>
    </table>
    <p style="color:#64748b;font-size:12px;margin-top:30px">Gegenereerd op ${new Date().toLocaleDateString('nl-BE')} | Gebaseerd op Belpex marktprijzen</p>
    <p style="color:#64748b;font-size:11px">Open dit bestand in je browser en druk Ctrl+P (of Cmd+P) om als PDF op te slaan.</p>
    </body></html>`;
    
    // Create blob and download as HTML file
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batterij-rapport-${results.dataYear}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white via-emerald-200 to-amber-200 bg-clip-text text-transparent">
            🔋 Slimme Batterij Calculator
          </h1>
          <p className="text-slate-400">Bereken de terugverdientijd met jouw Fluvius data</p>
        </div>
        
        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('input')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'input'
                ? 'bg-emerald-500 text-white'
                : 'bg-white/10 text-slate-400 hover:bg-white/20'
            }`}
          >
            📤 Invoer
          </button>
          <button
            onClick={() => setActiveTab('results')}
            disabled={!results}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'results'
                ? 'bg-emerald-500 text-white'
                : 'bg-white/10 text-slate-400 hover:bg-white/20 disabled:opacity-50'
            }`}
          >
            📊 Resultaten
          </button>
        </div>
        
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300">
            ⚠️ {error}
            <button onClick={() => setError(null)} className="float-right">×</button>
          </div>
        )}
        
        {/* Input Tab */}
        {activeTab === 'input' && (
          <div className="space-y-6">
            {/* File Upload */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h2 className="text-xl font-bold mb-4">📁 1. Upload Fluvius CSV</h2>
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors">
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-lg">Klik om CSV te selecteren</p>
                  <p className="text-sm text-slate-400">Exporteer kwartierdata van mijn.fluvius.be</p>
                </label>
              </div>
              {csvData && (
                <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-300">
                  <div>✅ Data geladen: {csvData.recordCount.toLocaleString()} meetpunten van {csvData.year}</div>
                  <div className="text-sm text-slate-400 mt-1">
                    Dekking: {csvData.coverage}% van het jaar
                  </div>
                  {csvData.extrapolationInfo && (
                    <div className="mt-2 p-2 bg-amber-500/20 border border-amber-500/30 rounded text-amber-300 text-sm">
                      ⚠️ Data onvolledig - {csvData.extrapolationInfo.extrapolatedCount.toLocaleString()} meetpunten geëxtrapoleerd op basis van jouw verbruiksprofiel
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Battery Config */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h2 className="text-xl font-bold mb-4">🔋 2. Batterij Configuratie</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Capaciteit (kWh)</label>
                  <input
                    type="number"
                    value={batteryCapacity}
                    onChange={(e) => setBatteryCapacity(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
                  />
                  <p className="text-xs text-slate-500 mt-1">Laadvermogen: {batteryCapacity/2} kW</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Prijs (€)</label>
                  <input
                    type="number"
                    value={batteryPrice}
                    onChange={(e) => setBatteryPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
                  />
                </div>
              </div>
            </div>
            
            {/* PV Config */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h2 className="text-xl font-bold mb-4">☀️ 3. PV Installatie</h2>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Jaaropbrengst (kWh)</label>
                <input
                  type="number"
                  value={annualPVProduction}
                  onChange={(e) => setAnnualPVProduction(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
                />
              </div>
            </div>
            
            {/* Tariffs */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h2 className="text-xl font-bold mb-4">💶 4. Tarieven (Domme Batterij)</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Afname (€/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={afnameTarief}
                    onChange={(e) => setAfnameTarief(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Injectie (€/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={injectieTarief}
                    onChange={(e) => setInjectieTarief(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
                  />
                </div>
              </div>
            </div>
            
            {/* Calculate Button */}
            <button
              onClick={calculateScenarios}
              disabled={!processedData || isProcessing}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-lg rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? '⏳ Berekenen...' : '🧮 Bereken Scenarios'}
            </button>
          </div>
        )}
        
        {/* Results Tab */}
        {activeTab === 'results' && results && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Current */}
              <div className="bg-slate-800/80 rounded-2xl border border-slate-600 p-5">
                <h3 className="font-bold text-slate-300 mb-3">☀️ Huidige Situatie</h3>
                <div className="text-2xl font-bold text-red-400 mb-3">{formatCurrency(results.scenario1.nettoKosten)}</div>
                <div className="text-sm space-y-1 text-slate-400">
                  <div className="flex justify-between"><span>Afname</span><span>{formatNumber(results.scenario1.totalAfnameKwh)} kWh</span></div>
                  <div className="flex justify-between"><span>Injectie</span><span>{formatNumber(results.scenario1.totalInjectieKwh)} kWh</span></div>
                  <div className="flex justify-between"><span>Zelfconsumptie</span><span>{formatNumber(results.scenario1.zelfconsumptiegraad, 1)}%</span></div>
                </div>
              </div>
              
              {/* Dumb */}
              <div className="bg-blue-900/30 rounded-2xl border border-blue-500/30 p-5">
                <h3 className="font-bold text-blue-300 mb-3">🔋 Domme Batterij</h3>
                <div className="text-2xl font-bold text-blue-400 mb-3">{formatCurrency(results.scenario2.nettoKosten)}</div>
                <div className="text-sm space-y-1 text-slate-400">
                  <div className="flex justify-between"><span>Afname</span><span>{formatNumber(results.scenario2.totalAfnameKwh)} kWh</span></div>
                  <div className="flex justify-between"><span>Injectie</span><span>{formatNumber(results.scenario2.totalInjectieKwh)} kWh</span></div>
                  <div className="flex justify-between"><span>Zelfconsumptie</span><span>{formatNumber(results.scenario2.zelfconsumptiegraad, 1)}%</span></div>
                  <div className="flex justify-between text-emerald-400"><span>Besparing/jaar</span><span>{formatCurrency(results.scenario2.savingsVsNoBattery)}</span></div>
                  <div className="flex justify-between"><span>Terugverdientijd</span><span>{results.scenario2.paybackYears === Infinity ? '∞' : formatNumber(results.scenario2.paybackYears, 1) + ' jaar'}</span></div>
                </div>
              </div>
              
              {/* Smart */}
              <div className="bg-emerald-900/30 rounded-2xl border border-emerald-500/30 p-5 relative">
                <span className="absolute top-2 right-2 px-2 py-1 bg-emerald-500/30 text-emerald-300 text-xs rounded-full">⭐ Aanbevolen</span>
                <h3 className="font-bold text-emerald-300 mb-3">⚡ Slimme Batterij</h3>
                <div className="text-2xl font-bold text-emerald-400 mb-3">{formatCurrency(results.scenario3.nettoKosten)}</div>
                <div className="text-sm space-y-1 text-slate-400">
                  <div className="flex justify-between"><span>Afname</span><span>{formatNumber(results.scenario3.totalAfnameKwh)} kWh</span></div>
                  <div className="flex justify-between"><span>Injectie</span><span>{formatNumber(results.scenario3.totalInjectieKwh)} kWh</span></div>
                  <div className="flex justify-between"><span>Zelfconsumptie</span><span>{formatNumber(results.scenario3.zelfconsumptiegraad, 1)}%</span></div>
                  <div className="flex justify-between text-emerald-400"><span>Besparing/jaar</span><span>{formatCurrency(results.scenario3.savingsVsNoBattery)}</span></div>
                  <div className="flex justify-between"><span>Terugverdientijd</span><span>{results.scenario3.paybackYears === Infinity ? '∞' : formatNumber(results.scenario3.paybackYears, 1) + ' jaar'}</span></div>
                  <div className="flex justify-between text-amber-400"><span>Extra vs dom</span><span>+{formatCurrency(results.scenario3.savingsVsDumb)}/jaar</span></div>
                </div>
              </div>
            </div>
            
            {/* Chart */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              <h3 className="text-xl font-bold mb-4">📈 Dagelijkse Energiestromen (30 dagen)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={results.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{fontSize: 10}} tickFormatter={(v) => v.slice(5)} />
                    <YAxis stroke="#64748b" tick={{fontSize: 10}} />
                    <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px'}} />
                    <Legend />
                    <Area type="monotone" dataKey="pv" name="PV" fill="#fbbf24" fillOpacity={0.3} stroke="#fbbf24" />
                    <Area type="monotone" dataKey="verbruik" name="Verbruik" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
                    <Line type="monotone" dataKey="afnameSmart" name="Afname (Slim)" stroke="#10b981" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Monthly Table */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6 overflow-x-auto">
              <h3 className="text-xl font-bold mb-4">📅 Maandelijks Overzicht</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-2 text-slate-400">Maand</th>
                    <th className="text-left py-2 px-2 text-slate-400">Scenario</th>
                    <th className="text-right py-2 px-2 text-slate-400">Afname</th>
                    <th className="text-right py-2 px-2 text-slate-400">Injectie</th>
                    <th className="text-right py-2 px-2 text-slate-400">Gem.Afn (c)</th>
                    <th className="text-right py-2 px-2 text-slate-400">Gem.Inj (c)</th>
                    <th className="text-right py-2 px-2 text-slate-400">Kost</th>
                  </tr>
                </thead>
                <tbody>
                  {results.monthlyData.map((month) => {
                    const mName = ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec'][parseInt(month.month.split('-')[1])-1];
                    return (
                      <React.Fragment key={month.month}>
                        <tr className="border-b border-white/5 bg-slate-800/30">
                          <td rowSpan={3} className="py-2 px-2 font-medium">{mName}</td>
                          <td className="py-1 px-2 text-slate-300">Huidige</td>
                          <td className="py-1 px-2 text-right">{formatNumber(month.original.afnameKwh, 1)}</td>
                          <td className="py-1 px-2 text-right">{formatNumber(month.original.injectieKwh, 1)}</td>
                          <td className="py-1 px-2 text-right">{(month.original.avgAfnamePrice * 100).toFixed(1)}</td>
                          <td className="py-1 px-2 text-right">{(month.original.avgInjectiePrice * 100).toFixed(1)}</td>
                          <td className="py-1 px-2 text-right text-red-400">{formatCurrency(month.original.nettoKost)}</td>
                        </tr>
                        <tr className="border-b border-white/5 bg-blue-900/20">
                          <td className="py-1 px-2 text-blue-300">Dom</td>
                          <td className="py-1 px-2 text-right">{formatNumber(month.dumb.afnameKwh, 1)}</td>
                          <td className="py-1 px-2 text-right">{formatNumber(month.dumb.injectieKwh, 1)}</td>
                          <td className="py-1 px-2 text-right">{(month.dumb.avgAfnamePrice * 100).toFixed(1)}</td>
                          <td className="py-1 px-2 text-right">{(month.dumb.avgInjectiePrice * 100).toFixed(1)}</td>
                          <td className="py-1 px-2 text-right text-blue-400">{formatCurrency(month.dumb.nettoKost)}</td>
                        </tr>
                        <tr className="border-b border-white/10 bg-emerald-900/20">
                          <td className="py-1 px-2 text-emerald-300">Slim</td>
                          <td className="py-1 px-2 text-right">{formatNumber(month.smart.afnameKwh, 1)}</td>
                          <td className="py-1 px-2 text-right">{formatNumber(month.smart.injectieKwh, 1)}</td>
                          <td className="py-1 px-2 text-right">{(month.smart.avgAfnamePrice * 100).toFixed(1)}</td>
                          <td className="py-1 px-2 text-right">{(month.smart.avgInjectiePrice * 100).toFixed(1)}</td>
                          <td className="py-1 px-2 text-right text-emerald-400">{formatCurrency(month.smart.nettoKost)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-700/50 font-bold">
                    <td className="py-2 px-2">TOTAAL</td>
                    <td className="py-2 px-2 text-slate-300">Huidige</td>
                    <td className="py-2 px-2 text-right">{formatNumber(results.scenario1.totalAfnameKwh)}</td>
                    <td className="py-2 px-2 text-right">{formatNumber(results.scenario1.totalInjectieKwh)}</td>
                    <td className="py-2 px-2 text-right">{(afnameTarief*100).toFixed(1)}</td>
                    <td className="py-2 px-2 text-right">{(injectieTarief*100).toFixed(1)}</td>
                    <td className="py-2 px-2 text-right text-red-400">{formatCurrency(results.scenario1.nettoKosten)}</td>
                  </tr>
                  <tr className="bg-blue-900/30 font-bold">
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2 text-blue-300">Dom</td>
                    <td className="py-2 px-2 text-right">{formatNumber(results.scenario2.totalAfnameKwh)}</td>
                    <td className="py-2 px-2 text-right">{formatNumber(results.scenario2.totalInjectieKwh)}</td>
                    <td className="py-2 px-2 text-right">{(afnameTarief*100).toFixed(1)}</td>
                    <td className="py-2 px-2 text-right">{(injectieTarief*100).toFixed(1)}</td>
                    <td className="py-2 px-2 text-right text-blue-400">{formatCurrency(results.scenario2.nettoKosten)}</td>
                  </tr>
                  <tr className="bg-emerald-900/30 font-bold">
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2 text-emerald-300">Slim</td>
                    <td className="py-2 px-2 text-right">{formatNumber(results.scenario3.totalAfnameKwh)}</td>
                    <td className="py-2 px-2 text-right">{formatNumber(results.scenario3.totalInjectieKwh)}</td>
                    <td className="py-2 px-2 text-right">{(results.scenario3.avgAfnamePrice*100).toFixed(1)}</td>
                    <td className="py-2 px-2 text-right">{(results.scenario3.avgInjectiePrice*100).toFixed(1)}</td>
                    <td className="py-2 px-2 text-right text-emerald-400">{formatCurrency(results.scenario3.nettoKosten)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            {/* PDF Download */}
            <div className="flex justify-center">
              <button
                onClick={generatePDF}
                className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold text-lg rounded-2xl"
              >
                📥 Download Rapport (HTML)
              </button>
            </div>
            <p className="text-center text-slate-500 text-sm mt-2">
              Open het gedownloade bestand en druk Ctrl+P om als PDF op te slaan
            </p>
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-12 text-center text-slate-500 text-sm">
          <p>Gebaseerd op Belpex marktprijzen {results?.dataYear || '2024-2025'}</p>
        </div>
      </div>
    </div>
  );
}
