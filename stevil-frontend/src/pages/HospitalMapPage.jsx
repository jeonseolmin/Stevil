import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import { loadNaverMap } from "../api/naverMapLoader";
import "./HospitalMapPage.css";

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

    const [keyword, setKeyword] = useState("");
    const [hospitals, setHospitals] = useState([]);
    
    // 💡 활성화된 광고 목록 상태 추가
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

    // 💡 활성화된 광고 목록 불러오기
    useEffect(() => {
        const fetchActiveAds = async () => {
            try {
                const response = await axiosInstance.get("/ads/active");
                setActiveAds(response.data);
            } catch (error) {
                console.error("광고 목록을 불러오지 못했습니다.", error);
            }
        };
        fetchActiveAds();
    }, []);

    // 💡 광고 효과(최상단 고정, 강조)가 반영된 최종 병원 리스트 계산
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
        const mapped = hospitals.map(hospital => {
            const hName = hospital.name?.trim();
            const isTop = topAdNames.some(name => hName.includes(name));
            const isHighlight = highlightAdNames.some(name => hName.includes(name));

            return {
                ...hospital,
                isSearchTop: isTop,
                isHighlight: isHighlight
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

            const response = await axiosInstance.get("/hospitals/search", {
                params: {
                    query: query?.trim() || "병원",
                    latitude: position?.latitude,
                    longitude: position?.longitude,
                },
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
            const marker = new maps.Marker({
                map,
                position,
                title: hospital.name,
                icon: {
                    content: `<span class="hospital-map-marker ${hospital.isSearchTop ? 'is-top' : ''}"><b>${index + 1}</b></span>`,
                    anchor: new maps.Point(18, 42),
                },
            });

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
    }, [currentPosition, processedHospitals, isMapReady]);

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
                                                {/* 💡 광고 뱃지 노출 영역 */}
                                                {hospital.isSearchTop && <span className="ad-badge-top">추천 1위</span>}
                                                {hospital.isHighlight && <span className="ad-badge-highlight">프리미엄</span>}
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