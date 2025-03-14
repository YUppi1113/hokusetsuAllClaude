// カテゴリーの定義
export const CATEGORIES = [
  { id: 'music', name: '音楽', icon: '🎵' },
  { id: 'cooking', name: '料理', icon: '🍳' },
  { id: 'language', name: '語学', icon: '🗣️' },
  { id: 'craft', name: 'クラフト', icon: '🧶' },
  { id: 'dance', name: 'ダンス', icon: '💃' },
  { id: 'technology', name: 'テクノロジー', icon: '💻' },
  { id: 'art', name: '芸術', icon: '🎨' },
  { id: 'sports', name: 'スポーツ', icon: '🏃‍♂️' },
  { id: 'business', name: 'ビジネス', icon: '💼' },
  { id: 'academics', name: '教養', icon: '📚' },
  { id: 'outdoor', name: 'アウトドア', icon: '🏕️' },
  { id: 'wellness', name: 'ウェルネス', icon: '🧘‍♀️' },
];

// カテゴリーごとのサブカテゴリー定義
export const SUBCATEGORIES: { [key: string]: { id: string, name: string }[] } = {
  'music': [
    { id: 'piano', name: 'ピアノ' },
    { id: 'guitar', name: 'ギター' },
    { id: 'violin', name: 'バイオリン' },
    { id: 'drums', name: 'ドラム' },
    { id: 'vocals', name: 'ボーカル' },
    { id: 'composition', name: '作曲' },
    { id: 'music_theory', name: '音楽理論' },
    { id: 'other_music', name: 'その他' },
  ],
  'cooking': [
    { id: 'japanese', name: '和食' },
    { id: 'italian', name: 'イタリアン' },
    { id: 'french', name: 'フレンチ' },
    { id: 'chinese', name: '中華' },
    { id: 'dessert', name: 'デザート' },
    { id: 'bread', name: 'パン作り' },
    { id: 'other_cooking', name: 'その他' },
  ],
  'language': [
    { id: 'english', name: '英語' },
    { id: 'japanese', name: '日本語' },
    { id: 'chinese', name: '中国語' },
    { id: 'french', name: 'フランス語' },
    { id: 'spanish', name: 'スペイン語' },
    { id: 'other_language', name: 'その他' },
  ],
  'craft': [
    { id: 'knitting', name: '編み物' },
    { id: 'pottery', name: '陶芸' },
    { id: 'jewelry', name: 'ジュエリー作り' },
    { id: 'woodworking', name: '木工' },
    { id: 'sewing', name: '裁縫' },
    { id: 'other_craft', name: 'その他' },
  ],
  'dance': [
    { id: 'ballet', name: 'バレエ' },
    { id: 'contemporary', name: 'コンテンポラリー' },
    { id: 'hiphop', name: 'ヒップホップ' },
    { id: 'ballroom', name: '社交ダンス' },
    { id: 'other_dance', name: 'その他' },
  ],
  'technology': [
    { id: 'programming', name: 'プログラミング' },
    { id: 'web_design', name: 'ウェブデザイン' },
    { id: 'data_science', name: 'データサイエンス' },
    { id: 'ai', name: 'AI/機械学習' },
    { id: 'other_tech', name: 'その他' },
  ],
  'art': [
    { id: 'painting', name: '絵画' },
    { id: 'drawing', name: 'デッサン' },
    { id: 'sculpture', name: '彫刻' },
    { id: 'photography', name: '写真' },
    { id: 'other_art', name: 'その他' },
  ],
  'sports': [
    { id: 'yoga', name: 'ヨガ' },
    { id: 'running', name: 'ランニング' },
    { id: 'swimming', name: '水泳' },
    { id: 'martial_arts', name: '武道' },
    { id: 'tennis', name: 'テニス' },
    { id: 'golf', name: 'ゴルフ' },
    { id: 'other_sports', name: 'その他' },
  ],
  'business': [
    { id: 'marketing', name: 'マーケティング' },
    { id: 'finance', name: 'ファイナンス' },
    { id: 'entrepreneurship', name: '起業' },
    { id: 'management', name: '経営' },
    { id: 'other_business', name: 'その他' },
  ],
  'academics': [
    { id: 'math', name: '数学' },
    { id: 'science', name: '科学' },
    { id: 'history', name: '歴史' },
    { id: 'literature', name: '文学' },
    { id: 'other_academics', name: 'その他' },
  ],
  'outdoor': [
    { id: 'hiking', name: 'ハイキング' },
    { id: 'camping', name: 'キャンプ' },
    { id: 'fishing', name: '釣り' },
    { id: 'gardening', name: 'ガーデニング' },
    { id: 'other_outdoor', name: 'その他' },
  ],
  'wellness': [
    { id: 'meditation', name: '瞑想' },
    { id: 'nutrition', name: '栄養学' },
    { id: 'fitness', name: 'フィットネス' },
    { id: 'mental_health', name: 'メンタルヘルス' },
    { id: 'other_wellness', name: 'その他' },
  ],
};