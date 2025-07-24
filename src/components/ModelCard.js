import React, { useRef, useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import * as THREE from "three";

export default function ModelLoader({ file }) {
  const ref = useRef();
  const [object, setObject] = useState(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      const ext = file.name.split(".").pop().toLowerCase();

      if (ext === "obj") {
        const loader = new OBJLoader();
        const result = loader.parse(reader.result);
        setObject(result);
      } else if (ext === "glb" || ext === "gltf") {
        const loader = new GLTFLoader();
        loader.parse(reader.result, "", (gltf) => setObject(gltf.scene));
      } else if (ext === "fbx") {
        const loader = new FBXLoader();
        const fbx = loader.parse(reader.result);
        setObject(fbx);
      } else {
        alert("Extension non supportée : " + ext);
      }
    };

    if (file.name.endsWith(".obj")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [file]);

  return object ? <primitive object={object} ref={ref} scale={1.5} /> : null;
}
