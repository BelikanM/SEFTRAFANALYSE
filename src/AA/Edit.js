import React, { useState } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";

const Edit = ({ object, isStylusActive, stylusType, stylusColor, unit }) => {
  const [points, setPoints] = useState([]);
  const [measurements, setMeasurements] = useState([]);

  // Unités de mesure disponibles
  const units = [
    { label: "Millimètres", value: "mm", factor: 1000 },
    { label: "Centimètres", value: "cm", factor: 100 },
    { label: "Mètres", value: "m", factor: 1 },
    { label: "Kilomètres", value: "km", factor: 0.001 },
    { label: "Pouces", value: "in", factor: 39.3701 },
    { label: "Pieds", value: "ft", factor: 3.28084 },
  ];

  // Gestion du clic pour ajouter un point de mesure
  const handleClick = (event) => {
    if (!isStylusActive || !object) {
      console.log(`Clic ignoré : Stylet ${isStylusActive ? "actif" : "inactif"}, Objet ${object ? "présent" : "absent"}`);
      return;
    }
    event.stopPropagation();
    const point = event.point.clone();
    setPoints((prev) => {
      const newPoints = [...prev, point];
      if (newPoints.length === 2) {
        const unitData = units.find((u) => u.value === unit) || units[2]; // Fallback sur "m"
        const distance = newPoints[0].distanceTo(newPoints[1]) * unitData.factor;
        setMeasurements((prev) => [
          ...prev,
          {
            start: newPoints[0],
            end: newPoints[1],
            distance: distance.toFixed(2),
            unit: unitData.value,
            stylusType,
            stylusColor,
          },
        ]);
        console.log(`Mesure ajoutée : ${distance.toFixed(2)} ${unitData.value}, Type: ${stylusType}, Couleur: ${stylusColor}`);
        return [];
      }
      return newPoints;
    });
  };

  // Rendu des lignes de mesure
  const renderLines = () => {
    return measurements.map((measure, index) => {
      const materialProps =
        measure.stylusType === "dashed"
          ? { color: measure.stylusColor, linewidth: 2, dashSize: 0.1, gapSize: 0.1 }
          : { color: measure.stylusColor, linewidth: 2 };

      return (
        <group key={index}>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([
                  measure.start.x, measure.start.y, measure.start.z,
                  measure.end.x, measure.end.y, measure.end.z,
                ])}
                count={2}
                itemSize={3}
              />
            </bufferGeometry>
            {measure.stylusType === "dashed" ? (
              <lineDashedMaterial {...materialProps} />
            ) : (
              <lineBasicMaterial {...materialProps} />
            )}
          </line>
          <Html
            position={[(measure.start.x + measure.end.x) / 2, (measure.start.y + measure.end.y) / 2, (measure.start.z + measure.end.z) / 2]}
            style={{
              background: "rgba(0, 0, 0, 0.8)",
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          >
            {`${measure.distance} ${measure.unit}`}
          </Html>
        </group>
      );
    });
  };

  return (
    <>
      {object ? (
        <primitive object={object} onClick={handleClick} dispose={null} />
      ) : (
        <Html center>
          <div style={{ color: "white", background: "rgba(0, 0, 0, 0.8)", padding: "10px", borderRadius: "4px" }}>
            Aucun objet sélectionné
          </div>
        </Html>
      )}
      {renderLines()}
      {measurements.length > 0 && (
        <Html
          prepend
          style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            zIndex: 10002,
            color: "white",
            background: "rgba(0, 0, 0, 0.8)",
            padding: "10px",
            borderRadius: "8px",
            fontSize: "12px",
            userSelect: "none",
          }}
        >
          <div className="flex flex-col gap-1">
            <strong>Mesures :</strong>
            {measurements.map((m, i) => (
              <div key={i}>
                {`Ligne ${i + 1}: ${m.distance} ${m.unit} (de [${m.start.x.toFixed(2)}, ${m.start.y.toFixed(2)}, ${m.start.z.toFixed(2)}] à [${m.end.x.toFixed(2)}, ${m.end.y.toFixed(2)}, ${m.end.z.toFixed(2)}], Type: ${m.stylusType}, Couleur: ${m.stylusColor})`}
              </div>
            ))}
          </div>
        </Html>
      )}
    </>
  );
};

export default Edit;
