import { Calculator } from '../api/api.js';

export const CalculatorPage = {
  render: () => `
    <div class="form-page">
      <div class="glass-panel">
        <h2 class="form-page-title">True Cost Calculator</h2>
        <p class="form-page-subtitle">
          See the real health and financial impact of air pollution in your area. 
          Enter any Delhi-NCR pincode to analyze local conditions.
        </p>

        <div style="display:flex; gap:10px; margin-bottom:28px;">
          <input type="text" id="calc-pincode" class="form-input" style="flex:1; margin-bottom:0;" placeholder="Enter PIN code (e.g. 110001)">
          <button id="calc-btn" class="btn btn-primary" style="min-width:130px;">Calculate</button>
        </div>

        <div id="calc-results" style="display:none;">
          <div class="stats-grid" style="margin-bottom:24px;">
            <div class="stat-card">
              <div class="stat-label">Current PM2.5</div>
              <div class="stat-value" id="res-pm25">—</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">µg/m³</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Cigarette Equiv/Day</div>
              <div class="stat-value" id="res-cig">—</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Lifespan Reduction</div>
              <div class="stat-value" id="res-life">—</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Asthma Risk</div>
              <div class="stat-value" id="res-asthma">—</div>
            </div>
          </div>

          <div class="glass-panel-flat" style="text-align:center; padding:28px; margin-bottom:24px;">
            <div class="stat-label" style="margin-bottom:8px;">Estimated Annual Healthcare Burden</div>
            <div class="cost-display">
              <span class="cost-currency">₹</span><span id="res-cost">—</span>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:8px;">Per person per year</div>
          </div>

          <div class="glass-panel-flat" style="padding:20px;">
            <div class="panel-title"><span class="dot"></span> 5-Year Cost Projection</div>
            <div style="height:200px; position:relative;">
              <canvas id="projectionChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,

  init: () => {
    document.getElementById('calc-btn').addEventListener('click', async () => {
      const pin = document.getElementById('calc-pincode').value.trim();
      if (!pin) return window.showToast('Please enter a pincode', 'error');

      const btn = document.getElementById('calc-btn');
      btn.textContent = 'Analyzing...';
      btn.disabled = true;

      try {
        const data = await Calculator.calculate({ pincode: pin });

        document.getElementById('res-pm25').textContent = Math.round(data.pm25);
        document.getElementById('res-cig').textContent = data.cigaretteEq;
        document.getElementById('res-life').textContent = data.lifespanReductionYears + ' yrs';
        document.getElementById('res-asthma').textContent = '+' + data.asthmaRiskIncrease + '%';

        // Format cost in Indian number system
        const costNum = data.estimatedCostRaw || parseInt(String(data.estimatedCost).replace(/,/g, ''), 10);
        const formatted = new Intl.NumberFormat('en-IN').format(costNum);
        document.getElementById('res-cost').textContent = formatted;

        document.getElementById('calc-results').style.display = 'block';

        // 5-year projection chart
        if (data.projection && typeof Chart !== 'undefined') {
          const ctx = document.getElementById('projectionChart');
          // Destroy existing chart instance if any
          if (ctx._chartInstance) ctx._chartInstance.destroy();

          const chart = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: data.projection.map(p => p.year),
              datasets: [{
                label: 'Healthcare Cost (₹)',
                data: data.projection.map(p => p.cost),
                backgroundColor: data.projection.map((_, i) =>
                  `rgba(90, 143, 188, ${0.3 + i * 0.15})`
                ),
                borderColor: '#5a8fbc',
                borderWidth: 1,
                borderRadius: 8
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  titleColor: '#1a2332',
                  bodyColor: '#4a5568',
                  borderColor: 'rgba(0,0,0,0.1)',
                  borderWidth: 1,
                  cornerRadius: 10,
                  callbacks: {
                    label: (ctx) => '₹' + new Intl.NumberFormat('en-IN').format(ctx.raw)
                  }
                }
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { color: '#8896a6', font: { family: 'Inter', size: 11 } }
                },
                y: {
                  grid: { color: 'rgba(0,0,0,0.04)' },
                  ticks: {
                    color: '#8896a6',
                    font: { family: 'Inter', size: 11 },
                    callback: (v) => '₹' + (v / 1000) + 'K'
                  }
                }
              }
            }
          });
          ctx._chartInstance = chart;
        }

        // Smooth scroll to results
        document.getElementById('calc-results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (e) {
        window.showToast(e.message, 'error');
        document.getElementById('calc-results').style.display = 'none';
      } finally {
        btn.textContent = 'Calculate';
        btn.disabled = false;
      }
    });

    // Enter key support
    document.getElementById('calc-pincode').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') document.getElementById('calc-btn').click();
    });
  }
};
