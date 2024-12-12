<script lang="ts">
    import { base } from "$app/paths";
    import ml from "maplibre-gl";
    import { MapLibre, NavigationControl, ScaleControl, GeolocateControl, GeoJSONSource, FillLayer, LineLayer} from "svelte-maplibre-gl";

    let dragging = $state(false);
    let draggingStartPoint = $state<ml.LngLat>();
    let draggedPolygon = $state.raw<ml.MapGeoJSONFeature>();
    let map = $state<ml.Map>();
</script>

<div class="fixed bottom-0 top-14">
    <MapLibre 
		class="h-full w-screen"
		style="https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json"
		zoom={4}
		center={{ lng: 139.751965, lat: 35.705514 }}
        bind:map
	>
        <NavigationControl />
		<ScaleControl />
		<GeolocateControl
			trackUserLocation={true}
		/>
        <GeoJSONSource id="tokyodome" data={`${base}/tokyodome.json`}>
            <FillLayer
				paint={{
					'fill-color': '#00bfff',
					'fill-opacity': 0.5
				}}
                onmousedown={(e) => {
                    if (typeof map === "undefined" || typeof e.features === "undefined" || e.features.length == 0 ) return;
                    map.getCanvas().style.cursor = 'grabbing';
                    dragging = true;
                    map.dragPan.disable()
                    draggingStartPoint = e.lngLat
                    draggedPolygon = e.features[0]
                }}
                onmousemove={(e) => {
                    if (!dragging || typeof draggedPolygon === "undefined" || typeof draggingStartPoint === "undefined") return;
                    if (typeof map === "undefined") return;
                    const deltaLat = e.lngLat.lat - draggingStartPoint.lat;
                    const deltaLng = e.lngLat.lng - draggingStartPoint.lng;
                    const updatedPolygonCoordinates = draggedPolygon.geometry.coordinates[0].map(([lng, lat]) => [
                        lng + deltaLng,
                        lat + deltaLat
                    ]);
                    draggingStartPoint = e.lngLat;
                    draggedPolygon.geometry.coordinates[0] = updatedPolygonCoordinates;
                    const src = map.getSource('tokyodome');
                    if (typeof src === "undefined") return;
                    src.setData({
                        type: 'FeatureCollection',
                        features: [draggedPolygon]
                    });
                }}
                onmouseup={() => {
                    if (!dragging) return;
                    if (typeof map === "undefined") return;
                    dragging = false;
                    map.dragPan.enable();
                    map.getCanvas().style.cursor = "";
                    draggedPolygon = undefined
                }}
			/>
			<LineLayer
				paint={{
					'line-color': 'white',
					'line-width': 2
				}}
			/>
        </GeoJSONSource>
    </MapLibre>
</div>
