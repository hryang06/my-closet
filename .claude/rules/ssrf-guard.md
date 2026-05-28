# SSRF 방어 규칙

## 규칙

서버사이드에서 사용자 입력 URL을 `fetch`하기 전, 반드시 프로토콜 화이트리스트를 검증한다.

## 적용 위치

Route Handler 또는 서버 함수에서 외부 URL을 fetch하는 모든 경우.

## 구현 패턴

```typescript
let parsed: URL;
try {
  parsed = new URL(url);
} catch {
  return Response.json({ error: "유효하지 않은 URL입니다." }, { status: 400 });
}
if (!["http:", "https:"].includes(parsed.protocol)) {
  return Response.json({ error: "http/https URL만 지원합니다." }, { status: 400 });
}
```

## 왜 필요한가

`new URL(url)` 문법 검사만으로는 아래를 막지 못한다:
- `file:///etc/passwd` (로컬 파일시스템)
- `http://169.254.169.254/` (클라우드 인스턴스 메타데이터)
- `http://10.0.0.1/admin` (내부 네트워크)
- `gopher://` (TCP 패킷 직접 생성)

## 추가 방어 (배포 환경)

프로토콜 화이트리스트는 최소 방어선이다. 클라우드 환경에서는 DNS 해결 후 사설 IP 대역(10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x) 차단도 권장한다.
