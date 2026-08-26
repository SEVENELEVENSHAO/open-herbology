import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

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
          background: "#f8f0df",
          border: "24px solid #20211f",
          borderRadius: 112,
          fontSize: 300,
        }}
      >
        🌿
      </div>
    ),
    size,
  );
}
