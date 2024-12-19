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
		const sourceName = `${name}_src`;
		clonedCenteredTokyoDome.features[0].properties['index'] = sourceName;
		map.addSource(sourceName, { type: 'geojson', data: clonedCenteredTokyoDome });
		const fillLayerName = `${name}_filllayer`;
		map.addLayer({
			id: fillLayerName,
			source: sourceName,
			type: 'fill',
			paint: {
				'fill-color': '#00bfff',
				'fill-opacity': 0.5
			}
		});
		map.addLayer({
			id: `${name}_linelayer`,
			source: sourceName,
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
	const title = 'tokyodome scaler';
</script>

<div class="fixed bottom-0 top-14">
	<MapLibre
		class="h-full w-screen"
		style="https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json"
		zoom={15}
		center={{ lng: 139.751965, lat: 35.705514 }}
		bind:map
	>
		<NavigationControl />
		<ScaleControl />
		<GeolocateControl trackUserLocation={true} />
	</MapLibre>
</div>
<header>
	<div class="flex justify-between p-4 dark:bg-slate-800">
		<h1>
			<a href="/" class="hover:underline dark:text-neutral-200">{title}</a>
		</h1>
		<nav class="flex space-x-4">
			<a
				href="https://github.com/eniehack/tokyodome-scaler?tab=readme-ov-file#license"
				class="hover:underline dark:text-neutral-200">ライセンス</a
			>
			<a
				href="https://github.com/eniehack/tokyodome-scaler"
				class="hover:underline dark:text-neutral-200">github</a
			>
		</nav>
	</div>
</header>
<div class="absolute bottom-10 left-2 rounded-lg bg-white p-2">
	<button
		class="m-2 flex rounded bg-green-600 p-2"
		onclick={() => {
			addTokyoDome();
		}}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			fill="currentColor"
			class="bi bi-plus-lg fill-white p-1"
			viewBox="0 0 16 16"
		>
			<path
				fill-rule="evenodd"
				d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"
			/>
		</svg>
		<span class="text-white">追加する</span>
	</button>
	<button class="m-2 flex rounded bg-red-600 p-2" onclick={() => {
		if (typeof map === "undefined") return;
		for (let i = index; 0 <= i; i--) {
			if (typeof map.getLayer(`tokyodome${i}_linelayer`) !== "undefined") {
				map.removeLayer(`tokyodome${i}_linelayer`)
			}
			if (typeof map.getLayer(`tokyodome${i}_filllayer`) !== "undefined") {
				map.removeLayer(`tokyodome${i}_filllayer`)
			}
			if (typeof map.getSource(`tokyodome${i}_src`) !== "undefined") {
				map.removeSource(`tokyodome${i}_src`)
			}
		}
	}}>
		<svg
			class="bi bi-trash-fill fill-white p-1"
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			fill="currentColor"
			viewBox="0 0 16 16"
		>
			<path
				d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"
			/>
		</svg>
		<span class="text-white">すべて削除する</span>
	</button>
</div>

<svelte:head>
	<title>{title}</title>
	<meta name="og:title" content={title} />
	<meta name="og:type" content="website" />
	<meta name="og:url" content={`https://tokyodome-scaler.pages.dev/${base}`} />
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
