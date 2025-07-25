import React, { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Loader } from "@react-three/drei";
import Scene from "./Scene";

export default function App() {
  const orbitControlsRef = useRef();

  return (
    <>
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 60 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
        <Suspense fallback={null}>
          <Environment preset="sunset" />
          <Scene orbitControlsRef={orbitControlsRef} />
        </Suspense>
        <OrbitControls ref={orbitControlsRef} />
      </Canvas>
      <Loader />
    </>
  );
}
