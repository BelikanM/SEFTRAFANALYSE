import React, { useRef, useEffect, useState } from "react";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";

export default function TransformControlsComponent({ object, orbitControlsRef }) {
  const controlsRef = useRef();
  const [mode, setMode] = useState("translate");
  const [snap, setSnap] = useState(false);

  useEffect(() => {
    if (!object || !controlsRef.current) return;

    const controls = controlsRef.current;

    const onDragChange = (event) => {
      if (orbitControlsRef?.current) {
        orbitControlsRef.current.enabled = !event.value;
      }
    };

    controls.addEventListener("dragging-changed", onDragChange);
    return () => controls.removeEventListener("dragging-changed", onDragChange);
  }, [object, orbitControlsRef]);

  // Blender-style shortcuts: G (move), R (rotate), S (scale)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "g") setMode("translate");
      if (e.key === "r") setMode("rotate");
      if (e.key === "s") setMode("scale");
      if (e.key === "x") setSnap((prev) => !prev);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return object ? (
    <TransformControls
      ref={controlsRef}
      object={object}
      mode={mode}
      space="local"
      size={1}
      showX
      showY
      showZ
      snapping={snap}
      translationSnap={snap ? 0.5 : null}
      rotationSnap={snap ? THREE.MathUtils.degToRad(15) : null}
      scaleSnap={snap ? 0.1 : null}
    />
  ) : null;
}
