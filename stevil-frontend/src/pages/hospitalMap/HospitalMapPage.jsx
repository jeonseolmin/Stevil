import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { loadNaverMap } from "../../api/naverMapLoader";
import "./HospitalMapPage.css";

/*
 * axiosInstance(XHR) 대신 fetch를 직접 쓴다.
 *
 * 로그인 직후처럼 axios 요청이 여러 개 동시에 몰리는 상황에서 backend가
 * 순간적으로 500을 내는 현상이 관찰됐는데(원인 미확정, 별도 이슈), 같은
 * 요청을 fetch로 보내면 재현되지 않는다(OAuthSuccessPage.jsx에서 이미
 * 같은 방식으로 확인/적용함). 이 페이지는 마운트 시 광고 목록 조회 +
 * 병원 검색이 거의 동시에 나가서 그 증상과 정확히 맞아떨어져, 이 두
 * 호출에 한해 fetch로 우회한다. axios 응답과 동일한 { data } 모양,
 * 동일한 error.response.status/data 모양을 유지해 호출부는 그대로 둔다.
 */
async function apiGet(path, params) {
    const token = localStorage.getItem("accessToken");

    const entries = params
        ? Object.entries(params).filter(
            ([, value]) => value !== undefined && value !== null
        )
        : [];

    const query = entries.length
        ? `?${new URLSearchParams(entries).toString()}`
        : "";

    const response = await fetch(`/api${path}${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(
            `${path} failed with ${response.status}`
        );

        error.response = {
            status: response.status,
            data,
        };

        throw error;
    }

    return { data };
}

const DEFAULT_POSITION = {
    latitude: 37.5666103,
    longitude: 126.9783882,
};

function formatDistance(distanceKm) {
    if (distanceKm === null || distanceKm === undefined) {
        return null;
    }

    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)}m`;
    }

    return `${distanceKm.toFixed(1)}km`;
}

function getAddress(hospital) {
    return hospital.roadAddress || hospital.address || "주소 정보 없음";
}

function getCurrentRegion(position) {
    return loadNaverMap().then((maps) => new Promise((resolve) => {
        maps.Service.reverseGeocode(
            {
                coords: new maps.LatLng(
                    position.latitude,
                    position.longitude
                ),
                orders: [
                    maps.Service.OrderType.ADDR,
                    maps.Service.OrderType.ROAD_ADDR,
                ].join(","),
            },
            (status, response) => {
                if (status !== maps.Service.Status.OK) {
                    resolve("");
                    return;
                }

                const region = response.v2?.results?.[0]?.region;
                const area2 = region?.area2?.name || "";
                const area3 = region?.area3?.name || "";

                resolve(`${area2} ${area3}`.trim());
            }
        );
    })).catch(() => "");
}

export default function HospitalMapPage() {
    const navigate = useNavigate();
    const mapElementRef = useRef(null);
    const mapRef = useRef(null);
    const mapsRef = useRef(null);
    const markersRef = useRef([]);
    const currentMarkerRef = useRef(null);
    // 마커 재생성 effect는 selectedIndex를 의존성에 넣지 않는다(넣으면 카드
    // 클릭마다 지도가 fitBounds로 다시 확대/축소됨) — 대신 재생성 시점의
    // 선택 상태를 ref로 읽어, 위치 갱신 등으로 마커가 다시 그려져도 이미
    // 선택돼 있던 마커의 강조 표시가 사라지지 않게 한다.
    const selectedIndexRef = useRef(null);

    const [keyword, setKeyword] = useState("");
    const [hospitals, setHospitals] = useState([]);
    
    // 활성화된 광고 목록 상태 추가
    const [activeAds, setActiveAds] = useState([]);

    const [selectedIndex, setSelectedIndex] = useState(null);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [mapError, setMapError] = useState("");
    const [searchError, setSearchError] = useState("");
    const [locationMessage, setLocationMessage] = useState(
        "현재 위치를 허용하면 가까운 병원 순으로 볼 수 있습니다."
    );

    // 활성화된 광고 목록 불러오기
    useEffect(() => {
        const fetchActiveAds = async () => {
            try {
                const response = await apiGet("/ads/active");
                setActiveAds(response.data);
            } catch (error) {
                console.error("광고 목록을 불러오지 못했습니다.", error);
            }
        };
        fetchActiveAds();
    }, []);

    // 광고 효과(최상단 고정, 강조)가 반영된 최종 병원 리스트 계산
    const processedHospitals = useMemo(() => {
        if (!hospitals || hospitals.length === 0) return [];

        // 1. SEARCH_TOP(지역 검색 최상단 고정) 광고가 걸린 병원 이름 추출
        const topAdNames = activeAds
            .filter(ad => ad.adType === "SEARCH_TOP")
            .map(ad => ad.doctorName?.trim());

        // 2. HIGHLIGHT(시각적 강조) 광고가 걸린 병원 이름 추출
        const highlightAdNames = activeAds
            .filter(ad => ad.adType === "HIGHLIGHT")
            .map(ad => ad.doctorName?.trim());

        // 3. 데이터에 광고 정보 매핑 및 정렬 (SEARCH_TOP인 병원을 맨 위로 이동)
        // isPartner는 백엔드(/hospitals/search)가 판정해 내려주는 값을 그대로 신뢰한다.
        // 프론트에서 병원명으로 제휴 여부를 다시 계산하지 않는다.
        const mapped = hospitals.map(hospital => {
            const hName = hospital.name?.trim();
            const isTop = topAdNames.some(name => hName.includes(name));
            const isHighlight = highlightAdNames.some(name => hName.includes(name));

            return {
                ...hospital,
                isSearchTop: isTop,
                isHighlight: isHighlight,
                isPartner: Boolean(hospital.isPartner)
            };
        });

        // SEARCH_TOP인 병원들을 배열 맨 앞으로 정렬
        return mapped.sort((a, b) => {
            if (a.isSearchTop && !b.isSearchTop) return -1;
            if (!a.isSearchTop && b.isSearchTop) return 1;
            return 0;
        });
    }, [hospitals, activeAds]);

    const searchHospitals = useCallback(async (query, position) => {
        try {
            setIsSearching(true);
            setSearchError("");
            setSelectedIndex(null);

            const response = await apiGet("/hospitals/search", {
                query: query?.trim() || "병원",
                latitude: position?.latitude,
                longitude: position?.longitude,
            });

            setHospitals(response.data);
        } catch (error) {
            const status = error.response?.status;

            if (status === 401 || status === 403) {
                localStorage.removeItem("accessToken");
                navigate("/login", { replace: true });
                return;
            }

            setHospitals([]);
            setSearchError(
                error.response?.data?.detail
                || error.response?.data?.message
                || "병원 검색 결과를 불러오지 못했습니다."
            );
        } finally {
            setIsSearching(false);
        }
    }, [navigate]);

    useEffect(() => {
        let isActive = true;

        loadNaverMap()
            .then((maps) => {
                if (!isActive || !mapElementRef.current) {
                    return;
                }

                mapsRef.current = maps;
                mapRef.current = new maps.Map(mapElementRef.current, {
                    center: new maps.LatLng(
                        DEFAULT_POSITION.latitude,
                        DEFAULT_POSITION.longitude
                    ),
                    zoom: 14,
                    zoomControl: true,
                    zoomControlOptions: {
                        position: maps.Position.TOP_RIGHT,
                    },
                });
                setIsMapReady(true);
            })
            .catch((error) => {
                if (isActive) {
                    setMapError(error.message);
                }
            });

        return () => {
            isActive = false;
        };
    }, []);

    const requestCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationMessage("이 브라우저에서는 현재 위치를 사용할 수 없습니다.");
            searchHospitals("서울 병원", null);
            return;
        }

        setLocationMessage("현재 위치를 확인하고 있습니다.");

        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                const position = {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                };

                const region = await getCurrentRegion(position);

                setCurrentPosition(position);
                setLocationMessage(
                    region
                        ? `${region}의 병원을 현재 위치에서 가까운 순서로 표시합니다.`
                        : "현재 위치를 기준으로 가까운 순서입니다."
                );
                searchHospitals(
                    region ? `${region} 병원` : "병원",
                    position
                );
            },
            () => {
                setLocationMessage("위치 권한이 없어 서울 지역 병원을 표시합니다.");
                searchHospitals("서울 병원", null);
            },
            {
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 300000,
            }
        );
    }, [searchHospitals]);

    useEffect(() => {
        requestCurrentLocation();
    }, [requestCurrentLocation]);

    useEffect(() => {
        if (!isMapReady || !currentPosition || !mapRef.current) {
            return;
        }

        const maps = mapsRef.current;
        const position = new maps.LatLng(
            currentPosition.latitude,
            currentPosition.longitude
        );

        currentMarkerRef.current?.setMap(null);
        currentMarkerRef.current = new maps.Marker({
            map: mapRef.current,
            position,
            title: "현재 위치",
            icon: {
                content: '<span class="hospital-current-marker" aria-label="현재 위치"></span>',
                anchor: new maps.Point(10, 10),
            },
        });
        mapRef.current.setCenter(position);
    }, [currentPosition, isMapReady]);

    useEffect(() => {
        if (!isMapReady || !mapRef.current) {
            return;
        }

        const maps = mapsRef.current;
        const map = mapRef.current;

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        // Naver Maps can report the SDK as loaded (loadNaverMap() resolves,
        // isMapReady becomes true) while its auth callback still failed —
        // internal constructors like LatLngBounds then throw synchronously
        // inside this effect. There is no error boundary in this app, so an
        // uncaught throw here unmounts the entire React tree, not just the
        // map. Guard it so a broken/unauthenticated SDK degrades to "no
        // markers" instead of a blank screen.
        try {
            const bounds = new maps.LatLngBounds();
            let hasPosition = false;

            processedHospitals.forEach((hospital, index) => {
                if (hospital.latitude === null || hospital.longitude === null) {
                    return;
                }

                const position = new maps.LatLng(
                    hospital.latitude,
                    hospital.longitude
                );
                const isAd = hospital.isSearchTop || hospital.isHighlight;
                // "is-selected"는 여기서 넣지 않는다 — 선택은 이 마커 재생성
                // effect와 별개로(아래 selectedIndex effect에서 marker.setIcon만
                // 호출해) 갱신해서, 카드를 클릭할 때마다 지도가 다시 fitBounds
                // 되며 확대/축소가 튀는 일이 없게 한다.
                const baseClassName = [
                    "hospital-map-marker",
                    isAd ? "is-ad" : "",
                    hospital.isPartner ? "is-partner" : "",
                ].filter(Boolean).join(" ");

                const initialClassName = index === selectedIndexRef.current
                    ? `${baseClassName} is-selected`
                    : baseClassName;

                const marker = new maps.Marker({
                    map,
                    position,
                    title: hospital.name,
                    icon: {
                        content: `<span class="${initialClassName}"><b>${index + 1}</b></span>`,
                        anchor: new maps.Point(18, 42),
                    },
                });

                marker.stevilBaseClassName = baseClassName;
                marker.stevilLabel = index + 1;

                maps.Event.addListener(marker, "click", () => {
                    setSelectedIndex(index);
                });

                markersRef.current.push(marker);
                bounds.extend(position);
                hasPosition = true;
            });

            if (currentPosition) {
                bounds.extend(new maps.LatLng(
                    currentPosition.latitude,
                    currentPosition.longitude
                ));
            }

            if (hasPosition) {
                map.fitBounds(bounds, { top: 70, right: 60, bottom: 70, left: 60 });
            }
        } catch (error) {
            console.error("지도 마커 표시 실패", error);
        }
    }, [currentPosition, processedHospitals, isMapReady]);

    // 선택된 마커만 강조 표시로 다시 그린다(마커를 전부 재생성하는 effect와
    // 분리 — 그러면 카드를 클릭할 때마다 지도가 fitBounds로 다시 확대/축소되는
    // 일 없이, 이미 만들어진 marker의 아이콘만 setIcon으로 교체한다).
    useEffect(() => {
        selectedIndexRef.current = selectedIndex;
        const maps = mapsRef.current;

        if (!maps) {
            return;
        }

        markersRef.current.forEach((marker, index) => {
            const className = index === selectedIndex
                ? `${marker.stevilBaseClassName} is-selected`
                : marker.stevilBaseClassName;

            marker.setIcon({
                content: `<span class="${className}"><b>${marker.stevilLabel}</b></span>`,
                anchor: new maps.Point(18, 42),
            });
        });
    }, [selectedIndex]);

    useEffect(() => {
        if (selectedIndex === null || !mapRef.current) {
            return;
        }

        const hospital = processedHospitals[selectedIndex];

        if (hospital?.latitude !== null && hospital?.longitude !== null) {
            mapRef.current.panTo(new mapsRef.current.LatLng(
                hospital.latitude,
                hospital.longitude
            ));
        }
    }, [processedHospitals, selectedIndex]);

    const handleSubmit = (event) => {
        event.preventDefault();
        searchHospitals(keyword, currentPosition);
    };

    return (
        <div className="hospital-page">
            <section className="hospital-heading">
                <div>
                    <span className="hospital-eyebrow">HOSPITAL FINDER</span>
                    <h1>내 주변 병원 찾기</h1>
                    <p>지역이나 병원명, 진료과를 검색해 위치를 확인하세요.</p>
                </div>

                <button
                    type="button"
                    className="hospital-location-button"
                    onClick={requestCurrentLocation}
                >
                    현재 위치 다시 찾기
                </button>
            </section>

            <form className="hospital-search" onSubmit={handleSubmit}>
                <label htmlFor="hospital-keyword" className="visually-hidden">
                    병원 검색어
                </label>
                <input
                    id="hospital-keyword"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="예: 강남구 내과, 분당 비만클리닉"
                    maxLength={100}
                />
                <button type="submit" disabled={isSearching}>
                    {isSearching ? "검색 중" : "검색"}
                </button>
            </form>

            <p className="hospital-location-message">{locationMessage}</p>

            <section className="hospital-content">
                <aside className="hospital-results" aria-live="polite">
                    <div className="hospital-results-heading">
                        <h2>검색 결과</h2>
                        <span>{processedHospitals.length}곳</span>
                    </div>

                    {searchError && (
                        <div className="hospital-empty hospital-empty--error">
                            <strong>검색하지 못했습니다.</strong>
                            <p>{searchError}</p>
                        </div>
                    )}

                    {!searchError && !isSearching && processedHospitals.length === 0 && (
                        <div className="hospital-empty">
                            <strong>검색 결과가 없습니다.</strong>
                            <p>지역명을 포함해 다시 검색해 보세요.</p>
                        </div>
                    )}

                    <ol className="hospital-list">
                        {processedHospitals.map((hospital, index) => (
                            <li key={`${hospital.name}-${hospital.address}-${index}`}>
                                <div
                                    className={`hospital-card
                                        ${selectedIndex === index ? "hospital-card--selected" : ""}
                                        ${hospital.isSearchTop ? "hospital-card--search-top" : ""}
                                        ${hospital.isHighlight ? "hospital-card--highlight" : ""}
                                        ${hospital.isPartner ? "hospital-card--partner" : ""}
                                    `}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setSelectedIndex(index)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            setSelectedIndex(index);
                                        }
                                    }}
                                >
                                    <span className="hospital-card-number">{index + 1}</span>
                                    <span className="hospital-card-body">
                                        <span className="hospital-card-title-row">
                                            <div>
                                                {/* 제휴/광고 뱃지 노출 영역 — 의료 품질을 암시하지 않는 중립적 표기만 사용 */}
                                                {hospital.isPartner && <span className="partner-badge">제휴</span>}
                                                {hospital.isSearchTop && <span className="ad-badge-top">광고</span>}
                                                {hospital.isHighlight && <span className="ad-badge-highlight">광고</span>}
                                                <strong>{hospital.name}</strong>
                                            </div>
                                            {formatDistance(hospital.distanceKm) && (
                                                <em>{formatDistance(hospital.distanceKm)}</em>
                                            )}
                                        </span>
                                        <span className="hospital-category">{hospital.category}</span>
                                        <span className="hospital-address">{getAddress(hospital)}</span>
                                        {hospital.telephone && (
                                            <span className="hospital-phone">{hospital.telephone}</span>
                                        )}
                                        {hospital.naverPlaceUrl && (
                                            <a
                                                href={hospital.naverPlaceUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                네이버에서 상세보기
                                            </a>
                                        )}
                                    </span>
                                </div>
                            </li>
                        ))}
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