import React, { useState, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
// STYLES
// =============================================
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #064e3b 100%)',
    color: 'white',
    padding: '32px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxSizing: 'border-box'
  },
  maxWidth: {
    maxWidth: '1000px',
    margin: '0 auto',
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '8px',
    background: 'linear-gradient(90deg, white, #a7f3d0, #fde68a)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '1.1rem'
  },
  tabContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '32px'
  },
  tab: {
    padding: '12px 24px',
    borderRadius: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    fontSize: '1rem',
    transition: 'all 0.2s'
  },
  tabActive: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white'
  },
  tabInactive: {
    background: 'rgba(255,255,255,0.1)',
    color: '#94a3b8'
  },
  tabDisabled: {
    background: 'rgba(255,255,255,0.05)',
    color: '#475569',
    cursor: 'not-allowed'
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '24px',
    marginBottom: '24px'
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  uploadArea: {
    border: '2px dashed rgba(255,255,255,0.2)',
    borderRadius: '16px',
    padding: '48px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box'
  },
  inputGroup: {
    marginBottom: '0'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    color: '#94a3b8',
    marginBottom: '4px'
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px'
  },
  button: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  error: {
    padding: '16px',
    background: 'rgba(239,68,68,0.2)',
    border: '1px solid rgba(239,68,68,0.5)',
    borderRadius: '12px',
    color: '#fca5a5',
    marginBottom: '24px'
  },
  success: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(16,185,129,0.2)',
    border: '1px solid rgba(16,185,129,0.5)',
    borderRadius: '8px',
    color: '#6ee7b7'
  },
  warning: {
    marginTop: '8px',
    padding: '8px',
    background: 'rgba(245,158,11,0.2)',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: '6px',
    color: '#fcd34d',
    fontSize: '0.875rem'
  },
  scenarioGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  scenarioCard: {
    padding: '20px',
    borderRadius: '16px'
  },
  scenarioCurrent: {
    background: 'rgba(51,65,85,0.8)',
    border: '1px solid #475569'
  },
  scenarioDumb: {
    background: 'rgba(30,58,138,0.3)',
    border: '1px solid rgba(59,130,246,0.3)'
  },
  scenarioSmart: {
    background: 'rgba(6,78,59,0.3)',
    border: '1px solid rgba(16,185,129,0.3)',
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '4px 8px',
    background: 'rgba(16,185,129,0.3)',
    color: '#6ee7b7',
    fontSize: '0.75rem',
    borderRadius: '9999px'
  },
  costBig: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    margin: '12px 0'
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
    padding: '4px 0'
  },
  table: {
    width: '100%',
    fontSize: '0.8rem',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'right',
    padding: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8',
    fontWeight: '500'
  },
  thLeft: {
    textAlign: 'left',
    padding: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8',
    fontWeight: '500'
  },
  td: {
    textAlign: 'right',
    padding: '6px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  tdLeft: {
    textAlign: 'left',
    padding: '6px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  downloadBtn: {
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer'
  },
  footer: {
    marginTop: '48px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '0.875rem'
  }
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

const getSeasonFactor = (month) => {
  const factors = {
    0: { afname: 1.3, injectie: 0.3 }, 1: { afname: 1.2, injectie: 0.5 },
    2: { afname: 1.1, injectie: 0.8 }, 3: { afname: 1.0, injectie: 1.1 },
    4: { afname: 0.9, injectie: 1.3 }, 5: { afname: 0.8, injectie: 1.4 },
    6: { afname: 0.8, injectie: 1.3 }, 7: { afname: 0.8, injectie: 1.2 },
    8: { afname: 0.9, injectie: 0.9 }, 9: { afname: 1.0, injectie: 0.6 },
    10: { afname: 1.2, injectie: 0.4 }, 11: { afname: 1.3, injectie: 0.2 }
  };
  return factors[month];
};

const extrapolateToFullYear = (data, targetYear) => {
  if (!data || data.length === 0) return data;
  
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
  
  Object.keys(profiles).forEach(key => {
    const p = profiles[key];
    p.avgAfname = p.afnameSum / p.count;
    p.avgInjectie = p.injectieSum / p.count;
  });
  
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
  
  const existingTimestamps = new Set(data.map(r => r.datetime.getTime()));
  const fullYearData = [];
  const startDate = new Date(targetYear, 0, 1, 0, 0);
  const endDate = new Date(targetYear + 1, 0, 1, 0, 0);
  
  let currentDate = new Date(startDate);
  let extrapolatedCount = 0;
  
  while (currentDate < endDate) {
    const timestamp = currentDate.getTime();
    
    if (existingTimestamps.has(timestamp)) {
      const existing = data.find(r => r.datetime.getTime() === timestamp);
      fullYearData.push({ ...existing, isExtrapolated: false });
    } else {
      const month = currentDate.getMonth();
      const weekday = currentDate.getDay();
      const hour = currentDate.getHours();
      const quarter = Math.floor(currentDate.getMinutes() / 15);
      
      const profileKey = `${month}-${weekday}-${hour}-${quarter}`;
      const hourKey = `${hour}-${quarter}`;
      
      let afname, injectie;
      
      if (profiles[profileKey] && profiles[profileKey].count >= 2) {
        afname = profiles[profileKey].avgAfname;
        injectie = profiles[profileKey].avgInjectie;
      } else {
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
    
    currentDate = new Date(currentDate.getTime() + 15 * 60 * 1000);
  }
  
  fullYearData.extrapolationInfo = {
    originalCount: data.length,
    extrapolatedCount: extrapolatedCount,
    totalCount: fullYearData.length,
    coveragePercent: ((data.length / fullYearData.length) * 100).toFixed(1)
  };
  
  return fullYearData;
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
    
    if (!pvOvervloedig && futureDeficit > 0 && (marketPrice + afnameToeslag) < 0) {
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
        
        const expectedQuarters = (targetYear % 4 === 0) ? 35136 : 35040;
        const coverage = (yearData.length / expectedQuarters) * 100;
        
        let finalData;
        let extrapolationInfo = null;
        
        if (coverage < 95) {
          finalData = extrapolateToFullYear(yearData, targetYear);
          extrapolationInfo = finalData.extrapolationInfo;
        } else {
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
          dailyData[dateKey] = { date: dateKey, pv: 0, verbruik: 0, afnameSmart: 0, injectieSmart: 0 };
        }
        const d = dailyData[dateKey];
        d.pv += row.pv;
        d.verbruik += row.verbruik;
        d.afnameSmart += scenario3.results[idx]?.gridAfname || 0;
        d.injectieSmart += scenario3.results[idx]?.gridInjectie || 0;
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

  const resultsRef = useRef(null);
  
  const generatePDF = async () => {
    if (!results || !resultsRef.current) return;
    
    // Toon loading state
    const button = document.querySelector('[data-pdf-button]');
    if (button) {
      button.textContent = '⏳ PDF genereren...';
      button.disabled = true;
    }
    
    try {
      // Maak canvas van de resultaten sectie
      const canvas = await html2canvas(resultsRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0f172a'
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Bereken PDF dimensies (A4)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      
      // Als de afbeelding te lang is, verdeel over meerdere pagina's
      const pageHeight = pdfHeight - 20; // marge
      const totalPages = Math.ceil(scaledHeight / pageHeight);
      
      if (totalPages === 1) {
        pdf.addImage(imgData, 'PNG', 0, 10, scaledWidth, scaledHeight);
      } else {
        // Meerdere pagina's
        let yOffset = 0;
        for (let i = 0; i < totalPages; i++) {
          if (i > 0) pdf.addPage();
          
          const sourceY = (i * pageHeight / ratio);
          const sourceHeight = Math.min(pageHeight / ratio, imgHeight - sourceY);
          
          // Maak een tijdelijke canvas voor deze pagina
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = imgWidth;
          pageCanvas.height = sourceHeight;
          const ctx = pageCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, sourceY, imgWidth, sourceHeight, 0, 0, imgWidth, sourceHeight);
          
          const pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', 0, 10, scaledWidth, sourceHeight * ratio);
        }
      }
      
      pdf.save(`batterij-rapport-hivolta-${results.dataYear}.pdf`);
      
    } catch (error) {
      console.error('PDF generatie fout:', error);
      alert('Er ging iets mis bij het genereren van de PDF. Probeer opnieuw.');
    } finally {
      // Herstel button
      if (button) {
        button.textContent = '📥 Download Rapport als PDF';
        button.disabled = false;
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>🔋 Slimme Batterij Calculator - Hivolta</h1>
          <p style={styles.subtitle}>Bereken de terugverdientijd met jouw Fluvius data</p>
        </div>
        
        {/* Tabs */}
        <div style={styles.tabContainer}>
          <button
            onClick={() => setActiveTab('input')}
            style={{...styles.tab, ...(activeTab === 'input' ? styles.tabActive : styles.tabInactive)}}
          >
            📤 Invoer
          </button>
          <button
            onClick={() => setActiveTab('results')}
            disabled={!results}
            style={{...styles.tab, ...(activeTab === 'results' ? styles.tabActive : (!results ? styles.tabDisabled : styles.tabInactive))}}
          >
            📊 Resultaten
          </button>
        </div>
        
        {/* Error */}
        {error && (
          <div style={styles.error}>
            ⚠️ {error}
            <span onClick={() => setError(null)} style={{float:'right',cursor:'pointer'}}>×</span>
          </div>
        )}
        
        {/* Input Tab */}
        {activeTab === 'input' && (
          <div>
            {/* File Upload */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📁 1. Upload Fluvius CSV</h2>
              <div style={styles.uploadArea}>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload} 
                  style={{display:'none'}} 
                  id="csv-upload" 
                />
                <label htmlFor="csv-upload" style={{cursor:'pointer'}}>
                  <div style={{fontSize:'3rem',marginBottom:'8px'}}>📄</div>
                  <p style={{fontSize:'1.1rem',margin:'8px 0'}}>Klik om CSV te selecteren</p>
                  <p style={{fontSize:'0.875rem',color:'#94a3b8'}}>Exporteer kwartierdata van mijn.fluvius.be</p>
                </label>
              </div>
              {csvData && (
                <div style={styles.success}>
                  <div>✅ Data geladen: {csvData.recordCount.toLocaleString()} meetpunten van {csvData.year}</div>
                  <div style={{fontSize:'0.875rem',color:'#94a3b8',marginTop:'4px'}}>Dekking: {csvData.coverage}% van het jaar</div>
                  {csvData.extrapolationInfo && (
                    <div style={styles.warning}>
                      ⚠️ Data onvolledig - {csvData.extrapolationInfo.extrapolatedCount.toLocaleString()} meetpunten geëxtrapoleerd
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Battery Config */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>🔋 2. Batterij Configuratie</h2>
              <div style={styles.grid2}>
                <div>
                  <label style={styles.label}>Capaciteit (kWh)</label>
                  <input
                    type="number"
                    value={batteryCapacity}
                    onChange={(e) => setBatteryCapacity(parseFloat(e.target.value) || 0)}
                    style={styles.input}
                  />
                  <p style={{fontSize:'0.75rem',color:'#64748b',marginTop:'4px'}}>Laadvermogen: {batteryCapacity/2} kW</p>
                </div>
                <div>
                  <label style={styles.label}>Prijs (€)</label>
                  <input
                    type="number"
                    value={batteryPrice}
                    onChange={(e) => setBatteryPrice(parseFloat(e.target.value) || 0)}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
            
            {/* PV Config */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>☀️ 3. PV Installatie</h2>
              <div>
                <label style={styles.label}>Jaaropbrengst (kWh)</label>
                <input
                  type="number"
                  value={annualPVProduction}
                  onChange={(e) => setAnnualPVProduction(parseFloat(e.target.value) || 0)}
                  style={styles.input}
                />
              </div>
            </div>
            
            {/* Tariffs */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>💶 4. Tarieven (Domme Batterij)</h2>
              <div style={styles.grid2}>
                <div>
                  <label style={styles.label}>Afname (€/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={afnameTarief}
                    onChange={(e) => setAfnameTarief(parseFloat(e.target.value) || 0)}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={styles.label}>Injectie (€/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={injectieTarief}
                    onChange={(e) => setInjectieTarief(parseFloat(e.target.value) || 0)}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
            
            {/* Calculate Button */}
            <button
              onClick={calculateScenarios}
              disabled={!processedData || isProcessing}
              style={{...styles.button, ...(!processedData || isProcessing ? styles.buttonDisabled : {})}}
            >
              {isProcessing ? '⏳ Berekenen...' : '🧮 Bereken Scenarios'}
            </button>
          </div>
        )}
        
        {/* Results Tab */}
        {activeTab === 'results' && results && (
          <div ref={resultsRef}>
            {/* Summary Cards */}
            <div style={styles.scenarioGrid}>
              {/* Current */}
              <div style={{...styles.scenarioCard, ...styles.scenarioCurrent}}>
                <h3 style={{fontWeight:'bold',color:'#cbd5e1',marginBottom:'12px'}}>☀️ Huidige Situatie</h3>
                <div style={{...styles.costBig, color:'#f87171'}}>{formatCurrency(results.scenario1.nettoKosten)}</div>
                <div style={{fontSize:'0.875rem',color:'#94a3b8'}}>
                  <div style={styles.statRow}><span>Afname</span><span>{formatNumber(results.scenario1.totalAfnameKwh)} kWh</span></div>
                  <div style={styles.statRow}><span>Injectie</span><span>{formatNumber(results.scenario1.totalInjectieKwh)} kWh</span></div>
                  <div style={styles.statRow}><span>Zelfconsumptie</span><span>{formatNumber(results.scenario1.zelfconsumptiegraad, 1)}%</span></div>
                </div>
              </div>
              
              {/* Dumb */}
              <div style={{...styles.scenarioCard, ...styles.scenarioDumb}}>
                <h3 style={{fontWeight:'bold',color:'#93c5fd',marginBottom:'12px'}}>🔋 Domme Batterij</h3>
                <div style={{...styles.costBig, color:'#60a5fa'}}>{formatCurrency(results.scenario2.nettoKosten)}</div>
                <div style={{fontSize:'0.875rem',color:'#94a3b8'}}>
                  <div style={styles.statRow}><span>Afname</span><span>{formatNumber(results.scenario2.totalAfnameKwh)} kWh</span></div>
                  <div style={styles.statRow}><span>Injectie</span><span>{formatNumber(results.scenario2.totalInjectieKwh)} kWh</span></div>
                  <div style={styles.statRow}><span>Zelfconsumptie</span><span>{formatNumber(results.scenario2.zelfconsumptiegraad, 1)}%</span></div>
                  <div style={{...styles.statRow, color:'#6ee7b7'}}><span>Besparing/jaar</span><span>{formatCurrency(results.scenario2.savingsVsNoBattery)}</span></div>
                  <div style={styles.statRow}><span>Terugverdientijd</span><span>{results.scenario2.paybackYears === Infinity ? '∞' : formatNumber(results.scenario2.paybackYears, 1) + ' jaar'}</span></div>
                </div>
              </div>
              
              {/* Smart */}
              <div style={{...styles.scenarioCard, ...styles.scenarioSmart}}>
                <span style={styles.badge}>⭐ Aanbevolen</span>
                <h3 style={{fontWeight:'bold',color:'#6ee7b7',marginBottom:'12px'}}>⚡ Slimme Batterij</h3>
                <div style={{...styles.costBig, color:'#34d399'}}>{formatCurrency(results.scenario3.nettoKosten)}</div>
                <div style={{fontSize:'0.875rem',color:'#94a3b8'}}>
                  <div style={styles.statRow}><span>Afname</span><span>{formatNumber(results.scenario3.totalAfnameKwh)} kWh</span></div>
                  <div style={styles.statRow}><span>Injectie</span><span>{formatNumber(results.scenario3.totalInjectieKwh)} kWh</span></div>
                  <div style={styles.statRow}><span>Zelfconsumptie</span><span>{formatNumber(results.scenario3.zelfconsumptiegraad, 1)}%</span></div>
                  <div style={{...styles.statRow, color:'#6ee7b7'}}><span>Besparing/jaar</span><span>{formatCurrency(results.scenario3.savingsVsNoBattery)}</span></div>
                  <div style={styles.statRow}><span>Terugverdientijd</span><span>{results.scenario3.paybackYears === Infinity ? '∞' : formatNumber(results.scenario3.paybackYears, 1) + ' jaar'}</span></div>
                  <div style={{...styles.statRow, color:'#fbbf24'}}><span>Extra vs dom</span><span>+{formatCurrency(results.scenario3.savingsVsDumb)}/jaar</span></div>
                </div>
              </div>
            </div>
            
            {/* Chart */}
            <div style={styles.card}>
              <h3 style={{fontSize:'1.25rem',fontWeight:'bold',marginBottom:'16px'}}>📈 Dagelijkse Energiestromen (30 dagen)</h3>
              <div style={{height:'256px'}}>
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
            <div style={styles.card}>
              <h3 style={{fontSize:'1.25rem',fontWeight:'bold',marginBottom:'16px'}}>📅 Maandelijks Overzicht</h3>
              <div style={{overflowX:'auto'}}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.thLeft}>Maand</th>
                      <th style={styles.thLeft}>Scenario</th>
                      <th style={styles.th}>Afname</th>
                      <th style={styles.th}>Injectie</th>
                      <th style={styles.th}>Gem.Afn (c)</th>
                      <th style={styles.th}>Gem.Inj (c)</th>
                      <th style={styles.th}>Kost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.monthlyData.map((month) => {
                      const mName = ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec'][parseInt(month.month.split('-')[1])-1];
                      return (
                        <React.Fragment key={month.month}>
                          <tr style={{background:'rgba(51,65,85,0.3)'}}>
                            <td rowSpan={3} style={{...styles.tdLeft,fontWeight:'500'}}>{mName}</td>
                            <td style={{...styles.tdLeft,color:'#cbd5e1'}}>Huidige</td>
                            <td style={styles.td}>{formatNumber(month.original.afnameKwh, 1)}</td>
                            <td style={styles.td}>{formatNumber(month.original.injectieKwh, 1)}</td>
                            <td style={styles.td}>{(month.original.avgAfnamePrice * 100).toFixed(1)}</td>
                            <td style={styles.td}>{(month.original.avgInjectiePrice * 100).toFixed(1)}</td>
                            <td style={{...styles.td,color:'#f87171'}}>{formatCurrency(month.original.nettoKost)}</td>
                          </tr>
                          <tr style={{background:'rgba(30,58,138,0.2)'}}>
                            <td style={{...styles.tdLeft,color:'#93c5fd'}}>Dom</td>
                            <td style={styles.td}>{formatNumber(month.dumb.afnameKwh, 1)}</td>
                            <td style={styles.td}>{formatNumber(month.dumb.injectieKwh, 1)}</td>
                            <td style={styles.td}>{(month.dumb.avgAfnamePrice * 100).toFixed(1)}</td>
                            <td style={styles.td}>{(month.dumb.avgInjectiePrice * 100).toFixed(1)}</td>
                            <td style={{...styles.td,color:'#60a5fa'}}>{formatCurrency(month.dumb.nettoKost)}</td>
                          </tr>
                          <tr style={{background:'rgba(6,78,59,0.2)'}}>
                            <td style={{...styles.tdLeft,color:'#6ee7b7'}}>Slim</td>
                            <td style={styles.td}>{formatNumber(month.smart.afnameKwh, 1)}</td>
                            <td style={styles.td}>{formatNumber(month.smart.injectieKwh, 1)}</td>
                            <td style={styles.td}>{(month.smart.avgAfnamePrice * 100).toFixed(1)}</td>
                            <td style={styles.td}>{(month.smart.avgInjectiePrice * 100).toFixed(1)}</td>
                            <td style={{...styles.td,color:'#34d399'}}>{formatCurrency(month.smart.nettoKost)}</td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{background:'rgba(51,65,85,0.5)',fontWeight:'bold'}}>
                      <td style={styles.tdLeft}>TOTAAL</td>
                      <td style={{...styles.tdLeft,color:'#cbd5e1'}}>Huidige</td>
                      <td style={styles.td}>{formatNumber(results.scenario1.totalAfnameKwh)}</td>
                      <td style={styles.td}>{formatNumber(results.scenario1.totalInjectieKwh)}</td>
                      <td style={styles.td}>{(afnameTarief*100).toFixed(1)}</td>
                      <td style={styles.td}>{(injectieTarief*100).toFixed(1)}</td>
                      <td style={{...styles.td,color:'#f87171'}}>{formatCurrency(results.scenario1.nettoKosten)}</td>
                    </tr>
                    <tr style={{background:'rgba(30,58,138,0.3)',fontWeight:'bold'}}>
                      <td style={styles.tdLeft}></td>
                      <td style={{...styles.tdLeft,color:'#93c5fd'}}>Dom</td>
                      <td style={styles.td}>{formatNumber(results.scenario2.totalAfnameKwh)}</td>
                      <td style={styles.td}>{formatNumber(results.scenario2.totalInjectieKwh)}</td>
                      <td style={styles.td}>{(afnameTarief*100).toFixed(1)}</td>
                      <td style={styles.td}>{(injectieTarief*100).toFixed(1)}</td>
                      <td style={{...styles.td,color:'#60a5fa'}}>{formatCurrency(results.scenario2.nettoKosten)}</td>
                    </tr>
                    <tr style={{background:'rgba(6,78,59,0.3)',fontWeight:'bold'}}>
                      <td style={styles.tdLeft}></td>
                      <td style={{...styles.tdLeft,color:'#6ee7b7'}}>Slim</td>
                      <td style={styles.td}>{formatNumber(results.scenario3.totalAfnameKwh)}</td>
                      <td style={styles.td}>{formatNumber(results.scenario3.totalInjectieKwh)}</td>
                      <td style={styles.td}>{(results.scenario3.avgAfnamePrice*100).toFixed(1)}</td>
                      <td style={styles.td}>{(results.scenario3.avgInjectiePrice*100).toFixed(1)}</td>
                      <td style={{...styles.td,color:'#34d399'}}>{formatCurrency(results.scenario3.nettoKosten)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            {/* PDF Download */}
            <div style={{textAlign:'center',marginTop:'24px'}}>
              <button data-pdf-button onClick={generatePDF} style={styles.downloadBtn}>
                📥 Download Rapport als PDF
              </button>
            </div>
            
            {/* Disclaimer */}
            <div style={{marginTop:'32px',padding:'16px',background:'rgba(255,255,255,0.05)',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.1)'}}>
              <p style={{color:'#94a3b8',fontSize:'0.8rem',margin:0,lineHeight:'1.5'}}>
                <strong style={{color:'#fbbf24'}}>⚠️ Disclaimer:</strong> Deze calculator geeft een schatting op basis van historische verbruiksdata en marktprijzen. 
                De werkelijke besparingen kunnen afwijken door veranderingen in energieprijzen, verbruikspatronen, weersomstandigheden en andere factoren. 
                Dit is geen garantie of belofte van toekomstige resultaten. Raadpleeg een specialist voor persoonlijk advies.
              </p>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div style={styles.footer}>
          <p>Hivolta | Gebaseerd op Belpex marktprijzen {results?.dataYear || '2024-2025'}</p>
        </div>
      </div>
    </div>
  );
}
