// App.js
import React, { useRef, useState, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Html,
  useProgress
} from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";
import * as THREE from "three";
import "./App.css";

const presetTextures = [
  { name: "Terre sèche", url: "https://cdn.polyhaven.com/asset_img/primary/dry_ground/preview.jpg" },
  { name: "Sol forestier", url: "https://cdn.polyhaven.com/asset_img/primary/forest_ground_01/preview.jpg" },
  { name: "Sol boueux", url: "https://cdn.polyhaven.com/asset_img/primary/mud_ground/preview.jpg" },
  { name: "Gravier", url: "https://cdn.polyhaven.com/asset_img/primary/rock_ground/preview.jpg" },
];

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="loader">{progress.toFixed(0)}%</div>
    </Html>
  );
}

function LoadModel({ file, material, textureURL, onClickPin, color }) {
  const [object, setObject] = useState(null);

  useEffect(() => {
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();

    let texture;
    if (textureURL) {
      const loader = new THREE.TextureLoader();
      texture = loader.load(textureURL);
    }

    reader.onload = () => {
      if (ext === "obj") {
        const loader = new OBJLoader();
        const result = loader.parse(reader.result);
        result.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = texture
              ? new THREE.MeshStandardMaterial({ map: texture })
              : new THREE.MeshStandardMaterial({ color });
          }
        });
        setObject(result);
      } else if (ext === "glb" || ext === "gltf") {
        const loader = new GLTFLoader();
        loader.parse(reader.result, "", (gltf) => {
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material = texture
                ? new THREE.MeshStandardMaterial({ map: texture })
                : new THREE.MeshStandardMaterial({ color });
            }
          });
          setObject(gltf.scene);
        });
      } else if (ext === "ply") {
        const loader = new PLYLoader();
        const geometry = loader.parse(reader.result);
        geometry.computeVertexNormals();
        const pointsMaterial = new THREE.PointsMaterial({ size: 0.01, color: color });
        const points = new THREE.Points(geometry, pointsMaterial);
        setObject(points);
      } else if (ext === "las") {
        const buffer = reader.result;
        const view = new DataView(buffer);

        const pointDataOffset = view.getUint32(96, true);
        const pointCount = view.getUint32(107, true);
        const pointSize = view.getUint16(105, true);

        const scaleX = view.getFloat64(131, true);
        const scaleY = view.getFloat64(139, true);
        const scaleZ = view.getFloat64(147, true);
        const offsetX = view.getFloat64(155, true);
        const offsetY = view.getFloat64(163, true);
        const offsetZ = view.getFloat64(171, true);

        const positions = [];
        const colors = [];

        for (let i = 0; i < pointCount; i++) {
          const base = pointDataOffset + i * pointSize;
          const x = view.getInt32(base, true) * scaleX + offsetX;
          const y = view.getInt32(base + 4, true) * scaleY + offsetY;
          const z = view.getInt32(base + 8, true) * scaleZ + offsetZ;
          positions.push(x, y, z);

          const r = view.getUint16(base + 20, true) / 256;
          const g = view.getUint16(base + 22, true) / 256;
          const b = view.getUint16(base + 24, true) / 256;
          colors.push(r / 255, g / 255, b / 255);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({ size: 0.05, vertexColors: true });
        const points = new THREE.Points(geometry, material);
        setObject(points);
      } else {
        alert("Format non supporté : " + ext);
      }
    };

    if (["obj"].includes(ext)) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [file, material, textureURL, color]);

  function handleClick(event) {
    event.stopPropagation();
    const point = event.point;
    onClickPin(file.name, point);
  }

  return object ? (
    <primitive
      object={object}
      scale={1.5}
      onClick={handleClick}
      dispose={null}
    />
  ) : null;
}

function ModelCard({ file, material, textureURL, onClickPin, color }) {
  const containerRef = useRef(null);
  const [bgColor, setBgColor] = useState("#222");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localColor, setLocalColor] = useState(color);

  useEffect(() => {
    function fullscreenChange() {
      const fsElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      setIsFullscreen(fsElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", fullscreenChange);
    document.addEventListener("webkitfullscreenchange", fullscreenChange);
    document.addEventListener("mozfullscreenchange", fullscreenChange);
    document.addEventListener("MSFullscreenChange", fullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", fullscreenChange);
      document.removeEventListener("webkitfullscreenchange", fullscreenChange);
      document.removeEventListener("mozfullscreenchange", fullscreenChange);
      document.removeEventListener("MSFullscreenChange", fullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div
      ref={containerRef}
      className="model-card"
      style={{
        backgroundColor: bgColor,
        position: isFullscreen ? "fixed" : "relative",
        top: isFullscreen ? 0 : "auto",
        left: isFullscreen ? 0 : "auto",
        width: isFullscreen ? "100vw" : "auto",
        height: isFullscreen ? "100vh" : "300px",
        zIndex: isFullscreen ? 9999 : "auto",
        borderRadius: "1rem",
        padding: isFullscreen ? "1rem" : 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <button
        onClick={toggleFullscreen}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10000,
          backgroundColor: "#8e44ad",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "6px 12px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {isFullscreen ? "↩️ Réduire" : "🔳 Plein écran"}
      </button>

      {isFullscreen && (
        <label
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 10000,
            color: "#fff",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          🎨 Couleur de l’objet :
          <input
            type="color"
            value={localColor}
            onChange={(e) => setLocalColor(e.target.value)}
          />
        </label>
      )}

      <Canvas
        shadows
        camera={{ position: [0, 2, 5], fov: 60 }}
        style={{
          borderRadius: "1rem",
          flexGrow: 1,
          backgroundColor: bgColor,
          marginTop: isFullscreen ? "2.5rem" : 0,
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
        <Environment preset="city" />
        <OrbitControls enableZoom enablePan />
        <Suspense fallback={<Loader />}>
          <LoadModel
            file={file}
            material={material}
            textureURL={textureURL}
            onClickPin={onClickPin}
            color={localColor}
          />
        </Suspense>
      </Canvas>

      {!isFullscreen && (
        <>
          <p className="filename" style={{ marginTop: 8 }}>{file.name}</p>
          <label style={{ fontSize: 12 }}>
            Fond carte :
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              style={{ marginLeft: 5 }}
            />
          </label>
        </>
      )}
    </div>
  );
}

export default function App() {
  const inputRef = useRef();
  const [files, setFiles] = useState([]);
  const [color, setColor] = useState("#aaaaaa");
  const [darkMode, setDarkMode] = useState(false);
  const [textureURL, setTextureURL] = useState("");
  const [pins, setPins] = useState({});

  const handleFile = (e) => {
    const selected = Array.from(e.target.files).slice(0, 10);
    setFiles(selected);
  };

  const material = new THREE.MeshStandardMaterial({ color });

  const addPin = (filename, point) => {
    setPins((prev) => {
      const pinsForFile = prev[filename] || [];
      return { ...prev, [filename]: [...pinsForFile, point] };
    });
  };

  return (
    <div className={`app-container ${darkMode ? "dark" : ""}`}>
      <div className="toolbar">
        <button onClick={() => inputRef.current.click()}>📦 Importer jusqu’à 10 fichiers 3D</button>
        <label>
          🎨 Couleur :
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ marginLeft: "0.5rem" }}
          />
        </label>
        <label>
          🖼️ Texture URL :
          <input
            type="text"
            placeholder="https://..."
            value={textureURL}
            onChange={(e) => setTextureURL(e.target.value)}
            style={{ width: "250px", marginLeft: "0.5rem" }}
          />
        </label>
        <div style={{ display: "inline-block", marginLeft: "1rem" }}>
          <strong>Textures prédéfinies :</strong>
          {presetTextures.map((t) => (
            <button
              key={t.url}
              style={{
                marginLeft: 8,
                backgroundColor: "#eee",
                border: "1px solid #ccc",
                borderRadius: 4,
                cursor: "pointer",
                padding: "2px 6px",
              }}
              onClick={() => setTextureURL(t.url)}
              title={t.name}
            >
              {t.name}
            </button>
          ))}
        </div>
        <button style={{ marginLeft: "1rem" }} onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "☀️ Mode clair" : "🌙 Mode sombre"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf,.obj,.ply,.las"
        className="hidden"
        multiple
        onChange={handleFile}
      />

      <div className="grid-container">
        {files.map((file, i) => (
          <div key={i} style={{ position: "relative" }}>
            <ModelCard
              file={file}
              material={material}
              textureURL={textureURL}
              onClickPin={addPin}
              color={color}
            />
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Pins sur {file.name} : {pins[file.name]?.length || 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
