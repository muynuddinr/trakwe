export const organizations = [
  { id: "org-dubai", name: "Trackwe Dubai Logistics" },
  { id: "org-emirates", name: "Emirates Cargo Services" },
];
// Reproducible illustrative road-adjacent UAE demo points, not live GPS or turn-by-turn routing.
export const routes: Record<string, [number, number][]> = {
  Dubai: [
    [25.2285, 55.2868],
    [25.2212, 55.2807],
    [25.2124, 55.2744],
    [25.2035, 55.2683],
    [25.1943, 55.2619],
    [25.1846, 55.2548],
    [25.1741, 55.247],
    [25.1646, 55.2399],
  ],
  "Abu Dhabi": [
    [24.4905, 54.3726],
    [24.4835, 54.3796],
    [24.477, 54.3861],
    [24.4699, 54.3931],
    [24.4629, 54.4001],
    [24.4558, 54.4072],
    [24.4487, 54.4142],
    [24.4417, 54.4213],
  ],
  Sharjah: [
    [25.3453, 55.3884],
    [25.3404, 55.3851],
    [25.3352, 55.3816],
    [25.3298, 55.3781],
    [25.3242, 55.3743],
    [25.3187, 55.3707],
    [25.3132, 55.3672],
    [25.3076, 55.3634],
  ],
  Ajman: [
    [25.4011, 55.4763],
    [25.3975, 55.4727],
    [25.394, 55.4691],
    [25.3904, 55.4655],
    [25.3868, 55.462],
    [25.3833, 55.4585],
    [25.3797, 55.455],
    [25.3761, 55.4514],
  ],
  "Ras Al Khaimah": [
    [25.7894, 55.958],
    [25.7829, 55.9559],
    [25.7764, 55.9538],
    [25.7699, 55.9517],
    [25.7634, 55.9496],
    [25.7569, 55.9475],
    [25.7504, 55.9454],
    [25.7439, 55.9433],
  ],
  Fujairah: [
    [25.1285, 56.3261],
    [25.1261, 56.3219],
    [25.1237, 56.3176],
    [25.1213, 56.3134],
    [25.1189, 56.3091],
    [25.1165, 56.3049],
    [25.1141, 56.3006],
    [25.1117, 56.2964],
  ],
  "Al Ain": [
    [24.2184, 55.7554],
    [24.2149, 55.7512],
    [24.2114, 55.747],
    [24.2079, 55.7428],
    [24.2044, 55.7386],
    [24.2009, 55.7344],
    [24.1974, 55.7302],
    [24.1939, 55.726],
  ],
};
export function routeFor(region: string) {
  return routes[region] ?? routes.Dubai;
}
// Geofence authoring is intentionally limited to the supported UAE city demo areas.
export function inDemoArea([lat, lng]: [number, number]) {
  return Object.values(routes).some((points) =>
    points.some(
      ([a, b]) => Math.abs(a - lat) < 0.055 && Math.abs(b - lng) < 0.055,
    ),
  );
}
