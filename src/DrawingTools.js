import React, { useState, useRef } from "react";

function DrawingTools({ lines }) {
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef();
  const [panelPosition, setPanelPosition] = useState({ x: 10, y: 10 });

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
          const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 200);
          const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 100);
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

  return (
    <div
      ref={panelRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="drawing-tools-panel"
    >
      <h3>Tracés</h3>
      {lines.length === 0 ? (
        <p>Aucun tracé</p>
      ) : (
        <ul>
          {lines.map((line, index) => (
            <li key={index}>
              {line.type === "circle"
                ? "Cercle"
                : line.type === "square"
                ? "Carré"
                : line.type === "straight"
                ? "Ligne droite"
                : "Ligne libre"}{" "}
              #{index + 1}: <br />
              {line.length.toFixed(2)} m
              <br />
              {(line.length * 100).toFixed(2)} cm
              <br />
              {(line.length * 1000).toFixed(2)} mm
              <br />
              {(line.length / 1000).toFixed(5)} km
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DrawingTools;
