"use client";

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ElevenLabsAgent from './ElevenLabsAgent';

interface InteractiveAvatarProps {
  // Props for the avatar, e.g., model URL, animation triggers
  agentId?: string;
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

const InteractiveAvatar: React.FC<InteractiveAvatarProps> = ({ agentId = "6fYFhKmGQZ8sdUf06ff1" }) => {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-64 h-64 bg-gray-800 border border-gray-500 rounded-lg">
        <Canvas>
          <ambientLight intensity={0.5} />
          <directionalLight position={[2, 5, 2]} intensity={1} />
          <SpinningMesh />
        </Canvas>
      </div>
      
      {/* ElevenLabs Conversational AI Agent */}
      <div className="w-64">
        <ElevenLabsAgent agentId={agentId} />
      </div>
    </div>
  );
};

export default InteractiveAvatar; 