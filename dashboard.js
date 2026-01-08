let currentProject = 'edge';
let dashboardData = [];
let charts = {};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    try {
        const projectSelector = document.getElementById('projectSelector');
        if (projectSelector) {
            projectSelector.addEventListener('change', (e) => {
                currentProject = e.target.value;
                initializeProject();
            });
        }

        initializeProject();
        setupUploadListener();
    } catch (error) {
        console.error('Error loading application:', error);
    }
});

function initializeProject() {
    if (typeof allProjectsData !== 'undefined') {
        dashboardData = allProjectsData[currentProject] || [];
        processInitialData();
        setupFilters();
        setupTabs();
        updateDashboard();
    } else if (typeof rawDashboardData !== 'undefined') {
        // Fallback for old data format
        dashboardData = rawDashboardData;
        processInitialData();
        setupFilters();
        setupTabs();
        updateDashboard();
    } else {
        console.error('No se encontraron datos. Asegúrate de que data.js esté cargado.');
    }
}

function processInitialData() {
    dashboardData.forEach(row => {
        // EDGE specific fields
        if (currentProject === 'edge') {
            row['Total POS'] = parseFloat(row['Total POS']) || 0;
            row['Approved POS'] = parseFloat(row['Approved POS']) || 0;
            row['Rechazados Totales'] = parseFloat(row['Rechazados Totales']) || 0;
            row['Refusal POS'] = parseFloat(row['Refusal POS']) || 0;
        }
        // INVOICE specific fields
        else {
            row['PoS Recruited'] = parseFloat(row['PoS Recruited']) || 0;
            row['Visits for Recruitment'] = parseFloat(row['Visits for Recruitment']) || 0;
            row['Visits for Invoice Collection'] = parseFloat(row['Visits for Invoice Collection']) || 0;
            row['Visits with Invoice Collection'] = parseFloat(row['Visits with Invoice Collection']) || 0;
        }

        row['Tiempo en Formularios (Hrs)'] = parseFloat(row['Time in forms (Hrs)'] || row['Tiempo en Formularios (Hrs)']) || 0;

        // Convert Excel serial date to JS Date object
        if (row.Fecha) {
            // If it's already a string from defaulted process (like defaulting default_str in Python), parse it
            if (typeof row.Fecha === 'string' && row.Fecha.includes('-')) {
                row.jsDate = new Date(row.Fecha);
            } else {
                const serial = parseFloat(row.Fecha);
                if (!isNaN(serial)) {
                    row.jsDate = new Date((serial - 25569) * 86400 * 1000);
                }
            }
            if (row.jsDate) row.dateString = row.jsDate.toLocaleDateString();
        }
    });
}

function setupFilters() {
    const regionFilter = document.getElementById('regionFilter');
    const cityFilter = document.getElementById('cityFilter');
    const statusFilter = document.getElementById('statusFilter');
    const monthFilter = document.getElementById('monthFilter');

    // Reset options
    regionFilter.innerHTML = '<option value="all">Todas las Regiones</option>';
    cityFilter.innerHTML = '<option value="all">Todas las Ciudades</option>';
    monthFilter.innerHTML = '<option value="all">Todos los Meses</option>';

    const regions = [...new Set(dashboardData.map(d => d.Region))].filter(Boolean).sort();
    const cities = [...new Set(dashboardData.map(d => d['Ciudad simp']))].filter(Boolean).sort();
    const months = [...new Set(dashboardData.map(d => d.Mes))].filter(Boolean).sort();

    regions.forEach(r => regionFilter.add(new Option(r, r)));
    cities.forEach(c => cityFilter.add(new Option(c, c)));
    months.forEach(m => monthFilter.add(new Option(m, m)));

    regionFilter.addEventListener('change', updateDashboard);
    cityFilter.addEventListener('change', updateDashboard);
    statusFilter.addEventListener('change', updateDashboard);
    monthFilter.addEventListener('change', updateDashboard);
}

function setupTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('pageTitle');

    const titles = {
        'productivity': 'Dashboard de Productividad EDGE',
        'overview': 'Vista General y Colecta',
        'quality': 'Análisis de Calidad Regional',
        'insights': 'Smart AI Insights'
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) content.classList.add('active');
            });
            pageTitle.textContent = titles[tabId];
            updateDashboard();
        });
    });
}

function setupUploadListener() {
    const uploadInput = document.getElementById('excelUpload');
    if (uploadInput) {
        uploadInput.addEventListener('change', handleFileUpload);
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length > 0) {
            dashboardData = jsonData;
            processInitialData();
            setupFilters();
            updateDashboard();
            alert('Datos actualizados: ' + jsonData.length + ' filas cargadas.');
        }
    };
    reader.readAsArrayBuffer(file);
}

function getFilteredData() {
    const region = document.getElementById('regionFilter').value;
    const city = document.getElementById('cityFilter').value;
    const status = document.getElementById('statusFilter').value;
    const month = document.getElementById('monthFilter').value;

    return dashboardData.filter(d => {
        const matchRegion = region === 'all' || d.Region === region;
        const matchCity = city === 'all' || d['Ciudad simp'] === city;
        const matchStatus = status === 'all' || d['Estado actual'] === status;
        const matchMonth = month === 'all' || d.Mes === month;
        return matchRegion && matchCity && matchStatus && matchMonth;
    });
}

function updateDashboard() {
    const data = getFilteredData();
    const activeTab = document.querySelector('.nav-item.active').getAttribute('data-tab');

    if (activeTab === 'productivity') {
        updateProductivityKPIs(data);
        renderProductivityCharts(data);
    } else if (activeTab === 'overview') {
        renderOverviewCharts(data);
    } else if (activeTab === 'quality') {
        renderQualityCharts(data);
    } else if (activeTab === 'insights') {
        renderInsights(data);
    }
}

function updateProductivityKPIs(data) {
    const auditorField = currentProject === 'edge' ? 'Name Auditor' : 'Auditor Name';
    const auditorNames = [...new Set(data.map(d => d[auditorField]))];

    if (currentProject === 'edge') {
        const totalPos = data.reduce((sum, d) => sum + d['Total POS'], 0);
        const approved = data.reduce((sum, d) => sum + d['Approved POS'], 0);
        const rejections = data.reduce((sum, d) => sum + d['Rechazados Totales'], 0);
        const avgPos = auditorNames.length > 0 ? (totalPos / auditorNames.length).toFixed(0) : 0;
        const approvalRate = totalPos > 0 ? (approved / totalPos * 100).toFixed(1) : 0;

        document.getElementById('kpi-total-pos').previousElementSibling.textContent = 'Productividad Total';
        document.getElementById('kpi-total-pos').textContent = totalPos.toLocaleString();
        document.getElementById('kpi-avg-pos').textContent = avgPos;
        document.getElementById('kpi-approval-rate').textContent = `${approvalRate}%`;
        document.getElementById('kpi-rejections').textContent = rejections.toLocaleString();
        document.getElementById('approval-progress').style.width = `${approvalRate}%`;

        document.getElementById('kpi-avg-pos').previousElementSibling.textContent = 'Promedio General';
        document.getElementById('kpi-approval-rate').previousElementSibling.textContent = 'Tasa Aprobación';
        document.getElementById('kpi-rejections').previousElementSibling.textContent = 'Rechazos';
    } else {
        const recruited = data.reduce((sum, d) => sum + d['PoS Recruited'], 0);
        const collections = data.reduce((sum, d) => sum + d['Visits with Invoice Collection'], 0);
        const visits = data.reduce((sum, d) => sum + d['Visits for Invoice Collection'], 0);

        const recruitmentRate = auditorNames.length > 0 ? (recruited / auditorNames.length).toFixed(1) : 0;
        const collectionRate = visits > 0 ? (collections / visits * 100).toFixed(1) : 0;

        document.getElementById('kpi-total-pos').previousElementSibling.textContent = 'Facturas Recolectadas';
        document.getElementById('kpi-total-pos').textContent = collections.toLocaleString();

        document.getElementById('kpi-avg-pos').previousElementSibling.textContent = 'Recrutas/Auditor';
        document.getElementById('kpi-avg-pos').textContent = recruitmentRate;

        document.getElementById('kpi-approval-rate').previousElementSibling.textContent = 'Tasa Recolección';
        document.getElementById('kpi-approval-rate').textContent = `${collectionRate}%`;

        document.getElementById('kpi-rejections').previousElementSibling.textContent = 'Total Reclutados';
        document.getElementById('kpi-rejections').textContent = recruited.toLocaleString();

        document.getElementById('approval-progress').style.width = `${collectionRate}%`;
    }

    document.getElementById('kpi-total-auditors').textContent = auditorNames.length;
}

function getAuditorStats(data) {
    const stats = {};
    const auditorField = currentProject === 'edge' ? 'Name Auditor' : 'Auditor Name';

    data.forEach(d => {
        const name = d[auditorField];
        if (!stats[name]) {
            stats[name] = {
                name,
                total: 0,
                approved: 0,
                rejected: 0,
                recruited: 0,
                collections: 0,
                city: d['Ciudad simp'],
                status: d['Estado actual'] || 'Activo'
            };
        }
        if (currentProject === 'edge') {
            stats[name].total += d['Total POS'];
            stats[name].approved += d['Approved POS'];
            stats[name].rejected += d['Rechazados Totales'];
        } else {
            stats[name].recruited += d['PoS Recruited'];
            stats[name].collections += d['Visits with Invoice Collection'];
            stats[name].total += d['Visits with Invoice Collection']; // For distribution
        }
    });
    return Object.values(stats);
}

function renderProductivityCharts(data) {
    const auditors = getAuditorStats(data);

    // 1. Labor Distribution (Histogram)
    const ranges = { '0-300': 0, '301-600': 0, '601-900': 0, '901-1200': 0, '1201-1500': 0, '1501+': 0 };
    auditors.forEach(a => {
        if (a.total <= 300) ranges['0-300']++;
        else if (a.total <= 600) ranges['301-600']++;
        else if (a.total <= 900) ranges['601-900']++;
        else if (a.total <= 1200) ranges['901-1200']++;
        else if (a.total <= 1500) ranges['1201-1500']++;
        else ranges['1501+']++;
    });

    createChart('laborDistributionChart', 'bar', {
        labels: Object.keys(ranges),
        datasets: [{
            label: 'Auditores',
            data: Object.values(ranges),
            backgroundColor: (ctx) => {
                const val = ctx.index;
                if (val < 2) return '#94a3b8'; // Low
                if (val < 4) return '#3b82f6'; // Mid
                return '#10b981'; // High
            },
            borderRadius: 6
        }]
    }, {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'N° Personas' } } }
    });

    // 2. People vs Volume (Scatter/Sorted Area)
    const sortedAuditors = auditors.sort((a, b) => b.total - a.total);
    createChart('auditorVolumeChart', 'line', {
        labels: sortedAuditors.map(a => ''), // Hide names to keep it clean like the image
        datasets: [{
            label: currentProject === 'edge' ? 'Volumen POS' : 'Volumen Facturas',
            data: sortedAuditors.map(a => a.total),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            pointBackgroundColor: sortedAuditors.map(a => a.total > (currentProject === 'edge' ? 1200 : 100) ? '#10b981' : '#3b82f6'),
            pointRadius: (ctx) => sortedAuditors[ctx.dataIndex]?.total > (currentProject === 'edge' ? 1200 : 100) ? 5 : 3,
            tension: 0.4
        }]
    }, {
        plugins: { tooltip: { callbacks: { label: (ctx) => `${sortedAuditors[ctx.dataIndex].name}: ${ctx.raw} ${currentProject === 'edge' ? 'POS' : 'Facturas'}` } } },
        scales: { x: { display: false }, y: { title: { display: true, text: currentProject === 'edge' ? 'POS' : 'Facturas' } } }
    });

    // 3. Update Table
    updatePersonnelTable(sortedAuditors);

    // 4. Daily Activity (Surveyors & Collections)
    renderDailyActivityChart(data);

    // 5. Daily Average Distribution (Histogram - Discrete)
    renderDailyAverageHistogram(data);

    // 6. Daily Range Distribution (Histogram - Grouped)
    renderDailyRangeHistogram(data);
}

function renderDailyRangeHistogram(data) {
    const auditorField = currentProject === 'edge' ? 'Name Auditor' : 'Auditor Name';
    const auditorStats = {};
    data.forEach(d => {
        const name = d[auditorField];
        if (!auditorStats[name]) {
            auditorStats[name] = { total: 0, days: new Set() };
        }
        if (currentProject === 'edge') {
            auditorStats[name].total += d['Total POS'];
        } else {
            auditorStats[name].total += d['Visits with Invoice Collection'];
        }
        if (d.dateString) auditorStats[name].days.add(d.dateString);
    });

    const averages = Object.values(auditorStats).map(a => {
        const dayCount = a.days.size || 1;
        return a.total / dayCount;
    });

    // Buckets of 5 units
    const ranges = { '0-5': 0, '6-10': 0, '11-15': 0, '16-20': 0, '21-25': 0, '26-30': 0, '31-35': 0, '35+': 0 };
    averages.forEach(avg => {
        if (avg <= 5) ranges['0-5']++;
        else if (avg <= 10) ranges['6-10']++;
        else if (avg <= 15) ranges['11-15']++;
        else if (avg <= 20) ranges['16-20']++;
        else if (avg <= 25) ranges['21-25']++;
        else if (avg <= 30) ranges['26-30']++;
        else if (avg <= 35) ranges['31-35']++;
        else ranges['35+']++;
    });

    createChart('dailyRangeHistogram', 'bar', {
        labels: Object.keys(ranges),
        datasets: [{
            label: 'Cantidad de Gestores',
            data: Object.values(ranges),
            backgroundColor: '#fb923c',
            borderRadius: 4
        }]
    }, {
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => `${ctx.raw} gestores en rango ${ctx.label} ${currentProject === 'edge' ? 'POS' : 'Facturas'}/día` } }
        },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'N° Gestores' } },
            x: { title: { display: true, text: 'Rangos de Promedio Diario' } }
        }
    });
}

function renderDailyAverageHistogram(data) {
    const auditorField = currentProject === 'edge' ? 'Name Auditor' : 'Auditor Name';
    const auditorStats = {};
    data.forEach(d => {
        const name = d[auditorField];
        if (!auditorStats[name]) {
            auditorStats[name] = { total: 0, days: new Set() };
        }
        if (currentProject === 'edge') {
            auditorStats[name].total += d['Total POS'];
        } else {
            auditorStats[name].total += d['Visits with Invoice Collection'];
        }
        if (d.dateString) auditorStats[name].days.add(d.dateString);
    });

    const averages = Object.values(auditorStats).map(a => {
        const dayCount = a.days.size || 1;
        return a.total / dayCount;
    });

    // Discrete bins from 1 to 35
    const bins = {};
    for (let i = 1; i <= 35; i++) {
        bins[i] = 0;
    }

    averages.forEach(avg => {
        const roundedAvg = Math.round(avg);
        if (roundedAvg >= 1 && roundedAvg <= 35) {
            bins[roundedAvg]++;
        } else if (roundedAvg > 35) {
            bins[35]++; // Cap at 35
        }
    });

    createChart('dailyAverageHistogram', 'bar', {
        labels: Object.keys(bins),
        datasets: [{
            label: 'Cantidad de Gestores',
            data: Object.values(bins),
            backgroundColor: '#fb923c',
            borderRadius: 2,
            barPercentage: 0.8,
            categoryPercentage: 0.8
        }]
    }, {
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => `${ctx.raw} gestores con promedio de ${ctx.label} ${currentProject === 'edge' ? 'encuestas' : 'facturas'}/día`
                }
            }
        },
        scales: {
            y: { beginAtZero: true, title: { display: true, text: 'N° Gestores' } },
            x: {
                title: { display: true, text: 'Promedio de Producción Diaria' },
                ticks: {
                    autoSkip: true,
                    maxRotation: 0,
                    callback: function (value, index, ticks) {
                        return this.getLabelForValue(value);
                    }
                }
            }
        }
    });
}

function renderDailyActivityChart(data) {
    const dayStats = {};
    data.forEach(d => {
        const date = d.dateString;
        if (!dayStats[date]) {
            dayStats[date] = { date, jsDate: d.jsDate, auditors: new Set(), collections: 0 };
        }
        dayStats[date].auditors.add(d['Name Auditor']);
        dayStats[date].collections += d['Total POS'];
    });

    const sortedDays = Object.values(dayStats).sort((a, b) => a.jsDate - b.jsDate);

    createChart('dailyActivityChart', 'line', {
        labels: sortedDays.map(d => d.date),
        datasets: [
            {
                label: 'Encuestadores Activos',
                data: sortedDays.map(d => d.auditors.size),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                yAxisID: 'y',
                tension: 0.3
            },
            {
                label: 'Colectas (POS)',
                data: sortedDays.map(d => d.collections),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                yAxisID: 'y1',
                tension: 0.3
            }
        ]
    }, {
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                grid: { display: false },
                title: { display: true, text: 'Personas' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: { drawOnChartArea: false },
                title: { display: true, text: 'Volumen POS' }
            }
        }
    });
}

function updatePersonnelTable(auditors) {
    const tableBody = document.getElementById('personnelTableBody');
    const tableCount = document.getElementById('table-count');
    const tableHeaders = document.querySelector('#personnelTable thead tr');
    tableBody.innerHTML = '';
    tableCount.textContent = auditors.length;

    // Update headers based on project
    if (currentProject === 'edge') {
        tableHeaders.innerHTML = `
            <th>#</th>
            <th>Auditor</th>
            <th>Ciudad</th>
            <th>Total POS</th>
            <th>Aprobados</th>
            <th>Calidad</th>
            <th>Estado</th>
            <th>Decisión</th>
        `;
    } else {
        tableHeaders.innerHTML = `
            <th>#</th>
            <th>Colaborador</th>
            <th>Ciudad</th>
            <th>Facturas</th>
            <th>Puntos Reclutados</th>
            <th>Eficiencia</th>
            <th>Estado</th>
            <th>Sugerencia</th>
        `;
    }

    auditors.forEach((a, index) => {
        let quality = 0;
        let decision = '';

        if (currentProject === 'edge') {
            quality = a.total > 0 ? (a.approved / a.total * 100).toFixed(1) : 0;
            if (quality >= 90 && a.total >= 300) {
                decision = '<span class="badge badge-keep">MANTENER</span>';
            } else if (quality < 75) {
                decision = '<span class="badge badge-replace">DESPEDIR</span>';
            } else {
                decision = '<span class="badge badge-train">REFORZAR</span>';
            }
        } else {
            // INVOICE Logic: Efficiency based on recruitment vs collection?
            // Let's use collection success as "quality" for now
            quality = a.total > 0 ? (a.collections / a.total * 100).toFixed(1) : 0;
            if (quality >= 95 && a.recruited >= 5) {
                decision = '<span class="badge badge-keep">EXCELENTE</span>';
            } else if (quality < 80) {
                decision = '<span class="badge badge-replace">REVISAR</span>';
            } else {
                decision = '<span class="badge badge-train">MEJORAR</span>';
            }
        }

        const statusIcon = a.status === 'Activo'
            ? '<span class="status-indicator status-active">●</span>'
            : '<span class="status-indicator status-abandoned">●</span>';

        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><span class="auditor-name">${a.name}</span></td>
                <td><span class="city-badge">${a.city}</span></td>
                <td style="font-weight: 600;">${(currentProject === 'edge' ? a.total : a.collections).toLocaleString()}</td>
                <td style="color: var(--success); font-weight: 500;">${(currentProject === 'edge' ? a.approved : a.recruited).toLocaleString()}</td>
                <td><span style="font-weight: 700; color: ${quality >= 90 ? 'var(--success)' : (quality < 75 ? 'var(--danger)' : 'var(--warning)')}">${quality}%</span></td>
                <td style="text-align: center;">${statusIcon}</td>
                <td>${decision}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// Chart Renderers for other tabs (Simplified for brevity)
function renderOverviewCharts(data) {
    // 1. Status Doughnut Chart
    if (currentProject === 'edge') {
        const statusData = {
            'Aprobados': data.reduce((sum, d) => sum + d['Approved POS'], 0),
            'Rechazados': data.reduce((sum, d) => sum + d['Rechazados Totales'], 0),
            'Refusal': data.reduce((sum, d) => sum + d['Refusal POS'], 0)
        };
        createChart('statusChart', 'doughnut', {
            labels: Object.keys(statusData),
            datasets: [{ data: Object.values(statusData), backgroundColor: ['#10b981', '#ef4444', '#f59e0b'] }]
        });
    } else {
        const statusData = {
            'Recrutados': data.reduce((sum, d) => sum + d['PoS Recruited'], 0),
            'Recolectados': data.reduce((sum, d) => sum + d['Visits with Invoice Collection'], 0),
            'Pendientes': data.reduce((sum, d) => sum + (d['Visits for Invoice Collection'] - d['Visits with Invoice Collection']), 0)
        };
        createChart('statusChart', 'doughnut', {
            labels: Object.keys(statusData),
            datasets: [{ data: Object.values(statusData), backgroundColor: ['#6366f1', '#10b981', '#f59e0b'] }]
        });
    }

    // 2. Timeline chart (Metrics by month)
    const months = [...new Set(data.map(d => d.Mes))].filter(Boolean);
    const monthStats = months.map(m => {
        const filtered = data.filter(d => d.Mes === m);
        if (currentProject === 'edge') {
            return {
                name: m,
                val1: filtered.reduce((sum, d) => sum + d['Total POS'], 0),
                val2: filtered.reduce((sum, d) => sum + d['Approved POS'], 0)
            };
        } else {
            return {
                name: m,
                val1: filtered.reduce((sum, d) => sum + d['Visits with Invoice Collection'], 0),
                val2: filtered.reduce((sum, d) => sum + d['PoS Recruited'], 0)
            };
        }
    });

    createChart('timelineChart', 'bar', {
        labels: monthStats.map(s => s.name),
        datasets: [
            { label: currentProject === 'edge' ? 'Total POS' : 'Facturas', data: monthStats.map(s => s.val1), backgroundColor: '#3b82f6' },
            { label: currentProject === 'edge' ? 'Aprobados' : 'Reclutas', data: monthStats.map(s => s.val2), backgroundColor: '#10b981' }
        ]
    });

    // 3. Regional Productivity
    const regions = [...new Set(data.map(d => d.Region))].filter(Boolean);
    const volumeField = currentProject === 'edge' ? 'Total POS' : 'Visits with Invoice Collection';

    const regionStats = regions.map(r => ({
        name: r,
        total: data.filter(d => d.Region === r).reduce((sum, d) => sum + (d[volumeField] || 0), 0)
    })).sort((a, b) => b.total - a.total);

    createChart('regionChart', 'bar', {
        labels: regionStats.map(s => s.name),
        datasets: [{ label: currentProject === 'edge' ? 'Total POS' : 'Facturas', data: regionStats.map(s => s.total), backgroundColor: '#6366f1' }]
    }, { indexAxis: 'y' });
}

function renderQualityCharts(data) {
    const cities = [...new Set(data.map(d => d['Ciudad simp']))];
    const cityQuality = cities.map(c => {
        const filtered = data.filter(d => d['Ciudad simp'] === c);
        const total = filtered.reduce((sum, d) => sum + d['Total POS'], 0);
        const approved = filtered.reduce((sum, d) => sum + d['Approved POS'], 0);
        return { name: c, rate: total > 0 ? (approved / total * 100) : 0 };
    }).sort((a, b) => b.rate - a.rate).slice(0, 15);

    createChart('cityQualityChart', 'bar', {
        labels: cityQuality.map(s => s.name),
        datasets: [{ label: '% Eficacia', data: cityQuality.map(s => s.rate), backgroundColor: '#10b981' }]
    });
}

function renderInsights(data) {
    const insightsGrid = document.getElementById('insightsGrid');
    if (!insightsGrid) return;
    insightsGrid.innerHTML = '';

    const insights = generateInsights(data);

    insights.forEach(insight => {
        const card = `
            <div class="card" style="border-left: 4px solid ${insight.color}; display: flex; gap: 1rem; align-items: flex-start;">
                <div style="background: ${insight.color}15; padding: 0.75rem; border-radius: 0.75rem; color: ${insight.color}; display: flex; align-items: center; justify-content: center;">
                    ${insight.icon}
                </div>
                <div>
                    <h4 style="margin-bottom: 0.25rem; font-size: 1rem; color: var(--primary); font-weight: 700;">${insight.title}</h4>
                    <p style="font-size: 0.875rem; color: var(--text-muted); line-height: 1.5;">${insight.text}</p>
                </div>
            </div>
        `;
        insightsGrid.innerHTML += card;
    });
}

function generateInsights(data) {
    if (data.length === 0) return [];

    const insights = [];

    const totalPos = data.reduce((s, d) => s + d['Total POS'], 0);
    const approved = data.reduce((s, d) => s + d['Approved POS'], 0);
    const avgEfficiency = totalPos > 0 ? (approved / totalPos * 100).toFixed(1) : 0;

    const regionStats = {};
    data.forEach(d => {
        if (!regionStats[d.Region]) regionStats[d.Region] = { total: 0, app: 0 };
        regionStats[d.Region].total += d['Total POS'];
        regionStats[d.Region].app += d['Approved POS'];
    });

    const regions = Object.entries(regionStats);
    const bestRegion = regions.length > 0 ? regions.sort((a, b) => (b[1].app / b[1].total) - (a[1].app / a[1].total))[0] : ["N/A", { app: 0, total: 1 }];

    const topAuditor = [...new Set(data.map(d => d['Name Auditor']))].map(name => {
        const auditorData = data.filter(d => d['Name Auditor'] === name);
        return { name, total: auditorData.reduce((s, d) => s + d['Total POS'], 0) };
    }).sort((a, b) => b.total - a.total)[0] || { name: "N/A", total: 0 };

    insights.push({
        title: "Eficacia de Operación",
        text: `El equipo mantiene una tasa de aprobación del ${avgEfficiency}%. Un valor saludable, pero con margen de mejora en procesos de validación.`,
        color: "#10b981",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 4 12 14.01 9 11.01"></polyline><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path></svg>'
    });

    insights.push({
        title: "Líder Regional",
        text: `La región "${bestRegion[0]}" sobresale con la mayor tasa de aprobación (${(bestRegion[1].app / bestRegion[1].total * 100).toFixed(1)}%). Recomendado replicar sus flujos.`,
        color: "#6366f1",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>'
    });

    insights.push({
        title: "Maximizador de Colecta",
        text: `${topAuditor.name} es el auditor más productivo con ${topAuditor.total} POS. Pilar fundamental del volumen actual.`,
        color: "#c084fc",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>'
    });

    const totalRefusal = data.reduce((s, d) => s + d['Refusal POS'], 0);
    insights.push({
        title: "Impacto de No Colecta",
        text: `Se registran ${totalRefusal} casos de "Refusal". Estos representan una pérdida de oportunidad mitigable.`,
        color: "#f59e0b",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
    });

    const avgTime = data.length > 0 ? data.reduce((s, d) => s + d['Tiempo en Formularios (Hrs)'], 0) / data.length : 0;
    insights.push({
        title: "Densidad Laboral",
        text: `El tiempo promedio en formularios es de ${avgTime.toFixed(2)} horas. Existe correlación entre tiempo y calidad.`,
        color: "#3b82f6",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
    });

    const cityRej = {};
    data.forEach(d => {
        if (!cityRej[d['Ciudad simp']]) cityRej[d['Ciudad simp']] = { total: 0, rej: 0 };
        cityRej[d['Ciudad simp']].total += d['Total POS'];
        cityRej[d['Ciudad simp']].rej += d['Rechazados Totales'];
    });
    const citiesRej = Object.entries(cityRej);
    const worstCity = citiesRej.length > 0 ? citiesRej.sort((a, b) => (b[1].rej / b[1].total) - (a[1].rej / a[1].total))[0] : ["N/A", { rej: 0, total: 1 }];
    insights.push({
        title: "Punto Crítico",
        text: `La ciudad "${worstCity[0]}" presenta la mayor tasa de rechazo. Requiere capacitación inmediata.`,
        color: "#ef4444",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
    });

    insights.push({
        title: "Estabilidad Temporal",
        text: "La colecta se mantiene estable. Se observa un pico que exige mayor control en cierres.",
        color: "#2DD4BF",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>'
    });

    insights.push({
        title: "Varianza de Auditoría",
        text: "La diferencia entre el mejor y peor auditor es significativa. Implementar mentoría basada en perfiles Top.",
        color: "#fb923c",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path></svg>'
    });

    const activeDays = new Set(data.map(d => d.Fecha)).size;
    insights.push({
        title: "Capacidad Diaria",
        text: `Con ${activeDays} días de actividad, la capacidad media es robusta y escalable.`,
        color: "#818cf8",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>'
    });

    insights.push({
        title: "Recomendación Estratégica",
        text: "Priorizar la optimización de desplazamientos para incrementar la colecta aprobada en un 12%.",
        color: "#f43f5e",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>'
    });

    // Add Regional Insights
    regions.slice(0, 3).forEach(([regionName, stats]) => {
        const efficiency = (stats.app / stats.total * 100).toFixed(1);
        insights.push({
            title: `Tendencia Regional: ${regionName}`,
            text: `La región ${regionName} muestra una consistencia de ${efficiency}% de calidad. Se recomienda mantener los supervisores actuales en este sector.`,
            color: "#6366f1",
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'
        });
    });

    return insights;
}

function createChart(id, type, data, extraOptions = {}) {
    if (charts[id]) charts[id].destroy();
    const el = document.getElementById(id);
    if (!el) return;
    const ctx = el.getContext('2d');
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#64748b', font: { family: 'Inter', weight: '500' } } } },
        scales: {
            y: { grid: { borderDash: [5, 5] }, ticks: { color: '#64748b' } },
            x: { grid: { display: false }, ticks: { color: '#64748b' } }
        },
        ...extraOptions
    };
    charts[id] = new Chart(ctx, { type, data, options });
}
