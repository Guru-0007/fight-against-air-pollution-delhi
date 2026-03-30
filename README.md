# 🌫️ PolluSense: Delhi Air Intelligence Platform

**PolluSense** is a state-of-the-art, full-stack air quality command center designed to monitor, analyze, and mitigate pollution in the Delhi-NCR region. It bridges the gap between citizen awareness and government action through real-time data visualization and interactive health algorithms.

---

## 🚀 Key Features

### 🏛️ Dual-Mode Ecosystem
- **Citizen Portal**: Provides hyper-local AQI data, personalized health risk assessments, and a community reporting tool for pollution violations.
- **Government Control Panel**: A restricted dashboard for environmental authorities to manage citizen reports, analyze industrial suspicion indices, and dispatch warnings to non-compliant sectors.

### 🧪 True Cost Health Calculator
- **PM2.5 to Cigarette Conversion**: Visualizes the toxicity of the current air in terms of cigarettes smoked per day.
- **Life Expectancy Analysis**: Dynamically calculates predicted lifespan reduction based on long-term AQI exposure.
- **Economic Impact**: Projects estimated medical costs and healthcare trajectories over a 5-year period.

### 🗺️ Dynamic Intelligence
- **Geocoding Search**: Convert any Delhi pincode or area name into precise GPS coordinates to fetch local pollution metrics.
- **Interactive Heatmaps**: Heatmap visualizations of pollution hotspots using the Leaflet.js engine.
- **Live AQI Integration**: Real-time multi-pollutant data (PM2.5, PM10, NO2) sourced from high-precision meteorological APIs.

### 🛡️ Community Safeguards
- **Evidence-Based Reporting**: Citizens can upload images and geotagged descriptions of pollution incidents.
- **Verified Leaderboard**: Rewards the most active and verified contributors in the pollution monitoring community.

---

## 💻 Tech Stack

- **Frontend**: Native ES6+ JavaScript, CSS3 Glassmorphism UI, Leaflet.js (Maps), Chart.js (Data Viz)
- **Backend**: Node.js, Express.js, Supabase (Database & Auth)
- **APIs**: Open-Meteo Air Quality, OSM Nominatim Geocoding

---

## 🛠️ Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or higher)
- [Supabase Account](https://supabase.com/)

### 2. Launch
Simply open `frontend/index.html` in any modern browser, or use a live server extension.

The application is now a **Pure Frontend Static Site**, communicating directly with:
- **Supabase**: For Authentication, News, and Reports.
- **WAQI API**: For real-time air quality metrics.
- **Open-Meteo**: For dynamic wind and weather data.

---

## 🏢 Government Access
To log into the Government Dashboard, use the credentials provided in your internal documentation. 

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
