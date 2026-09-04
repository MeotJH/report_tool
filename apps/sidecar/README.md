# report-tool 사이드카

호스트 앱이 **Node가 아닐 때**(Spring · Flask · ASP.NET) 그 옆에서 도는 프로세스다.

발행본 PDF를 만들려면 harfbuzz로 서브셋한 글꼴을 pdf-lib로 임베딩해야 하고, 그것은
Node에서만 된다. 그래서 호스트 앱은 그대로 두고 이 프로세스 하나를 옆에 세운다.

호스트가 구현할 REST는 [docs/HOST_API.md](../../docs/HOST_API.md)에 있다.

## 띄우기

```bash
docker build -f apps/sidecar/Dockerfile -t report-tool-sidecar .
docker run -p 8787:8787 \
  -e HOST_API_URL=https://hr.example.com/report-api \
  -e HOST_API_KEY=... \
  -e LINK_TOKEN_SECRET=... \
  -v /srv/fonts:/app/fonts \
  report-tool-sidecar
```

도커 없이:

```bash
npm run build
HOST_API_URL=... LINK_TOKEN_SECRET=... node apps/sidecar/dist/main.js
```

## 환경 변수

| 이름 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `HOST_API_URL` | ✅ | — | 호스트가 콜백을 열어 둔 자리. `http(s)://`로 시작해야 한다 |
| `LINK_TOKEN_SECRET` | ✅ | — | 배포 링크 서명 열쇠 |
| `HOST_API_KEY` | | 없음 | 호스트가 사이드카를 알아보는 열쇠. `Authorization: Bearer …`로 나간다 |
| `FONT_DIR` | | `./fonts` | 임베딩할 TTF 폴더 |
| `PORT` | | `8787` | 들을 포트 |
| `BASE_PATH` | | `/report` | 호스트가 이 사이드카를 붙여 둔 자리 |

**빠진 값이 있으면 뜨지 않고 죽는다.** 잘못된 설정으로 떠 있는 것보다 배포가 실패하는
편이 낫다 — 떠 있으면 아무도 보지 않지만, 배포가 실패하면 사람이 본다.

## 운영에서 정해 둘 것

- **여러 대로 늘릴 때 `LINK_TOKEN_SECRET`이 모두 같아야 한다.** 다르면 A가 만든
  링크를 B가 열지 못하고, 증상은 수신자에게 "링크가 만료됐다"로 보인다
- **글꼴은 TTF여야 한다.** OTF(CFF 아웃라인)는 임베딩 중 예외가 난다
- 파일 이름 규칙은 `<가족>-Regular.ttf` · `<가족>-Bold.ttf`다. 양식이 선언한 글꼴
  이름과 맞아야 한다
- **인증 헤더 값에는 ASCII만 쓸 수 있다.** 한글 열쇠를 넣으면 시작 시점에 막힌다
- 이 프로세스는 아무것도 오래 들고 있지 않는다. 재시작해도 잃을 것이 없다

## 살아 있는지 확인

```
GET /health  → 200 ok
```

붙인 자리(`BASE_PATH`) 바깥에 있다. 호스트가 자리를 옮겨도 검사 주소는 그대로다.
