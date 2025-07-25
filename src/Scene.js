import React, { useRef, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import TransformControlsComponent from "./TransformControlsComponent";

export default function Scene({ orbitControlsRef }) {
  const [selectedObject, setSelectedObject] = useState(null);

  const objModel = useLoader(OBJLoader, "/models/myObject.obj");
  const gltf = useLoader(GLTFLoader, "/models/myModel.glb");

  const objRef = useRef();
  const gltfRef = useRef();

  return (
    <>
      <primitive
        object={objModel}
        ref={objRef}
        position={[-1.5, 0, 0]}
        onClick={() => setSelectedObject(objRef.current)}
      />
      <primitive
        object={gltf.scene}
        ref={gltfRef}
        position={[1.5, 0, 0]}
        onClick={() => setSelectedObject(gltfRef.current)}
      />

      <TransformControlsComponent
        object={selectedObject}
        orbitControlsRef={orbitControlsRef}
      />
    </>
  );
}

