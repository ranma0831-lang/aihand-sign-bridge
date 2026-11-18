// 각도표 xlsx → src/lib/angleTable.data.js
// 사용: npm run angles -- "각도표_양식.xlsx"
// 이기태 님이 채운 각도표(이정민 님 양식)를 받으면 이 명령 한 번 → 커밋·배포로 대시보드에 반영된다.
// 외부 라이브러리 없이 xlsx(zip + XML)를 직접 읽는다. 읽는 탭: "각도표", "손 배치"
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rowsToHands, rowsToTable } from '../src/lib/angleTable.js';

// zip 안의 파일들 { 이름: Buffer }
export function unzip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('xlsx(zip) 파일이 아닙니다');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    files[name] = method === 8 ? inflateRawSync(raw) : raw;
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const unescapeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const colIndex = (ref) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

// 탭 이름 → 행 배열
export function readSheets(buf) {
  const f = unzip(buf);
  const text = (n) => (f[n] ? f[n].toString('utf8') : '');
  const shared = [...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => unescapeXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1]; // 속성 순서가 파일마다 달라서 따로 찾는다
  const rels = Object.fromEntries([...text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship [^>]*>/g)].map((m) => [attr(m[0], 'Id'), attr(m[0], 'Target')]));
  const sheets = {};
  for (const [tag] of text('xl/workbook.xml').matchAll(/<sheet [^>]*>/g)) {
    const m = [, attr(tag, 'name'), attr(tag, 'r:id')];
    const target = rels[m[2]].replace(/^\/?(xl\/)?/, 'xl/');
    const rows = [];
    for (const row of text(target).matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = [];
      for (const c of row[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = c[1].match(/r="([A-Z]+\d+)"/)?.[1];
        const type = c[1].match(/t="(\w+)"/)?.[1];
        const v = c[2]?.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        const inline = c[2]?.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
        const val = type === 's' ? shared[Number(v)] : type === 'inlineStr' ? unescapeXml(inline ?? '') : unescapeXml(v ?? '');
        if (ref) cells[colIndex(ref)] = val;
      }
      rows.push(Array.from(cells, (x) => x ?? ''));
    }
    sheets[unescapeXml(m[1])] = rows;
  }
  return sheets;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2];
  if (!file) { console.error('사용: npm run angles -- "각도표.xlsx"'); process.exit(1); }
  const sheets = readSheets(readFileSync(file));
  const tab = sheets['각도표'] || Object.values(sheets)[0];
  const { order, table } = rowsToTable(tab);
  const hands = sheets['손 배치'] ? rowsToHands(sheets['손 배치']) : [];
  if (hands.length !== 5) console.warn(`⚠ '손 배치' 탭에서 손 ${hands.length}대를 읽었습니다 (5대여야 함)`);
  const out = { source: basename(file), generated: new Date().toISOString().slice(0, 10), order, table, hands };
  const dest = join(dirname(fileURLToPath(import.meta.url)), '../src/lib/angleTable.data.js');
  writeFileSync(dest, `// 자동 생성: npm run angles -- "${basename(file)}" (직접 고치지 말 것)\nexport default ${JSON.stringify(out, null, 1)};\n`);
  const ok = order.filter((k) => table[k].status === '확인됨').length;
  const screen = order.filter((k) => !table[k].hands.length);
  console.log(`✓ ${order.length}글자 읽음 · 확인됨 ${ok} · 화면 안내 ${screen.join(' ') || '없음'} · 손 배치 ${hands.length}대`);
  console.log(`→ ${dest}`);
}
