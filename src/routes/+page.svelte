<script lang="ts">
	import { base } from '$app/paths';
	import ml, { type MapLayerMouseEvent } from 'maplibre-gl';
	import { MapLibre, NavigationControl, ScaleControl, GeolocateControl } from 'svelte-maplibre-gl';
	import { cloneDeep } from 'es-toolkit';
	import type { Polygon } from 'geojson';
	import { center } from '@turf/center';

	let dragging = $state(false);
	let draggingStartPoint = $state<ml.LngLat>();
	let draggedPolygon = $state.raw<ml.MapGeoJSONFeature>();
	let map = $state<ml.Map>();
	let tokyoDome = $state<GeoJSON.FeatureCollection<Polygon>>();
	let centeredTokyoDome = $state<GeoJSON.FeatureCollection<Polygon>>();
	let index = $state(0);
	let targetSource = $state<string>();
	const fetchTokyoDome = async (): Promise<GeoJSON.FeatureCollection<Polygon>> => {
		const resp = await fetch(`${base}/tokyodome.json`);
		const json = await resp.json();
		return json satisfies GeoJSON.FeatureCollection<Polygon>;
	};
	$effect(() => {
		fetchTokyoDome()
			.then((json) => {
				tokyoDome = json;
				return json;
			})
			.then((json) => {
				const tokyoDomeCenterPoint = center(json);
				centeredTokyoDome = json;
				centeredTokyoDome.features[0].geometry.coordinates[0] =
					centeredTokyoDome.features[0].geometry.coordinates[0].map(([lng, lat]) => [
						lng - tokyoDomeCenterPoint.geometry.coordinates[0],
						lat - tokyoDomeCenterPoint.geometry.coordinates[1]
					]);
			});
	});
	const addTokyoDome = () => {
		if (typeof map === 'undefined') return;
		if (typeof centeredTokyoDome === 'undefined') return;
		const mapCenter = map.getCenter();
		const clonedCenteredTokyoDome = cloneDeep(centeredTokyoDome);
		clonedCenteredTokyoDome.features[0].geometry.coordinates[0] =
			clonedCenteredTokyoDome.features[0].geometry.coordinates[0].map(([lng, lat]) => [
				lng + mapCenter.lng,
				lat + mapCenter.lat
			]);
		const name = `tokyodome${index}`;
		const sourceLayerName = `src_${name}`;
		clonedCenteredTokyoDome.features[0].properties['index'] = sourceLayerName;
		map.addSource(sourceLayerName, { type: 'geojson', data: clonedCenteredTokyoDome });
		const fillLayerName = `${name}_filllayer`;
		map.addLayer({
			id: fillLayerName,
			source: `src_${name}`,
			type: 'fill',
			paint: {
				'fill-color': '#00bfff',
				'fill-opacity': 0.5
			}
		});
		map.addLayer({
			id: `${name}_linelayer`,
			source: `src_${name}`,
			type: 'line',
			paint: {
				'line-color': 'white',
				'line-width': 2
			}
		});
		map.on('mousedown', fillLayerName, fillLayerOnMouseDown);
		map.on('mouseup', fillLayerName, fillLayerOnMouseUp);
		map.on('mousemove', fillLayerName, fillLayerOnMouseMove);
		map.on('click', fillLayerName, () => console.log(fillLayerName));
		index++;
	};
	const fillLayerOnMouseDown = (e: MapLayerMouseEvent) => {
		if (typeof map === 'undefined' || typeof e.features === 'undefined' || e.features.length == 0)
			return;
		map.getCanvas().style.cursor = 'grabbing';
		dragging = true;
		map.dragPan.disable();
		draggingStartPoint = e.lngLat;
		draggedPolygon = e.features[0];
	};
	const fillLayerOnMouseMove = (e: MapLayerMouseEvent) => {
		if (
			!dragging ||
			typeof draggedPolygon === 'undefined' ||
			typeof draggingStartPoint === 'undefined'
		)
			return;
		if (typeof map === 'undefined') return;
		const deltaLat = e.lngLat.lat - draggingStartPoint.lat;
		const deltaLng = e.lngLat.lng - draggingStartPoint.lng;
		const updatedCoord = draggedPolygon.geometry.coordinates[0].map(([lng, lat]) => [
			lng + deltaLng,
			lat + deltaLat
		]);
		draggingStartPoint = e.lngLat;
		draggedPolygon.geometry.coordinates[0] = updatedCoord;
		const src = map.getSource(draggedPolygon.properties['index']);
		if (typeof src === 'undefined') return;
		src.setData({
			type: 'FeatureCollection',
			features: [draggedPolygon]
		});
		return;
	};
	const fillLayerOnMouseUp = () => {
		if (!dragging) return;
		if (typeof map === 'undefined') return;
		dragging = false;
		map.dragPan.enable();
		map.getCanvas().style.cursor = '';
		draggedPolygon = undefined;
	};
	const title = 'tokyodome-scaler';
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
		<GeolocateControl trackUserLocation={true} />
	</MapLibre>
</div>

<div class="absolute bottom-10 left-2 rounded-lg bg-white p-2">
	<button
		class="bg-red-200"
		onclick={() => {
			addTokyoDome();
		}}>more tokyodome!</button
	>
</div>

<svelte:head>
	<title>{title}</title>
	<meta name="og:title" content={title} />
	<meta name="og:type" content="website" />
	<meta name="og:url" content={base} />
	<meta name="og:locale" content="ja-JP" />
	<meta name="og:description" content="そこのお前！東京ドーム1個の面積は東京ドーム1個分だぜ！" />
	<meta name="twitter:title" content={title} />
	<meta
		name="twitter:description"
		content="そこのお前！東京ドーム1個の面積は東京ドーム1個分だぜ！"
	/>
	<meta name="twitter:creators" content="@eniehack" />
	<meta name="twitter:card" content="summary" />
	<meta name="fediverse:creator" content="@eniehack@mstdn.sublimer.me" />
</svelte:head>
