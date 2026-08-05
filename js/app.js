const $ = id => document.getElementById(id);

const API_BASE = '';
const SEARCH_URL = '/o/egp-portal-winning-bid-data/services/smart/search_prc';
const CATEGORY_URL = '/o/egp-portal-winning-bid-data/services/get/category';

// Static Map Fallback for Hình thức LCNT
const BID_FORM_MAP = {
    'DTRR': 'Đấu thầu rộng rãi',
    'DTHC': 'Đấu thầu hạn chế',
    'CHCT': 'Chào hàng cạnh tranh',
    'CHCTRG': 'Chào hàng cạnh tranh rút gọn',
    'CDT': 'Chỉ định thầu',
    'CDTRG': 'Chỉ định thầu rút gọn',
    'MSTT': 'Mua sắm trực tiếp',
    'CGTT': 'Chào giá trực tuyến',
    'CGTTRG': 'Chào giá trực tuyến theo quy trình rút gọn',
    'ESHOP': 'Mua sắm trực tuyến',
    'TTH': 'Tự thực hiện',
    'DH': 'Đặt hàng',
    'GNV': 'Giao nhiệm vụ',
    'DH_GNV': 'Đặt hàng, giao nhiệm vụ',
    'DPG': 'Đàm phán giá',
    'DPCT': 'Đàm phán cạnh tranh',
    'LCNT_DB': 'Lựa chọn nhà thầu trong trường hợp đặc biệt',
    'TVCN': 'Tư vấn cá nhân',
    'TCTVCN': 'Tuyển chọn tư vấn cá nhân',
    'QCBS': 'Tuyển chọn trên cơ sở Chất lượng và Chi phí (QCBS)',
    'QBS': 'Tuyển chọn tư vấn dựa trên cơ sở chất lượng (QBS)',
    'FBS': 'Lựa chọn theo mức ngân sách cố định (FBS)',
    'LCS': 'Tuyển chọn tư vấn có chi phí thấp nhất (LCS)',
    'CQS': 'Tuyển chọn dựa trên năng lực (CQS)',
    'SSS': 'Tuyển chọn từ một nguồn duy nhất (SSS)',
    'KHAC': 'Khác'
};

const state = {
    currentTab: 'GENERIC',
    pageSize: 20,
    pageNumber: 0,
    totalElements: 0,
    hasSearched: false,
    lastResults: [],
    isLoading: false,
    categories: { bidForms: Object.assign({}, BID_FORM_MAP) }
};

function getCategoryName(val) {
    if (!val) return '';
    return state.categories.bidForms[val] || val;
}

function getLocationText(locationArr) {
    if (!Array.isArray(locationArr) || locationArr.length === 0) return '';
    return locationArr.map(loc => loc.provName || '').filter(Boolean).join(', ');
}

const TAB_CONFIG = {
    'TBYT': {
        typeHH: 'THIET_BI_VAT_TU_Y_TE',
        medicines: null,
        hasMedicineType: false,
        matchFields: ['ten_thiet_bi', 'ma_hs', 'xuat_xu', 'ma_tbmt', 'ky_ma_hieu', 'nhan_hieu', 'hang_san_xuat'],
        placeholder: 'Nhập từ khóa theo tên thiết bị, vật tư y tế, Mã HS, xuất xứ, ký mã hiệu, hãng sản xuất',
        columns: [
            {key: 'stt', label: 'STT', class: 'td-stt'},
            {key: 'tenThietBi', label: 'Tên thiết bị, vật tư y tế', class: 'td-desc'},
            {key: 'maHs', label: 'Mã HS'},
            {key: 'xuatXu', label: 'Xuất xứ'},
            {key: 'kyMaHieu', label: 'Ký mã hiệu'},
            {key: 'nhanHieu', label: 'Nhãn hiệu'},
            {key: 'hangSanXuat', label: 'Hãng sản xuất'},
            {key: 'donViTinh', label: 'Đơn vị tính'},
            {key: 'khoiLuongDouble', label: 'Khối lượng', class: 'td-number', format: 'number'},
            {key: 'donGia', label: 'Đơn giá (VND)', class: 'td-price', format: 'currency'},
            {key: 'maTbmt', label: 'Mã TBMT'},
            {key: 'tenCdtBmt', label: 'Tên CĐT'},
            {key: 'bidForm', label: 'Hình thức LCNT', format: 'category'},
            {key: 'ngayDangTaiKqlcnt', label: 'Ngày đăng tải KQLCNT', format: 'date'},
            {key: 'soQuyetDinh', label: 'Số quyết định'},
            {key: 'ngayBanHanhQuyetDinh', label: 'Ngày ban hành quyết định', format: 'date'},
            {key: 'soNhaThauThamDu', label: 'Số nhà thầu tham dự', class: 'td-number', format: 'number'},
            {key: 'diaDiem', label: 'Địa điểm', class: 'td-location', format: 'location'},
            {key: 'winningName', label: 'Nhà thầu trúng thầu', class: 'td-desc'}
        ]
    },
    'GENERIC': {
        typeHH: 'THUOC_TAN_DUOC',
        medicines: '0',
        hasMedicineType: false,
        matchFields: ['ten_thuoc', 'ten_hoat_chat', 'gdklh_gpnk', 'ma_tbmt'],
        placeholder: 'Nhập tên thuốc, tên hoạt chất, số GĐKLH hoặc GPNK...',
        columns: [
            {key: 'stt', label: 'STT', class: 'td-stt'},
            {key: 'tenThuoc', label: 'Tên thuốc', class: 'td-desc'},
            {key: 'tenHoatChat', label: 'Tên hoạt chất/ thành phần dược liệu'},
            {key: 'nongDo', label: 'Nồng độ, hàm lượng'},
            {key: 'gdklh_GPNK', label: 'GĐKLH hoặc GPNK'},
            {key: 'duongDung', label: 'Đường dùng'},
            {key: 'dangBaoChe', label: 'Dạng bào chế'},
            {key: 'hanDung', label: 'Hạn dùng (Tuổi thọ)'},
            {key: 'tenCoSoSanXuat', label: 'Tên cơ sở sản xuất'},
            {key: 'nuocSanXuat', label: 'Nước sản xuất'},
            {key: 'quyCachDongGoi', label: 'Quy cách đóng gói'},
            {key: 'donViTinh', label: 'Đơn vị tính'},
            {key: 'soLuong', label: 'Số lượng', class: 'td-number', format: 'number'},
            {key: 'donGia', label: 'Đơn giá trúng thầu (VND)', class: 'td-price', format: 'currency'},
            {key: 'nhomThuoc', label: 'Nhóm thuốc'},
            {key: 'maTbmt', label: 'Mã TBMT'},
            {key: 'tenCdtBmt', label: 'Tên CĐT'},
            {key: 'bidForm', label: 'Hình thức LCNT', format: 'category'},
            {key: 'ngayDangTaiKqlcnt', label: 'Ngày đăng tải KQLCNT', format: 'date'},
            {key: 'soQuyetDinh', label: 'Số quyết định'},
            {key: 'ngayBanHanhQuyetDinh', label: 'Ngày ban hành quyết định', format: 'date'},
            {key: 'soNhaThauThamDu', label: 'Số nhà thầu tham dự', class: 'td-number', format: 'number'},
            {key: 'diaDiem', label: 'Địa điểm', class: 'td-location', format: 'location'},
            {key: 'winningName', label: 'Nhà thầu trúng thầu', class: 'td-desc'}
        ]
    },
    'BRANDED': {
        typeHH: 'THUOC_TAN_DUOC',
        medicines: '1',
        hasMedicineType: false,
        matchFields: ['ten_thuoc', 'ten_hoat_chat', 'gdklh_gpnk', 'ma_tbmt'],
        placeholder: 'Nhập tên thuốc, tên hoạt chất, số GĐKLH hoặc GPNK...',
        columns: null // Copied in init
    },
    'HERBAL_DRUG': {
        typeHH: 'THUOC_TAN_DUOC',
        medicines: '2',
        hasMedicineType: false,
        matchFields: ['ten_thuoc', 'ten_hoat_chat', 'gdklh_gpnk', 'ma_tbmt'],
        placeholder: 'Nhập tên thuốc, tên hoạt chất, số GĐKLH hoặc GPNK...',
        columns: null // Copied in init
    },
    'DUOC_LIEU': {
        typeHH: 'DUOC_LIEU',
        medicines: null,
        hasMedicineType: true,
        matchFields: ['ten_duoc_lieu', 'ten_khoa_hoc', 'ten_san_pham', 'gdklh_gpnk', 'ma_tbmt'],
        placeholder: 'Nhập tên dược liệu, tên khoa học, số GĐKLH hoặc GPNK...',
        columns: [
            {key: 'stt', label: 'STT', class: 'td-stt'},
            {key: 'tenDuocLieu', label: 'Tên dược liệu', class: 'td-desc'},
            {key: 'boPhanDung', label: 'Bộ phận dùng'},
            {key: 'tenKhoaHoc', label: 'Tên khoa học'},
            {key: 'nguonGoc', label: 'Nguồn gốc (N/I/NI)'},
            {key: 'phuongPhapCheBien', label: 'Phương pháp chế biến'},
            {key: 'gdklh_GPNK', label: 'Số ĐKLH/ Giấy phép NK'},
            {key: 'tenCoSoSanXuat', label: 'Tên cơ sở sản xuất'},
            {key: 'nuocSanXuat', label: 'Nước sản xuất'},
            {key: 'quyCachDongGoi', label: 'Quy cách đóng gói'},
            {key: 'donViTinh', label: 'Đơn vị tính'},
            {key: 'soLuong', label: 'Số lượng', class: 'td-number', format: 'number'},
            {key: 'donGia', label: 'Đơn giá trúng thầu (VND)', class: 'td-price', format: 'currency'},
            {key: 'nhomTCKT', label: 'Nhóm TCKT'},
            {key: 'maTbmt', label: 'Mã TBMT'},
            {key: 'tenCdtBmt', label: 'Tên CĐT'},
            {key: 'bidForm', label: 'Hình thức LCNT', format: 'category'},
            {key: 'ngayDangTaiKqlcnt', label: 'Ngày đăng tải KQLCNT', format: 'date'},
            {key: 'soQuyetDinh', label: 'Số quyết định'},
            {key: 'ngayBanHanhQuyetDinh', label: 'Ngày ban hành quyết định', format: 'date'},
            {key: 'soNhaThauThamDu', label: 'Số nhà thầu tham dự', class: 'td-number', format: 'number'},
            {key: 'diaDiem', label: 'Địa điểm', class: 'td-location', format: 'location'},
            {key: 'winningName', label: 'Nhà thầu trúng thầu', class: 'td-desc'}
        ]
    },
    'VI_THUOC': {
        typeHH: 'VI_THUOC_CO_TRUYEN',
        medicines: null,
        hasMedicineType: true,
        matchFields: ['ten_duoc_lieu', 'ten_khoa_hoc', 'ten_san_pham', 'gdklh_gpnk', 'ma_tbmt'],
        placeholder: 'Nhập tên vị thuốc cổ truyền, tên khoa học, số GĐKLH hoặc GPNK...',
        columns: [
            {key: 'stt', label: 'STT', class: 'td-stt'},
            {key: 'tenDuocLieu', label: 'Tên vị thuốc cổ truyền', class: 'td-desc'},
            {key: 'boPhanDung', label: 'Bộ phận dùng'},
            {key: 'tenKhoaHoc', label: 'Tên khoa học'},
            {key: 'nguonGoc', label: 'Nguồn gốc (N/I/NI)'},
            {key: 'phuongPhapCheBien', label: 'Phương pháp chế biến'},
            {key: 'gdklh_GPNK', label: 'Số ĐKLH/ Giấy phép NK'},
            {key: 'tenCoSoSanXuat', label: 'Tên cơ sở sản xuất'},
            {key: 'nuocSanXuat', label: 'Nước sản xuất'},
            {key: 'quyCachDongGoi', label: 'Quy cách đóng gói'},
            {key: 'donViTinh', label: 'Đơn vị tính'},
            {key: 'soLuong', label: 'Số lượng', class: 'td-number', format: 'number'},
            {key: 'donGia', label: 'Đơn giá trúng thầu (VND)', class: 'td-price', format: 'currency'},
            {key: 'nhomTCKT', label: 'Nhóm TCKT'},
            {key: 'maTbmt', label: 'Mã TBMT'},
            {key: 'tenCdtBmt', label: 'Tên CĐT'},
            {key: 'bidForm', label: 'Hình thức LCNT', format: 'category'},
            {key: 'ngayDangTaiKqlcnt', label: 'Ngày đăng tải KQLCNT', format: 'date'},
            {key: 'soQuyetDinh', label: 'Số quyết định'},
            {key: 'ngayBanHanhQuyetDinh', label: 'Ngày ban hành quyết định', format: 'date'},
            {key: 'soNhaThauThamDu', label: 'Số nhà thầu tham dự', class: 'td-number', format: 'number'},
            {key: 'diaDiem', label: 'Địa điểm', class: 'td-location', format: 'location'},
            {key: 'winningName', label: 'Nhà thầu trúng thầu', class: 'td-desc'}
        ]
    }
};

// Utilities
function escapeHtml(unsafe) {
    if (!unsafe && unsafe !== 0) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function formatCurrency(value) {
    if (!value && value !== 0) return '';
    return Number(value).toLocaleString('vi-VN');
}

function formatNumber(value) {
    if (!value && value !== 0) return '';
    return Number(value).toLocaleString('vi-VN');
}

function parseVietnameseDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const cleanStr = dateStr.trim();
    const dmyMatch = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1;
        const year = parseInt(dmyMatch[3], 10);
        const d = new Date(year, month, day);
        if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) return d;
    }
    const ymdMatch = cleanStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10);
        const month = parseInt(ymdMatch[2], 10) - 1;
        const day = parseInt(ymdMatch[3], 10);
        const d = new Date(year, month, day);
        if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) return d;
    }
    const parsed = new Date(cleanStr);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = parseVietnameseDate(dateStr);
    if (!d) return dateStr;
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function convertDateFrom(dateStr) {
    const d = parseVietnameseDate(dateStr);
    if (!d) return null;
    d.setHours(0, 0, 0, 0);
    return new Date(d.getTime() + 7 * 3600000).toISOString();
}

function convertDateTo(dateStr) {
    const d = parseVietnameseDate(dateStr);
    if (!d) return null;
    d.setHours(23, 59, 59, 999);
    return new Date(d.getTime() + 7 * 3600000).toISOString();
}

// Build Payload
function buildFilterSearch() {
    const config = TAB_CONFIG[state.currentTab];
    const filters = [];
    
    // Date filters
    const dateFrom = $('date-from')?.value;
    const dateTo = $('date-to')?.value;
    if (dateFrom || dateTo) {
        filters.push({
            fieldName: 'ngay_dang_tai_kqlcnt',
            searchType: 'range',
            from: dateFrom ? convertDateFrom(dateFrom) : null,
            to: dateTo ? convertDateTo(dateTo) : null
        });
    }
    
    const decFrom = $('decision-date-from')?.value;
    const decTo = $('decision-date-to')?.value;
    if (decFrom || decTo) {
        filters.push({
            fieldName: 'ngay_ban_hanh_quyet_dinh',
            searchType: 'range',
            from: decFrom ? convertDateFrom(decFrom) : null,
            to: decTo ? convertDateTo(decTo) : null
        });
    }

    // Medicine type filter for DUOC_LIEU and VI_THUOC_CO_TRUYEN
    if (config.hasMedicineType) {
        const medType = parseInt($('medicine-type-select')?.value || '0');
        filters.push({
            fieldName: 'medicine_type',
            searchType: 'in',
            fieldValues: medType === 0 ? [0, null] : [medType]
        });
    }
    
    // Medicines filter for THUOC_TAN_DUOC
    if (config.medicines !== null) {
        filters.push({
            fieldName: 'medicines',
            searchType: 'in',
            fieldValues: [config.medicines]
        });
    }
    
    // Tab filtering constraints
    filters.push({
        fieldName: 'type',
        searchType: 'in',
        fieldValues: ['HANG_HOA']
    });
    filters.push({
        fieldName: 'tab',
        searchType: 'in',
        fieldValues: [config.typeHH]
    });

    // Quantity filter: so_luong > X
    const minQty = $('min-quantity')?.value;
    if (minQty !== '' && minQty !== null && minQty !== undefined && !isNaN(Number(minQty)) && Number(minQty) > 0) {
        // TBYT uses khoi_luong, medicines use so_luong
        const qtyField = state.currentTab === 'TBYT' ? 'khoi_luong' : 'so_luong';
        filters.push({
            fieldName: qtyField,
            searchType: 'range',
            from: Number(minQty),
            to: null
        });
    }

    return filters;
}

function buildQuery() {
    const config = TAB_CONFIG[state.currentTab];
    const query = [];
    const filters = buildFilterSearch();

    const keyword = $('search-keyword')?.value?.trim() || '';
    const matchType = $('match-type')?.value || 'all-1';
    const investor = $('investor')?.value?.trim() || '';
    const contractor = $('contractor')?.value?.trim() || '';
    const decisionNum = $('decision-number')?.value?.trim() || '';

    // Main keyword query
    if (keyword) {
        query.push({
            index: 'es-smart-pricing',
            keyWord: keyword,
            keyWordNotMatch: '',
            matchType: matchType,
            matchFields: config.matchFields,
            filters: filters
        });
    }

    // Decision number query
    if (decisionNum) {
        query.push({
            index: 'es-smart-pricing',
            keyWord: decisionNum,
            keyWordNotMatch: '',
            matchType: matchType,
            matchFields: ['so_quyet_dinh'],
            filters: filters
        });
    }

    // Investor query
    if (investor) {
        query.push({
            index: 'es-smart-pricing',
            keyWord: investor,
            keyWordNotMatch: '',
            matchType: matchType,
            matchFields: ['ten_cdt_bmt', 'ma_cdt'],
            filters: filters
        });
    }

    // Contractor query
    if (contractor) {
        query.push({
            index: 'es-smart-pricing',
            keyWord: contractor,
            keyWordNotMatch: '',
            matchType: matchType,
            matchFields: ['winning_name', 'winning_code'],
            filters: filters
        });
    }

    // Default: if no queries, send empty keyword
    if (query.length === 0) {
        query.push({
            index: 'es-smart-pricing',
            keyWord: '',
            keyWordNotMatch: '',
            matchType: matchType,
            matchFields: config.matchFields,
            filters: filters
        });
    }

    return query;
}

// Render Functions
function formatCellContent(item, col) {
    let rawValue = item[col.key];
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        if (col.key === 'tenSanPham') {
            rawValue = item.tenThuoc || item.tenDuocLieu || item.moTaHangHoa || item.tenThietBi || '';
        } else if (col.key === 'moTaHangHoa') {
            rawValue = item.tenThietBi || item.tenThuoc || item.tenDuocLieu || item.moTaHangHoa || '';
        }
    }
    if (col.format === 'currency') return formatCurrency(rawValue);
    if (col.format === 'number') return formatNumber(rawValue);
    if (col.format === 'date') return formatDate(rawValue);
    if (col.format === 'category') return getCategoryName(rawValue);
    if (col.format === 'location') return getLocationText(rawValue);
    return escapeHtml(rawValue);
}

function renderTableHeaders() {
    const config = TAB_CONFIG[state.currentTab];
    const thead = $('results-table-head');
    let tr = '<tr>';
    config.columns.forEach(col => {
        tr += `<th class="table__th ${col.class || ''}">${escapeHtml(col.label)}</th>`;
    });
    tr += '</tr>';
    thead.innerHTML = tr;
}

function renderResults(items) {
    const tbody = $('results-table-body');
    const cardsContainer = $('results-cards');
    const config = TAB_CONFIG[state.currentTab];
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '';
        cardsContainer.innerHTML = '';
        return;
    }

    let tbodyHTML = '';
    let cardsHTML = '';

    items.forEach((item, index) => {
        // Calculate STT based on page
        const stt = state.pageNumber * state.pageSize + index + 1;
        item.stt = stt;

        // Table Row
        let tr = '<tr>';
        let cardContent = '';
        
        config.columns.forEach(col => {
            const content = formatCellContent(item, col);
            tr += `<td class="${col.class || ''}">${content}</td>`;
            
            if (col.key !== 'stt') {
                cardContent += `<div><strong>${escapeHtml(col.label)}:</strong> ${content}</div>`;
            }
        });
        tr += '</tr>';
        tbodyHTML += tr;

        // Mobile Card
        cardsHTML += `
            <div class="result-card">
                <div style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;">
                    <strong>STT: ${stt}</strong>
                </div>
                ${cardContent}
            </div>
        `;
    });

    tbody.innerHTML = tbodyHTML;
    cardsContainer.innerHTML = cardsHTML;
    
    $('table-wrapper').classList.remove('hidden');
    $('stats-bar').classList.remove('hidden');
}

function renderPagination() {
    const totalPages = Math.ceil(state.totalElements / state.pageSize);
    const container = $('pagination');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    
    // Prev
    html += `<button ${state.pageNumber === 0 ? 'disabled' : ''} onclick="goToPage(${state.pageNumber - 1})">Trước</button>`;
    
    // Page logic (simplified sliding window)
    let start = Math.max(0, state.pageNumber - 2);
    let end = Math.min(totalPages - 1, state.pageNumber + 2);
    
    if (start > 0) html += `<button onclick="goToPage(0)">1</button>${start > 1 ? '<span style="padding: 6px;">...</span>' : ''}`;
    
    for (let i = start; i <= end; i++) {
        html += `<button class="${i === state.pageNumber ? 'active' : ''}" onclick="goToPage(${i})">${i + 1}</button>`;
    }

    if (end < totalPages - 1) html += `${end < totalPages - 2 ? '<span style="padding: 6px;">...</span>' : ''}<button onclick="goToPage(${totalPages - 1})">${totalPages}</button>`;
    
    // Next
    html += `<button ${state.pageNumber >= totalPages - 1 ? 'disabled' : ''} onclick="goToPage(${state.pageNumber + 1})">Sau</button>`;

    container.innerHTML = html;
}

function updateStats() {
    $('total-results').textContent = formatNumber(state.totalElements);
}

// Actions
window.goToPage = function(page) {
    if (page < 0 || page >= Math.ceil(state.totalElements / state.pageSize)) return;
    state.pageNumber = page;
    performSearch();
};

async function performSearch() {
    state.isLoading = true;
    state.hasSearched = true;
    $('loading-overlay').classList.remove('hidden');
    $('empty-state').classList.add('hidden');
    $('error-state').classList.add('hidden');
    
    const payload = {
        pageSize: state.pageSize,
        pageNumber: state.pageNumber,
        query: buildQuery()
    };
    
    // CRITICAL: Wrap payload in array
    const requestBody = [payload];

    try {
        const response = await fetch(SEARCH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let errorMsg = `Lỗi kết nối máy chủ (${response.status})`;
            try {
                const errData = await response.json();
                if (errData && errData.detail) {
                    errorMsg = errData.detail;
                }
            } catch (e) {}
            throw new Error(errorMsg);
        }

        const data = await response.json();
        
        const pageData = data?.page || {};
        let items = pageData.content || [];
        state.totalElements = pageData.totalElements || 0;

        // Client-side filter by Hình thức LCNT (bidForm)
        const selectedBidForm = $('bid-form-select')?.value;
        if (selectedBidForm) {
            items = items.filter(it => it.bidForm === selectedBidForm);
            // Update total to reflect filtered count on this page
            state.totalElements = items.length;
        }

        state.lastResults = items;

        renderResults(items);
        renderPagination();
        updateStats();

        if (items.length === 0) {
            $('empty-state').innerHTML = '<p style="font-size: 1.05rem; font-weight: 500; color: #64748b;">Không tìm thấy kết quả nào phù hợp với bộ lọc.</p>';
            $('empty-state').classList.remove('hidden');
            $('table-wrapper').classList.add('hidden');
            $('stats-bar').classList.add('hidden');
        }

    } catch (error) {
        console.error('Search error:', error);
        if ($('error-desc')) {
            $('error-desc').textContent = error.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại!';
        }
        $('error-state').classList.remove('hidden');
        $('results-table-body').innerHTML = '';
        $('results-cards').innerHTML = '';
        $('pagination').innerHTML = '';
        state.totalElements = 0;
        updateStats();
    } finally {
        state.isLoading = false;
        $('loading-overlay')?.classList.add('hidden');
    }
}

function switchTab(tabKey) {
    if (state.currentTab === tabKey) return;
    state.currentTab = tabKey;
    
    // UI Update Tabs
    document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('tab--active'));
    document.querySelector(`.tab[data-tab="${tabKey}"]`).classList.add('tab--active');
    
    const config = TAB_CONFIG[tabKey];
    
    // Update Placeholder
    $('search-keyword').placeholder = config.placeholder;
    
    // Show/Hide Medicine Type Select
    const medGroup = $('medicine-type-group');
    if (config.hasMedicineType) {
        medGroup.classList.remove('hidden');
    } else {
        medGroup.classList.add('hidden');
        $('medicine-type-select').value = '0';
    }

    // Reset page number and update headers
    state.pageNumber = 0;
    renderTableHeaders();
    if (state.hasSearched) {
        performSearch();
    }
}

function resetFilters() {
    $('search-keyword').value = '';
    const bidFormEl = $('bid-form-select');
    if (bidFormEl) bidFormEl.value = '';
    $('match-type').value = 'all-1';
    $('date-from').value = '';
    $('date-to').value = '';
    $('decision-date-from').value = '';
    $('decision-date-to').value = '';
    $('decision-number').value = '';
    $('investor').value = '';
    $('contractor').value = '';
    $('medicine-type-select').value = '0';
    const minQtyEl = $('min-quantity');
    if (minQtyEl) minQtyEl.value = '';
}

function exportToExcel() {
    const items = state.lastResults || [];
    if (items.length === 0) {
        alert('Không có dữ liệu để xuất Excel. Vui lòng thực hiện tìm kiếm trước!');
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert('Đang tải thư viện Excel, vui lòng thử lại sau vài giây!');
        return;
    }

    const config = TAB_CONFIG[state.currentTab];
    const columns = config.columns || [];

    // Prepare array of row objects
    const dataRows = items.map((item, index) => {
        item.stt = state.pageNumber * state.pageSize + index + 1;
        const rowObj = {};
        columns.forEach(col => {
            let val = formatCellContent(item, col);
            val = String(val).replace(/<[^>]*>/g, '').trim();
            // Convert numerical values for proper Excel formatting
            if (col.format === 'currency' || col.format === 'number') {
                const num = item[col.key];
                if (num !== undefined && num !== null && num !== '') {
                    val = Number(num);
                }
            }
            rowObj[col.label] = val;
        });
        return rowObj;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataRows);

    // Auto-fit column widths
    const colWidths = columns.map(col => {
        let maxLen = col.label.length;
        dataRows.forEach(row => {
            const cellVal = String(row[col.label] || '');
            if (cellVal.length > maxLen) maxLen = cellVal.length;
        });
        return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
    });
    worksheet['!cols'] = colWidths;

    // Create workbook and write .xlsx
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KQLCNT');

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `Ket_qua_trung_thau_${state.currentTab}_${timestamp}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}


// Fetch Categories
async function fetchCategories() {
    // Populate static fallback map first
    Object.assign(state.categories.bidForms, BID_FORM_MAP);
    
    try {
        const response = await fetch('/o/egp-portal-winning-bid-data/services/get/category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryTypeCodeLst: ["DM_HTLCNT"] })
        });
        if (response.ok) {
            const data = await response.json();
            const list = data?.categories?.DM_HTLCNT;
            if (Array.isArray(list)) {
                list.forEach(item => {
                    if (item.code && item.name) {
                        state.categories.bidForms[item.code] = item.name;
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Could not fetch categories from server, using fallback map');
    }
}

// Initialization
function init() {
    // 1. Copy columns to BRANDED & HERBAL_DRUG configs
    TAB_CONFIG['BRANDED'].columns = [...TAB_CONFIG['GENERIC'].columns];
    TAB_CONFIG['HERBAL_DRUG'].columns = [...TAB_CONFIG['GENERIC'].columns];

    // 2. Bind Events
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    $('btn-search').addEventListener('click', () => {
        state.pageNumber = 0;
        performSearch();
    });

    $('btn-reset').addEventListener('click', resetFilters);
    
    $('btn-retry').addEventListener('click', () => {
        performSearch();
    });

    $('page-size-select').addEventListener('change', (e) => {
        state.pageSize = parseInt(e.target.value);
        state.pageNumber = 0;
        performSearch();
    });

    // Initialize Flatpickr Datepicker safely
    if (typeof flatpickr !== 'undefined') {
        try {
            // Custom inline locale - CDN vn locale hides year selector
            const vnLocale = {
                firstDayOfWeek: 1,
                weekdays: {
                    shorthand: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
                    longhand: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
                },
                months: {
                    shorthand: ['Th.1', 'Th.2', 'Th.3', 'Th.4', 'Th.5', 'Th.6', 'Th.7', 'Th.8', 'Th.9', 'Th.10', 'Th.11', 'Th.12'],
                    longhand: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
                },
                rangeSeparator: ' đến ',
                scrollTitle: 'Cuộn để thay đổi',
                toggleTitle: 'Nhấn để chuyển đổi'
            };
            flatpickr('.date-mask', {
                dateFormat: 'd/m/Y',
                allowInput: true,
                locale: vnLocale,
                showMonths: 1
            });
        } catch(err) {
            console.warn('Flatpickr init warning:', err);
        }
    }

    $('btn-export-excel')?.addEventListener('click', exportToExcel);

    $('search-keyword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            state.pageNumber = 0;
            performSearch();
        }
    });

    // 3. Setup Initial Tab & Load
    renderTableHeaders();
    // Set placeholder to match default active tab
    const initConfig = TAB_CONFIG[state.currentTab];
    $('search-keyword').placeholder = initConfig.placeholder;
    // Ensure medicine-type-group visibility matches default tab
    const medGroup = $('medicine-type-group');
    if (initConfig.hasMedicineType) {
        medGroup.classList.remove('hidden');
    } else {
        medGroup.classList.add('hidden');
    }
    fetchCategories();
}

document.addEventListener('DOMContentLoaded', init);
