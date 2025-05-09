"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface InteractiveAvatarProps {
  // Props for the avatar, e.g., model URL, animation triggers
}

const SpinningMesh = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef} scale={[1, 1, 1]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
};

const InteractiveAvatar: React.FC<InteractiveAvatarProps> = (props) => {
  return (
    <div className="w-64 h-64 bg-gray-800 border border-gray-500 rounded-lg">
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 2]} intensity={1} />
        <SpinningMesh />
      </Canvas>
    </div>
  );
};

export default InteractiveAvatar; 