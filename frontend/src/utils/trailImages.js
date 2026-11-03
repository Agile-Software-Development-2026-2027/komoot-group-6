// Immagini dei sentieri: stanno tutte nella cartella src/assets/trails/.
// Ogni file si chiama come il sentiero, per esempio "Anello del Campus UniCal.jpg".
// Maiuscole, accenti, spazi e apostrofi non contano: va bene anche "anello-del-campus-unical.jpg".

// Vite trova le immagini della cartella quando avvia o costruisce il sito
// e per ogni file restituisce l'URL da mettere nell'<img>: { '../assets/trails/nome.jpg': url }
const FILES = import.meta.glob('../assets/trails/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}', {
  eager: true,
  query: '?url',
  import: 'default',
});

// Rende confrontabili il nome del sentiero e quello del file:
// "Anello del Campus UniCal" e "anello-del-campus-unical" diventano entrambi "anello-del-campus-unical".
export function toImageKey(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // toglie gli accenti: "à" diventa "a"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // spazi, apostrofi e altri simboli diventano un trattino
    .replace(/^-|-$/g, '');
}

// Da { percorso del file: url } a una Map { nome del file come chiave: url }
export function indexImages(files) {
  const images = new Map();
  for (const [path, url] of Object.entries(files)) {
    const fileName = path.split('/').pop().replace(/\.[^.]+$/, ''); // senza cartella ed estensione
    images.set(toImageKey(fileName), url);
  }
  return images;
}

const IMAGES = indexImages(FILES);

// URL dell'immagine del sentiero, null se nella cartella non c'è un file con il suo nome.
// Il secondo parametro serve ai test, per usare un elenco di file finto.
export function trailImageUrl(trailName, images = IMAGES) {
  const key = toImageKey(trailName);
  return (key && images.get(key)) || null;
}
