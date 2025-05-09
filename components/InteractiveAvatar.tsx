"use client";

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ElevenLabsAgent from './ElevenLabsAgent';

interface InteractiveAvatarProps {
  agentId?: string;
}

const SpinningCube = () => {
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
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-96 h-96 bg-gray-800 border border-gray-500 rounded-lg relative">
        <Canvas>
          <ambientLight intensity={1.5} />
          <directionalLight position={[3, 5, 2]} intensity={2} />
          <SpinningCube />
        </Canvas>
      </div>
      
      <div className="w-full max-w-md">
        <ElevenLabsAgent agentId={agentId} onSpeakingStatusChange={setIsAgentSpeaking} />
      </div>
    </div>
  );
};

export default InteractiveAvatar; 