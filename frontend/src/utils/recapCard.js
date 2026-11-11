import { projectRoute } from './shareRecap.js';
import {LAYER_PAINT_COLOR, SHARE_BACKGROUND_COLOR, SHARE_BACKGROUND_DARK_COLOR, 
        SHARE_START_COLOR, SHARE_END_COLOR, SHARE_MAIN_TEXT_COLOR,
        SHARE_MUTED_TEXT_COLOR, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT,
        SHARE_PAD, SHARE_PHOTO_HEIGHT, SHARE_ROUTE_BOX, SHARE_FONT
        } from '../config/theme.js';

// Background: the primary color of the site (--color-primary in index.css).
// Route and start/end dots: the same colors as on the trail map (TrackLayer.jsx, .startMarker, .endMarker).
const COLORS = {
  background: SHARE_BACKGROUND_COLOR,
  backgroundDark: SHARE_BACKGROUND_DARK_COLOR,
  route: LAYER_PAINT_COLOR,
  start: SHARE_START_COLOR,
  end: SHARE_END_COLOR,
  text: SHARE_MAIN_TEXT_COLOR,
  muted: SHARE_MUTED_TEXT_COLOR,
};

// Loads a picture; resolves with null if it cannot be loaded (the card is drawn without it)
function loadImage(url) {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

// Draws the image so that it covers the whole rectangle, cutting what is outside
function drawCover(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sw = width / scale;
  const sh = height / scale;
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, width, height);
}

// Splits the text into at most maxLines lines that fit in maxWidth.
function wrapText(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

// Rectangle with rounded corners.
function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

// Top part: the photo (or soft mountains when there is none), the kicker and the name
function drawHeader(ctx, { name, kicker }, photo) {
  if (photo) {
    drawCover(ctx, photo, 0, 0, SHARE_CARD_WIDTH, SHARE_PHOTO_HEIGHT);
  } else {
    // No photo: two lines of mountains on a lighter background
    const sky = ctx.createLinearGradient(0, 0, 0, SHARE_PHOTO_HEIGHT);
    sky.addColorStop(0, '#2f8f95');
    sky.addColorStop(1, COLORS.background);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_PHOTO_HEIGHT);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(0, 420);
    [[200, 250], [380, 360], [600, 180], [820, 330], [1080, 220], [1080, SHARE_PHOTO_HEIGHT], [0, SHARE_PHOTO_HEIGHT]]
      .forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.fill();
  }

  // Dark shade at the bottom of the photo: the white text is readable on any picture,
  // and the photo fades into the background of the card
  const shade = ctx.createLinearGradient(0, SHARE_PHOTO_HEIGHT * 0.35, 0, SHARE_PHOTO_HEIGHT);
  shade.addColorStop(0, 'rgba(15, 82, 87, 0)');
  shade.addColorStop(1, COLORS.background);
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_PHOTO_HEIGHT);

  ctx.fillStyle = COLORS.text;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 76px ${SHARE_FONT}`;
  const lines = wrapText(ctx, name, SHARE_CARD_WIDTH - SHARE_PAD * 2, 2);
  const lineHeight = 84;
  const lastLineY = SHARE_PHOTO_HEIGHT - 24;
  lines.forEach((line, i) => {
    ctx.fillText(line, SHARE_PAD, lastLineY - (lines.length - 1 - i) * lineHeight);
  });

  ctx.fillStyle = COLORS.muted;
  ctx.font = `700 30px ${SHARE_FONT}`;
  ctx.fillText(kicker.toUpperCase(), SHARE_PAD, lastLineY - (lines.length - 1) * lineHeight - 92);
}

// A dot with a white ring: start (green) and end (red) of the route
function drawDot(ctx, [x, y], color) {
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.text;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// Middle part: the shape of the route on a light panel (no map tiles: only the line)
function drawRoute(ctx, geometry) {
  roundedRect(ctx, SHARE_ROUTE_BOX.x, SHARE_ROUTE_BOX.y, SHARE_ROUTE_BOX.width, SHARE_ROUTE_BOX.height, 32);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fill();

  const inner = 44;
  const lines = projectRoute(geometry, {
    x: SHARE_ROUTE_BOX.x + inner,
    y: SHARE_ROUTE_BOX.y + inner,
    width: SHARE_ROUTE_BOX.width - inner * 2,
    height: SHARE_ROUTE_BOX.height - inner * 2,
  });

  if (lines.length === 0) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `600 32px ${SHARE_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('Route not available', SHARE_CARD_WIDTH / 2, SHARE_ROUTE_BOX.y + SHARE_ROUTE_BOX.height / 2);
    ctx.textAlign = 'left';
    return;
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // White border first, then the colored route on top (as on the trail map)
  for (const [width, color] of [[16, 'rgba(255, 255, 255, 0.9)'], [9, COLORS.route]]) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    for (const line of lines) {
      ctx.beginPath();
      line.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    }
  }

  const start = lines[0][0];
  const end = lines.at(-1).at(-1);
  // A loop ends where it starts: the end dot is drawn only if it is far enough from the start
  if (Math.hypot(end[0] - start[0], end[1] - start[1]) > 24) drawDot(ctx, end, COLORS.end);
  drawDot(ctx, start, COLORS.start);
}

// Bottom part: the numbers in columns separated by thin lines, then the footer
function drawStats(ctx, stats, footer) {
  const top = 1120;
  const columnWidth = (SHARE_CARD_WIDTH - SHARE_PAD * 2) / stats.length;
  // Room for a value: the column minus the space around the separator lines
  const room = columnWidth - 56;

  // One font size for all the values: the biggest one (max 50px) with which even the
  // longest value (e.g. "12:30 h") does not touch the next column
  let size = 50;
  ctx.font = `800 ${size}px ${SHARE_FONT}`;
  while (size > 30 && stats.some(({ value }) => ctx.measureText(value).width > room)) {
    size -= 2;
    ctx.font = `800 ${size}px ${SHARE_FONT}`;
  }
  const valueFont = `800 ${size}px ${SHARE_FONT}`;

  stats.forEach(({ label, value }, i) => {
    const x = SHARE_PAD + i * columnWidth + (i === 0 ? 0 : 28);
    if (i > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(SHARE_PAD + i * columnWidth, top - 6, 2, 104);
    }
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 26px ${SHARE_FONT}`;
    ctx.fillText(label.toUpperCase(), x, top + 24);
    ctx.fillStyle = COLORS.text;
    ctx.font = valueFont;
    ctx.fillText(value, x, top + 88);
  });

  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(SHARE_PAD, 1250, SHARE_CARD_WIDTH - SHARE_PAD * 2, 2);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 28px ${SHARE_FONT}`;
  ctx.fillText(footer, SHARE_PAD, 1302);
}

// Draws the whole card on a 2D context. "photo" is an already loaded image (or null).
// data = { name, kicker, stats: [{ label, value }], footer, geometry }
export function drawRecapCard(ctx, data, photo) {
  // The gradient starts under the photo: there the color is the same as the end of the
  // shade on the photo, so photo and background join without a visible line
  const background = ctx.createLinearGradient(0,SHARE_PHOTO_HEIGHT, 0, SHARE_CARD_HEIGHT);
  background.addColorStop(0, COLORS.background);
  background.addColorStop(1, COLORS.backgroundDark);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  drawHeader(ctx, data, photo);
  drawRoute(ctx, data.geometry);
  drawStats(ctx, data.stats, data.footer);
}

// Creates the recap image and returns it as a PNG Blob (the file that is shared or downloaded).
// data = what drawRecapCard needs, plus imageUrl (the cover photo, can be null).
export async function createRecapImage({ imageUrl, ...data }) {
  const photo = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  drawRecapCard(ctx, data, photo);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the image'))), 'image/png');
  });
}
