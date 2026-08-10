/**
 * Dashboard Thông tin thầu - JS Logic
 * HAI CHẾ ĐỘ:
 *  - Browse mode (keyword rỗng): mỗi tab có state riêng, filter 30 ngày
 *  - Search mode (có keyword): tìm song song cả 4 tab, gộp kết quả + badge loại
 */

const API = {
    SEARCH:        '/o/egp-portal-contractor-selection-v2/services/smart/search?token=dummy',
    KHLCNT_DETAIL: '/o/egp-portal-contractor-selection-v2/services/expose/lcnt/bid-po-bidp-plan-project-view/get-by-id?token=dummy',
};

const MEDICINE_CATS = [
    { value: 'all',  label: '🏥 Tất cả Thuốc & VTYT' },
    { value: '0',    label: '💊 Thuốc Generic'         },
    { value: '1',    label: '💊 Thuốc Biệt dược gốc'  },
    { value: '2',    label: '🌿 Thuốc Dược liệu'      },
    { value: '4',    label: '🌿 Dược liệu'             },
    { value: '5',    label: '🌿 Vị thuốc cổ truyền'   },
    { value: 'tbyt', label: '🔬 TB, VT y tế'           },
];

const MSC_BASE = 'https://muasamcong.mpi.gov.vn/web/guest/contractor-selection';

const STATUS_MAP = {
    '':         { label: 'Đang mở thầu',             cls: 'open'       },
    'DXT':      { label: 'Đang xét thầu',             cls: 'evaluating' },
    'CNTTT':    { label: 'Có nhà thầu trúng thầu',   cls: 'awarded'    },
    'KCNTTT':   { label: 'Không có NTTT',             cls: 'default'    },
    'DHT':      { label: 'Đã huỷ thầu',              cls: 'cancelled'  },
    'DHTBMT':   { label: 'Đã hủy TBMT',              cls: 'cancelled'  },
    'DHKQLCNT': { label: 'Đã huỷ KQLCNT',            cls: 'cancelled'  },
};

const INVEST_FIELD_MAP = {
    'HH': 'Hàng hóa', 'XL': 'Xây lắp', 'TV': 'Tư vấn', 'PTV': 'Phi tư vấn'
};

const TAB_BADGE = {
    tbmt:   { label: '📢 TBMT',   cls: 'tbmt'   },
    khlcnt: { label: '📋 KHLCNT', cls: 'khlcnt' },
    kqlcnt: { label: '🏆 KQLCNT', cls: 'kqlcnt' },
    cgtt:   { label: '⚡ CGTT',   cls: 'cgtt'   },
};

let state = {
    mode: 'browse',
    tab: 'tbmt',
    page: 0,
    pageSize: 20,
    totalElements: 0,
    results: [],
    selectedItem: null,
};

const tabStates = {
    tbmt:   { medicinesCat: 'all', statusFilter: '', page: 0 },
    khlcnt: { medicinesCat: 'all', statusFilter: '', page: 0 },
    kqlcnt: { medicinesCat: 'all', statusFilter: '', page: 0 },
    cgtt:   { medicinesCat: 'all', statusFilter: '', page: 0 },
};

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    initMedicineCats();
    initTabs();
    initFilters();
    doBrowse();
});

function initMedicineCats() {
    const sel = $('d-medicine-cat');
    if (!sel) return;
    MEDICINE_CATS.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.value;
        opt.textContent = cat.label;
        sel.appendChild(opt);
    });
}

function initTabs() {
    document.querySelectorAll('.dtab').forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.mode === 'search') exitSearchMode();
            document.querySelectorAll('.dtab').forEach(b => b.classList.remove('dtab--active'));
            btn.classList.add('dtab--active');
            state.tab = btn.dataset.tab;
            state.page = 0;
            state.selectedItem = null;
            hideDetail();
            restoreTabFilters(state.tab);
            doBrowse();
        });
    });
}

function saveTabFilters(tab) {
    tabStates[tab].medicinesCat = $('d-medicine-cat').value;
    tabStates[tab].statusFilter = $('d-status').value;
    tabStates[tab].page = state.page;
}

function restoreTabFilters(tab) {
    const ts = tabStates[tab];
    $('d-medicine-cat').value = ts.medicinesCat;
    $('d-status').value = ts.statusFilter;
    state.page = ts.page;
    $('d-medicine-cat').style.display = (tab === 'cgtt' || tab === 'khlcnt') ? 'none' : '';
}

function initFilters() {
    $('d-btn-search').addEventListener('click', () => {
        const kw = $('d-keyword').value.trim();
        if (kw) { state.page = 0; doGlobalSearch(kw); }
        else { exitSearchMode(); state.page = 0; doBrowse(); }
    });
    $('d-keyword').addEventListener('keydown', e => { if (e.key === 'Enter') $('d-btn-search').click(); });
    $('d-btn-clear').addEventListener('click', () => {
        $('d-keyword').value = '';
        exitSearchMode();
        state.page = 0;
        doBrowse();
    });
    $('d-pagesize').addEventListener('change', () => {
        state.pageSize = parseInt($('d-pagesize').value);
        state.page = 0;
        if (state.mode === 'search') doGlobalSearch($('d-keyword').value.trim());
        else doBrowse();
    });
    $('d-medicine-cat').addEventListener('change', () => { if (state.mode === 'browse') { state.page = 0; doBrowse(); } });
    $('d-status').addEventListener('change', () => { if (state.mode === 'browse') { state.page = 0; doBrowse(); } });
    $('d-detail-close').addEventListener('click', hideDetail);
}

function enterSearchMode(keyword) {
    state.mode = 'search';
    const banner = $('d-search-banner');
    if (banner) { banner.textContent = '🔍 Tìm kiếm: "' + keyword + '" — trên tất cả TBMT · KHLCNT · KQLCNT · CGTT'; banner.classList.remove('hidden'); }
    $('d-btn-clear').classList.remove('hidden');
    $('d-filter-dropdowns').classList.add('hidden');
    const tabs = document.querySelector('.dtabs');
    if (tabs) tabs.classList.add('dtabs--search');
}

function exitSearchMode() {
    state.mode = 'browse';
    const banner = $('d-search-banner');
    if (banner) banner.classList.add('hidden');
    $('d-btn-clear').classList.add('hidden');
    $('d-filter-dropdowns').classList.remove('hidden');
    const tabs = document.querySelector('.dtabs');
    if (tabs) tabs.classList.remove('dtabs--search');
    restoreTabFilters(state.tab);
}

async function doGlobalSearch(keyword) {
    enterSearchMode(keyword);
    showLoading(true);
    hideEmpty();
    const perTab = Math.max(5, Math.floor(state.pageSize / 2));
    const searches = [
        { tabKey: 'tbmt',   filters: getBrowseFilters('tbmt',   'all', ''), matchFields: ['notifyNo','bidName'] },
        { tabKey: 'khlcnt', filters: getBrowseFilters('khlcnt', 'all', ''), matchFields: ['planNo','bidName']   },
        { tabKey: 'kqlcnt', filters: getBrowseFilters('kqlcnt', 'all', ''), matchFields: ['notifyNo','bidName'] },
        { tabKey: 'cgtt',   filters: getBrowseFilters('cgtt',   'all', ''), matchFields: ['notifyNo','bidName'] },
    ];
    try {
        const promises = searches.map(s =>
            postJSON(API.SEARCH, [{ pageSize: perTab, pageNumber: 0, query: [{ index: 'es-contractor-selection', keyWord: keyword, matchType: 'all-1', matchFields: s.matchFields, filters: s.filters }] }])
            .then(d => ({ tabKey: s.tabKey, data: d }))
            .catch(() => ({ tabKey: s.tabKey, data: null }))
        );
        const responses = await Promise.all(promises);
        let merged = [];
        let totalAll = 0;
        responses.forEach(({ tabKey, data }) => {
            if (data && data.page) {
                const items = (data.page.content || []).map(item => ({ ...item, _tabKey: tabKey }));
                merged = merged.concat(items);
                totalAll += data.page.totalElements || 0;
            }
        });
        state.results = merged;
        state.totalElements = totalAll;
        renderResults();
        renderStats();
    } catch (e) {
        console.error('Global search error:', e);
        state.results = [];
        showEmpty('Lỗi khi tìm kiếm. Vui lòng thử lại.');
    }
    showLoading(false);
    $('d-pagination').innerHTML = '';
}

async function doBrowse() {
    const tab = state.tab;
    const cat = $('d-medicine-cat').value;
    const statusFilter = $('d-status').value;
    saveTabFilters(tab);
    showLoading(true);
    hideEmpty();
    const filters = getBrowseFilters(tab, cat, statusFilter);
    const matchFields = tab === 'khlcnt' ? ['planNo', 'bidName'] : ['notifyNo', 'bidName'];
    // CGTT + KHLCNT: không có isMedicine field → lọc bằng keyword 'thuốc'
    const browseKeyword = (tab === 'cgtt' || tab === 'khlcnt') ? 'thuốc' : '';
    // Nếu filters có _sort hint (KHLCNT), truyền vào query
    const sortHint = filters._sort || null;
    if (sortHint) delete filters._sort;
    try {
        const query = { index: 'es-contractor-selection', keyWord: browseKeyword, matchType: 'all-1', matchFields: matchFields, filters: filters };
        if (sortHint) query.sort = sortHint;
        const payload = [{ pageSize: state.pageSize, pageNumber: state.page, query: [query] }];
        const data = await postJSON(API.SEARCH, payload);
        if (data && data.page) {
            state.results = (data.page.content || []).map(item => ({ ...item, _tabKey: tab }));
            state.totalElements = data.page.totalElements || 0;
            renderResults();
            renderPagination();
            renderStats();
        } else {
            state.results = [];
            state.totalElements = 0;
            renderResults();
        }
    } catch (e) {
        console.error('Browse error:', e);
        state.results = [];
        renderResults();
    }
    showLoading(false);
}

function getBrowseFilters(tab, cat, statusFilter) {
    const filters = [];
    if (tab === 'tbmt') {
        filters.push({ fieldName: 'type', searchType: 'in', fieldValues: ['es-notify-contractor'] });
        filters.push({ fieldName: 'caseKHKQ', searchType: 'not_in', fieldValues: ['1'] });
        if (statusFilter) filters.push({ fieldName: 'statusForNotify', searchType: 'in', fieldValues: [statusFilter] });
    } else if (tab === 'khlcnt') {
        filters.push({ fieldName: 'type', searchType: 'in', fieldValues: ['es-plan-project-p'] });
        filters.push({ fieldName: 'investField', searchType: 'in', fieldValues: ['HH'] });
        // Chỉ KHLCNT có gói thầu chưa đăng tải TBMT
        filters.push({ fieldName: 'haveBidNotNotify', searchType: 'in', fieldValues: ['1'] });
        // Date range 30 ngày: dùng from/to (không phải fieldValues!)
        const [df, dt] = getLast30Days();
        filters.push({ fieldName: 'publicDate', searchType: 'range', from: df, to: dt });
        filters._sort = { fieldName: 'publicDate', sortType: 'desc' };
        return filters;
    } else if (tab === 'kqlcnt') {
        filters.push({ fieldName: 'type', searchType: 'in', fieldValues: ['es-notify-contractor'] });
        filters.push({ fieldName: 'statusForNotify', searchType: 'in', fieldValues: ['CNTTT'] });
    } else if (tab === 'cgtt') {
        filters.push({ fieldName: 'type', searchType: 'in', fieldValues: ['es-notify-contractor'] });
        filters.push({ fieldName: 'bidForm', searchType: 'in', fieldValues: ['CGTTRG'] });
        filters.push({ fieldName: 'statusForNotify', searchType: 'in', fieldValues: [''] });
        filters.push({ fieldName: 'investField', searchType: 'in', fieldValues: ['HH'] });
        return filters;
    }
    const [dateFrom, dateTo] = getLast30Days();
    const dateField = (tab === 'khlcnt') ? 'publicDate' : 'originalPublicDate';
    filters.push({ fieldName: dateField, searchType: 'range', fieldValues: [dateFrom, dateTo] });
    if (tab === 'khlcnt') {
        filters.push({ fieldName: 'investField', searchType: 'in', fieldValues: ['HH'] });
    } else {
        if (cat === 'tbyt') {
            filters.push({ fieldName: 'investField', searchType: 'in', fieldValues: ['HH'] });
            filters.push({ fieldName: 'isMedicine', searchType: 'not_in', fieldValues: ['1'] });
        } else if (cat === 'all') {
            filters.push({ fieldName: 'isMedicine', searchType: 'in', fieldValues: ['1'] });
        } else {
            filters.push({ fieldName: 'isMedicine', searchType: 'in', fieldValues: ['1'] });
            filters.push({ fieldName: 'medicines', searchType: 'in', fieldValues: [cat] });
        }
    }
    return filters;
}

function getLast30Days() {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T00:00:00`;
    const fmtEnd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T23:59:59`;
    return [fmt(from), fmtEnd(now)];
}

function renderResults() {
    const container = $('d-list-scroll');
    container.querySelectorAll('.dcard').forEach(c => c.remove());
    if (state.results.length === 0) { showEmpty('Không có kết quả phù hợp.'); return; }
    hideEmpty();
    const frag = document.createDocumentFragment();
    state.results.forEach((item, i) => {
        const div = document.createElement('div');
        div.innerHTML = renderCard(item, i);
        const card = div.firstElementChild;
        card.addEventListener('click', () => selectItem(i));
        frag.appendChild(card);
    });
    container.appendChild(frag);
}

function renderCard(item, index) {
    const status = getStatus(item.statusForNotify);
    const code = item.notifyNo || item.planNo || '';
    const bidName = Array.isArray(item.bidName) ? item.bidName[0] : (item.bidName || item.name || '');
    const investor = item.investorName || item.procuringEntityName || '';
    const price = formatPrice(Array.isArray(item.bidPrice) ? item.bidPrice[0] : item.bidPrice);
    const date = formatDate(item.publicDate);
    const closeDate = item.bidCloseDate ? formatDate(item.bidCloseDate) : '';
    const isSelected = state.selectedItem === index ? ' dcard--selected' : '';
    const tabBadge = (state.mode === 'search' && item._tabKey && TAB_BADGE[item._tabKey])
        ? '<span class="dcard__tab-badge dcard__tab-badge--' + TAB_BADGE[item._tabKey].cls + '">' + TAB_BADGE[item._tabKey].label + '</span>' : '';
    const loc = item.locations && item.locations[0] ? item.locations[0].provName : '';
    let winningHtml = '';
    if (item.statusForNotify === 'CNTTT' && item.contractorName) {
        const names = Array.isArray(item.contractorName) ? item.contractorName : [item.contractorName];
        winningHtml = '<div class="dcard__winning">' + escHtml(names[0]) + (names.length > 1 ? ' (+' + (names.length-1) + ')' : '') + '</div>';
    }
    return '<div class="dcard' + isSelected + '" data-index="' + index + '">' +
        '<div class="dcard__top"><span class="dcard__status dcard__status--' + status.cls + '">' + status.label + '</span>' + tabBadge + '<span class="dcard__date">' + date + '</span></div>' +
        '<div class="dcard__code">' + escHtml(code) + '</div>' +
        '<div class="dcard__name">' + escHtml(bidName) + '</div>' +
        '<div class="dcard__investor">' + escHtml(investor) + '</div>' +
        '<div class="dcard__bottom"><span class="dcard__price">' + price + '</span>' +
        (closeDate ? '<span class="dcard__close-date">Đóng: ' + closeDate + '</span>' : '') +
        (loc ? '<span class="dcard__location">📍 ' + escHtml(loc) + '</span>' : '') + '</div>' +
        winningHtml + '</div>';
}

function selectItem(index) {
    state.selectedItem = index;
    const item = state.results[index];
    if (!item) return;
    document.querySelectorAll('.dcard').forEach((c, i) => c.classList.toggle('dcard--selected', i === index));
    if (item._tabKey === 'khlcnt') loadKhlcntDetail(item);
    else showTbmtDetail(item);
}

function showTbmtDetail(item) {
    const status = getStatus(item.statusForNotify);
    const code = item.notifyNo || '';
    const planNo = item.planNo || '';
    const bidName = Array.isArray(item.bidName) ? item.bidName[0] : (item.bidName || '');
    const investor = item.investorName || item.procuringEntityName || '';
    const prices = Array.isArray(item.bidPrice) ? item.bidPrice : [item.bidPrice];
    const investField = Array.isArray(item.investField) ? item.investField.map(f => INVEST_FIELD_MAP[f] || f).join(', ') : '';
    const loc = item.locations && item.locations[0] ? item.locations[0].provName : '';
    const linkType = (item.bidForm === 'CGTTRG' || item.bidForm === 'CGTT') ? 'cgtt' : 'tbmt';

    let html = '<div class="ddetail__section"><div class="ddetail__status dcard__status--' + status.cls + '">' + status.label + '</div>' +
        '<table class="ddetail__table">' +
        '<tr><th>Mã TBMT</th><td><a href="' + MSC_BASE + '?render=url-redirect&type=' + linkType + '&code=' + code + '" target="_blank" class="ddetail__link">' + escHtml(code) + ' ↗</a></td></tr>' +
        '<tr><th>Mã KHLCNT</th><td>' + (planNo ? '<a href="' + MSC_BASE + '?render=url-redirect&type=khlcnt&code=' + planNo + '" target="_blank" class="ddetail__link">' + escHtml(planNo) + ' ↗</a>' : '—') + '</td></tr>' +
        '<tr><th>Tên gói thầu</th><td>' + escHtml(bidName) + '</td></tr>' +
        '<tr><th>Chủ đầu tư</th><td>' + escHtml(investor) + '</td></tr>' +
        '<tr><th>Giá gói thầu</th><td>' + prices.map(formatPrice).join('<br>') + '</td></tr>' +
        '<tr><th>Lĩnh vực</th><td>' + investField + '</td></tr>' +
        '<tr><th>Hình thức</th><td>' + (item.bidForm || '—') + '</td></tr>' +
        '<tr><th>Phương thức</th><td>' + (item.bidMode || '—') + '</td></tr>' +
        '<tr><th>Địa điểm</th><td>' + escHtml(loc) + '</td></tr>' +
        '<tr><th>Ngày đăng tải</th><td>' + formatDate(item.publicDate) + '</td></tr>' +
        '<tr><th>Thời điểm mở thầu</th><td>' + formatDate(item.bidOpenDate) + '</td></tr>' +
        '<tr><th>Thời điểm đóng thầu</th><td>' + formatDate(item.bidCloseDate) + '</td></tr>' +
        '</table></div>';

    if (item.statusForNotify === 'CNTTT' && item.contractorName) {
        const names = Array.isArray(item.contractorName) ? item.contractorName : [item.contractorName];
        const winPrices = Array.isArray(item.bidWinningPrice) ? item.bidWinningPrice : [];
        html += '<div class="ddetail__section"><h4 class="ddetail__section-title">🏆 Nhà thầu trúng thầu</h4>' +
            '<table class="ddetail__data-table"><thead><tr><th>#</th><th>Nhà thầu</th><th>Giá trúng</th></tr></thead><tbody>' +
            names.map((n, i) => '<tr><td>' + (i+1) + '</td><td>' + escHtml(n) + '</td><td>' + (winPrices[i] ? formatPrice(winPrices[i]) : '—') + '</td></tr>').join('') +
            '</tbody></table>' + (item.priceInit ? '<div class="ddetail__note">Giá dự toán: ' + formatPrice(item.priceInit) + '</div>' : '') + '</div>';
    }

    html += '<div class="ddetail__section ddetail__actions"><a href="' + MSC_BASE + '?render=url-redirect&type=' + linkType + '&code=' + code + '" target="_blank" class="ddetail__ext-link">🔗 Mở trên muasamcong.mpi.gov.vn</a></div>';
    $('d-detail-title').textContent = code;
    $('d-detail-body').innerHTML = html;
    showDetail();
}

async function loadKhlcntDetail(item) {
    $('d-detail-title').textContent = item.planNo || 'KHLCNT';
    $('d-detail-body').innerHTML = '<div class="dloading"><div class="dloading__spinner"></div><p>Đang tải chi tiết...</p></div>';
    showDetail();
    try {
        const data = await postJSON(API.KHLCNT_DETAIL, { id: item.id });
        if (data) renderKhlcntDetail(item, data);
        else $('d-detail-body').innerHTML = '<p>Không tải được chi tiết.</p>';
    } catch (e) {
        $('d-detail-body').innerHTML = '<p>Lỗi khi tải chi tiết.</p>';
    }
}

function renderKhlcntDetail(item, data) {
    const plan = data.bidPoBidpPlanProjectDetailView || {};
    const bidList = data.bidpPlanDetailToProjectList || [];
    const planNo = plan.planNo || item.planNo || '';
    let html = '<div class="ddetail__section"><table class="ddetail__table">' +
        '<tr><th>Mã KHLCNT</th><td><a href="' + MSC_BASE + '?render=url-redirect&type=khlcnt&code=' + planNo + '" target="_blank" class="ddetail__link">' + escHtml(planNo) + ' ↗</a></td></tr>' +
        '<tr><th>Tên kế hoạch</th><td>' + escHtml(plan.name || '—') + '</td></tr>' +
        '<tr><th>Chủ đầu tư</th><td>' + escHtml(plan.investorName || '—') + '</td></tr>' +
        '<tr><th>Số quyết định</th><td>' + (plan.decisionNo || '—') + '</td></tr>' +
        '<tr><th>Ngày phê duyệt</th><td>' + formatDate(plan.decisionDate) + '</td></tr>' +
        '<tr><th>Tổng mức đầu tư</th><td>' + formatPrice(plan.investTotal) + '</td></tr>' +
        '<tr><th>Số gói thầu</th><td>' + (plan.bidPack || bidList.length) + '</td></tr>' +
        '</table></div>';
    if (bidList.length > 0) {
        html += '<div class="ddetail__section"><h4 class="ddetail__section-title">📦 Danh mục gói thầu (' + bidList.length + ')</h4>' +
            '<table class="ddetail__data-table"><thead><tr><th>#</th><th>Tên gói thầu</th><th>Giá gói thầu</th><th>Hình thức</th></tr></thead><tbody>' +
            bidList.map((b, i) => '<tr><td>' + (i+1) + '</td><td>' + escHtml(b.bidName || '') + '</td><td>' + formatPrice(b.bidPrice) + '</td><td>' + (b.bidForm || '') + '</td></tr>').join('') +
            '</tbody></table></div>';
    }
    html += '<div class="ddetail__section ddetail__actions"><a href="' + MSC_BASE + '?render=url-redirect&type=khlcnt&code=' + planNo + '" target="_blank" class="ddetail__ext-link">🔗 Mở trên muasamcong.mpi.gov.vn</a></div>';
    $('d-detail-body').innerHTML = html;
}

function showDetail() { $('d-detail').classList.remove('hidden'); $('d-detail').classList.add('ddetail--open'); }
function hideDetail() {
    $('d-detail').classList.add('hidden'); $('d-detail').classList.remove('ddetail--open');
    state.selectedItem = null;
    document.querySelectorAll('.dcard').forEach(c => c.classList.remove('dcard--selected'));
}

function renderPagination() {
    const totalPages = Math.ceil(state.totalElements / state.pageSize);
    const container = $('d-pagination');
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    let html = '<button class="dpag__btn" ' + (state.page === 0 ? 'disabled' : '') + ' onclick="goPage(' + (state.page-1) + ')">«</button>';
    const range = getPageRange(state.page, totalPages, 5);
    if (range[0] > 0) { html += '<button class="dpag__btn" onclick="goPage(0)">1</button>'; if (range[0] > 1) html += '<span class="dpag__dots">…</span>'; }
    for (let p = range[0]; p <= range[1]; p++) html += '<button class="dpag__btn' + (p === state.page ? ' dpag__btn--active' : '') + '" onclick="goPage(' + p + ')">' + (p+1) + '</button>';
    if (range[1] < totalPages-1) { if (range[1] < totalPages-2) html += '<span class="dpag__dots">…</span>'; html += '<button class="dpag__btn" onclick="goPage(' + (totalPages-1) + ')">' + totalPages + '</button>'; }
    html += '<button class="dpag__btn" ' + (state.page >= totalPages-1 ? 'disabled' : '') + ' onclick="goPage(' + (state.page+1) + ')">»</button>';
    container.innerHTML = html;
}

function goPage(p) {
    state.page = p;
    if (state.mode === 'search') doGlobalSearch($('d-keyword').value.trim());
    else doBrowse();
    $('d-list-scroll').scrollTo({ top: 0, behavior: 'smooth' });
}

function getPageRange(current, total, size) {
    let start = Math.max(0, current - Math.floor(size / 2));
    let end = Math.min(total-1, start+size-1);
    start = Math.max(0, end-size+1);
    return [start, end];
}

function renderStats() { $('d-total').textContent = state.totalElements.toLocaleString('vi-VN'); }

function getStatus(code) { return STATUS_MAP[code || ''] || { label: code || '', cls: 'default' }; }

function formatPrice(val) {
    if (!val && val !== 0) return '—';
    const n = parseFloat(val);
    if (isNaN(n)) return '—';
    if (n >= 1e9) return (n/1e9).toFixed(2).replace(/\.?0+$/, '') + ' tỷ';
    if (n >= 1e6) return (n/1e6).toFixed(1).replace(/\.?0+$/, '') + ' triệu';
    return n.toLocaleString('vi-VN') + ' ₫';
}

function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escHtml(s) {
    if (!s) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

function showLoading(show) {
    const loader = $('d-loading');
    if (!loader) return;
    loader.classList.toggle('hidden', !show);
    if (show) $('d-list-scroll').querySelectorAll('.dcard').forEach(c => c.style.display = 'none');
    else $('d-list-scroll').querySelectorAll('.dcard').forEach(c => c.style.display = '');
}

function showEmpty(msg) { const el = $('d-empty'); if (el) { el.textContent = msg || ''; el.classList.remove('hidden'); } }
function hideEmpty() { const el = $('d-empty'); if (el) el.classList.add('hidden'); }

async function postJSON(url, payload) {
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return resp.json();
}