import { describe, expect, it } from 'vitest';
import { indexImages, toImageKey, trailImageUrl } from './trailImages.js';

// Elenco finto, nel formato che Vite restituisce per i file della cartella: { percorso: url }
const images = indexImages({
  '../assets/trails/Anello del Campus UniCal.jpg': '/assets/anello.jpg',
  '../assets/trails/cosenza-vecchia-e-castello-svevo.PNG': '/assets/cosenza.png',
  '../assets/trails/Città dei Bruzi.webp': '/assets/bruzi.webp',
});

describe('toImageKey', () => {
  it('ignores case, accents, spaces and apostrophes', () => {
    expect(toImageKey('Anello del Campus UniCal')).toBe('anello-del-campus-unical');
    expect(toImageKey("  Sentiero dell'Angelo – Città ")).toBe('sentiero-dell-angelo-citta');
  });

  it('returns an empty key when the name is missing', () => {
    expect(toImageKey(undefined)).toBe('');
    expect(toImageKey('')).toBe('');
  });
});

describe('trailImageUrl', () => {
  it('finds the image whose file has the name of the trail', () => {
    expect(trailImageUrl('Anello del Campus UniCal', images)).toBe('/assets/anello.jpg');
    // File in minuscolo con i trattini ed estensione maiuscola
    expect(trailImageUrl('Cosenza vecchia e Castello Svevo', images)).toBe('/assets/cosenza.png');
    // Accento nel nome del file ma non in quello del sentiero
    expect(trailImageUrl('Citta dei Bruzi', images)).toBe('/assets/bruzi.webp');
  });

  it('returns null when the folder has no image for the trail', () => {
    expect(trailImageUrl('Monte Curcio da Camigliatello', images)).toBeNull();
    expect(trailImageUrl(undefined, images)).toBeNull();
  });
});
