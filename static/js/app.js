let sessionHistory = [];
let activeHistoryFilter = 'All';
let currentBatchResults = [];
let currentAutoResponse = '';

const PRESETS = {
    billing: "I was charged twice for my subscription this month and need an urgent refund.",
    tech: "The application keeps crashing with a 500 internal server error whenever I try to export reports to PDF.",
    account: "I forgot my password and the reset email link is not arriving in my inbox.",
    general: "Do you offer a student discount or enterprise custom pricing plans for teams?",
    urgent: "API endpoint calls are timing out continuously and database connection drops on login."
};

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    fetchMetrics();
    fetchDataset();
});

function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            navButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            if (targetTab === 'analytics') {
                fetchMetrics();
            } else if (targetTab === 'retrain') {
                fetchDataset();
            }
        });
    });
}

function loadPreset(key) {
    if (PRESETS[key]) {
        const textarea = document.getElementById('ticket-text');
        textarea.value = PRESETS[key];
        textarea.focus();
        showToast(`Loaded ${key.toUpperCase()} preset example`);
    }
}

function clearInput() {
    document.getElementById('ticket-text').value = '';
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('result-content').classList.add('hidden');
}

async function handleSingleSubmit(event) {
    event.preventDefault();
    const textInput = document.getElementById('ticket-text').value.trim();
    if (!textInput) return;

    const btnSubmit = document.getElementById('btn-submit');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...`;

    try {
        const res = await fetch('/api/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textInput })
        });

        if (!res.ok) throw new Error('Classification request failed');

        const data = await res.json();
        renderPredictionResult(data);

        sessionHistory.unshift(data);
        renderHistory();

    } catch (err) {
        showToast(`Error: ${err.message}`, true);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Classify Ticket`;
    }
}

function renderPredictionResult(data) {
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('result-content').classList.remove('hidden');

    const categoryBadge = document.getElementById('res-category');
    const categoryText = document.getElementById('res-category-text');
    categoryText.textContent = data.category;
    categoryBadge.className = `category-badge-large ${data.category.toLowerCase()}`;

    const iconMap = {
        Billing: 'fa-credit-card',
        Technical: 'fa-triangle-exclamation',
        Account: 'fa-user-gear',
        General: 'fa-circle-question'
    };
    categoryBadge.querySelector('i').className = `fa-solid ${iconMap[data.category] || 'fa-tag'}`;

    const confidencePct = Math.round(data.confidence * 100);
    document.getElementById('res-confidence-pct').textContent = `${confidencePct}%`;
    const circle = document.getElementById('confidence-circle');
    circle.setAttribute('stroke-dasharray', `${confidencePct}, 100`);

    if (confidencePct > 60) circle.style.stroke = 'var(--accent-emerald)';
    else if (confidencePct > 40) circle.style.stroke = 'var(--accent-amber)';
    else circle.style.stroke = 'var(--accent-rose)';

    const barsContainer = document.getElementById('prob-bars-container');
    barsContainer.innerHTML = '';

    const sortedProbs = Object.entries(data.probabilities).sort((a, b) => b[1] - a[1]);

    sortedProbs.forEach(([cat, val]) => {
        const pct = (val * 100).toFixed(1);
        const barItem = document.createElement('div');
        barItem.className = 'bar-item';
        barItem.innerHTML = `
            <div class="bar-meta">
                <span class="bar-label">${cat}</span>
                <span class="bar-pct">${pct}%</span>
            </div>
            <div class="bar-track">
                <div class="bar-fill ${cat}" style="width: 0%"></div>
            </div>
        `;
        barsContainer.appendChild(barItem);

        setTimeout(() => {
            barItem.querySelector('.bar-fill').style.width = `${pct}%`;
        }, 50);
    });

    const priorityBadge = document.getElementById('res-priority');
    priorityBadge.textContent = data.priority;
    priorityBadge.className = `priority-badge ${data.priority}`;

    document.getElementById('res-team').textContent = data.routing_team;
    document.getElementById('res-sla').textContent = data.sla;

    currentAutoResponse = data.auto_response;
    document.getElementById('res-auto-response').textContent = data.auto_response;
}

function copyAutoResponse() {
    if (!currentAutoResponse) return;
    navigator.clipboard.writeText(currentAutoResponse);
    showToast('Auto response copied to clipboard!');
}

function renderHistory() {
    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = '';

    const filtered = activeHistoryFilter === 'All' 
        ? sessionHistory 
        : sessionHistory.filter(item => item.category === activeHistoryFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No tickets found for filter '${activeHistoryFilter}'.</td></tr>`;
        return;
    }

    filtered.forEach((item, index) => {
        const tr = document.createElement('tr');
        const pct = Math.round(item.confidence * 100);
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">"${item.text}"</td>
            <td><span class="tag ${item.category}">${item.category}</span></td>
            <td><strong>${pct}%</strong></td>
            <td><span class="priority-badge ${item.priority}">${item.priority}</span></td>
            <td>${item.routing_team}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="retestHistoryItem(${sessionHistory.indexOf(item)})">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Inspect
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterHistory(category) {
    activeHistoryFilter = category;
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.textContent === category);
    });
    renderHistory();
}

function retestHistoryItem(idx) {
    const item = sessionHistory[idx];
    if (item) {
        document.getElementById('ticket-text').value = item.text;
        renderPredictionResult(item);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function exportHistoryCSV() {
    if (sessionHistory.length === 0) {
        showToast('No history available to export', true);
        return;
    }

    let csv = "Index,Text,Category,Confidence,Priority,RoutingTeam,SLA\n";
    sessionHistory.forEach((item, i) => {
        const cleanText = `"${item.text.replace(/"/g, '""')}"`;
        csv += `${i + 1},${cleanText},${item.category},${item.confidence},${item.priority},"${item.routing_team}",${item.sla}\n`;
    });

    downloadCSV(csv, 'ticket_triage_history.csv');
}

function loadBatchSample() {
    const sample = [
        "I was charged twice on my credit card this billing cycle",
        "The web application throws a 500 error when clicking settings",
        "My account is locked due to multiple invalid password attempts",
        "Where can I find your API endpoints documentation?",
        "Can I request a full refund for my annual subscription renewal?",
        "Mobile app keeps freezing on startup splash screen"
    ].join('\n');
    document.getElementById('batch-text').value = sample;
    showToast('Loaded sample batch tickets!');
}

async function processBatch() {
    const raw = document.getElementById('batch-text').value.trim();
    if (!raw) return;

    const tickets = raw.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    if (tickets.length === 0) return;

    try {
        const res = await fetch('/api/classify-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickets: tickets })
        });

        if (!res.ok) throw new Error('Batch processing failed');

        const data = await res.json();
        currentBatchResults = data.results;
        renderBatchResults(data.results);
        showToast(`Successfully classified ${data.total} tickets!`);

    } catch (err) {
        showToast(`Batch Error: ${err.message}`, true);
    }
}

function renderBatchResults(results) {
    const container = document.getElementById('batch-results-card');
    const tbody = document.getElementById('batch-tbody');
    document.getElementById('batch-count').textContent = results.length;

    tbody.innerHTML = '';
    results.forEach((item, index) => {
        const tr = document.createElement('tr');
        const pct = Math.round(item.confidence * 100);
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td style="max-width: 320px;">"${item.text}"</td>
            <td><span class="tag ${item.category}">${item.category}</span></td>
            <td><strong>${pct}%</strong></td>
            <td><span class="priority-badge ${item.priority}">${item.priority}</span></td>
            <td>${item.routing_team}</td>
        `;
        tbody.appendChild(tr);
    });

    container.classList.remove('hidden');
}

function exportBatchCSV() {
    if (currentBatchResults.length === 0) return;
    let csv = "Index,Text,Category,Confidence,Priority,RoutingTeam\n";
    currentBatchResults.forEach((item, i) => {
        const cleanText = `"${item.text.replace(/"/g, '""')}"`;
        csv += `${i + 1},${cleanText},${item.category},${item.confidence},${item.priority},"${item.routing_team}"\n`;
    });
    downloadCSV(csv, 'batch_triage_results.csv');
}

async function fetchMetrics() {
    try {
        const res = await fetch('/api/metrics');
        if (!res.ok) return;
        const data = await res.json();

        document.getElementById('top-f1-badge').textContent = `Macro F1: ${data.macro_f1}`;
        document.getElementById('kpi-f1').textContent = data.macro_f1;
        document.getElementById('kpi-accuracy').textContent = `${(data.accuracy * 100).toFixed(1)}%`;
        document.getElementById('kpi-dataset-size').textContent = data.dataset_size;

        renderPerClassMetrics(data.per_class);
        renderConfusionMatrix(data.classes, data.confusion_matrix);

    } catch (err) {
        console.error(err);
    }
}

function renderPerClassMetrics(perClassData) {
    const tbody = document.getElementById('metrics-tbody');
    tbody.innerHTML = '';

    Object.entries(perClassData).forEach(([cls, metrics]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="tag ${cls}">${cls}</span></td>
            <td><strong>${metrics.precision}</strong></td>
            <td><strong>${metrics.recall}</strong></td>
            <td><strong>${metrics.f1}</strong></td>
            <td>${metrics.support}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderConfusionMatrix(classes, cm) {
    const container = document.getElementById('confusion-matrix-container');
    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'cm-grid';
    grid.style.gridTemplateColumns = `80px repeat(${classes.length}, 60px)`;

    const emptyCorner = document.createElement('div');
    emptyCorner.className = 'cm-header-cell';
    emptyCorner.textContent = 'Actual \\ Pred';
    grid.appendChild(emptyCorner);

    classes.forEach(c => {
        const header = document.createElement('div');
        header.className = 'cm-header-cell';
        header.textContent = c;
        grid.appendChild(header);
    });

    cm.forEach((row, i) => {
        const rowHeader = document.createElement('div');
        rowHeader.className = 'cm-header-cell';
        rowHeader.textContent = classes[i];
        grid.appendChild(rowHeader);

        row.forEach((val, j) => {
            const cell = document.createElement('div');
            cell.className = 'cm-cell';
            cell.textContent = val;

            if (i === j) {
                cell.style.background = `rgba(5, 150, 105, ${Math.min(0.2 + val * 0.2, 0.85)})`;
                cell.style.color = '#047857';
                cell.style.borderColor = '#a7f3d0';
            } else if (val > 0) {
                cell.style.background = `rgba(225, 29, 72, ${Math.min(0.15 + val * 0.25, 0.8)})`;
                cell.style.color = '#9f1239';
                cell.style.borderColor = '#fecdd3';
            } else {
                cell.style.background = '#f8fafc';
            }

            grid.appendChild(cell);
        });
    });

    container.appendChild(grid);
}

async function fetchDataset() {
    try {
        const res = await fetch('/api/dataset');
        if (!res.ok) return;
        const data = await res.json();

        document.getElementById('dataset-count-badge').textContent = `${data.count} Samples`;
        const scrollList = document.getElementById('dataset-scroll-list');
        scrollList.innerHTML = '';

        data.dataset.reverse().forEach((item) => {
            const div = document.createElement('div');
            div.className = 'dataset-item';
            div.innerHTML = `
                <span class="dataset-item-text" title="${item.text}">"${item.text}"</span>
                <span class="tag ${item.category}">${item.category}</span>
            `;
            scrollList.appendChild(div);
        });

    } catch (err) {
        console.error(err);
    }
}

async function handleRetrainSubmit(event) {
    event.preventDefault();
    const text = document.getElementById('retrain-text').value.trim();
    const category = document.getElementById('retrain-category').value;

    if (!text || !category) return;

    const btn = document.getElementById('btn-retrain');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Retraining...`;

    try {
        const res = await fetch('/api/retrain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, category })
        });

        if (!res.ok) throw new Error('Retraining failed');

        const data = await res.json();
        showToast(data.message);

        document.getElementById('retrain-text').value = '';
        fetchMetrics();
        fetchDataset();

    } catch (err) {
        showToast(`Retrain Error: ${err.message}`, true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Add Sample & Retrain`;
    }
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.innerHTML = isError 
        ? `<i class="fa-solid fa-triangle-exclamation" style="color:#e11d48"></i> ${message}`
        : `<i class="fa-solid fa-circle-check" style="color:#059669"></i> ${message}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3500);
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
