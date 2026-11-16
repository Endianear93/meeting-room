# 회의실 — PPT 서버 생성 수정판

기존 공유 회의실의 공동 편집 및 자동 저장 기능을 유지하면서, PPT 제작만 브라우저 내 생성 방식에서 **서버 생성 방식**으로 교체했습니다. OpenAI API나 토큰을 쓰지 않습니다.

## 기존 Render 사이트 수정
1. 이 ZIP을 풀고 안에 있는 **모든 파일**을 기존 GitHub 저장소 최상위에 업로드해 기존 파일을 교체하세요. `data` 폴더는 비워둔 상태로 두세요.
2. GitHub에서 Commit changes.
3. Render에서 자동 배포가 완료되었는지 확인. Build command는 `npm install`, Start command는 `npm start`.
4. 사이트 새로고침(`Ctrl+Shift+R`) 후 `PPT 만들기` → 페이지 선택 → `PPTX 다운로드`.

API `/api/pptx`는 `pptxgenjs` 서버 패키지로 파일을 생성합니다. 단순 HTML/JS 교체가 아니라 **server.js, package.json도 함께 교체해야** 합니다.

공유 데이터 보존은 Render 영구 디스크 설정에 달려 있습니다. 무료 Render 인스턴스의 임시 저장 데이터는 재배포로 유실될 수 있으니 사전 백업이 중요합니다.
