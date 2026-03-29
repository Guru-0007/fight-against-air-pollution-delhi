# Delhi Air Quality Command Center

A fully dynamic, real-time web platform built to monitor, analyze, and manage air pollution across the Delhi-NCR region. Features dual-mode access for Citizens and Government Officials, integrating live AQI metrics, interactive mapping, health impact algorithms, and community reporting.

## Features

- **Real-Time Data**: Integrates with Open-Meteo Air Quality API to provide live index numbers, PM2.5, PM10, Nitrogen Dioxide, and weather statuses for any specific pincode.
- **Dynamic Geography**: Built-in Nominatim geocoding engine converts any Delhi-NCR pincode or area name into precise GPS coordinates to fetch exact, hyper-local pollution data dynamically. 
- **True Cost Health Calculator**: Clinically derived algorithms convert local PM2.5 concentrations into "Cigarette Equivalents", calculates predicted Lifespan Reductions alongside asthma risk percentages, and projects estimated healthcare costs (with charted 5-year trajectories).
- **Interactive Mapping**: Leaflet-based heatmaps and geocoded location markers mapping all government monitoring stations and sensitive vulnerable zones.
- **Dual User Modes**:
  - *Citizen View*: Browse maps, calculate personal health impact, discover DIY home-air tips, and report local emission violations anonymously.
  - *Government Dashboard*: Secured control panel for authorities to track real-time complaint tickets, monitor dynamic suspicion indices of industrial zones, dispatch enforcement emails to polluting factories, and update citizen reports globally.
- **Responsive & Modern UI**: A premium, "glassmorphism" aesthetic built purely with optimized CSS and native JavaScript modules.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Guru-0007/fight-against-air-pollution-delhi.git
   cd fight-against-air-pollution-delhi
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **View the application:**
   Open your browser and navigate to `http://localhost:3005` (or simply open `frontend/index.html` manually).

*Note: For government access, use the "Government Login" section with the credentials configured in your environment.*

## Technologies Used
- Frontend: HTML5, CSS3 (Custom Glass UI), Vanilla ES6 JavaScript
- Maps: Leaflet.js
- Charts: Chart.js
- Backend: Node.js, Express.js
- APIs: Open-Meteo, OpenStreetMap Nominatim

## License
MIT License
