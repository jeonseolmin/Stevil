import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadNaverMap } from "../../api/naverMapLoader";
// 지도 marker / 카드 번호 / 제휴·광고 badge 스타일은 병원 지도 CSS를 그대로 재사용한다
// (HospitalMapPage 파일은 수정하지 않고 클래스만 공유). 약국 전용 스타일만 아래 CSS에 둔다.
import "../hospitalMap/HospitalMapPage.css";
import "./PharmacyMapPage.css";
import {
    PHARMACY_DEFAULT_POSITION,
    PRODUCT_CATALOG,
    SAMPLE_PHARMACIES,
    STOCK_STATUS,
    filterPharmacies,
    formatDistance,
    formatPrice,
    formatUpdatedAt,
    haversineKm,
    priceRange,
    sortPharmacies,
    summarizeStock,
} from "./pharmacyData";

// 샘플 데이터가 수원시 팔달구에만 있어, 이 반경 밖에서 접속하면 현재 위치 대신 팔달구 중심을 기준으로 삼는다.
const SAMPLE_AREA_RADIUS_KM = 15;

const EMPTY_FILTERS = { products: [], inStock: false, partnerOnly: false, openOnly: false };

function StockBadge({ status }) {
    if (!status) {
        return <span className="pharmacy-stock pharmacy-stock--none">미취급</span>;
    }

    return (
        <span className={`pharmacy-stock pharmacy-stock--${status.toLowerCase()}`}>
            {STOCK_STATUS[status].label}
        </span>
    );
}

export default function PharmacyMapPage() {
    const mapElementRef = useRef(null);
    const mapRef = useRef(null);
    const mapsRef = useRef(null);
    const markersRef = useRef([]);
    const currentMarkerRef = useRef(null);
    // 병원 지도와 같은 이유: marker 재생성 effect가 selectedId에 의존하면 카드 클릭마다 fitBounds가 다시 돈다.
    const selectedIdRef = useRef(null);

    const [pharmacies] = useState(SAMPLE_PHARMACIES);
    const [keyword, setKeyword] = useState("");
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [pickedId, setSelectedId] = useState(null);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [mapError, setMapError] = useState("");
    const [locationMessage, setLocationMessage] = useState(() =>
        navigator.geolocation
            ? "현재 위치를 확인하면 가까운 순으로 볼 수 있습니다."
            : "이 브라우저에서는 현재 위치를 사용할 수 없어 팔달구 중심 기준으로 표시합니다."
    );

    const origin = currentPosition ?? PHARMACY_DEFAULT_POSITION;

    const visible = useMemo(
        () => sortPharmacies(
            filterPharmacies(pharmacies.filter((item) => item.active), { keyword, ...filters }),
            origin
        ),
        [pharmacies, keyword, filters, origin]
    );

    // 상태 메시지는 호출부에서 정한다(마운트 effect에서 동기 setState를 피하기 위함).
    const locate = useCallback(() => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const position = { latitude: coords.latitude, longitude: coords.longitude };

                if (haversineKm(PHARMACY_DEFAULT_POSITION, position) > SAMPLE_AREA_RADIUS_KM) {
                    setCurrentPosition(null);
                    setLocationMessage("샘플 데이터는 수원시 팔달구에만 있어 팔달구 중심 기준으로 표시합니다.");
                    return;
                }

                setCurrentPosition(position);
                setLocationMessage("현재 위치에서 가까운 순서로 표시합니다.");
            },
            () => setLocationMessage("위치 권한이 없어 팔달구 중심 기준으로 표시합니다."),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
        );
    }, []);

    // 필터로 선택 약국이 사라지면 선택 해제(파생값 — effect setState 회피)
    const selectedId = visible.some((item) => item.id === pickedId) ? pickedId : null;

    useEffect(() => {
        locate();
    }, [locate]);

    const requestCurrentLocation = () => {
        if (navigator.geolocation) setLocationMessage("현재 위치를 확인하고 있습니다.");
        locate();
    };

    useEffect(() => {
        let isActive = true;

        loadNaverMap()
            .then((maps) => {
                if (!isActive || !mapElementRef.current) return;

                mapsRef.current = maps;
                mapRef.current = new maps.Map(mapElementRef.current, {
                    center: new maps.LatLng(
                        PHARMACY_DEFAULT_POSITION.latitude,
                        PHARMACY_DEFAULT_POSITION.longitude
                    ),
                    zoom: 14,
                    zoomControl: true,
                    zoomControlOptions: { position: maps.Position.TOP_RIGHT },
                });
                setIsMapReady(true);
            })
            .catch((error) => {
                if (isActive) setMapError(error.message);
            });

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        if (!isMapReady || !currentPosition) return;

        const maps = mapsRef.current;

        currentMarkerRef.current?.setMap(null);
        currentMarkerRef.current = new maps.Marker({
            map: mapRef.current,
            position: new maps.LatLng(currentPosition.latitude, currentPosition.longitude),
            title: "현재 위치",
            icon: {
                content: '<span class="hospital-current-marker" aria-label="현재 위치"></span>',
                anchor: new maps.Point(10, 10),
            },
        });
    }, [currentPosition, isMapReady]);

    // marker 재생성 — 병원 지도와 동일한 클래스 규칙(is-ad / is-partner / is-selected)과 anchor 계산.
    useEffect(() => {
        if (!isMapReady) return;

        const maps = mapsRef.current;
        const map = mapRef.current;

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        // SDK 인증 실패 시 LatLngBounds 등이 동기 throw 할 수 있어 페이지 전체가 죽지 않게 막는다.
        try {
            const bounds = new maps.LatLngBounds();

            visible.forEach((pharmacy, index) => {
                const position = new maps.LatLng(pharmacy.latitude, pharmacy.longitude);
                const baseClassName = [
                    "hospital-map-marker",
                    pharmacy.advertised ? "is-ad" : "",
                    pharmacy.partnership ? "is-partner" : "",
                    index + 1 >= 10 ? "is-double-digit" : "",
                ].filter(Boolean).join(" ");

                const isSelected = pharmacy.id === selectedIdRef.current;
                const size = isSelected ? 44 : 40;
                const marker = new maps.Marker({
                    map,
                    position,
                    title: pharmacy.name,
                    icon: {
                        content: `<span class="${isSelected ? `${baseClassName} is-selected` : baseClassName}"><b>${index + 1}</b></span>`,
                        anchor: new maps.Point(size / 2, size / 2),
                    },
                });

                marker.stevilBaseClassName = baseClassName;
                marker.stevilLabel = index + 1;
                marker.stevilId = pharmacy.id;

                maps.Event.addListener(marker, "click", () => setSelectedId(pharmacy.id));

                markersRef.current.push(marker);
                bounds.extend(position);
            });

            if (visible.length > 0) {
                map.fitBounds(bounds, { top: 70, right: 60, bottom: 70, left: 60 });
            }
        } catch (error) {
            console.error("지도 마커 표시 실패", error);
        }
    }, [visible, isMapReady]);

    // 선택 강조만 setIcon으로 갱신 — marker 재생성/fitBounds 없이.
    useEffect(() => {
        selectedIdRef.current = selectedId;
        const maps = mapsRef.current;

        if (!maps) return;

        markersRef.current.forEach((marker) => {
            const isSelected = marker.stevilId === selectedId;
            const size = isSelected ? 44 : 40;

            marker.setIcon({
                content: `<span class="${isSelected ? `${marker.stevilBaseClassName} is-selected` : marker.stevilBaseClassName}"><b>${marker.stevilLabel}</b></span>`,
                anchor: new maps.Point(size / 2, size / 2),
            });
        });
    }, [selectedId]);

    // 선택 시 지도 이동 + 목록에서 해당 카드가 보이도록 스크롤(marker 클릭 → 리스트 동기화).
    useEffect(() => {
        if (selectedId === null) return;

        const pharmacy = visible.find((item) => item.id === selectedId);

        if (pharmacy && mapRef.current) {
            mapRef.current.panTo(new mapsRef.current.LatLng(pharmacy.latitude, pharmacy.longitude));
        }

        document.getElementById(`pharmacy-card-${selectedId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [selectedId, visible]);

    const toggleProduct = (product) =>
        setFilters((current) => ({
            ...current,
            products: current.products.includes(product)
                ? current.products.filter((item) => item !== product)
                : [...current.products, product],
        }));

    const toggleFlag = (key) => setFilters((current) => ({ ...current, [key]: !current[key] }));

    const isAllFilters = !filters.inStock && !filters.partnerOnly && !filters.openOnly && filters.products.length === 0;

    // 필터 칩 정의 — 제품 칩은 PRODUCT_CATALOG에서 만들어 제품이 늘어도 코드 수정이 없다.
    const chips = [
        { key: "all", label: "전체", active: isAllFilters, onClick: () => setFilters(EMPTY_FILTERS) },
        { key: "inStock", label: "현재 재고 있음", active: filters.inStock, onClick: () => toggleFlag("inStock") },
        ...PRODUCT_CATALOG.map(({ product, displayName }) => ({
            key: product,
            label: displayName,
            active: filters.products.includes(product),
            onClick: () => toggleProduct(product),
        })),
        { key: "partnerOnly", label: "제휴 약국", active: filters.partnerOnly, onClick: () => toggleFlag("partnerOnly") },
        { key: "openOnly", label: "영업 중", active: filters.openOnly, onClick: () => toggleFlag("openOnly") },
    ];

    return (
        <div className="hospital-page pharmacy-page">
            <section className="hospital-heading">
                <div>
                    <span className="hospital-eyebrow">PHARMACY FINDER</span>
                    <h1>내 주변 약국 찾기</h1>
                    <p>
                        <span className="pharmacy-region">수원시 팔달구</span>
                        약국의 위고비·마운자로 취급 정보를 확인하세요.
                    </p>
                </div>

                <button type="button" className="hospital-location-button" onClick={requestCurrentLocation}>
                    현재 위치 다시 찾기
                </button>
            </section>

            <div className="pharmacy-sample-notice" role="note">
                <strong>샘플 데이터</strong>
                이 화면의 약국·재고·가격은 화면 확인용 가상 데이터이며 실제 영업, 재고, 가격 정보가 아닙니다.
                방문 전 약국에 직접 확인하세요.
            </div>

            <form className="hospital-search" onSubmit={(event) => event.preventDefault()}>
                <label htmlFor="pharmacy-keyword" className="visually-hidden">약국 검색어</label>
                <input
                    id="pharmacy-keyword"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="약국명 또는 주소 (예: 행궁, 정조로)"
                    maxLength={100}
                />
                <button type="submit">검색</button>
            </form>

            <p className="hospital-location-message">{locationMessage}</p>

            <div className="pharmacy-filters" role="group" aria-label="약국 필터">
                {chips.map((chip) => (
                    <button
                        key={chip.key}
                        type="button"
                        className={`pharmacy-chip ${chip.active ? "is-active" : ""}`}
                        aria-pressed={chip.active}
                        onClick={chip.onClick}
                    >
                        {chip.label}
                    </button>
                ))}
            </div>

            <section className="hospital-content">
                <aside className="hospital-results" aria-live="polite">
                    <div className="hospital-results-heading">
                        <h2>검색 결과</h2>
                        <span>{visible.length}곳</span>
                    </div>

                    {visible.length === 0 && (
                        <div className="hospital-empty">
                            <strong>조건에 맞는 약국이 없습니다.</strong>
                            <p>필터를 해제하거나 검색어를 바꿔 보세요.</p>
                        </div>
                    )}

                    <ol className="hospital-list">
                        {visible.map((pharmacy, index) => {
                            const isSelected = pharmacy.id === selectedId;
                            const range = priceRange(pharmacy);

                            return (
                                <li key={pharmacy.id}>
                                    <div
                                        id={`pharmacy-card-${pharmacy.id}`}
                                        className={`hospital-card ${isSelected ? "hospital-card--selected" : ""}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={isSelected}
                                        onClick={() => setSelectedId(pharmacy.id)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                setSelectedId(pharmacy.id);
                                            }
                                        }}
                                    >
                                        <span
                                            className={`hospital-card-number ${pharmacy.partnership ? "is-partner" : ""} ${pharmacy.advertised ? "is-ad" : ""} ${isSelected ? "is-selected" : ""}`}
                                        >
                                            {index + 1}
                                        </span>

                                        <span className="hospital-card-body">
                                            <span className="hospital-card-title-row">
                                                <div>
                                                    {pharmacy.partnership && <span className="partner-badge">제휴</span>}
                                                    {pharmacy.advertised && <span className="ad-badge-top">광고</span>}
                                                    <strong>{pharmacy.name}</strong>
                                                </div>
                                                <em>{formatDistance(pharmacy.distanceKm)}</em>
                                            </span>

                                            <span className="hospital-address">{pharmacy.address}</span>
                                            <span className="pharmacy-status-row">
                                                <span className={`pharmacy-open ${pharmacy.isOpen ? "is-open" : ""}`}>
                                                    {pharmacy.isOpen ? "영업 중" : "영업 종료"}
                                                </span>
                                                <span className="hospital-phone">{pharmacy.businessHours}</span>
                                            </span>

                                            <span className="pharmacy-glp1-summary">
                                                {PRODUCT_CATALOG.map(({ product, displayName }) => (
                                                    <span key={product} className="pharmacy-glp1-item">
                                                        <b>{displayName}</b>
                                                        <StockBadge status={summarizeStock(pharmacy, product)} />
                                                    </span>
                                                ))}
                                            </span>

                                            <span className="hospital-phone">
                                                {range ? `샘플 가격 ${range}` : "등록된 가격 없음"}
                                                {" · "}정보 업데이트 {formatUpdatedAt(pharmacy.updatedAt)}
                                            </span>

                                            {isSelected && (
                                                <span className="pharmacy-detail">
                                                    {pharmacy.phone && <span className="hospital-phone">전화 {pharmacy.phone}</span>}
                                                    {pharmacy.glp1Products.length === 0 && (
                                                        <span className="hospital-phone">등록된 GLP-1 취급 정보가 없습니다.</span>
                                                    )}
                                                    {pharmacy.glp1Products.length > 0 && (
                                                        <table className="pharmacy-detail-table">
                                                            <caption className="visually-hidden">GLP-1 제품별 용량, 재고, 샘플 가격</caption>
                                                            <thead>
                                                                <tr><th>제품</th><th>용량</th><th>재고</th><th>샘플 가격</th></tr>
                                                            </thead>
                                                            <tbody>
                                                                {pharmacy.glp1Products.map((item) => (
                                                                    <tr key={`${item.product}-${item.dose}`}>
                                                                        <td>{item.displayName}</td>
                                                                        <td>{item.dose}</td>
                                                                        <td><StockBadge status={item.stockStatus} /></td>
                                                                        <td>{formatPrice(item.price)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                    {pharmacy.advertised && (
                                                        <span className="hospital-phone">광고 게재 약국입니다. 순서는 광고 우선순위를 반영합니다.</span>
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </aside>

                <div className="hospital-map-wrap">
                    <div ref={mapElementRef} className="hospital-map" />
                    {mapError && (
                        <div className="hospital-map-error">
                            <strong>지도를 표시하지 못했습니다.</strong>
                            <p>{mapError}</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
