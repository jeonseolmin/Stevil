/*
 * Naver Maps SDK 호출 가드.
 *
 * 지도 인증이 실패하면 SDK가 자기 객체를 정리해서(window.naver 소멸 등) 이미 만들어 둔 marker/map의
 * setMap / setIcon / panTo 같은 호출이 예외를 던진다. 이 호출들은 React effect 안에서 실행되므로
 * 예외가 그대로 올라가면 error boundary가 없는 이 앱은 트리 전체를 unmount(빈 화면)한다.
 * 그래서 SDK를 직접 건드리는 호출은 모두 여기를 거쳐 개별 try/catch로 감싼다.
 *
 * 인증 실패 자체를 숨기지는 않는다 — 경고는 한 번만 남기고, onFail로 화면에 지도 오류를 알린다.
 */

let warned = false;

export const MAP_FAILURE_MESSAGE =
    "지도 기능을 사용할 수 없습니다. 목록과 필터는 계속 이용할 수 있습니다.";

export function createMapGuard(onFail) {
    // fn을 실행하고, 예외가 나면 fallback을 돌려준다(호출한 쪽 로직은 계속 진행).
    const call = (fn, fallback) => {
        try {
            return fn();
        } catch (error) {
            if (!warned) {
                warned = true;
                console.warn("Naver Maps SDK 호출 실패 — 지도 기능만 건너뜁니다.", error);
            }

            onFail?.();

            return fallback;
        }
    };

    const setMap = (marker, map) => {
        if (marker) {
            call(() => marker.setMap(map));
        }
    };

    // makeIcon은 함수로 받는다 — icon 안의 new maps.Point 같은 SDK 호출도 가드 안에서 실행되도록.
    const setIcon = (marker, makeIcon) => {
        if (marker) {
            call(() => marker.setIcon(makeIcon()));
        }
    };

    // marker마다 독립적으로 리스너 해제 + setMap(null) — 하나가 실패해도 나머지 정리는 계속한다.
    const clearMarkers = (markers, maps) => {
        markers.forEach((marker) => {
            if (marker.stevilListener) {
                call(() => maps.Event.removeListener(marker.stevilListener));
            }

            setMap(marker, null);
        });
    };

    return { call, setMap, setIcon, clearMarkers };
}
