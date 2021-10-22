import React from 'react';
import { PanelPlugin } from '@grafana/data';
import { GeomapPanel } from './GeomapPanel';
import { MapViewEditor } from './editor/MapViewEditor';
import { defaultView, GeomapPanelOptions } from './types';
import { mapPanelChangedHandler, mapMigrationHandler } from './migrations';
import { getLayerEditor } from './editor/layerEditor';
import { config } from '@grafana/runtime';

export const plugin = new PanelPlugin<GeomapPanelOptions>(GeomapPanel)
  .setNoPadding()
  .setPanelChangeHandler(mapPanelChangedHandler)
  .setMigrationHandler(mapMigrationHandler)
  .useFieldConfig()
  .setPanelOptions((builder, context) => {
    let category = ['Map view'];
    builder.addCustomEditor({
      category,
      id: 'view',
      path: 'view',
      name: 'Initial view', // don't show it
      description: 'This location will show when the panel first loads',
      editor: MapViewEditor,
      defaultValue: defaultView,
    });

    builder.addBooleanSwitch({
      category,
      path: 'view.shared',
      description: 'Use the same view across multiple panels.  Note: this may require a dashboard reload.',
      name: 'Share view',
      defaultValue: defaultView.shared,
    });

    // Check server settings to disable custom basemap settings
    if (config.geomapDisableCustomBaseLayer) {
      builder.addCustomEditor({
        category: ['Base layer'],
        id: 'layers',
        path: '',
        name: '',
        // eslint-disable-next-line react/display-name
        editor: () => <div>The base layer is configured by the server admin.</div>,
      });
    } else {
      builder.addNestedOptions(
        getLayerEditor({
          category: ['Base layer'],
          path: 'basemap', // only one for now
          basemaps: true,
          current: context.options?.layers?.[0],
        })
      );
    }

    let layerCount = context.options?.layers?.length;
    if (layerCount == null || layerCount < 1) {
      layerCount = 1;
    }

    for (let i = 0; i < layerCount; i++) {
      let name = 'Data layer';
      if (i > 0) {
        name += ` (${i + 1})`;
      }
      builder.addNestedOptions(
        getLayerEditor({
          category: [name],
          path: `layers[${i}]`, // only one for now
          basemaps: false,
          current: context.options?.layers?.[i],
        })
      );
    }

    // The controls section
    category = ['Map controls'];
    builder
      .addBooleanSwitch({
        category,
        path: 'controls.showZoom',
        description: 'show buttons in the upper left',
        name: 'Show zoom control',
        defaultValue: true,
      })
      .addBooleanSwitch({
        category,
        path: 'controls.mouseWheelZoom',
        name: 'Mouse wheel zoom',
        defaultValue: true,
      })
      .addBooleanSwitch({
        category,
        path: 'controls.showAttribution',
        name: 'Show attribution',
        description: 'Show the map source attribution info in the lower right',
        defaultValue: true,
      })
      .addBooleanSwitch({
        category,
        path: 'controls.showScale',
        name: 'Show scale',
        description: 'Indicate map scale',
        defaultValue: false,
      })
      .addBooleanSwitch({
        category,
        path: 'controls.showDebug',
        name: 'Show debug',
        description: 'show map info',
        defaultValue: false,
      });
  });
