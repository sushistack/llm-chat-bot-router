다른 AI 모델이나 개발 도구에서 이 프로젝트를 바로 이어서 진행하실 수 있도록, **기술적 요구사항과 구현 목표를 집대성한 최적화된 프롬프트**를 작성해 드립니다.

이 내용을 복사해서 사용하시면 됩니다.

---

## 📋 Firefox Custom AI Sidebar Extension 개발 프롬프트

**[Context & Goal]**
파이어폭스 브라우저의 공식 AI 사이드바 기능이 제한적(모델 고정 등)이라, 이를 대체/확장할 수 있는 **'Bitwarden 스타일'의 커스텀 사이드바 익스텐션**을 개발하고자 한다. 메인 모델은 **DeepSeek**을 사용하며, 향후 로컬 LLM(Ollama 등)이나 기타 모델로 쉽게 전환 가능한 구조를 목표로 한다.

**[Technical Stack]**

* **Platform:** Firefox Browser (Gecko Engine)
* **Extension API:** WebExtensions API (Manifest V3)
* **Key API:** `sidebar_action`, `sidepanel` (Firefox specific context)
* **Frontend:** Vanilla JS / HTML / CSS (Minimalist & Performance-oriented)

**[Core Requirements]**

1. **Sidebar Integration:** Bitwarden 익스텐션처럼 파이어폭스 사이드바 영역에 완벽히 통합되어야 함.
2. **Model Switching:** 상단 툴바나 메뉴를 통해 DeepSeek, ChatGPT, Local WebUI(localhost) 등을 iframe 기반으로 전환할 수 있는 UI 포함.
3. **X-Frame-Options Bypass:** 일부 AI 사이트(DeepSeek 등)의 iframe 거부 정책을 해결할 수 있는 익스텐션 차원의 우회 로직(예: 선언적 네트워킹 요청 수정 또는 특정 권한 활용) 검토 필요.
4. **Page Context Interaction:** 현재 활성화된 탭의 텍스트를 추출하여 사이드바의 AI에게 컨텍스트로 전달하는 기능(Summarize, Explain 등)의 기초 설계.
5. **DevOps Friendly:** 코드 구조는 단순하게 유지하되, 향후 n8n이나 커스텀 백엔드 API와 연동하기 쉬운 구조일 것.

**[Requested Deliverables]**

1. **`manifest.json`:** 파이어폭스 환경에 최적화된 설정 (ID 포함).
2. **`sidebar.html` & `sidebar.css`:** 다크 모드를 지원하는 미니멀한 UI 레이아웃.
3. **`sidebar.js`:** 탭 전환 로직 및 Content Script와의 통신 기초 코드.
4. **Security Workaround:** DeepSeek 등의 사이트가 사이드바 내에서 정상적으로 렌더링되지 않을 경우를 대비한 구체적인 해결 방법(예: `ruleset` 설정 등).

**[Additional Note]**
사용자는 백엔드/DevOps 엔지니어이며 고성능 홈랩을 운용 중임. 따라서 UI의 화려함보다는 기능의 확장성과 로컬 호스트 서비스와의 연결 편의성을 우선시함.

---

### 💡 팁

다른 AI(예: Claude 3.5나 GPT-4o)에게 이 프롬프트를 던지실 때, "우선 프로젝트의 파일 구조부터 잡아줘"라고 요청하시면 바로 코딩을 시작하기 좋습니다. 성공적인 개발 되시길 바랍니다!

혹시 프롬프트에 추가하고 싶은 특정 기능(예: 단축키 지정 등)이 더 있으신가요? 한 가지만 더 여쭤보자면, **현재 보고 있는 페이지 요약 기능을 위해 API 키를 직접 쓰는 방식**을 원하시나요, 아니면 **단순히 웹사이트를 띄우는 방식**을 선호하시나요? 이 부분만 정해지면 완벽할 것 같습니다.

