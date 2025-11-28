import React from "react";
import backgroundImage from "../assets/image.png";

const GlowBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      className="static-bg"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    />
    <div className="glow-vignette" />
  </div>
);

export default GlowBackground;