"""재현본을 원본과 나란히 대고 어디가 어긋났는지 항목별로 센다.

    python tools/report-fidelity/compare.py "<원본.pdf>" [재현본.pdf]

원본(고객사 자료)은 저장소에 두지 않는다. 담당자가 가진 파일 경로를 넘긴다.
재현본은 `npx vitest run packages/renderer`가 만든다.

필요: PyMuPDF (pip install pymupdf)
"""
import re, sys, os
from pdfread import read

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')
ORIGINAL = sys.argv[1] if len(sys.argv) > 1 else '인팩 리포트.pdf'
MADE = sys.argv[2] if len(sys.argv) > 2 else 'apps/poc/generated-service-report.pdf'

SECTIONS = ['업무별 통계(당월)', '처리구분별 통계(당월)', '처리내역 (상세)',
            '미처리내역 (상세)', '기타사항']


def norm(text):
    return re.sub(r'\s+', '', text)


def page_text(page):
    """줄(기준선)로 묶고 줄 안에서는 x 순으로 읽는다.

    글자가 놓인 자리로 순서를 정한다. 추출 도구가 정하는 순서를 그대로 쓰면
    같은 줄에 있는 두 칸의 앞뒤가 글꼴 차이로 뒤바뀌어, 자리가 같은데도 다르다고
    나온다.
    """
    ordered = sorted(page['spans'], key=lambda s: (round(s['baseline'] / 3), s['x']))
    return norm(''.join(s['text'] for s in ordered))


def section_pages(pages):
    found = {}
    for index, page in enumerate(pages, 1):
        joined = norm(''.join(s['text'] for s in page['spans']))
        for title in SECTIONS:
            if norm(title) in joined:
                found.setdefault(title, []).append(index)
    return found


def ticket_pages(pages):
    """NO 열(가장 왼쪽)에 찍힌 건 번호가 몇 쪽에 나오는지 모은다."""
    found = {}
    for index, page in enumerate(pages, 1):
        for s in page['spans']:
            value = s['text'].strip()
            if s['x'] < 49 and value.isdigit() and len(value) <= 2 and s['size'] < 9:
                found.setdefault(value, []).append(index)
    return found


def row_bands(page):
    """행 띠마다 그 띠를 가로지르는 세로선 x를 모은다.

    쪽 전체의 세로선 x만 모으면 병합을 못 본다. `합계` 행에만 있는 칸막이는
    다른 행에도 같은 x가 있어 집합으로는 구분되지 않기 때문이다. 띠마다 따로
    세야 "이 줄이 몇 칸인가"가 드러난다.
    """
    rules = sorted({h[0] for h in page['horizontals']})
    bands = []
    for top, bottom in zip(rules, rules[1:]):
        if bottom - top < 3:
            continue
        xs = sorted({round(v[0]) for v in page['verticals']
                     if v[1] <= top + 1 and v[2] >= bottom - 1})
        if len(xs) > 2:
            bands.append(xs)
    return bands


def column_xs(page):
    """표의 세로 구분선 x 좌표만 모은다. 짧은 조각은 무시한다."""
    return sorted({round(v[0]) for v in page['verticals'] if v[2] - v[1] > 3})


class Report:
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failures = []

    def record(self, name, ok, detail=''):
        self.total += 1
        if ok:
            self.passed += 1
        else:
            self.failures.append(name)
        print(f'[{"OK  " if ok else "DIFF"}] {name}{"  — " + detail if detail else ""}')


def main():
    a, b = read(ORIGINAL), read(MADE)
    r = Report()
    r.record('쪽 수', len(a) == len(b), f'원본 {len(a)}쪽 / 재현본 {len(b)}쪽')

    sa, sb = section_pages(a), section_pages(b)
    for title in SECTIONS:
        r.record(f'구역 "{title}"', sa.get(title) == sb.get(title),
                 f'원본 {sa.get(title)} / 재현본 {sb.get(title)}')

    ta, tb = ticket_pages(a), ticket_pages(b)
    r.record('처리내역 건 수', len(ta) == len(tb) == 23,
             f'원본 {len(ta)}건 / 재현본 {len(tb)}건')
    mismatched = [k for k in sorted(ta, key=int) if ta.get(k) != tb.get(k)]
    r.record('건별 시작 쪽', not mismatched,
             f'{len(ta) - len(mismatched)}/{len(ta)}건 일치'
             + ('' if not mismatched else '  어긋남: ' + ', '.join(
                 f'{k}({ta[k]}→{tb.get(k)})' for k in mismatched)[:400]))

    for index in range(min(len(a), len(b))):
        ra = sorted({h[0] for h in a[index]['horizontals'] if h[1] < 32})
        rb = sorted({h[0] for h in b[index]['horizontals'] if h[1] < 32})
        near = len(ra) == len(rb) and all(abs(p - q) <= 1 for p, q in zip(ra, rb))
        worst = max((abs(p - q) for p, q in zip(ra, rb)), default=0)
        r.record(f'{index + 1}쪽 표 가로선', near,
                 f'{len(ra)}개, 최대 어긋남 {worst:.1f}pt' if len(ra) == len(rb)
                 else f'원본 {len(ra)}개 / 재현본 {len(rb)}개')

    for index in range(min(len(a), len(b))):
        wa, wb = row_bands(a[index]), row_bands(b[index])
        same = len(wa) == len(wb) and all(
            len(p) == len(q) and all(abs(x - y) <= 1 for x, y in zip(p, q))
            for p, q in zip(wa, wb))
        r.record(f'{index + 1}쪽 행별 칸 나눔', same,
                 f'{len(wa)}개 띠'
                 + ('' if same else f' — 원본 {[len(p) - 1 for p in wa]}'
                                    f' / 재현본 {[len(q) - 1 for q in wb]}'))

    for index in range(min(len(a), len(b))):
        ca, cb = column_xs(a[index]), column_xs(b[index])
        near = len(ca) == len(cb) and all(abs(p - q) <= 1 for p, q in zip(ca, cb))
        r.record(f'{index + 1}쪽 표 세로선', near,
                 f'원본 {len(ca)}개 / 재현본 {len(cb)}개'
                 + ('' if near else f'\n        원본  {ca}\n        재현본 {cb}'))

    doc_a = ''.join(page_text(p) for p in a)
    doc_b = ''.join(page_text(p) for p in b)
    r.record('문서 전체 글자 구성', sorted(doc_a) == sorted(doc_b),
             f'{len(doc_a)}자 / {len(doc_b)}자 — 사라지거나 늘어난 글자 없음'
             if sorted(doc_a) == sorted(doc_b) else
             f'원본 {len(doc_a)}자 / 재현본 {len(doc_b)}자')

    # 글자가 놓인 순서는 추출 도구가 정하므로, 그 쪽에 **무엇이** 있는지로 본다.
    # 두 칸이 같은 줄에 있으면 글꼴 차이만으로 앞뒤가 뒤바뀌어 나온다.
    for index in range(min(len(a), len(b))):
        pa, pb = page_text(a[index]), page_text(b[index])
        same = sorted(pa) == sorted(pb)
        r.record(f'{index + 1}쪽 글자 구성', same,
                 f'{len(pa)}자' if same else f'원본 {len(pa)}자 / 재현본 {len(pb)}자')

    print(f'\n=== {r.passed}/{r.total} 일치 ===')
    if r.failures:
        print('어긋난 항목:', ', '.join(r.failures))
    return r


def common(x, y):
    n = 0
    for p, q in zip(x, y):
        if p != q:
            break
        n += 1
    return n


if __name__ == '__main__':
    main()
