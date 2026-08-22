import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'node_modules/pretendard/dist/public/static/alternative/Pretendard-Regular.ttf';
const S = '임금명세서 기본급 3,800,000원 국민연금 실지급액 ABC 0123456789';
for (const subset of [true, false]) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const f = await pdf.embedFont(readFileSync(F), { subset });
  const p = pdf.addPage([600, 200]);
  p.drawText(S, { x: 20, y: 120, size: 14, font: f });
  p.drawText('가나다라마바사아자차카타파하', { x: 20, y: 80, size: 14, font: f });
  writeFileSync(`apps/poc/cmp-${subset ? 'on' : 'off'}.pdf`, await pdf.save());
}
console.log('done');
