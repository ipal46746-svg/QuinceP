import { WordCard, ImageCard } from './types';

// Extracted from the provided OCR text in the prompt
export const WORD_CARDS: WordCard[] = [
  { id: 1, text: '改变' }, { id: 2, text: '分享' }, { id: 3, text: '犹豫' },
  { id: 4, text: '执着' }, { id: 5, text: '罪恶感' }, { id: 6, text: '喜悦' },
  { id: 7, text: '习惯' }, { id: 8, text: '希望' }, { id: 9, text: '强迫' },
  { id: 10, text: '付出' }, { id: 11, text: '压抑' }, { id: 12, text: '焦虑' },
  { id: 13, text: '欢笑' }, { id: 14, text: '吸引' }, { id: 15, text: '陌生人' },
  { id: 16, text: '谎言' }, { id: 17, text: '同性恋' }, { id: 18, text: '孩童' },
  { id: 19, text: '开始' }, { id: 20, text: '痛苦' }, { id: 21, text: '尴尬' },
  { id: 22, text: '奴隶' }, { id: 23, text: '羞辱' }, { id: 24, text: '父亲' },
  { id: 25, text: '色情' }, { id: 26, text: '威胁' }, { id: 27, text: '攻击' },
  { id: 28, text: '疲倦' }, { id: 29, text: '裸体' }, { id: 30, text: '专家' },
  { id: 31, text: '恐惧' }, { id: 32, text: '权力游戏' }, { id: 33, text: '梦想' },
  { id: 34, text: '应该' }, { id: 35, text: '生气' }, { id: 36, text: '女人' },
  { id: 37, text: '受害者' }, { id: 38, text: '道歉' }, { id: 39, text: '丑陋' },
  { id: 40, text: '破坏' }, { id: 41, text: '攫取' }, { id: 42, text: '混乱' },
  { id: 43, text: '不喜欢' }, { id: 44, text: '上司' }, { id: 45, text: '憎恶' },
  { id: 46, text: '感情' }, { id: 47, text: '母亲' }, { id: 48, text: '敌对' },
  { id: 49, text: '依赖' }, { id: 50, text: '危险' }, { id: 51, text: '循环' },
  { id: 52, text: '幻想' }, { id: 53, text: '羞愧' }, { id: 54, text: '弄巧成拙' },
  { id: 55, text: '恐吓' }, { id: 56, text: '丢脸' }, { id: 57, text: '男性' },
  { id: 58, text: '躲藏' }, { id: 59, text: '顺应' }, { id: 60, text: '错误' },
  { id: 61, text: '诙谐' }, { id: 62, text: '退省' }, { id: 63, text: '失败' },
  { id: 64, text: '腐朽' }, { id: 65, text: '停止' }, { id: 66, text: '爱情' },
  { id: 67, text: '放开' }, { id: 68, text: '姿态' }, { id: 69, text: '成功' },
  { id: 70, text: '厌烦' }, { id: 71, text: '哀伤' }, { id: 72, text: '愚蠢' },
  { id: 73, text: '憎恨' }, { id: 74, text: '固执' }, { id: 75, text: '亏欠' },
  { id: 76, text: '外表' }, { id: 77, text: '消除' }, { id: 78, text: '奇妙' },
  { id: 79, text: '抗拒' }, { id: 80, text: '等候' }, { id: 81, text: '坚定' },
  { id: 82, text: '前进' }, { id: 83, text: '家' }, { id: 84, text: '违背' },
  { id: 85, text: '夸赞' }, { id: 86, text: '聪明' }, { id: 87, text: '孤独' },
  { id: 88, text: '游戏' }
];

// Simulation of Image cards using Picsum with specific seeds to maintain consistency in "randomness"
// OH cards are often watercolor, abstract, or slice-of-life.
export const IMAGE_CARDS: ImageCard[] = Array.from({ length: 88 }, (_, i) => ({
  id: i + 1,
  // Using seeds ensuring we get the same image for the same ID every time
  imageUrl: `https://picsum.photos/seed/${i + 100}/300/450`
}));
