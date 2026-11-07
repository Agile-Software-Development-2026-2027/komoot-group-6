// Short numbers like on social networks: 950 -> "950", 1234 -> "1.2K", 15000 -> "15K"
const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export function formatLikes(count) {
  return compactNumber.format(count);
}

// Sentence under the heart, written from the user's point of view:
// count = total likes, liked = true if the user's like is among them
export function likesText(count, liked) {
  if (count === 0) return 'Be the first to like this trail';
  if (liked) {
    const others = count - 1;
    if (others === 0) return 'You like this trail';
    return `You and ${formatLikes(others)} ${others === 1 ? 'other' : 'others'} like this trail`;
  }
  return `${formatLikes(count)} ${count === 1 ? 'person likes' : 'people like'} this trail`;
}
