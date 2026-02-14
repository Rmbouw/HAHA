// ===== INISIALISASI DATA =====
let transactions = [];

// Data dummy
const dummyData = [
    { tanggal: getTodayDate(), kategori: 'Makanan', keterangan: 'Nasi Goreng', tipe: 'pengeluaran', jumlah: 35000 },
    { tanggal: getTodayDate(), kategori: 'Gaji', keterangan: 'Gaji Bulanan', tipe: 'pemasukan', jumlah: 5000000 },
    { tanggal: getYesterdayDate(), kategori: 'Transport', keterangan: 'Bensin', tipe: 'pengeluaran', jumlah: 50000 },
    { tanggal: getYesterdayDate(), kategori: 'Minuman', keterangan: 'Boba', tipe: 'pengeluaran', jumlah: 25000 },
    { tanggal: getWeekAgoDate(), kategori: 'Belanja', keterangan: 'Bulanan', tipe: 'pengeluaran', jumlah: 500000 },
    { tanggal: getWeekAgoDate(), kategori: 'Bonus', keterangan: 'Proyek', tipe: 'pemasukan', jumlah: 1000000 },
];

// Helper tanggal
function getTodayDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getYesterdayDate() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekAgoDate() {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Load data
function loadData() {
    const stored = localStorage.getItem('transaksi');
    if (stored) {
        transactions = JSON.parse(stored);
    } else {
        transactions = dummyData;
        saveData();
    }
}

function saveData() {
    localStorage.setItem('transaksi', JSON.stringify(transactions));
}

// Format rupiah
function formatRupiah(angka) {
    return 'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ===== RENDER TABEL =====
function renderTable() {
    const tbody = document.getElementById('transactionBody');
    const filterType = document.getElementById('filterType').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    let filtered = [...transactions];

    // Filter tanggal
    if (filterType !== 'all') {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (filterType === 'today') {
            filtered = filtered.filter(t => t.tanggal === getTodayDate());
        } else if (filterType === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(t => new Date(t.tanggal) >= weekAgo);
        } else if (filterType === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            filtered = filtered.filter(t => new Date(t.tanggal) >= monthAgo);
        }
    }

    // Filter search
    if (searchTerm) {
        filtered = filtered.filter(t => 
            t.keterangan.toLowerCase().includes(searchTerm) || 
            t.kategori.toLowerCase().includes(searchTerm)
        );
    }

    // Urutkan
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    // Render
    tbody.innerHTML = '';
    let total = 0;

    filtered.forEach((t, i) => {
        const row = document.createElement('tr');
        row.className = t.tipe;
        
        const jumlahTampil = t.tipe === 'pemasukan' ? t.jumlah : -t.jumlah;
        total += jumlahTampil;

        const tgl = new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' });
        
        row.innerHTML = `
            <td>${i+1}</td>
            <td>${tgl}</td>
            <td>${t.kategori.substring(0,3)}</td>
            <td>${t.keterangan.substring(0,8)}${t.keterangan.length>8?'...':''}</td>
            <td>${t.tipe === 'pemasukan' ? '💚' : '❤️'}</td>
            <td>${formatRupiah(t.jumlah)}</td>
            <td><button class="btn-delete" onclick="hapus('${t.tanggal}','${t.keterangan}',${t.jumlah})"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('footerTotal').textContent = formatRupiah(Math.abs(total));
    updateDashboard();
    updateQuickStats(filtered);
    updateCharts();
}

// ===== HAPUS =====
window.hapus = function(tanggal, keterangan, jumlah) {
    const index = transactions.findIndex(t => 
        t.tanggal === tanggal && t.keterangan === keterangan && t.jumlah === jumlah
    );
    if (index !== -1) {
        transactions.splice(index, 1);
        saveData();
        renderTable();
    }
};

// ===== UPDATE DASHBOARD =====
function updateDashboard() {
    const masuk = transactions.filter(t => t.tipe === 'pemasukan').reduce((s,t) => s + t.jumlah, 0);
    const keluar = transactions.filter(t => t.tipe === 'pengeluaran').reduce((s,t) => s + t.jumlah, 0);
    const saldo = masuk - keluar;

    document.getElementById('totalPemasukan').textContent = formatRupiah(masuk);
    document.getElementById('totalPengeluaran').textContent = formatRupiah(keluar);
    document.getElementById('totalSaldo').textContent = formatRupiah(saldo);
}

// ===== UPDATE QUICK STATS =====
function updateQuickStats(filtered) {
    if (filtered.length === 0) {
        document.getElementById('avgDaily').textContent = 'Rp 0';
        document.getElementById('topCategory').textContent = '-';
        return;
    }

    // Rata-rata harian
    const dates = [...new Set(filtered.map(t => t.tanggal))];
    const avg = filtered.reduce((s,t) => s + t.jumlah, 0) / dates.length;
    document.getElementById('avgDaily').textContent = formatRupiah(avg);

    // Top kategori
    const cats = {};
    filtered.filter(t => t.tipe === 'pengeluaran').forEach(t => {
        cats[t.kategori] = (cats[t.kategori] || 0) + t.jumlah;
    });
    
    let top = '-';
    let topVal = 0;
    for (let [k, v] of Object.entries(cats)) {
        if (v > topVal) { topVal = v; top = k; }
    }
    document.getElementById('topCategory').textContent = top;
}

// ===== UPDATE CHART (HANYA DI LAPTOP) =====
let catChart, trendChart;

function updateCharts() {
    // Hanya jalan di laptop
    if (window.innerWidth < 1024) return;

    // Hapus chart lama
    if (catChart) catChart.destroy();
    if (trendChart) trendChart.destroy();

    // Chart kategori
    const catData = {};
    transactions.filter(t => t.tipe === 'pengeluaran').forEach(t => {
        catData[t.kategori] = (catData[t.kategori] || 0) + t.jumlah;
    });

    const ctx1 = document.getElementById('categoryChart')?.getContext('2d');
    if (ctx1) {
        catChart = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: Object.keys(catData),
                datasets: [{
                    data: Object.values(catData),
                    backgroundColor: ['#f72585','#4361ee','#4cc9f0','#f8961e','#06d6a0']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Chart tren bulanan
    const monthData = {};
    transactions.forEach(t => {
        const month = t.tanggal.substring(0,7);
        if (!monthData[month]) monthData[month] = { masuk:0, keluar:0 };
        if (t.tipe === 'pemasukan') monthData[month].masuk += t.jumlah;
        else monthData[month].keluar += t.jumlah;
    });

    const months = Object.keys(monthData).sort();
    const ctx2 = document.getElementById('trendChart')?.getContext('2d');
    if (ctx2) {
        trendChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: months.map(m => m.substring(5)),
                datasets: [
                    { label: 'Pemasukan', data: months.map(m => monthData[m].masuk), borderColor: '#06d6a0' },
                    { label: 'Pengeluaran', data: months.map(m => monthData[m].keluar), borderColor: '#ef476f' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

// ===== REKOMENDASI MAKANAN =====
function updateFoodRecommend() {
    const foods = ['🍔 Burger','🍕 Pizza','🍜 Mie','🍛 Nasi Goreng','🍣 Sushi','🥗 Salad','🍝 Pasta','🍖 Ayam','🥩 Steak','🍲 Soto'];
    const random = foods[Math.floor(Math.random() * foods.length)];
    document.getElementById('foodRecommend').innerHTML = `${random} <small>Rp ${Math.floor(Math.random()*50)+15}.000</small>`;
}

// ===== TOGGLE FILTER =====
window.toggleFilter = function() {
    const content = document.getElementById('filterContent');
    const arrow = document.getElementById('filterArrow');
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        arrow.className = 'fas fa-chevron-up';
    } else {
        content.style.display = 'none';
        arrow.className = 'fas fa-chevron-down';
    }
};

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderTable();
    
    // Set tanggal hari ini
    document.getElementById('tanggal').value = getTodayDate();
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'short' });
    document.getElementById('footerYear').textContent = new Date().getFullYear();
    
    // Rekomendasi makanan
    updateFoodRecommend();
    setInterval(updateFoodRecommend, 60000);

    // Form submit
    document.getElementById('transactionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const baru = {
            tanggal: document.getElementById('tanggal').value,
            kategori: document.getElementById('kategori').value,
            keterangan: document.getElementById('keterangan').value,
            tipe: document.getElementById('tipe').value,
            jumlah: parseInt(document.getElementById('jumlah').value)
        };

        transactions.push(baru);
        saveData();
        renderTable();
        e.target.reset();
        document.getElementById('tanggal').value = getTodayDate();
    });

    // Filter
    document.getElementById('filterType').addEventListener('change', renderTable);
    document.getElementById('searchInput').addEventListener('input', renderTable);
    document.getElementById('applyFilter').addEventListener('click', renderTable);

    // Dark mode
    document.getElementById('themeToggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = document.getElementById('themeToggle').querySelector('i');
        icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-sun' : 'fas fa-moon';
    });

    // Print
    document.getElementById('printBtn').addEventListener('click', () => window.print());

    // PDF
    document.getElementById('pdfBtn').addEventListener('click', () => {
        alert('Gunakan fitur Print > Save as PDF');
    });

    // Reset
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (confirm('Reset semua data?')) {
            transactions = dummyData;
            saveData();
            renderTable();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            updateCharts();
        }
    });
});