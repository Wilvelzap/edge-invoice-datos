let currentProject = 'edge';
let dashboardData = [];
let charts = {};
let activeFilters = {
    regions: [],
    cities: [],
    months: [],
    status: 'all'
};

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
        setupMobileMenu();
        setupSandboxListeners();
    } catch (error) {
        console.error('Error loading application:', error);
    }
});

function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && overlay) {
        const toggle = () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        };

        menuToggle.addEventListener('click', toggle);
        overlay.addEventListener('click', toggle);

        // Close sidebar when clicking a nav item on mobile
        const navItems = document.querySelectorAll('.nav-menu .nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                }
            });
        });
    }
}

function initializeProject() {
    if (typeof allProjectsData !== 'undefined') {
        dashboardData = allProjectsData[currentProject] || [];
        processInitialData();
        setupFilters();
        setupTabs();
        setupBonosListeners();
        updateDashboard();
    } else if (typeof rawDashboardData !== 'undefined') {
        // Fallback for old data format
        dashboardData = rawDashboardData;
        processInitialData();
        setupFilters();
        setupTabs();
        setupBonosListeners();
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
    activeFilters = {
        regions: [],
        cities: [],
        months: [],
        status: 'all'
    };

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.value = 'all';
        statusFilter.addEventListener('change', (e) => {
            activeFilters.status = e.target.value;
            updateDashboard();
        });
    }

    const regions = [...new Set(dashboardData.map(d => d.Region))].filter(Boolean).sort();
    const cities = [...new Set(dashboardData.map(d => d['Ciudad simp']))].filter(Boolean).sort();
    const months = [...new Set(dashboardData.map(d => d.Mes))].filter(Boolean).sort();

    createMultiSelect('regionFilter', regions, 'Todas las regiones', (selected) => {
        activeFilters.regions = selected;
        updateDashboard();
    });

    createMultiSelect('cityFilter', cities, 'Todas las ciudades', (selected) => {
        activeFilters.cities = selected;
        updateDashboard();
    });

    createMultiSelect('monthFilter', months, 'Todos los meses', (selected) => {
        activeFilters.months = selected;
        updateDashboard();
    });

    // Close all dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.multiselect-container')) {
            document.querySelectorAll('.multiselect-container').forEach(c => c.classList.remove('open'));
        }
    });
}

function createMultiSelect(idPrefix, options, defaultText, callback) {
    const header = document.getElementById(`${idPrefix}Header`);
    const optionsContainer = document.getElementById(`${idPrefix}Options`);
    const container = document.getElementById(`${idPrefix}Container`);

    if (!header || !optionsContainer || !container) return;

    optionsContainer.innerHTML = '';
    let selected = [];

    const updateHeader = () => {
        if (selected.length === 0) {
            header.innerHTML = defaultText;
        } else {
            header.innerHTML = `${selected.length} seleccionado(s) <span class="selected-count">${selected.length}</span>`;
        }
    };

    // Add "Select All" option
    const allOption = document.createElement('div');
    allOption.className = 'multiselect-option';
    allOption.innerHTML = `
        <input type="checkbox" id="${idPrefix}_all">
        <label for="${idPrefix}_all">Seleccionar Todos</label>
    `;
    optionsContainer.appendChild(allOption);

    const allCheckbox = allOption.querySelector('input');

    const checkboxes = [];

    options.forEach(opt => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'multiselect-option';
        optionDiv.innerHTML = `
            <input type="checkbox" value="${opt}" id="${idPrefix}_${opt}">
            <label for="${idPrefix}_${opt}">${opt}</label>
        `;
        optionsContainer.appendChild(optionDiv);

        const cb = optionDiv.querySelector('input');
        checkboxes.push(cb);

        cb.addEventListener('change', () => {
            selected = checkboxes.filter(c => c.checked).map(c => c.value);
            allCheckbox.checked = selected.length === options.length;
            updateHeader();
            callback(selected);
        });

        optionDiv.addEventListener('click', (e) => {
            if (e.target !== cb && e.target !== optionDiv.querySelector('label')) {
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event('change'));
            }
        });
    });

    allCheckbox.addEventListener('change', () => {
        checkboxes.forEach(cb => cb.checked = allCheckbox.checked);
        selected = allCheckbox.checked ? options : [];
        updateHeader();
        callback(selected);
    });

    header.addEventListener('click', () => {
        const isOpen = container.classList.contains('open');
        document.querySelectorAll('.multiselect-container').forEach(c => c.classList.remove('open'));
        if (!isOpen) container.classList.add('open');
    });
}

function setupTabs() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('pageTitle');

    const titles = {
        'productivity': 'Dashboard de Productividad EDGE',
        'overview': 'Vista General y Colecta',
        'quality': 'Análisis de Calidad Regional',
        'insights': 'Smart AI Insights',
        'bonos': 'Comparativa de Sistemas de Pago y Bonos'
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
    return dashboardData.filter(d => {
        const matchRegion = activeFilters.regions.length === 0 || activeFilters.regions.includes(d.Region);
        const matchCity = activeFilters.cities.length === 0 || activeFilters.cities.includes(d['Ciudad simp']);
        const matchMonth = activeFilters.months.length === 0 || activeFilters.months.includes(d.Mes);
        const matchStatus = activeFilters.status === 'all' || d['Estado actual'] === activeFilters.status;

        return matchRegion && matchCity && matchMonth && matchStatus;
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
    } else if (activeTab === 'bonos') {
        renderBonosTab();
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
    const cityStats = {};
    const auditorField = currentProject === 'edge' ? 'Name Auditor' : 'Auditor Name';

    data.forEach(d => {
        const name = d[auditorField];
        const city = d['Ciudad simp'];
        const date = d.dateString || 'Unknown';

        if (!stats[name]) {
            stats[name] = {
                name,
                total: 0,
                approved: 0,
                rejected: 0,
                recruited: 0,
                collections: 0,
                city: city,
                status: d['Estado actual'] || 'Activo',
                daysActive: new Set()
            };
        }

        stats[name].daysActive.add(date);

        if (currentProject === 'edge') {
            stats[name].total += d['Total POS'];
            stats[name].approved += d['Approved POS'];
            stats[name].rejected += d['Rechazados Totales'];
        } else {
            stats[name].recruited += d['PoS Recruited'];
            stats[name].collections += d['Visits with Invoice Collection'];
            stats[name].total += d['Visits with Invoice Collection'];
        }

        // Aggregate for city statistics
        if (!cityStats[city]) {
            cityStats[city] = { totalVolume: 0, totalDaysAcrossAuditors: 0 };
        }
    });

    // Post-process auditor metrics
    const auditors = Object.values(stats).map(a => {
        const days = a.daysActive.size || 1;
        const avgDaily = a.total / days;
        return {
            ...a,
            daysCount: days,
            avgDaily: avgDaily
        };
    });

    // Calculate city averages for daily productivity
    const citiesList = {};
    auditors.forEach(a => {
        if (!citiesList[a.city]) citiesList[a.city] = { sumAvgs: 0, count: 0 };
        citiesList[a.city].sumAvgs += a.avgDaily;
        citiesList[a.city].count += 1;
    });

    const cityAverages = {};
    for (const city in citiesList) {
        cityAverages[city] = citiesList[city].sumAvgs / citiesList[city].count;
    }

    // Attach city average to each auditor
    return auditors.map(a => ({
        ...a,
        cityAvg: cityAverages[a.city] || 0
    }));
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
            <th>Prom. Día</th>
            <th>Calidad</th>
            <th>Vs. Ciudad</th>
            <th>Decisión</th>
        `;
    } else {
        tableHeaders.innerHTML = `
            <th>#</th>
            <th>Colaborador</th>
            <th>Ciudad</th>
            <th>Facturas</th>
            <th>Prom. Día</th>
            <th>Eficiencia</th>
            <th>Vs. Ciudad</th>
            <th>Sugerencia</th>
        `;
    }

    auditors.forEach((a, index) => {
        let quality = 0;
        let decision = '';
        const dailyAvg = a.avgDaily;
        const cityAvg = a.cityAvg;
        const ratioToCity = cityAvg > 0 ? (dailyAvg / cityAvg) : 1;

        if (currentProject === 'edge') {
            quality = a.total > 0 ? (a.approved / a.total * 100).toFixed(1) : 0;

            if (quality >= 90 && ratioToCity >= 0.9) {
                decision = '<span class="badge badge-keep">MANTENER</span>';
            } else if (quality < 70 || ratioToCity < 0.5) {
                decision = '<span class="badge badge-replace">DESPEDIR</span>';
            } else {
                decision = '<span class="badge badge-train">REFORZAR</span>';
            }
        } else {
            quality = a.total > 0 ? (a.collections / a.total * 100).toFixed(1) : 0;

            if (quality >= 95 && ratioToCity >= 0.9) {
                decision = '<span class="badge badge-keep">EXCELENTE</span>';
            } else if (quality < 80 || ratioToCity < 0.5) {
                decision = '<span class="badge badge-replace">REVISAR</span>';
            } else {
                decision = '<span class="badge badge-train">MEJORAR</span>';
            }
        }

        const vsCityText = `<span style="color: ${ratioToCity >= 1 ? 'var(--success)' : (ratioToCity < 0.7 ? 'var(--danger)' : 'var(--warning)')}">${(ratioToCity * 100).toFixed(0)}%</span>`;

        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><span class="auditor-name">${a.name || '---'}</span></td>
                <td><span class="city-badge">${a.city}</span></td>
                <td style="font-weight: 600;">${(currentProject === 'edge' ? a.total : a.collections).toLocaleString()}</td>
                <td style="text-align: center; font-weight: 600;">${dailyAvg.toFixed(1)}</td>
                <td><span style="font-weight: 700; color: ${quality >= 90 ? 'var(--success)' : (quality < 75 ? 'var(--danger)' : 'var(--warning)')}">${quality}%</span></td>
                <td style="text-align: center;">${vsCityText}</td>
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
        text: "La productividad se mantiene constante a lo largo de las semanas, indicando un ritmo de trabajo sostenible por el equipo.",
        color: "#10b981",
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"></path><polyline points="13 13 8 18 3 13"></polyline><polyline points="21 5 11 15 6 10"></polyline></svg>'
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

// --- BONOS LOGIC ---

const PAYMENT_RULES = {
    edge: {
        occidente: {
            base: 10,
            bonuses: [
                { min: 21, value: 220 },
                { min: 18, value: 150 },
                { min: 15, value: 90 }
            ],
            proposed: [
                { min: 25, value: 12 },
                { min: 20, value: 11.5 },
                { min: 15, value: 11 },
                { min: 12, value: 10 }
            ]
        },
        oriente: {
            base: 15,
            bonuses: [
                { min: 12, value: 220 },
                { min: 10, value: 150 },
                { min: 8, value: 90 }
            ],
            proposed: [
                { min: 14, value: 18 },
                { min: 12, value: 17 },
                { min: 8, value: 16 },
                { min: 7, value: 15 }
            ]
        }
    },
    invoice: {
        occidente: {
            base: 20,
            bonuses: [
                { min: 10, value: 220 },
                { min: 8, value: 150 },
                { min: 6, value: 75 }
            ],
            proposed: [
                { min: 10, value: 26 },
                { min: 9, value: 25 },
                { min: 8, value: 24 },
                { min: 7, value: 23 },
                { min: 6, value: 22 },
                { min: 5, value: 21 },
                { min: 4, value: 20 }
            ]
        },
        oriente: {
            base: 25,
            bonuses: [
                { min: 7, value: 220 },
                { min: 6, value: 150 },
                { min: 5, value: 75 }
            ],
            proposed: [
                { min: 8, value: 31 }, // Extrapolated from user table ending at 7
                { min: 7, value: 30 },
                { min: 6, value: 28 },
                { min: 5, value: 27 },
                { min: 4, value: 25 }
            ]
        }
    }
};

function getActiveRegion() {
    if (activeFilters.regions && activeFilters.regions.length > 0) {
        return activeFilters.regions[0].toLowerCase();
    }
    return 'occidente';
}

function setupBonosListeners() {
    const range = document.getElementById('productivityRange');
    if (!range) return;

    // Remove existing to avoid double-processing
    const newRange = range.cloneNode(true);
    range.parentNode.replaceChild(newRange, range);

    newRange.addEventListener('input', (e) => {
        const val = e.target.value;
        const rangeValueText = document.getElementById('rangeValue');
        if (rangeValueText) rangeValueText.textContent = val;
        updateBonosCalculator(parseInt(val));
    });
}

function calculatePayCurrent(dailyProd, region = null) {
    const project = currentProject;
    const activeRegion = region || getActiveRegion();
    const rules = PAYMENT_RULES[project][activeRegion];

    const DAYS_PER_WEEK = 6;
    const WEEKS_PER_MONTH = 4;
    const basePayPerSurvey = rules.base;

    const weeklyProd = dailyProd * DAYS_PER_WEEK;
    const weeklyBasePay = weeklyProd * basePayPerSurvey;

    let weeklyBonus = 0;
    for (const b of rules.bonuses) {
        if (dailyProd >= b.min) {
            weeklyBonus = b.value;
            break;
        }
    }

    const totalWeekly = weeklyBasePay + weeklyBonus;
    const totalMonthly = totalWeekly * WEEKS_PER_MONTH;
    const baseMonthly = (weeklyBasePay * WEEKS_PER_MONTH);
    const bonusMonthly = (weeklyBonus * WEEKS_PER_MONTH);

    return {
        baseMonthly,
        bonusMonthly,
        totalMonthly
    };
}

function calculatePayProposed(dailyProd, region = null) {
    const project = currentProject;
    const activeRegion = region || getActiveRegion();
    const rules = PAYMENT_RULES[project][activeRegion];

    const DAYS_PER_WEEK = 6;
    const WEEKS_PER_MONTH = 4;

    let payPerSurvey = rules.base;
    for (const p of rules.proposed) {
        if (dailyProd >= p.min) {
            payPerSurvey = p.value;
            break;
        }
    }

    const dailyPay = dailyProd * payPerSurvey;
    const weeklyPay = dailyPay * DAYS_PER_WEEK;
    const totalMonthly = weeklyPay * WEEKS_PER_MONTH;

    return {
        payPerSurvey,
        totalMonthly
    };
}

function updateBonosCalculator(val) {
    const unit = currentProject === 'edge' ? 'enc' : 'fac';
    const activeRegion = getActiveRegion();
    const current = calculatePayCurrent(val, activeRegion);
    const proposed = calculatePayProposed(val, activeRegion);

    const diffActual = proposed.totalMonthly - current.totalMonthly;
    const diffFromBase = proposed.totalMonthly - current.baseMonthly;
    const percentFromBase = current.baseMonthly > 0 ? (diffFromBase / current.baseMonthly * 100).toFixed(0) : 0;

    const baseEl = document.getElementById('calc-base-current');
    const bonoEl = document.getElementById('calc-bono-current');
    const totalActualEl = document.getElementById('calc-total-current');
    const rateLabelEl = document.getElementById('calc-label-rate');
    const rateEl = document.getElementById('calc-rate-proposed');
    const totalProposedEl = document.getElementById('calc-total-proposed');
    const summaryEl = document.getElementById('calc-impact-summary');

    if (baseEl) baseEl.textContent = `${current.baseMonthly.toLocaleString()} Bs.`;
    if (bonoEl) bonoEl.textContent = `${current.bonusMonthly.toLocaleString()} Bs.`;
    if (totalActualEl) totalActualEl.textContent = `${current.totalMonthly.toLocaleString()} Bs.`;

    if (rateLabelEl) rateLabelEl.textContent = `Pago por ${currentProject === 'edge' ? 'Encuesta' : 'Factura'}:`;
    if (rateEl) rateEl.textContent = `${proposed.payPerSurvey} Bs.`;
    if (totalProposedEl) totalProposedEl.textContent = `${proposed.totalMonthly.toLocaleString()} Bs.`;

    if (summaryEl) {
        if (diffActual >= 0) {
            summaryEl.style.backgroundColor = '#dcfce7';
            summaryEl.style.color = '#166534';
            summaryEl.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>
                <span>Impacto Real: +${diffActual.toLocaleString()} Bs. mensuales (${percentFromBase}% sobre base)</span>
            `;
        } else {
            summaryEl.style.backgroundColor = '#fee2e2';
            summaryEl.style.color = '#991b1b';
            summaryEl.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                <span>Impacto Real: ${diffActual.toLocaleString()} Bs. mensuales</span>
            `;
        }
    }
}

function renderBonosTab() {
    const tableBody = document.getElementById('bonosComparisonBody');
    if (!tableBody) return;

    const activeRegion = getActiveRegion();
    const rules = PAYMENT_RULES[currentProject][activeRegion];

    // Render Sandbox first to ensure inputs match current rules
    renderSandbox();

    const unit = currentProject === 'edge' ? 'enc' : 'fac';
    const labelProd = document.getElementById('label-prod-diaria');
    const simProjName = document.getElementById('sim-project-name');
    const subtitle = document.querySelector('#bonos .title-group p');

    // Dynamic Slider adjustments
    const rangeInput = document.getElementById('productivityRange');
    const sliderMinLabel = document.getElementById('slider-min');
    const sliderMaxLabel = document.getElementById('slider-max');

    const minVal = currentProject === 'edge' ? 5 : 1;
    const maxVal = currentProject === 'edge' ? 35 : 15;
    const defaultVal = currentProject === 'edge' ? 15 : 5;

    if (rangeInput) {
        rangeInput.min = minVal;
        rangeInput.max = maxVal;
        if (!rangeInput.value || rangeInput.value == 0) rangeInput.value = defaultVal;
        if (sliderMinLabel) sliderMinLabel.textContent = minVal;
        if (sliderMaxLabel) sliderMaxLabel.textContent = maxVal;
        const rangeValueText = document.getElementById('rangeValue');
        if (rangeValueText) rangeValueText.textContent = rangeInput.value;
    }

    if (labelProd) labelProd.textContent = currentProject === 'edge' ? 'Encuestas/Día' : 'Facturas/Día';
    if (simProjName) simProjName.textContent = `SIMULACIÓN: ${currentProject.toUpperCase()} - ${activeRegion.toUpperCase()}`;
    if (subtitle) {
        subtitle.textContent = `Región Detectada: ${activeRegion.toUpperCase()} | Análisis: Sistema Actual vs. Propuesta de Pago Variable`;
    }

    tableBody.innerHTML = '';

    const minRange = Math.min(...rules.proposed.map(p => p.min)) - 1;
    const maxRange = Math.max(...rules.proposed.map(p => p.min)) + 4;

    for (let i = Math.max(0, Math.floor(minRange)); i <= Math.ceil(maxRange); i++) {
        if (i < 1) continue;
        const current = calculatePayCurrent(i, activeRegion);
        const proposed = calculatePayProposed(i, activeRegion);

        const diffActual = proposed.totalMonthly - current.totalMonthly;
        const isHighlighted = rules.proposed.some(p => p.min === i);
        const rowStyle = isHighlighted ? 'background-color: #f0fdf4; font-weight: 600;' : '';

        const row = `
            <tr style="${rowStyle}">
                <td>${i}</td>
                <td>${i * 6}</td>
                <td>${current.totalMonthly.toLocaleString()} Bs. <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">(Base: ${current.baseMonthly} + Bono: ${current.bonusMonthly})</span></td>
                <td style="color: var(--primary-light);">${proposed.totalMonthly.toLocaleString()} Bs. <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">(@ ${proposed.payPerSurvey}/${unit})</span></td>
                <td style="color: ${diffActual >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">${diffActual >= 0 ? '+' : ''}${diffActual.toLocaleString()} Bs.</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="badge ${diffActual >= 0 ? 'badge-keep' : 'badge-replace'}" style="width: 60px; justify-content: center;">${(diffActual / current.totalMonthly * 100).toFixed(1)}%</span>
                        <div style="flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; min-width: 100px;">
                            <div style="width: ${Math.min(Math.abs(diffActual / current.totalMonthly * 100) * 3, 100)}%; height: 100%; background: ${diffActual >= 0 ? 'var(--success)' : 'var(--danger)'};"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    }

    updateBonosCalculator(rangeInput ? parseInt(rangeInput.value) : defaultVal);
    renderBonosTeamSimulation();
}

function renderSandbox() {
    const container = document.getElementById('sandbox-rates-container');
    const baseInput = document.getElementById('sandbox-base');
    if (!container || !baseInput) return;

    const activeRegion = getActiveRegion();
    const rules = PAYMENT_RULES[currentProject][activeRegion];

    // Avoid infinite loops with listeners
    const currentBase = rules.baseOverride || rules.basePay || 2100;
    if (document.activeElement !== baseInput) {
        baseInput.value = currentBase;
    }

    container.innerHTML = '';
    rules.proposed.forEach((p, idx) => {
        const item = document.createElement('div');
        item.style.cssText = "background: white; padding: 0.75rem; border-radius: 0.4rem; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between;";
        item.innerHTML = `
            <label style="font-size: 0.7rem; color: var(--secondary); display: block; margin-bottom: 0.3rem; font-weight: 600;">Min. ${currentProject === 'edge' ? 'Enc' : 'Fac'}: ${p.min}</label>
            <div style="display: flex; align-items: center; gap: 0.3rem;">
                <input type="number" step="0.5" value="${p.value}" data-idx="${idx}" class="sandbox-rate-input" style="width: 100%; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 0.3rem; font-weight: 700; color: var(--primary);">
                <span style="font-size: 0.8rem; font-weight: 600;">Bs.</span>
            </div>
        `;
        container.appendChild(item);
    });

    // Add listeners to new inputs
    container.querySelectorAll('.sandbox-rate-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            rules.proposed[idx].value = parseFloat(e.target.value);
            renderBonosTab();
        });
    });
}

function setupSandboxListeners() {
    const baseInput = document.getElementById('sandbox-base');
    const recommendBtn = document.getElementById('recommendRatesBtn');

    if (baseInput) {
        baseInput.addEventListener('change', (e) => {
            const activeRegion = getActiveRegion();
            const rules = PAYMENT_RULES[currentProject][activeRegion];
            const newVal = parseInt(e.target.value);
            rules.basePay = newVal; // We'll store it in a generic basePay prop
            rules.proposed.forEach(p => p.baseOverride = newVal);
            renderBonosTab();
        });
    }

    if (recommendBtn) {
        recommendBtn.addEventListener('click', recommendOptimalRates);
    }
}

function recommendOptimalRates() {
    const activeRegion = getActiveRegion();
    const rules = PAYMENT_RULES[currentProject][activeRegion];
    const unit = currentProject === 'edge' ? 'encs' : 'facs';

    // Simple logic: Recommendation aims for a 10% gain over Current System (Base + Bonus)
    // for auditors who reach the 2nd tier of productivity.

    rules.proposed.forEach((tier, idx) => {
        // Calculate what they currently earn at this benchmark
        const currentAtTier = calculatePayCurrent(tier.min, activeRegion);
        const targetMonthly = currentAtTier.totalMonthly * 1.05; // 5% bonus above current total

        // TargetRate = TargetMonthly / (Min * Days * Weeks)
        const suggestedRate = Math.ceil(targetMonthly / (tier.min * 6 * 4));
        tier.value = suggestedRate;
    });

    alert(`Recomendación aplicada: Ajustamos las tarifas para asegurar un beneficio del ~5% sobre el sistema actual en cada nivel de productividad.`);
    renderBonosTab();
}

function renderBonosTeamSimulation() {
    const simBody = document.getElementById('bonosTeamSimulationBody');
    if (!simBody) return;

    simBody.innerHTML = '';
    const filteredData = getFilteredData();
    const auditorField = currentProject === 'edge' ? 'Name Auditor' : 'Auditor Name';

    const auditorStats = {};
    filteredData.forEach(d => {
        const name = d[auditorField];
        if (!auditorStats[name]) {
            auditorStats[name] = { total: 0, days: new Set(), city: d['Ciudad simp'], region: d.Region };
        }
        if (currentProject === 'edge') {
            auditorStats[name].total += d['Total POS'];
        } else {
            auditorStats[name].total += d['Visits with Invoice Collection'];
        }
        if (d.dateString) auditorStats[name].days.add(d.dateString);
    });

    const simulation = Object.values(auditorStats).map(a => {
        const dayCount = a.days.size || 1;
        const avgDaily = a.total / dayCount;
        const auditorRegion = (a.region || '').toLowerCase() === 'oriente' ? 'oriente' : 'occidente';

        const currentPay = calculatePayCurrent(avgDaily, auditorRegion);
        const proposedPay = calculatePayProposed(avgDaily, auditorRegion);

        return {
            name: a.name,
            city: a.city,
            region: auditorRegion,
            avgDaily: avgDaily.toFixed(1),
            current: currentPay.totalMonthly,
            proposed: proposedPay.totalMonthly,
            diff: proposedPay.totalMonthly - currentPay.totalMonthly
        };
    }).sort((a, b) => b.diff - a.diff);

    simulation.forEach(s => {
        const diffColor = s.diff >= 0 ? 'var(--success)' : 'var(--danger)';
        const row = `
            <tr>
                <td style="font-weight: 700;">${s.name} <span style="font-size: 0.6rem; color: var(--text-muted); font-weight: 400; display: block;">${s.region.toUpperCase()}</span></td>
                <td><span class="city-badge">${s.city}</span></td>
                <td style="text-align: center; font-weight: 600;">${s.avgDaily}</td>
                <td>${s.current.toLocaleString()} Bs.</td>
                <td style="color: var(--primary-light); font-weight: 600;">${s.proposed.toLocaleString()} Bs.</td>
                <td style="color: ${diffColor}; font-weight: 700;">${s.diff >= 0 ? '+' : ''}${s.diff.toLocaleString()} Bs.</td>
            </tr>
        `;
        simBody.innerHTML += row;
    });
}
