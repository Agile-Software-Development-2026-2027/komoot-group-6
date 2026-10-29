//questa funzione non nasconde niente riceve la lista dei nomi dei layer e restituisce
//una funzione che li nasconde davvero.
//maplibre per usare Map transformStyle ha bisogno dello stile vecchio e quello nuovo
//questa classe fa esattamente questo, prende lo stile vecchio e quello nuovo e restituisce lo stile nuovo con i layer nascosti
export function hideLayers(layerIds) {
  const hidden = new Set(layerIds); //trasforma l'array in un set per avere una ricerca più veloce
  return (_previous, next) => ({
    ...next,
    layers: next.layers.map((layer) => (
      hidden.has(layer.id)
        ? { ...layer, layout: { ...layer.layout, visibility: 'none' } }
        : layer
    )),
  });
}