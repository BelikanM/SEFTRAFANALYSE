import React, { useRef, useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import * as THREE from "three";

const ModelLoader = ({ file }) => {
  const ref = useRef();
  const [object, setObject] = useState(null);

  useEffect(() => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const ext = file.name.split(".").pop().toLowerCase();
      const result = reader.result;

      if (ext === "obj") {
        const loader = new OBJLoader();
        try {
          const obj = loader.parse(result);
          setObject(obj);
        } catch (err) {
          alert("Erreur OBJ : " + err.message);
        }
      } else if (ext === "glb" || ext === "gltf") {
        const loader = new GLTFLoader();
        loader.parse(result, "", (gltf) => {
          setObject(gltf.scene);
        }, (err) => {
          alert("Erreur GLTF : " + err.message);
        });
      } else if (ext === "fbx") {
        const loader = new FBXLoader();
        try {
          const fbx = loader.parse(result);
          setObject(fbx);
        } catch (err) {
          alert("Erreur FBX : " + err.message);
        }
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

  return object ? (
    <primitive object={object} ref={ref} scale={1.5} position={[0, -1, 0]} />
  ) : null;
};

export default ModelLoader;
