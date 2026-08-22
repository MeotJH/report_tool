import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import subsetFont from 'subset-font';
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'node_modules/pretendard/dist/public/static/alternative/Pretendard-Regular.ttf';
const L1 = '임금명세서 기본급 3,800,000원 국민연금 실지급액 ABC 0123456789';
const L2 = '가나다라마바사아자차카타파하';

const raw = readFileSync(F);
// 문서에 실제로 쓰인 문자만 harfbuzz 로 서브셋
const used = [...new Set([...L1, ...L2])].join('');
const sub = await subsetFont(raw, used, { targetFormat: 'truetype' });

const pdf = await PDFDocument.create();
pdf.registerFontkit(fontkit);
const f = await pdf.embedFont(sub, { subset: false });   // 이미 서브셋됨
const p = pdf.addPage([600, 200]);
p.drawText(L1, { x: 20, y: 120, size: 14, font: f });
p.drawText(L2, { x: 20, y: 80,  size: 14, font: f });
const out = await pdf.save();
writeFileSync('apps/poc/cmp-hb.pdf', out);

console.log('원본 폰트   :', (raw.length/1024).toFixed(1), 'KB');
console.log('서브셋 폰트 :', (sub.length/1024).toFixed(1), 'KB', `(${used.length}자)`);
console.log('최종 PDF    :', (out.length/1024).toFixed(1), 'KB');
console.log('폭 측정     :', f.widthOfTextAtSize(L1, 14).toFixed(2), 'pt');
