import { createDemoTemplate } from "@report-tool/admin";
import { HostStore } from "../../../../lib/hostStore";

/**
 * 데모용 급여명세서 양식을 호스트 저장소에 넣는다.
 *
 * **호스트 계약(`/api/report-api`)의 일부가 아니다.** 실제 호스트에는 이런 자리가
 * 없다 — 양식은 담당자가 편집기로 만든다. 데모를 열자마자 볼 것이 있게 하려고
 * 따로 둔 자리이고, 그래서 경로도 나눠 두었다.
 *
 * 서버에서 만드는 이유는 `createDemoTemplate`이 Node 어댑터와 같은 패키지에 있어
 * 브라우저 번들에 넣을 수 없기 때문이다.
 */
export async function POST(): Promise<Response> {
  const store = HostStore.shared();
  const template = createDemoTemplate();
  store.saveTemplate(template.toJSON());
  return new Response(
    JSON.stringify({ id: template.id, name: template.name, elements: template.getElements().length }),
    { headers: { "Content-Type": "application/json" } },
  );
}
