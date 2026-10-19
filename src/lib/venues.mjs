/**
 * 地點名稱含關鍵字時，活動頁才補地址與寵物提醒。
 * 其他場次只顯示試算表裡的地點，不出現門牌。
 */
const VENUES = [
  {
    match: '凹屋珈琲',
    address: '台北市士林區中山北路五段 505 巷 44 弄 2 號',
    transit: '捷運士林站 2 號出口，步行約 1–3 分鐘',
    mapUrl: 'https://maps.app.goo.gl/KLmqCZhYWMfzdTNSA',
    mapLabel: 'Google 地圖',
    pet: '寵物友善，歡迎帶毛孩一起來',
    petCare: '香料和酒精對貓咪、鳥寶寶比較刺激，建議留在家；狗狗請待在離調香桌遠一點的地方。',
  },
];

/** @param {unknown} venue */
export function venueNote(venue) {
  const text = String(venue ?? '');
  return VENUES.find((item) => text.includes(item.match)) ?? null;
}
