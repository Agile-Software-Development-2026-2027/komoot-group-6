# Map Technologies

* **Map Engine:** MapLibre GL JS
  * Open-source, WebGL-based library for rendering interactive 2D and 3D maps in the browser.

* **Map Data & Styling:** Vector Tiles (Outdoor Style)
  * Vector-based map data (e.g., provided by MapTiler) that allows for deep customization, such as hiding urban elements to create a clean UI while preserving hiking trails.

* **3D Terrain:** RGB DEM (Digital Elevation Model)
  * Specialized data tiles used to physically extrude the map upwards for 3D mountains and calculate dynamic hillshading for depth perception.

## Useful Resources & Documentation

* **MapLibre GL JS**
  * [MapLibre Official Documentation & API Reference](https://maplibre.org/maplibre-gl-js/docs/)
  * [MapLibre 3D Terrain Example](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/) - *Great starting point for the 3D mountain effect.*

* **MapTiler (Vector Tiles & DEM)**
  * [Using MapTiler with MapLibre GL JS](https://docs.maptiler.com/maplibre-gl-js/) - *Tutorials for integrating the maps.*
  * [MapTiler Outdoor Maps](https://www.maptiler.com/outdoor-maps/) - *Overview of the hiking-specific map style.*

* **GPX / GeoJSON Data**
  * [togeojson](https://github.com/mapbox/togeojson) - *A useful JavaScript library for converting GPX trails into GeoJSON for rendering on the map.*