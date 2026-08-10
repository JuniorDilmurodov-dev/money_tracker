import { ImageResponse } from "next/og";

/**
 * The three ascending bars from `app/icon.svg`, rasterised at whatever size the
 * manifest asks for. Android's installer needs real PNGs — it will accept an
 * SVG for the launcher but not for the splash screen or the task switcher, and
 * the "Install app" prompt itself only fires once a 192px and a 512px raster
 * are on offer.
 *
 * Geometry is the 32px grid of `icon.svg`, scaled: bars 5 wide with 2 between
 * them (19 across) standing 18.5 tall, centred on the opaque dark tile. The
 * tile is never transparent — Android composites maskable icons over the
 * launcher's own background, and iOS drops the alpha channel outright.
 */
const TILE = "#1a1a1c";
const MARK = "#d9a441";

/** Bar heights on the 32px grid, shortest first. */
const BARS = [8, 12.5, 18.5];

/**
 * Fraction of the tile the mark occupies for a `maskable` icon. Android may
 * crop a maskable icon to any shape inside the middle 80% — a circle at its
 * most aggressive — so the mark has to fit within that circle. At 0.85 the
 * mark's diagonal is 22.5 on the 32 grid against a 25.6 safe circle.
 */
export const MASKABLE_SCALE = 0.85;

export function appIcon(size: number, scale = 1): ImageResponse {
  const k = (size / 32) * scale;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: TILE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2 * k }}>
          {BARS.map((height) => (
            <div
              key={height}
              style={{
                width: 5 * k,
                height: height * k,
                borderRadius: 1.5 * k,
                background: MARK,
              }}
            />
          ))}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
