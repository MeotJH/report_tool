"""PDF에서 글자와 선을 좌표째 뽑는다. 원본과 재현본에 같은 자를 댄다."""
import fitz


def read(path):
    doc = fitz.open(path)
    pages = []
    for page in doc:
        spans = []
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                for span in line['spans']:
                    if span['text'].strip() == '':
                        continue
                    spans.append({
                        'x': round(span['bbox'][0], 2),
                        'y': round(span['bbox'][1], 2),
                        'baseline': round(span['origin'][1], 2),
                        'size': round(span['size'], 1),
                        'font': span['font'],
                        'text': span['text'],
                    })
        # 칠한 칸은 선과 따로 모은다. 흰 바탕은 종이색이므로 세지 않는다.
        #
        # 도구마다 사각형을 다르게 적는다 — 원본은 `re` 하나로, pdf-lib은 선 네
        # 개로 낸다. 어떻게 적었는지가 아니라 **결과로 어디가 칠해졌는지**를 봐야
        # 같은 것을 같다고 셀 수 있다. 그래서 항목이 아니라 그림의 외곽을 쓴다.
        fills = []
        for drawing in page.get_drawings():
            color = drawing.get('fill')
            if color is None or tuple(round(c, 2) for c in color) == (1.0, 1.0, 1.0):
                continue
            r = drawing['rect']
            if r.width < 5 or r.height < 5:
                continue
            fills.append((
                '#%02X%02X%02X' % tuple(round(c * 255) for c in color),
                round(r.x0, 1), round(r.y0, 1), round(r.x1, 1), round(r.y1, 1),
            ))

        verticals, horizontals = [], []
        for drawing in page.get_drawings():
            # 채우기만 한 사각형은 배경이지 표의 선이 아니다.
            if drawing.get('color') is None:
                continue
            for item in drawing['items']:
                if item[0] == 'l':
                    p, q = item[1], item[2]
                    if abs(p.x - q.x) < 0.6:
                        verticals.append((round(p.x, 1), round(min(p.y, q.y), 1),
                                          round(max(p.y, q.y), 1)))
                    elif abs(p.y - q.y) < 0.6:
                        horizontals.append((round(p.y, 1), round(min(p.x, q.x), 1),
                                            round(max(p.x, q.x), 1)))
                elif item[0] == 're':
                    r = item[1]
                    # 테두리만 그린 사각형은 선 네 개와 같은 뜻이다.
                    verticals.append((round(r.x0, 1), round(r.y0, 1), round(r.y1, 1)))
                    verticals.append((round(r.x1, 1), round(r.y0, 1), round(r.y1, 1)))
                    horizontals.append((round(r.y0, 1), round(r.x0, 1), round(r.x1, 1)))
                    horizontals.append((round(r.y1, 1), round(r.x0, 1), round(r.x1, 1)))
        pages.append({
            'fills': sorted(set(fills)),
            'spans': sorted(spans, key=lambda s: (s['y'], s['x'])),
            'verticals': sorted(set(verticals)),
            'horizontals': sorted(set(horizontals)),
        })
    doc.close()
    return pages


if __name__ == '__main__':
    import sys, json
    sys.stdout.reconfigure(encoding='utf-8')
    pages = read(sys.argv[1])
    print('pages', len(pages))
    for i, p in enumerate(pages, 1):
        print(i, 'spans', len(p['spans']), 'v', len(p['verticals']),
              'h', len(p['horizontals']), 'fills', len(p['fills']))
    if len(sys.argv) > 2:
        json.dump(pages, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
