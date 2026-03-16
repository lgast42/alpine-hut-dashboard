export const monthlyAverages = [
  { month: 'May', precipitation: 197, snow: 89 },
  { month: 'Jun', precipitation: 171, snow: 64 },
  { month: 'Jul', precipitation: 242, snow: 28 },
  { month: 'Aug', precipitation: 256, snow: 11 },
  { month: 'Sep', precipitation: 169, snow:  5 },
];

export const annualData = [
  {
    year: 2018,
    months: {
      may: { precip: 152.6, snow: null },
      jun: { precip: 168.1, snow: null },
      jul: { precip: 152.4, snow: null },
      aug: { precip: 300.3, snow: 26.6 },
      sep: { precip: 123.7, snow: 21.2 },
    },
  },
  {
    year: 2019,
    months: {
      may: { precip: 220.3, snow: 99.8 },
      jun: { precip:  65.2, snow: 85.7 },
      jul: { precip: 190.5, snow: 55.9 },
      aug: { precip: 162.2, snow: 20.9 },
      sep: { precip: 171.4, snow:  2.3 },
    },
  },
  {
    year: 2020,
    months: {
      may: { precip: 136.0, snow: 83.9 },
      jun: { precip: 229.3, snow: 75.2 },
      jul: { precip: 222.8, snow: 50.0 },
      aug: { precip: 382.1, snow:  5.5 },
      sep: { precip: 185.3, snow:  1.5 },
    },
  },
  {
    year: 2021,
    months: {
      may: { precip: 213.3, snow: 99.3 },
      jun: { precip: 124.3, snow: 85.5 },
      jul: { precip: 344.4, snow: 39.3 },
      aug: { precip: 298.8, snow: 26.8 },
      sep: { precip: 102.4, snow:  3.0 },
    },
  },
  {
    year: 2022,
    months: {
      may: { precip: 157.9, snow: 79.8 },
      jun: { precip: 256.3, snow: 38.5 },
      jul: { precip: 216.6, snow:  1.0 },
      aug: { precip: 188.4, snow:  0.5 },
      sep: { precip: 193.4, snow: null },
    },
  },
  {
    year: 2023,
    months: {
      may: { precip: 217.5, snow: null },
      jun: { precip: 111.6, snow: null },
      jul: { precip: 288.8, snow: 32.4 },
      aug: { precip: 295.2, snow:  0.0 },
      sep: { precip:  87.0, snow:  3.2 },
    },
  },
  {
    year: 2024,
    months: {
      may: { precip: 251.3, snow: null },
      jun: { precip: 225.1, snow: null },
      jul: { precip: 230.0, snow: 14.3 },
      aug: { precip: 221.7, snow:  1.8 },
      sep: { precip: 322.3, snow:  2.0 },
    },
  },
  {
    year: 2025,
    months: {
      may: { precip: 230.3, snow: 82.7 },
      jun: { precip: 184.7, snow: 35.6 },
      jul: { precip: 292.7, snow:  5.0 },
      aug: { precip: 197.1, snow:  1.5 },
      sep: { precip: 164.3, snow:  1.1 },
    },
  },
];

// Min/max across all 8 years per month (snow ignores null values)
export const varianceData = [
  { month: 'May', precipMin: 136.0, precipMax: 251.3, snowMin: 79.8, snowMax: 99.8 },
  { month: 'Jun', precipMin:  65.2, precipMax: 256.3, snowMin: 35.6, snowMax: 85.7 },
  { month: 'Jul', precipMin: 152.4, precipMax: 344.4, snowMin:  1.0, snowMax: 55.9 },
  { month: 'Aug', precipMin: 162.2, precipMax: 382.1, snowMin:  0.0, snowMax: 26.8 },
  { month: 'Sep', precipMin:  87.0, precipMax: 322.3, snowMin:  1.1, snowMax: 21.2 },
];
