// ==UserScript==
// @author         lokpro
// @name           IITC plugin: Portal Images
// @category       Layer
// @version        0.1
// @description    Show portal images on the map.
// @id             portal-images
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://raw.githubusercontent.com/Ingrass/IITC-portal-Images/refs/heads/main/portal-Images.meta.js
// @downloadURL    https://raw.githubusercontent.com/Ingrass/IITC-portal-Images/refs/heads/main/portal-Images.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==

/*
 * This plugin is developed based on the Portal Names plugin by ZasoGD.
 * Original plugin URL: https://iitc.app/build/release/plugins/portal-names.user.js
 */

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

plugin_info.buildName = 'release';
plugin_info.dateTimeVersion = '2025-01-20-00000';
plugin_info.pluginId = 'portal-images';
//END PLUGIN AUTHORS NOTE


// use own namespace for plugin
window.plugin.portalImages = function() {};

window.plugin.portalImages.labelLayers = {};
window.plugin.portalImages.labelLayerGroup = null;

window.plugin.portalImages.setupCSS = function() {
	$("<style>").prop("type", "text/css").html(/*css*/ `
		.plugin-portal-images {
			width: 50px;
			height: 50px;
			transition: width 0.2s ease-in-out, height 0.2s ease-in-out, margin-left 0.2s ease-in-out, margin-top 0.2s ease-in-out;
			transform-origin: center center;
			background-size: contain;
			background-position: center;
			background-repeat: no-repeat;
			background-color: #00ffff73;
			border: 1px solid #00ffff73;
		}
		.plugin-portal-images:hover {
			width: 512px !important;
			height: 512px !important;
			margin-left: -256px !important;
			margin-top: -256px !important;
			z-index: 9999999 !important;
			background-image: var(--hover-background-image) !important;
		}
	`).appendTo("head");
}
window.plugin.portalImages.addLabel = function(guid, latLng) {
	var previousLayer = window.plugin.portalImages.labelLayers[guid];
	if (!previousLayer) {

		var d = window.portals[guid].options.data;
		//var portalName = d.title;

		var portalImage = d.image; // Assuming d.image contains the URL of the image

		var imgHtml = "";//`<img src="${portalImage}">`; // Adjust the size as needed

		const W = 50;

		let icon = L.divIcon({
			className: 'plugin-portal-images',
			iconAnchor: [W/2, W/2], // Center the icon
			iconSize: [W, W],
			html: imgHtml
		})

		var label = L.marker(latLng, {
			icon,
			guid,
			interactive: true,
		});
		
		window.plugin.portalImages.labelLayers[guid] = label;
		label.addTo(window.plugin.portalImages.labelLayerGroup);

		label._icon. style.backgroundImage = `url(${portalImage}=s40)`;
		label._icon.style.setProperty('--hover-background-image', `url(${portalImage})`);

		// Add event listener to trigger the portal click event
		label.on('click', function() {
			const guid = this.options?.guid;
			
			if (window.portals[guid]) {
				window.renderPortalDetails(guid);
				window.selectPortal(guid);
			}
		});
	}
}


window.plugin.portalImages.removeLabel = function(guid) {
	var previousLayer = window.plugin.portalImages.labelLayers[guid];
	if(previousLayer) {
		window.plugin.portalImages.labelLayerGroup.removeLayer(previousLayer);
		delete plugin.portalImages.labelLayers[guid];
	}
}

window.plugin.portalImages.clearAllPortalLabels = function() {
	for (var guid in window.plugin.portalImages.labelLayers) {
		window.plugin.portalImages.removeLabel(guid);
	}
}


window.plugin.portalImages.updatePortalLabels = function() {

  // Define the minimum zoom level at which portal images should be displayed
  const minZoomLevel = 16;

  // Check the current zoom level
  if (map.getZoom() < minZoomLevel) {
    // Clear all portal labels if the zoom level is below the threshold
    window.plugin.portalImages.clearAllPortalLabels();
    return;
  }

	// as this is called every time layers are toggled, there's no point in doing it when the leyer is off
	if (!map.hasLayer(window.plugin.portalImages.labelLayerGroup)) {
		return;
	}

	var portalPoints = {};

	for (var guid in window.portals) {
		var p = window.portals[guid];
		if (p._map && p.options.data.title) {  // only consider portals added to the map and with a title
			var point = map.project(p.getLatLng());
			portalPoints[guid] = point;
		}
	}

	// remove any not wanted
	for (var guid in window.plugin.portalImages.labelLayers) {
		if (!(guid in portalPoints)) {
			window.plugin.portalImages.removeLabel(guid);
		}
	}

	// and add those we do
	for (var guid in portalPoints) {
		window.plugin.portalImages.addLabel(guid, portals[guid].getLatLng());
	}
}

// ass calculating portal marker visibility can take some time when there's lots of portals shown, we'll do it on
// a short timer. this way it doesn't get repeated so much
window.plugin.portalImages.delayedUpdatePortalLabels = function(wait) {

	if (window.plugin.portalImages.timer === undefined) {
		window.plugin.portalImages.timer = setTimeout ( function() {
			window.plugin.portalImages.timer = undefined;
			window.plugin.portalImages.updatePortalLabels();
		}, wait*1000);

	}
}


var setup = function() {
	window.plugin.portalImages.setupCSS();

	window.plugin.portalImages.labelLayerGroup = new L.LayerGroup();
	window.layerChooser.addOverlay(window.plugin.portalImages.labelLayerGroup, 'Portal Images');

	window.addHook('requestFinished', function() { setTimeout(function(){window.plugin.portalImages.delayedUpdatePortalLabels(3.0);},1); });
	window.addHook('mapDataRefreshEnd', function() { window.plugin.portalImages.delayedUpdatePortalLabels(0.5); });
	window.map.on('overlayadd overlayremove', function() { setTimeout(function(){window.plugin.portalImages.delayedUpdatePortalLabels(1.0);},1); });
	window.map.on('zoomend', window.plugin.portalImages.clearAllPortalLabels );

}

setup.info = plugin_info; //add the script info data to the function as a property
if (typeof changelog !== 'undefined') setup.info.changelog = changelog;
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

