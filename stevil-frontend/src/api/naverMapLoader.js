let naverMapPromise;

export function loadNaverMap() {
    if (window.naver?.maps) {
        return Promise.resolve(window.naver.maps);
    }

    if (naverMapPromise) {
        return naverMapPromise;
    }

    const clientId =
        import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

    if (!clientId) {
        return Promise.reject(
            new Error(
                "VITE_NAVER_MAP_CLIENT_ID가 설정되지 않았습니다."
            )
        );
    }

    naverMapPromise = new Promise(
        (resolve, reject) => {
            const script =
                document.createElement("script");

            window.navermap_authFailure = () => {
                reject(
                    new Error(
                        "네이버 지도 인증에 실패했습니다."
                    )
                );
            };

            script.src =
                "https://oapi.map.naver.com/openapi/v3/maps.js"
                + `?ncpKeyId=${encodeURIComponent(clientId)}`
                + "&submodules=geocoder";

            script.async = true;

            script.onload = () => {
                if (window.naver?.maps) {
                    resolve(window.naver.maps);
                    return;
                }

                reject(
                    new Error(
                        "네이버 지도 SDK를 불러오지 못했습니다."
                    )
                );
            };

            script.onerror = () => {
                reject(
                    new Error(
                        "네이버 지도 SDK 요청에 실패했습니다."
                    )
                );
            };

            document.head.appendChild(script);
        }
    ).catch((error) => {
        naverMapPromise = undefined;
        throw error;
    });

    return naverMapPromise;
}