/**
 * 한글 PDF PoC — 최대 리스크 검증
 *
 * 확인 항목
 *  1. 한글 OTF 임베딩이 실제로 되는가
 *  2. 서브셋 on/off 용량 차이
 *  3. mm 좌표계 + 좌상단 원점 → PDF 좌하단 원점 변환이 맞는가
 *  4. 텍스트 폭 측정(widthOfTextAtSize)이 한글에서 동작하는가  ← WYSIWYG 의 근거
 */
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import subsetFont from 'subset-font';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const MM = 2.834645669291339;                 // 1mm in pt
const mm = (v) => v * MM;
const FONT = (w) => `node_modules/pretendard/dist/public/static/alternative/Pretendard-${w}.ttf`;

const PAGE = { w: 210, h: 297 };              // A4 mm
/** 스키마의 좌상단 y(mm) → PDF 좌하단 y(pt) */
const flipY = (yMm, hMm = 0) => mm(PAGE.h - yMm - hMm);

const won = (n) => n.toLocaleString('ko-KR') + '원';

/** 문서에 등장하는 모든 문자. 실제 렌더러는 요소 순회로 자동 수집한다. */
const USED_CHARS = [...new Set(
  '임금명세서 2026년 8월분 성명김정환사원번호ISU-20194부서기술연구소지급일2025-08 주민등록번호900417-1* ' +
  '지급항목기본급직책수당식대연장근로야간소계공제국민연금건강보험고용소득세 ' +
  '실지급액위와같이임하였음을확인합니다수령인서명 ABC0123456789,원-*'
)].join('');

async function build({ subset }) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  // @pdf-lib/fontkit 의 subset:true 는 한글 글리프를 누락시킨다(검증됨).
  // harfbuzz(subset-font)로 미리 서브셋한 뒤 subset:false 로 임베딩한다.
  const prep = async (weight) => {
    const raw = readFileSync(FONT(weight));
    return subset ? await subsetFont(raw, USED_CHARS, { targetFormat: 'truetype' }) : raw;
  };
  const regular = await pdf.embedFont(await prep('Regular'), { subset: false });
  const bold    = await pdf.embedFont(await prep('Bold'),    { subset: false });

  const page = pdf.addPage([mm(PAGE.w), mm(PAGE.h)]);

  const text = (s, { x, y, size = 10, font = regular, align = 'left', w = 0, color = rgb(0,0,0) }) => {
    const tw = font.widthOfTextAtSize(s, size);
    let px = mm(x);
    if (align === 'right')  px = mm(x + w) - tw;
    if (align === 'center') px = mm(x + w / 2) - tw / 2;
    page.drawText(s, { x: px, y: flipY(y, 0) - size, size, font, color });
    return tw;
  };
  const line = (x, y, w, thick = 0.3) =>
    page.drawLine({ start: { x: mm(x), y: flipY(y) }, end: { x: mm(x + w), y: flipY(y) },
                    thickness: mm(thick), color: rgb(0.7, 0.7, 0.7) });

  // ---- 헤더
  text('임 금 명 세 서', { x: 20, y: 20, w: 170, size: 18, font: bold, align: 'center' });
  text('2026년 8월분', { x: 20, y: 30, w: 170, size: 10, align: 'center', color: rgb(0.4,0.4,0.4) });

  // ---- 인적사항 (field 바인딩 시뮬레이션)
  let y = 45;
  for (const [label, value] of [
    ['성명', '김정환'], ['사원번호', 'ISU-20194'],
    ['부서', '기술연구소'], ['지급일', '2026-08-25'],
    ['주민등록번호', '900417-1******'],   // 마스킹 포맷터 결과
  ]) {
    text(label, { x: 20, y, size: 9, color: rgb(0.45,0.45,0.45) });
    text(value, { x: 55, y, size: 10, font: bold });
    y += 7;
  }

  // ---- 반복 테이블 (행 수가 사람마다 다른 부분)
  y += 6;
  const items = [
    ['기본급', 3_800_000], ['직책수당', 300_000], ['식대', 200_000],
    ['연장근로수당', 412_500], ['야간근로수당', 137_500],
  ];
  const deductions = [
    ['국민연금', 171_000], ['건강보험', 134_750], ['고용보험', 40_500], ['소득세', 214_380],
  ];

  const table = (title, rows, startY) => {
    text(title, { x: 20, y: startY, size: 10, font: bold });
    let ty = startY + 7;
    line(20, ty - 2, 170, 0.4);
    for (const [name, amt] of rows) {
      text(name, { x: 22, y: ty, size: 9.5 });
      text(won(amt), { x: 20, y: ty, w: 168, size: 9.5, align: 'right' });
      ty += 6;
      line(20, ty - 2, 170, 0.15);
    }
    const total = rows.reduce((a, [, v]) => a + v, 0);
    text('소계', { x: 22, y: ty, size: 9.5, font: bold });
    text(won(total), { x: 20, y: ty, w: 168, size: 9.5, font: bold, align: 'right' });
    return { y: ty + 10, total };
  };

  const pay = table('지급 항목', items, y);
  const ded = table('공제 항목', deductions, pay.y);

  // ---- 실지급액
  const net = pay.total - ded.total;
  page.drawRectangle({ x: mm(20), y: flipY(ded.y + 12, 0), width: mm(170), height: mm(12),
                       color: rgb(0.95, 0.96, 0.98) });
  text('실 지급액', { x: 24, y: ded.y + 3.5, size: 11, font: bold });
  text(won(net), { x: 20, y: ded.y + 3, w: 166, size: 13, font: bold, align: 'right' });

  // ---- 서명란 (SignatureElement 자리)
  const sy = ded.y + 30;
  text('위와 같이 임금을 지급하였음을 확인합니다.', { x: 20, y: sy, size: 9, color: rgb(0.4,0.4,0.4) });
  page.drawRectangle({ x: mm(130), y: flipY(sy + 30, 0), width: mm(60), height: mm(20),
                       borderColor: rgb(0.8,0.8,0.8), borderWidth: mm(0.3), borderDashArray: [3,3] });
  text('수령인 서명', { x: 130, y: sy + 33, w: 60, size: 8, align: 'center', color: rgb(0.6,0.6,0.6) });

  // ---- 폭 측정 검증 (WYSIWYG 근거)
  const probe = regular.widthOfTextAtSize('한글 폭 측정 ABC 123', 10);

  return { bytes: await pdf.save(), probe };
}

const off = await build({ subset: false });
const on  = await build({ subset: true });

writeFileSync('apps/poc/payslip.pdf', on.bytes);

const kb = (b) => (b.length / 1024).toFixed(1) + ' KB';
console.log('서브셋 OFF :', kb(off.bytes));
console.log('서브셋 ON  :', kb(on.bytes));
console.log('절감        :', (100 - (on.bytes.length / off.bytes.length) * 100).toFixed(1) + '%');
console.log('한글 폭 측정:', on.probe.toFixed(2), 'pt', on.probe > 0 ? '✓' : '✗ 실패');
console.log('sha256      :', createHash('sha256').update(on.bytes).digest('hex').slice(0, 16) + '...');
console.log('출력        : apps/poc/payslip.pdf');
