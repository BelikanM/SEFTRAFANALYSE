import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Html, useProgress } from "@react-three/drei";
import ModelLoader from "./ModelLoader";

const Loader = () => {
  const { progress } = useProgress();
  return <Html center><div className="text-white">{progress.toFixed(0)}%</div></Html>;
};

const Viewer = ({ file }) => (
  <Canvas shadows camera={{ position: [0, 2, 5], fov: 60 }}>
    <ambientLight intensity={0.5} />
    <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
    <Environment preset="city" />
    <OrbitControls enableZoom enablePan />
    <Suspense fallback={<Loader />}>
      <ModelLoader file={file} />
    </Suspense>
  </Canvas>
);

export default Viewer;
