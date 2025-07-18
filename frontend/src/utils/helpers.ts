export const getRarityDisplayName = (rarityNum: number): string => {
    switch (rarityNum) {
      case 1: return '⭐️';
      case 2: return '⭐️⭐️';
      case 3: return '⭐️⭐️⭐️';
      case 4: return '⭐️⭐️⭐️⭐️';
      case 5: return '⭐️⭐️⭐️⭐️⭐️';
      default: return String(rarityNum); // 未知の数値の場合はそのまま文字列として返す
    }
  };

  export const getRarityStars = (rarityNum: number): string => {
    return '⭐️'.repeat(rarityNum);
  };