import React, { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Html,
  useProgress,
  TransformControls,
} from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";
import * as THREE from "three";
import "./App.css";
import DrawingTools from "./DrawingTools";

// Textures prédéfinies
const presetTextures = [
  { name: "Terre sèche", url: "https://cdn.polyhaven.com/asset_img/primary/dry_ground/preview.jpg" },
  { name: "Sol forestier", url: "https://cdn.polyhaven.com/asset_img/primary/forest_ground_01/preview.jpg" },
  { name: "Sol boueux", url: "https://cdn.polyhaven.com/asset_img/primary/mud_ground/preview.jpg" },
  { name: "Gravier", url: "https://cdn.polyhaven.com/asset_img/primary/rock_ground/preview.jpg" },
];

// Composant de chargement
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="loader">{progress.toFixed(0)}%</div>
    </Html>
  );
}

// Composant pour les lignes tracées
function DrawnLines({ points, color, width, length, type }) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, linewidth: width });
  const midPoint = points[Math.floor(points.length / 2)];

  return (
    <>
      <line geometry={geometry} material={material} />
      {length && midPoint && (
        <Html position={midPoint}>
          <div style={{ background: "rgba(0, 0, 0, 0.7)", color: "white", padding: "2px 5px", borderRadius: "3px", fontSize: "10px" }}>
            {type === "circle" ? "Circonférence" : type === "square" ? "Périmètre" : "Longueur"}:
            <br />{length.toFixed(2)} m
            <br />{(length * 100).toFixed(2)} cm
            <br />{(length * 1000).toFixed(2)} mm
            <br />{(length / 1000).toFixed(5)} km
          </div>
        </Html>
      )}
    </>
  );
}

// Composant pour charger et afficher un modèle 3D
function LoadModel({ file, material, textureURL, onClickPin, color, interiorColor, setSelectedObject, onDraw, drawMode, drawType, lineColor, lineWidth }) {
  const [object, setObject] = useState(null);
  const { scene, camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();

    let texture;
    if (textureURL) {
      const loader = new THREE.TextureLoader();
      texture = loader.load(textureURL);
    }

    const exteriorMaterial = texture
      ? new THREE.MeshStandardMaterial({ map: texture })
      : new THREE.MeshStandardMaterial({ color });

    const interiorMaterial = new THREE.MeshStandardMaterial({
      color: interiorColor,
      side: THREE.BackSide,
    });

    reader.onload = () => {
      if (ext === "obj") {
        const loader = new OBJLoader();
        const result = loader.parse(reader.result);
        result.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const group = new THREE.Group();
            const exteriorMesh = child.clone();
            const interiorMesh = child.clone();

            exteriorMesh.material = exteriorMaterial;
            interiorMesh.material = interiorMaterial;

            group.add(exteriorMesh);
            group.add(interiorMesh);

            child.parent?.add(group);
            child.parent?.remove(child);
          }
        });
        setObject(result);
      } else if (ext === "glb" || ext === "gltf") {
        const loader = new GLTFLoader();
        loader.parse(reader.result, "", (gltf) => {
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const group = new THREE.Group();
              const exteriorMesh = child.clone();
              const interiorMesh = child.clone();

              exteriorMesh.material = exteriorMaterial;
              interiorMesh.material = interiorMaterial;

              group.add(exteriorMesh);
              group.add(interiorMesh);

              child.parent?.add(group);
              child.parent?.remove(child);
            }
          });
          setObject(gltf.scene);
        });
      } else if (ext === "ply") {
        const loader = new PLYLoader();
        const geometry = loader.parse(reader.result);
        geometry.computeVertexNormals();
        const pointsMaterial = new THREE.PointsMaterial({ size: 0.01, color });
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
  }, [file, material, textureURL, color, interiorColor]);

  const updateMousePosition = (event) => {
    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const getIntersects = () => {
    raycaster.current.setFromCamera(mouse.current, camera);
    return raycaster.current.intersectObject(object, true);
  };

  const handleMouseDown = (event) => {
    if (!object || !drawMode) return;
    setIsDrawing(true);
    updateMousePosition(event);
    const intersects = getIntersects();
    if (intersects.length > 0) {
      const point = intersects[0].point;
      setCurrentPoints([point]);
    }
  };

  const handleMouseMove = (event) => {
    if (!isDrawing || !object || !drawMode) return;
    updateMousePosition(event);
    const intersects = getIntersects();
    if (intersects.length > 0) {
      const point = intersects[0].point;
      setCurrentPoints((prev) => {
        if (prev.length === 0) return [point];
        const lastPoint = prev[prev.length - 1];
        // Ajouter un point seulement si la distance est supérieure à 0.01 (précision)
        if (point.distanceTo(lastPoint) > 0.01) {
          if (drawType === "straight" && prev.length === 1) {
            return [prev[0], point];
          } else if (drawType === "free") {
            return [...prev, point];
          } else if (drawType === "circle" || drawType === "square") {
            return [prev[0], point];
          }
        }
        return prev;
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentPoints.length > 1) {
      let finalPoints = currentPoints;
      if (drawType === "circle") {
        finalPoints = createCirclePoints(currentPoints[0], currentPoints[1]);
      } else if (drawType === "square") {
        finalPoints = createSquarePoints(currentPoints[0], currentPoints[1]);
      }
      const length = calculateLength(finalPoints);
      setLines((prev) => [...prev, { points: finalPoints, length, type: drawType }]);
      onDraw({ points: finalPoints, length, type: drawType });
    }
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const createCirclePoints = (center, edge) => {
    const radius = center.distanceTo(edge);
    const points = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = center.x + radius * Math.cos(theta);
      const y = center.y + radius * Math.sin(theta);
      const z = center.z;
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  };

  const createSquarePoints = (start, end) => {
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    const size = Math.max(width, height);
    const points = [
      start,
      new THREE.Vector3(start.x + size, start.y, start.z),
      new THREE.Vector3(start.x + size, start.y + size, start.z),
      new THREE.Vector3(start.x, start.y + size, start.z),
      start,
    ];
    return points;
  };

  const calculateLength = (points) => {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += points[i].distanceTo(points[i - 1]);
    }
    return length;
  };

  function handleClick(event) {
    if (drawMode) return;
    event.stopPropagation();
    const point = event.point;
    onClickPin(file.name, point);
    setSelectedObject(object);
  }

  return (
    <>
      {object && (
        <primitive
          object={object}
          scale={1.5}
          onClick={handleClick}
          onPointerDown={drawMode ? handleMouseDown : undefined}
          onPointerMove={drawMode ? handleMouseMove : undefined}
          onPointerUp={drawMode ? handleMouseUp : undefined}
          dispose={null}
        />
      )}
      {lines.map((line, index) => (
        <DrawnLines key={index} points={line.points} color={lineColor} width={lineWidth} length={line.length} type={line.type} />
      ))}
      {currentPoints.length > 0 && (
        <DrawnLines points={currentPoints} color={lineColor} width={lineWidth} length={calculateLength(currentPoints)} type={drawType} />
      )}
    </>
  );
}

// Composant pour les contrôles de transformation
function TransformControlsComponent({ object, isFullscreen, orbitControlsRef, setDrawMode, drawType, setDrawType, lineColor, setLineColor, lineWidth, setLineWidth }) {
  const [mode, setMode] = useState("translate");
  const [snap, setSnap] = useState(false);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const controlsRef = useRef();
  const panelRef = useRef();
  const [panelPosition, setPanelPosition] = useState({ x: 10, y: isFullscreen ? 80 : 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);

  useEffect(() => {
    if (object && controlsRef.current) {
      const controls = controlsRef.current;
      controls.addEventListener("change", () => {
        const newState = {
          position: object.position.clone(),
          rotation: object.rotation.clone(),
          scale: object.scale.clone(),
        };
        setHistory((prev) => [...prev, newState].slice(-50));
        setRedoStack([]);
      });
    }
  }, [object]);

  const undo = () => {
    if (history.length <= 1) return;
    const lastState = history[history.length - 2];
    setRedoStack((prev) => [...prev, history[history.length - 1]]);
    setHistory((prev) => prev.slice(0, -1));
    if (lastState && object) {
      object.position.copy(lastState.position);
      object.rotation.copy(lastState.rotation);
      object.scale.copy(lastState.scale);
    }
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setHistory((prev) => [...prev, nextState]);
    setRedoStack((prev) => prev.slice(0, -1));
    if (nextState && object) {
      object.position.copy(nextState.position);
      object.rotation.copy(nextState.rotation);
      object.scale.copy(nextState.scale);
    }
  };

  const handleInputChange = (type, axis, value) => {
    if (!object) return;
    const numValue = parseFloat(value) || 0;
    if (type === "position") object.position[axis] = numValue;
    if (type === "rotation") object.rotation[axis] = THREE.MathUtils.degToRad(numValue);
    if (type === "scale") object.scale[axis] = numValue;
    const newState = object
      ? {
          position: object.position.clone(),
          rotation: object.rotation.clone(),
          scale: object.scale.clone(),
        }
      : {};
    setHistory((prev) => [...prev, newState].slice(-50));
    setRedoStack([]);
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.stopPropagation();
      requestAnimationFrame(() => {
        setPanelPosition((prev) => {
          const newX = prev.x + e.movementX;
          const newY = prev.y + e.movementY;
          const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 300);
          const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 200);
          return {
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY)),
          };
        });
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const rotateLeft = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.object.rotateY(THREE.MathUtils.degToRad(15));
      orbitControlsRef.current.update();
    }
  };

  const rotateRight = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.object.rotateY(THREE.MathUtils.degToRad(-15));
      orbitControlsRef.current.update();
    }
  };

  const rotateUp = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.object.rotateX(THREE.MathUtils.degToRad(15));
      orbitControlsRef.current.update();
    }
  };

  const rotateDown = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.object.rotateX(THREE.MathUtils.degToRad(-15));
      orbitControlsRef.current.update();
    }
  };

  const zoomIn = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.object.position.lerp(
        orbitControlsRef.current.target,
        0.1
      );
      orbitControlsRef.current.update();
    }
  };

  const zoomOut = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.object.position.lerp(
        orbitControlsRef.current.target,
        -0.1
      );
      orbitControlsRef.current.update();
    }
  };

  const resetCamera = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.reset();
    }
  };

  return (
    <>
      {object && mode !== "draw" && (
        <TransformControls
          ref={controlsRef}
          object={object}
          mode={mode}
          space="local"
          size={isFullscreen ? 1.2 : 0.8}
          showX={true}
          showY={true}
          showZ={true}
          snapping={snap}
          translationSnap={snap ? 0.1 : null}
          rotationSnap={snap ? THREE.MathUtils.degToRad(5) : null}
          scaleSnap={snap ? 0.1 : null}
        />
      )}
      {isPanelVisible && (
        <Html
          prepend
          style={{
            position: "absolute",
            top: `${panelPosition.y}px`,
            left: `${panelPosition.x}px`,
            zIndex: 10001,
            color: "white",
            background: "rgba(0, 0, 0, 0.8)",
            padding: "10px",
            borderRadius: "8px",
            fontSize: "12px",
            userSelect: "none",
            cursor: isDragging ? "grabbing" : "grab",
            transition: "top 0.1s, left 0.1s",
          }}
        >
          <div
            ref={panelRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="flex flex-col gap-2"
          >
            <div className="flex gap-2 flex-wrap">
              <button
                className={`px-2 py-1 rounded ${mode === "translate" ? "bg-purple-600" : "bg-gray-600"} hover:bg-purple-500 transition`}
                onClick={() => { setMode("translate"); setDrawMode(false); }}
              >
                Move (G)
              </button>
              <button
                className={`px-2 py-1 rounded ${mode === "rotate" ? "bg-purple-600" : "bg-gray-600"} hover:bg-purple-500 transition`}
                onClick={() => { setMode("rotate"); setDrawMode(false); }}
              >
                Rotate (R)
              </button>
              <button
                className={`px-2 py-1 rounded ${mode === "scale" ? "bg-purple-600" : "bg-gray-600"} hover:bg-purple-500 transition`}
                onClick={() => { setMode("scale"); setDrawMode(false); }}
              >
                Scale (S)
              </button>
              <button
                className={`px-2 py-1 rounded ${mode === "draw" ? "bg-purple-600" : "bg-gray-600"} hover:bg-purple-500 transition`}
                onClick={() => { setMode("draw"); setDrawMode(true); }}
              >
                Draw (D)
              </button>
              <button
                className={`px-2 py-1 rounded ${snap ? "bg-purple-600" : "bg-gray-600"} hover:bg-purple-500 transition`}
                onClick={() => setSnap(!snap)}
              >
                Snap {snap ? "On" : "Off"}
              </button>
              <button
                className="px-2 py-1 bg-gray-600 rounded hover:bg-purple-500 transition"
                onClick={() => setIsPanelVisible(false)}
              >
                Hide
              </button>
            </div>
            {mode === "draw" && (
              <div className="flex flex-col gap-2">
                <div>
                  <label>Type de tracé :</label>
                  <select
                    value={drawType}
                    onChange={(e) => setDrawType(e.target.value)}
                    className="ml-2 p-1 bg-gray-800 text-white rounded"
                  >
                    <option value="free">Ligne libre</option>
                    <option value="straight">Ligne droite</option>
                    <option value="circle">Cercle</option>
                    <option value="square">Carré</option>
                  </select>
                </div>
                <div>
                  <label>Couleur de la ligne :</label>
                  <input
                    type="color"
                    value={lineColor}
                    onChange={(e) => setLineColor(e.target.value)}
                    className="ml-2"
                  />
                </div>
                <div>
                  <label>Épaisseur de la ligne :</label>
                  <input
                    type="number"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(parseFloat(e.target.value))}
                    min="1"
                    max="10"
                    step="1"
                    className="ml-2 w-16 p-1 bg-gray-800 text-white rounded"
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <button
                className="px-2 py-1 bg-gray-600 rounded hover:bg-purple-500 transition"
                onClick={rotateLeft}
              >
                🔄 Gauche
              </button>
              <button
                className="px-2 py-1 bg-gray-600 rounded hover:bg-purple-500 transition"
                onClick={rotateRight}
              >
                🔄 Droite
              </button>
              <button
                className="px-2 py-1 bg-gray-600 rounded hover:bg-purple-500 transition"
                onClick={rotateDown}
              >
                🔄 Bas
              </button>
              <button
                className="px-2 py-1 bg-gray-600 rounded hover:bg-purple-500 transition"
                onClick={rotateUp}
              >
                🔄 Haut
              </button>
              <button
                className="px-2 py-1 bg-gray-600 rounded hover:bg-purple-500 transition"
                onClick={zoomIn}
              >
                🔎 Zoom +
              </button>
              <button
                className="px-2 py-1 bg-gray-600 rounded hover:bg-purple-500 transition"
                onClick={zoomOut}
              >
                🔎 Zoom -
              </button>
              <button
                className="px-2 py-1 bg-gray-600 rounded hover:bg-purple-500 transition"
                onClick={resetCamera}
              >
                🔄 Réinitialiser
              </button>
            </div>
            <div className="flex gap-2">
              <button
                className="px-2 py-1 bg-gray-600 rounded hover:bg-purple-500 transition"
                onClick={undo}
                disabled={history.length <= 1}
              >
                Undo
              </button>
              <button
                className="px-2 py-1 bg-gray-600 rounded hover:bg-purple-500 transition"
                onClick={redo}
                disabled={redoStack.length === 0}
              >
                Redo
              </button>
            </div>
            {object && mode !== "draw" && (
              <div className="flex flex-col gap-1">
                <div>
                  <span>Position:</span>
                  <input
                    type="number"
                    className="w-16 mx-1 p-1 bg-gray-800 text-white rounded"
                    value={object.position.x.toFixed(2)}
                    onChange={(e) => handleInputChange("position", "x", e.target.value)}
                    step="0.1"
                  />
                  <input
                    type="number"
                    className="w-16 mx-1 p-1 bg-gray-800 text-white rounded"
                    value={object.position.y.toFixed(2)}
                    onChange={(e) => handleInputChange("position", "y", e.target.value)}
                    step="0.1"
                  />
                  <input
                    type="number"
                    className="w-16 mx-1 p-1 bg-gray-800 text-white rounded"
                    value={object.position.z.toFixed(2)}
                    onChange={(e) => handleInputChange("position", "z", e.target.value)}
                    step="0.1"
                  />
                </div>
                <div>
                  <span>Rotation:</span>
                  <input
                    type="number"
                    className="w-16 mx-1 p-1 bg-gray-800 text-white rounded"
                    value={THREE.MathUtils.radToDeg(object.rotation.x).toFixed(2)}
                    onChange={(e) => handleInputChange("rotation", "x", e.target.value)}
                    step="5"
                  />
                  <input
                    type="number"
                    className="w-16 mx-1 p-1 bg-gray-800 text-white rounded"
                    value={THREE.MathUtils.radToDeg(object.rotation.y).toFixed(2)}
                    onChange={(e) => handleInputChange("rotation", "y", e.target.value)}
                    step="5"
                  />
                  <input
                    type="number"
                    className="w-16 mx-1 p-1 bg-gray-800 text-white rounded"
                    value={THREE.MathUtils.radToDeg(object.rotation.z).toFixed(2)}
                    onChange={(e) => handleInputChange("rotation", "z", e.target.value)}
                    step="5"
                  />
                </div>
                <div>
                  <span>Scale:</span>
                  <input
                    type="number"
                    className="w-16 mx-1 p-1 bg-gray-800 text-white rounded"
                    value={object.scale.x.toFixed(2)}
                    onChange={(e) => handleInputChange("scale", "x", e.target.value)}
                    step="0.1"
                  />
                  <input
                    type="number"
                    className="w-16 mx-1 p-1 bg-gray-800 text-white rounded"
                    value={object.scale.y.toFixed(2)}
                    onChange={(e) => handleInputChange("scale", "y", e.target.value)}
                    step="0.1"
                  />
                  <input
                    type="number"
                    className="w-16 mx-1 p-1 bg-gray-800 text-white rounded"
                    value={object.scale.z.toFixed(2)}
                    onChange={(e) => handleInputChange("scale", "z", e.target.value)}
                    step="0.1"
                  />
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
      {!isPanelVisible && (
        <Html
          prepend
          style={{
            position: "absolute",
            top: `${panelPosition.y}px`,
            left: `${panelPosition.x}px`,
            zIndex: 10001,
            color: "white",
            background: "rgba(0, 0, 0, 0.8)",
            padding: "10px",
            borderRadius: "8px",
            fontSize: "12px",
            userSelect: "none",
            transition: "top 0.1s, left 0.1s",
          }}
        >
          <button
            className="px-2 py-1 bg-gray-600 rounded hover:bg-purple-500 transition"
            onClick={() => setIsPanelVisible(true)}
          >
            Afficher le panneau
          </button>
        </Html>
      )}
    </>
  );
}

// Composant pour afficher une carte de modèle
function ModelCard({ file, material, textureURL, onClickPin, color, interiorColor }) {
  const containerRef = useRef(null);
  const orbitControlsRef = useRef();
  const [bgColor, setBgColor] = useState("#222");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localColor, setLocalColor] = useState(color);
  const [localInteriorColor, setLocalInteriorColor] = useState(interiorColor);
  const [selectedObject, setSelectedObject] = useState(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawType, setDrawType] = useState("free");
  const [lineColor, setLineColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(2);
  const [drawnLines, setDrawnLines] = useState([]);
  const [isDrawingPanelVisible, setIsDrawingPanelVisible] = useState(true);

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

  const handleDraw = (line) => {
    setDrawnLines((prev) => [...prev, line]);
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
          zIndex: 10002,
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
        <div className="controls-container">
          <label className="control-label">
            🎨 Couleur extérieure :
            <input
              type="color"
              value={localColor}
              onChange={(e) => setLocalColor(e.target.value)}
            />
          </label>
          <label className="control-label">
            🖌️ Couleur intérieure :
            <input
              type="color"
              value={localInteriorColor}
              onChange={(e) => setLocalInteriorColor(e.target.value)}
            />
          </label>
          <button
            className="control-button"
            onClick={() => setIsDrawingPanelVisible(!isDrawingPanelVisible)}
          >
            {isDrawingPanelVisible ? "Masquer les tracés" : "Afficher les tracés"}
          </button>
          {isDrawingPanelVisible && <DrawingTools lines={drawnLines} />}
        </div>
      )}

      <Canvas
        shadows
        camera={{ position: [0, 2, 5], fov: 60 }}
        style={{
          borderRadius: "1rem",
          flexGrow: 1,
          backgroundColor: bgColor,
          marginTop: isFullscreen ? "4rem" : 0,
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
        <Environment preset="city" />
        <OrbitControls
          ref={orbitControlsRef}
          enableZoom
          enablePan
          enableRotate={!drawMode}
          enableDamping
        />
        <Suspense fallback={<Loader />}>
          <LoadModel
            file={file}
            material={material}
            textureURL={textureURL}
            onClickPin={onClickPin}
            color={localColor}
            interiorColor={localInteriorColor}
            setSelectedObject={setSelectedObject}
            onDraw={handleDraw}
            drawMode={drawMode}
            drawType={drawType}
            lineColor={lineColor}
            lineWidth={lineWidth}
          />
          <TransformControlsComponent
            object={selectedObject}
            isFullscreen={isFullscreen}
            orbitControlsRef={orbitControlsRef}
            setDrawMode={setDrawMode}
            drawType={drawType}
            setDrawType={setDrawType}
            lineColor={lineColor}
            setLineColor={setLineColor}
            lineWidth={lineWidth}
            setLineWidth={setLineWidth}
          />
        </Suspense>
      </Canvas>

      {!isFullscreen && (
        <div className="controls-container">
          <p className="filename">{file.name}</p>
          <label className="control-label">
            Fond carte :
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
            />
          </label>
          <button
            className="control-button"
            onClick={() => setIsDrawingPanelVisible(!isDrawingPanelVisible)}
          >
            {isDrawingPanelVisible ? "Masquer les tracés" : "Afficher les tracés"}
          </button>
          {isDrawingPanelVisible && <DrawingTools lines={drawnLines} />}
        </div>
      )}
    </div>
  );
}

// Composant principal
export default function App() {
  const inputRef = useRef();
  const [files, setFiles] = useState([]);
  const [color, setColor] = useState("#aaaaaa");
  const [interiorColor, setInteriorColor] = useState("#ffffff");
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
        <button onClick={() => inputRef.current.click()}>
          📦 Importer jusqu’à 10 fichiers 3D
        </button>
        <label>
          🎨 Couleur extérieure :
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ marginLeft: "0.5rem" }}
          />
        </label>
        <label>
          🖌️ Couleur intérieure :
          <input
            type="color"
            value={interiorColor}
            onChange={(e) => setInteriorColor(e.target.value)}
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
              interiorColor={interiorColor}
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
