import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Simple indigo document mark for browser favicon. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4F46E5",
          borderRadius: 8,
          color: "white",
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        A
      </div>
    ),
    size,
  );
}
