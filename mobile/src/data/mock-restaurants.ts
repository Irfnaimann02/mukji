import type { Restaurant } from './types';

// Made-up data for building screens. PR D replaces it in Week 11.
export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 'mock-1', nameKo: '모의 김밥', nameEn: 'Mock Kimbap', foodType: 'korean',
    lat: 37.2985, lng: 126.837, address: 'Near ERICA (mock)', phone: '010-0000-0001',
    priceLevel: 1, halalCertified: false,
    origin: [{ itemKo: '햄(돼지고기)', country: 'USA' }],
    recommendCount: 12, rating: 4.2, sources: ['menu', '원산지 label'],
    dishes: [
      { id: 'mock-1-a', nameKo: '기본 김밥', nameEn: 'Classic kimbap', priceWon: 3500,
        contains: ['pork', 'egg'], mayContain: [],
        leaveOutKo: '햄 빼 주세요', leaveOutEn: 'No ham, please',
        verifiedCount: 2, lastChecked: '2026-10-20' },
      { id: 'mock-1-b', nameKo: '야채 김밥', nameEn: 'Vegetable kimbap', priceWon: 3000,
        contains: ['egg'], mayContain: [], verifiedCount: 1, lastChecked: '2026-10-20' },
      { id: 'mock-1-c', nameKo: '라면', nameEn: 'Ramyeon', priceWon: 4000,
        contains: ['wheat', 'egg'], mayContain: ['beef', 'seafood'],
        verifiedCount: 0, lastChecked: null },
    ],
  },
  {
    id: 'mock-2', nameKo: '모의 치킨', nameEn: 'Mock Chicken', foodType: 'chicken',
    lat: 37.295, lng: 126.833, address: 'Near ERICA (mock)', phone: '010-0000-0002',
    priceLevel: 2, halalCertified: false,
    origin: [{ itemKo: '닭고기', country: 'Korea' }],
    recommendCount: 30, rating: 4.5, sources: ['menu', 'reviews'],
    dishes: [
      { id: 'mock-2-a', nameKo: '후라이드 치킨', nameEn: 'Fried chicken', priceWon: 20000,
        contains: ['chicken', 'wheat'], mayContain: [], verifiedCount: 1, lastChecked: '2026-10-18' },
      { id: 'mock-2-b', nameKo: '생맥주', nameEn: 'Draft beer', priceWon: 4500,
        contains: ['alcohol', 'wheat'], mayContain: [], verifiedCount: 0, lastChecked: null },
    ],
  },
  {
    id: 'mock-3', nameKo: '모의 할랄 케밥', nameEn: 'Mock Halal Kebab', foodType: 'halal',
    lat: 37.2995, lng: 126.8335, address: 'Near ERICA (mock)', phone: '010-0000-0003',
    priceLevel: 2, halalCertified: true,
    origin: [{ itemKo: '닭고기', country: 'Brazil' }],
    recommendCount: 8, rating: 4.0, sources: ['menu', '원산지 label', 'reviews'],
    dishes: [
      { id: 'mock-3-a', nameKo: '치킨 케밥', nameEn: 'Chicken kebab', priceWon: 9000,
        contains: ['chicken', 'wheat', 'dairy'], mayContain: [], verifiedCount: 3, lastChecked: '2026-10-22' },
      { id: 'mock-3-b', nameKo: '팔라펠 랩', nameEn: 'Falafel wrap', priceWon: 8000,
        contains: ['wheat'], mayContain: ['dairy', 'egg'],
        leaveOutKo: '소스 빼 주세요', leaveOutEn: 'No sauce, please',
        verifiedCount: 1, lastChecked: '2026-10-22' },
    ],
  },
];