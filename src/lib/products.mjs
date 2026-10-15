/** @param {string} text */
export function parseCsv(text) {
  const source = text.replace(/^\uFEFF/, '');
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** 時長欄是空的時候，從說明文字裡取出「過程…」。 */
export function extractDuration(description) {
  if (!description) return null;
  const match = description.match(/過程(?:大約)?\s*[^。\n]*/);
  if (!match) return null;
  return match[0].replace(/\s+/g, ' ').trim();
}

/**
 * 讀產品 CSV。空白列略過。只有名稱、沒有說明與定價的列當成分類標題（例如「商品」）。
 * @param {string} text
 */
export function parseProducts(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headerName = (rows[0][0] || '體驗項目').trim() || '體驗項目';
  /** @type {{ heading: string, items: { name: string, description: string, price: string, duration: string | null }[] }[]} */
  const groups = [{ heading: headerName, items: [] }];

  for (const raw of rows.slice(1)) {
    const cells = [0, 1, 2, 3].map((index) => (raw[index] ?? '').trim());
    if (cells.every((value) => value === '')) continue;
    const [name, description, price, durationColumn] = cells;
    if (name && !description && !price && !durationColumn) {
      groups.push({ heading: name, items: [] });
      continue;
    }
    if (!name) continue;
    groups[groups.length - 1].items.push({
      name,
      description,
      price,
      duration: durationColumn || extractDuration(description),
    });
  }

  return groups.filter((group) => group.items.length > 0);
}
