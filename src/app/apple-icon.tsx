import { ImageResponse } from "next/og";

/**
 * iOS ignores SVG icons and strips the alpha channel, so the home-screen icon
 * has to be a rasterised, fully opaque square. It is also masked by iOS itself
 * — hence no rounded corners here, unlike `icon.svg`.
 *
 * Same three bars, scaled from the 32px grid (×5.625).
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BARS = [45, 70, 104];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1a1a1c",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 11,
          paddingBottom: 37,
        }}
      >
        {BARS.map((height) => (
          <div
            key={height}
            style={{
              width: 28,
              height,
              borderRadius: 8,
              background: "#d9a441",
            }}
          />
        ))}
      </div>
    ),
    size,
  );
}
