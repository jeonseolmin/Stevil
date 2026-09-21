/*
 * 약국 찾기 / 관리자 약국 관리 공용 샘플 데이터 + 순수 헬퍼.
 *
 * !! 전부 가상의 SAMPLE 데이터다 !!
 * 약국명·주소·전화번호·재고·가격은 UI 검증용으로 만든 값이며 실제 영업/재고/가격
 * 정보가 아니다. 화면에는 항상 "샘플" 표기를 함께 보여준다.
 *
 * 실제 API 전환 시 이 파일의 SAMPLE_PHARMACIES만 API 응답으로 바꾸면 된다.
 * 응답 모양(예상): 외부 지역검색 기본 정보 + Stevil DB(제휴/광고/GLP-1) 병합 결과.
 */

// 취급 제품 카탈로그 — 제품이 늘어나면 여기에만 추가한다(필터·관리자 폼이 이 배열을 읽는다).
export const PRODUCT_CATALOG = [
    { product: "WEGOVY", displayName: "위고비" },
    { product: "MOUNJARO", displayName: "마운자로" },
];

export const STOCK_STATUS = {
    IN_STOCK: { label: "재고 있음", rank: 0 },
    LOW_STOCK: { label: "재고 소량", rank: 1 },
    OUT_OF_STOCK: { label: "품절", rank: 2 },
};

export const PHARMACY_DEFAULT_POSITION = {
    latitude: 37.2795,
    longitude: 127.019,
};

export function getProductName(product) {
    return PRODUCT_CATALOG.find((item) => item.product === product)?.displayName ?? product;
}

// glp1Products는 "제품 x 용량" 한 줄씩의 평면 배열이다 — 같은 product가 여러 줄이면 다중 용량.
const p = (product, dose, stockStatus, price) => ({
    product,
    displayName: getProductName(product),
    dose,
    stockStatus,
    price,
});

const W = (dose, stock, price) => p("WEGOVY", dose, stock, price);
const M = (dose, stock, price) => p("MOUNJARO", dose, stock, price);

export const SAMPLE_PHARMACIES = [
    {
        id: 1, name: "행궁건강약국", address: "경기 수원시 팔달구 행궁로 000 (샘플)",
        latitude: 37.2819, longitude: 127.0139, phone: "031-000-0001",
        businessHours: "09:00–19:00", isOpen: true, active: true,
        partnership: true, advertised: true, adPriority: 1, updatedAt: "2026-09-20T10:30:00",
        glp1Products: [W("0.25mg", "IN_STOCK", 100000), W("0.5mg", "IN_STOCK", 150000), M("2.5mg", "LOW_STOCK", 120000)],
    },
    {
        id: 2, name: "팔달온누리약국", address: "경기 수원시 팔달구 팔달로 000 (샘플)",
        latitude: 37.2775, longitude: 127.0173, phone: "031-000-0002",
        businessHours: "09:00–21:00", isOpen: true, active: true,
        partnership: true, advertised: false, adPriority: null, updatedAt: "2026-09-20T09:10:00",
        glp1Products: [W("1mg", "LOW_STOCK", 200000), M("2.5mg", "IN_STOCK", 110000), M("5mg", "IN_STOCK", 180000)],
    },
    {
        id: 3, name: "수원중앙약국", address: "경기 수원시 팔달구 중부대로 000 (샘플)",
        latitude: 37.2661, longitude: 127.0287, phone: "031-000-0003",
        businessHours: "08:30–18:30", isOpen: true, active: true,
        partnership: false, advertised: true, adPriority: 2, updatedAt: "2026-09-19T17:45:00",
        glp1Products: [W("0.25mg", "OUT_OF_STOCK", 100000), M("5mg", "IN_STOCK", 175000)],
    },
    {
        id: 4, name: "화서다온약국", address: "경기 수원시 팔달구 화서로 000 (샘플)",
        latitude: 37.2841, longitude: 126.9995, phone: "031-000-0004",
        businessHours: "09:00–20:00", isOpen: true, active: true,
        partnership: false, advertised: false, adPriority: null, updatedAt: "2026-09-18T14:20:00",
        glp1Products: [W("0.25mg", "IN_STOCK", 95000), W("0.5mg", "LOW_STOCK", 140000)],
    },
    {
        id: 5, name: "매교역새봄약국", address: "경기 수원시 팔달구 매교로 000 (샘플)",
        latitude: 37.2652, longitude: 127.0158, phone: "031-000-0005",
        businessHours: "09:00–18:00", isOpen: false, active: true,
        partnership: true, advertised: false, adPriority: null, updatedAt: "2026-09-19T11:00:00",
        glp1Products: [M("2.5mg", "LOW_STOCK", 115000), M("7.5mg", "OUT_OF_STOCK", 230000)],
    },
    {
        id: 6, name: "인계휴약국", address: "경기 수원시 팔달구 권광로 000 (샘플)",
        latitude: 37.2657, longitude: 127.0328, phone: "031-000-0006",
        businessHours: "10:00–22:00", isOpen: true, active: true,
        partnership: false, advertised: false, adPriority: null, updatedAt: "2026-09-20T08:00:00",
        glp1Products: [W("0.5mg", "IN_STOCK", 145000), M("5mg", "LOW_STOCK", 170000)],
    },
    {
        id: 7, name: "지동바른약국", address: "경기 수원시 팔달구 지동로 000 (샘플)",
        latitude: 37.2792, longitude: 127.0206, phone: "031-000-0007",
        businessHours: "09:00–19:30", isOpen: true, active: true,
        partnership: false, advertised: false, adPriority: null, updatedAt: "2026-09-17T16:40:00",
        glp1Products: [],
    },
    {
        id: 8, name: "우만해든약국", address: "경기 수원시 팔달구 우만로 000 (샘플)",
        latitude: 37.2812, longitude: 127.0384, phone: "031-000-0008",
        businessHours: "09:00–18:30", isOpen: false, active: true,
        partnership: false, advertised: false, adPriority: null, updatedAt: "2026-09-16T12:15:00",
        glp1Products: [W("1mg", "OUT_OF_STOCK", 195000), W("1.7mg", "OUT_OF_STOCK", 260000), M("10mg", "OUT_OF_STOCK", 290000)],
    },
    {
        id: 9, name: "남문믿음약국", address: "경기 수원시 팔달구 정조로 000 (샘플)",
        latitude: 37.2782, longitude: 127.0158, phone: "031-000-0009",
        businessHours: "09:00–21:00", isOpen: true, active: true,
        partnership: false, advertised: true, adPriority: 3, updatedAt: "2026-09-20T13:05:00",
        glp1Products: [W("0.25mg", "LOW_STOCK", 105000), M("2.5mg", "IN_STOCK", 118000)],
    },
    {
        id: 10, name: "효원공원약국", address: "경기 수원시 팔달구 효원로 000 (샘플)",
        latitude: 37.2652, longitude: 127.0243, phone: "031-000-0010",
        businessHours: "08:00–20:00", isOpen: true, active: true,
        partnership: true, advertised: false, adPriority: null, updatedAt: "2026-09-19T19:30:00",
        glp1Products: [W("0.5mg", "IN_STOCK", 148000), W("1mg", "IN_STOCK", 198000), M("5mg", "IN_STOCK", 172000)],
    },
];

export function haversineKm(a, b) {
    const rad = (deg) => (deg * Math.PI) / 180;
    const dLat = rad(b.latitude - a.latitude);
    const dLng = rad(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;

    return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function formatDistance(km) {
    if (km === null || km === undefined) {
        return null;
    }

    return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

export function formatPrice(price) {
    return price > 0 ? `${price.toLocaleString("ko-KR")}원` : "가격 미등록";
}

export function formatUpdatedAt(value) {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("ko-KR", {
        month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(new Date(value));
}

export function handles(pharmacy, product) {
    return pharmacy.glp1Products.some((item) => item.product === product);
}

/*
 * 재고 요약 — product를 주면 그 제품만, 없으면 전체 대상.
 * 가장 좋은 상태를 대표값으로 쓴다(용량 중 하나라도 있으면 "재고 있음").
 */
export function summarizeStock(pharmacy, product) {
    const items = pharmacy.glp1Products.filter((item) => !product || item.product === product);

    if (items.length === 0) {
        return null;
    }

    return items.reduce((best, item) =>
        STOCK_STATUS[item.stockStatus].rank < STOCK_STATUS[best].rank ? item.stockStatus : best,
    items[0].stockStatus);
}

export function priceRange(pharmacy, product) {
    const prices = pharmacy.glp1Products
        .filter((item) => (!product || item.product === product) && item.price > 0)
        .map((item) => item.price);

    if (prices.length === 0) {
        return null;
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return min === max ? formatPrice(min) : `${formatPrice(min)} ~ ${formatPrice(max)}`;
}

/*
 * 필터: 제품 키 배열 + 재고/제휴/영업 토글. 모두 AND.
 * 제품이 선택돼 있으면 "재고 있음"도 그 제품 기준으로 판단한다.
 */
export function filterPharmacies(pharmacies, { keyword, products, inStock, partnerOnly, openOnly }) {
    const kw = keyword.trim().toLowerCase();

    return pharmacies.filter((pharmacy) => {
        if (kw && !`${pharmacy.name} ${pharmacy.address}`.toLowerCase().includes(kw)) return false;
        if (products.some((product) => !handles(pharmacy, product))) return false;
        if (partnerOnly && !pharmacy.partnership) return false;
        if (openOnly && !pharmacy.isOpen) return false;

        if (inStock) {
            const targets = products.length ? products : [undefined];
            const hasStock = targets.some((product) => {
                const status = summarizeStock(pharmacy, product);
                return status === "IN_STOCK" || status === "LOW_STOCK";
            });

            if (!hasStock) return false;
        }

        return true;
    });
}

/* 광고(adPriority 오름차순) 먼저, 그다음 거리순 — 병원 지도의 SEARCH_TOP 우선 노출과 같은 규칙. */
export function sortPharmacies(pharmacies, origin) {
    return pharmacies
        .map((pharmacy) => ({ ...pharmacy, distanceKm: haversineKm(origin, pharmacy) }))
        .sort((a, b) => {
            if (a.advertised !== b.advertised) return a.advertised ? -1 : 1;
            if (a.advertised && a.adPriority !== b.adPriority) return a.adPriority - b.adPriority;
            return a.distanceKm - b.distanceKm;
        });
}
