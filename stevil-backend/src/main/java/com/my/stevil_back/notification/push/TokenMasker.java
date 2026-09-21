package com.my.stevil_back.notification.push;

/*
 * FCM 토큰은 기기에 푸시를 보낼 수 있는 자격이므로 로그에 전체를 남기지 않는다.
 * 뒤 6자리만 보여 주어 로그에서 같은 토큰인지 구분할 수 있게 한다.
 */
public final class TokenMasker {

    private static final int VISIBLE_TAIL = 6;

    private TokenMasker() {
    }

    public static String mask(String token) {
        if (token == null) {
            return "null";
        }
        if (token.length() <= VISIBLE_TAIL * 2) {
            return "***";
        }

        return "..." + token.substring(token.length() - VISIBLE_TAIL);
    }
}
