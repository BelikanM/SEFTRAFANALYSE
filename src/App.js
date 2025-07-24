import React, { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Html,
  useProgress
} from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
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

function LoadModel({ file, material, textureURL, onClickPin }) {
  const [object, setObject] = useState(null);
  const meshRef = useRef();

  useEffect(() => {
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = () => {
      let texture;
      if (textureURL) {
        const loader = new THREE.TextureLoader();
        texture = loader.load(textureURL);
      }

      if (ext === "obj") {
        const loader = new OBJLoader();
        const result = loader.parse(reader.result);
        result.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (texture) {
              child.material = new THREE.MeshStandardMaterial({ map: texture });
            } else {
              child.material = material;
            }
          }
        });
        setObject(result);
      } else if (ext === "glb" || ext === "gltf") {
        const loader = new GLTFLoader();
        loader.parse(reader.result, "", (gltf) => {
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (texture) {
                child.material = new THREE.MeshStandardMaterial({ map: texture });
              } else {
                child.material = material;
              }
            }
          });
          setObject(gltf.scene);
        });
      } else {
        alert("Format non supporté : " + ext);
      }
    };

    if (ext === "obj") {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [file, material, textureURL]);

  // Gestion simple de clic sur objet 3D pour "placer un pin"
  // Attention : ça marche si l'objet a une géométrie mesh !
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

function ModelCard({ file, material, textureURL, onClickPin }) {
  const [bgColor, setBgColor] = useState("#222");

  return (
    <div className="model-card" style={{ backgroundColor: bgColor }}>
      <Canvas
        shadows
        camera={{ position: [0, 2, 5], fov: 60 }}
        style={{ borderRadius: "1rem", height: "300px", backgroundColor: bgColor }}
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
          />
        </Suspense>
      </Canvas>
      <p className="filename">{file.name}</p>
      <label style={{ fontSize: 12 }}>
        Fond carte :{" "}
        <input
          type="color"
          value={bgColor}
          onChange={(e) => setBgColor(e.target.value)}
        />
      </label>
    </div>
  );
}

export default function App() {
  const inputRef = useRef();
  const [files, setFiles] = useState([]);
  const [color, setColor] = useState("#aaaaaa");
  const [darkMode, setDarkMode] = useState(false);
  const [textureURL, setTextureURL] = useState("");
  const [pins, setPins] = useState({}); // { filename: [ {x,y,z}, ... ] }

  const handleFile = (e) => {
    const selected = Array.from(e.target.files).slice(0, 10);
    setFiles(selected);
  };

  const material = new THREE.MeshStandardMaterial({ color });

  // Ajoute un pin à un fichier donné
  const addPin = (filename, point) => {
    setPins((prev) => {
      const pinsForFile = prev[filename] || [];
      console.log(`Pin ajouté sur ${filename} en :`, point);
      return { ...prev, [filename]: [...pinsForFile, point] };
    });
  };

  return (
    <div className={`app-container ${darkMode ? "dark" : ""}`}>
      <div className="toolbar">
        <button onClick={() => inputRef.current.click()}>
          📦 Importer jusqu’à 10 fichiers 3D
        </button>

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

        <button
          style={{ marginLeft: "1rem" }}
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? "☀️ Mode clair" : "🌙 Mode sombre"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf,.obj"
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
            />
            {/* Affiche les pins pour chaque modèle (simple console.log pour l’instant) */}
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Pins sur {file.name} : {pins[file.name]?.length || 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
