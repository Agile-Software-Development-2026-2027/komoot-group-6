// Calcola di quanti pixel spostare la mappa perché un elemento (il popup) stia tutto dentro il suo contenitore.
// Il risultato è l'argomento di map.panBy([x, y]): il valore indica lo spostamento della vista,
// quindi è l'opposto dello spostamento che vede l'utente (se il popup esce in alto serve y negativo).
// Se l'elemento è più grande del contenitore vince il lato alto/sinistro, dove stanno titolo e pulsante di chiusura.
export function getPanOffset(elementRect, containerRect, margin = 12) {
  let x = 0;
  let y = 0;

  if (elementRect.top < containerRect.top + margin) {
    y = elementRect.top - (containerRect.top + margin);
  } else if (elementRect.bottom > containerRect.bottom - margin) {
    y = elementRect.bottom - (containerRect.bottom - margin);
  }

  if (elementRect.left < containerRect.left + margin) {
    x = elementRect.left - (containerRect.left + margin);
  } else if (elementRect.right > containerRect.right - margin) {
    x = elementRect.right - (containerRect.right - margin);
  }

  return [x, y];
}
